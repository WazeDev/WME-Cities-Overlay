// ==UserScript==
// @name         WME Cities Overlay
// @namespace    https://greasyfork.org/en/users/166843-wazedev
// @version      2022.12.29.02
// @description  Adds a city overlay for selected states
// @author       WazeDev
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://greasyfork.org/scripts/369729-wme-cities-overlay-db/code/WME%20Cities%20Overlay%20DB.js
// @license      GNU GPLv3
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @connect
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// ==/UserScript==

/* global W */
/* global OpenLayers */
/* ecmaVersion 2017 */
/* global $ */
/* global idbKeyval */
/* global WazeWrap */
/* global I18n */
/* eslint curly: ["warn", "multi-or-nest"] */

(function() {
    'use strict';

    var _color = '#E6E6E6';
    var _settingsStoreName = '_wme_cities';
    var _settings;
    var _features;
    var _kml;
    var _layerName = 'Cities Overlay';
    var _layer = null;
    var defaultFillOpacity = 0.3;
    var defaultStrokeOpacity = 0.6;
    var noFillStrokeOpacity = 0.9;
    var repoOwner = 'WazeDev';

    let currState = "";
    let currCity = "";
    let _US_States = {};
    let _MX_States = {};
    let kmlCache = {};

    let indexedDBSupport = false;
    let citiesDB;

    function isChecked(checkboxId) {
        return $('#' + checkboxId).is(':checked');
    }

    function setChecked(checkboxId, checked) {
        $('#' + checkboxId).prop('checked', checked);
    }

    function loadSettings() {
        _settings = $.parseJSON(localStorage.getItem(_settingsStoreName));
        let _defaultsettings = {
            layerVisible: true,
            ShowCityLabels: true,
            FillPolygons: true,
            HighlightFocusedCity: true,
            AutoUpdateKMLs: true
            //hiddenAreas: []
        };
        if(!_settings)
            _settings = _defaultsettings;
        for (var prop in _defaultsettings) {
            if (!_settings.hasOwnProperty(prop))
                _settings[prop] = _defaultsettings[prop];
        }
    }

    function saveSettings() {
        if (localStorage) {
            var settings = {
                layerVisible: _layer.visibility,
                ShowCityLabels: _settings.ShowCityLabels,
                FillPolygons: _settings.FillPolygons,
                HighlightFocusedCity: _settings.HighlightFocusedCity,
                AutoUpdateKMLs: _settings.AutoUpdateKMLs
            };
            localStorage.setItem(_settingsStoreName, JSON.stringify(settings));
        }
    }

    function GetFeaturesFromKMLString(strKML) {
        var format = new OpenLayers.Format.KML({
            'internalProjection': W.map.getProjectionObject(),
            'externalProjection': new OpenLayers.Projection("EPSG:4326")
        });
        return format.read(strKML);
    }

    function findCurrCity(){
        let newCity = "";
        var mapCenter = new OpenLayers.Geometry.Point(W.map.getCenter().lon,W.map.getCenter().lat);
        for (var i=0;i<_layer.features.length;i++){
            var feature = _layer.features[i];
            if(pointInFeature(feature.geometry, mapCenter)){
                newCity = feature.attributes.name;
                break;
            }
        }
        return newCity;
    }

    async function updateCitiesLayer(){
        let newCurrCity = findCurrCity();
        if(currCity != newCurrCity){
            currCity = newCurrCity;
            _layer.redraw();
        }
        await updateCityPolygons();
        updateDistrictNameDisplay();
    }

    function updateDistrictNameDisplay(){
        $('.wmecitiesoverlay-region').remove();
        if (_layer !== null) {
            if(_layer.features.length > 0){
                if(currCity != ""){
                    let color = '#00ffff';
                    var $div = $('<div>', {id:'wmecitiesoverlay', class:"wmecitiesoverlay-region", style:'float:left; margin-left:10px;'})//, title:'Click to toggle color on/off for this group'})
                    .css({color:color, cursor:"pointer"});
                    //.click(toggleAreaFill);
                    var $span = $('<span>').css({display:'inline-block'});
                    $span.text(currCity).appendTo($div);
                    $('.location-info-region').after($div);
                }
            }
        }
        else
            _layer.destroyFeatures();
    }

    function pointInFeature(geometry, mapCenter){
        try{
        if(geometry.CLASS_NAME == "OpenLayers.Geometry.Collection" || geometry.CLASS_NAME == "OpenLayers.Geometry.Collection"){
            for(let i=0; i<geometry.components.length; i++){
                if(geometry.components[i].containsPoint(mapCenter))
                    return true;
            }
        }
        else
            return geometry.containsPoint(mapCenter);
        }
        catch(err){
            console.log(err);
        }
        return false;
    }

    async function fetch(url){
        //return await $.get(url);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: url,
                method: 'GET',
                onload(res) {
                    if (res.status < 400) {
                        resolve(res.responseText);
                    } else {
                        reject(res);
                    }
                },
                onerror(res) {
                    reject(res);
                }
            });
        });
    }

    async function updateAllMaps(){
        let countryAbbr = W.model.countries.top.abbr;
        let keys = await idbKeyval.keys(`${countryAbbr}_states_cities`);
        let updatedCount = 0;
        let updatedStates = "";
        let countryAbbrObj;

        if(countryAbbr === "US")
            countryAbbrObj = _US_States;
        else if(countryAbbr === "MX")
            countryAbbrObj = _MX_States;

        let KMLinfoArr = await fetch(`https://api.github.com/repos/WazeDev/WME-Cities-Overlay/contents/KMLs/${countryAbbr}`);
        KMLinfoArr = $.parseJSON(KMLinfoArr);
        let state;
        for(let i=0; i<keys.length; i++){
            state = keys[i];

            for(let j=0; j<KMLinfoArr.length; j++){
                if(KMLinfoArr[j].name === `${state}_Cities.kml`){ //check the size in db against server - if different, update db
                    let stateObj = await idbKeyval.get(`${countryAbbr}_states_cities`, state);

                    if(stateObj.kmlsize !== KMLinfoArr[j].size){
                        let kml = await fetch(`https://raw.githubusercontent.com/${repoOwner}/WME-Cities-Overlay/master/KMLs/${countryAbbr}/${state}_Cities.kml`);

                        if(state === countryAbbrObj.getAbbreviation(currState))
                            _kml = kml;

                        await idbKeyval.set(`${countryAbbr}_states_cities`, {
                            kml: kml,
                            state: state,
                            kmlsize: KMLinfoArr[j].size
                        });
                        if(kmlCache[state] != null)
                            kmlCache[state] = _kml;
                        if(updatedStates != "")
                            updatedStates += `, ${state}`;
                        else
                            updatedStates += state;
                        updatedCount+=1;
                    }
                    break;
                }
            }
        }
        if(updatedCount > 0)
            $('#WMECOupdateStatus').text(`${updatedCount} state file${updatedCount >1 ? "s" : ""} updated - ${updatedStates}`);
        else
            $('#WMECOupdateStatus').text("No updates available");

        updatePolygons();
    }

    /*function toggleAreaFill() {
        var text = $('#wmecitiesoverlay span').text();
        if (text) {
            var match = text.match(/WV-(\d+)/);
            if (match.length > 1) {
                var group = parseInt(match[1]);
                var f = _layer.features[group-1];
                var hide = f.attributes.fillOpacity !== 0;
                f.attributes.fillOpacity = hide ? 0 : defaultFillOpacity;
                var idx = _settings.hiddenAreas.indexOf(group);
                if (hide) {
                    if (idx === -1) _settings.hiddenAreas.push(group);
                } else {
                    if (idx > -1) {
                        _settings.hiddenAreas.splice(idx,1);
                    }
                }
                //saveSettingsToStorage();
                _layer.redraw();
            }
        }
    }*/

    function init() {
        _US_States = {
            Alabama:"AL", Alaska:"AK", Arizona:"AZ", Arkansas:"AR", California:"CA", Colorado:"CO", Connecticut:"CT",
            "District of Columbia":"DC", Delaware:"DE", Florida:"FL", Georgia:"GA", Hawaii:"HI", Idaho:"ID", Illinois:"IL", Indiana:"IN",
            Iowa:"IA", Kansas:"KS", Kentucky:"KY", Louisiana:"LA", Maine:"ME", Maryland:"MD", Massachusetts:"MA",
            Michigan:"MI", Minnesota:"MN", Mississippi:"MS", Missouri:"MO", Montana:"MT", Nebraska:"NE", Nevada:"NV", "New Hampshire":"NH",
            "New Jersey":"NJ", "New Mexico":"NM", "New York":"NY", "North Carolina":"NC", "North Dakota":"ND", Ohio:"OH", Oklahoma:"OK", Oregon:"OR", Pennsylvania:"PA",
            "Rhode Island":"RI", "South Carolina":"SC", "South Dakota":"SD", Tennessee:"TN", Texas:"TX", Utah:"UT",
            Vermont:"VT", Virginia:"VA", Washington:"WA", "West Virginia":"WV", Wisconsin:"WI", Wyoming:"WY",
            getAbbreviation: function(state) { return this[state];},
            getStateFromAbbr: function(abbr) { return Object.entries(_US_States).filter(x => {if(x[1] == abbr) return x})[0][0];},
            getStatesArray: function() { return Object.keys(_US_States).filter(x => {if(typeof _US_States[x] !== "function") return x;});},
            getStateAbbrArray: function() { return Object.values(_US_States).filter(x => {if(typeof x !== "function") return x;});}
        };

        _MX_States = {
        Aguascalientes:"AGS", "Baja California":"BC", "Baja California Sur":"BCS",Campeche:"CAM", "Coahuila de Zaragoza":"COAH", Colima:"COL",
            Chiapas:"CHIS", Durango:"DGO", "Ciudad de México":"CDMX", "Guanajuato":"GTO", Guerrero:"GRO", Hidalgo:"HGO", Jalisco:"JAL",
            "Estado de México":"EM", "Michoacán de Ocampo":"MICH", Morelos:"MOR", Nayarit:"NAY", "Nuevo León":"NL", Oaxaca:"OAX", Puebla:"PUE",
            "Quintana Roo":"QROO", "Querétaro":"QRO", "San Luis Potosí":"SLP", Sinaloa:"SIN", Sonora:"SON", Tabasco:"TAB", Tamaulipas:"TAM", Tlaxcala:"TLAX",
            "Veracruz Ignacio de la Llave":"VER", "Yucatán":"YUC", "Zacatecas":"ZAC",
            getAbbreviation: function(state) { return this[state];},
            getStateFromAbbr: function(abbr) { return Object.entries(_MX_States).filter(x => {if(x[1] == abbr) return x})[0][0];},
            getStatesArray: function() { return Object.keys(_MX_States).filter(x => {if(typeof _MX_States[x] !== "function") return x;});},
            getStateAbbrArray: function() { return Object.values(_MX_States).filter(x => {if(typeof x !== "function") return x;});}};

        loadSettings();

        var layerid = 'wme_cities_overlay';
        var layerStyle = new OpenLayers.StyleMap({
            strokeDashstyle: 'solid', strokeColor: _color,
            strokeOpacity: _settings.FillPolygons ? defaultStrokeOpacity : noFillStrokeOpacity,
            strokeWidth: 2,
            fillOpacity: _settings.FillPolygons ? defaultFillOpacity : 0,
            fillColor: _color,fontColor: '#ffffff',
            label : "${labelText}", labelOutlineColor: '#000000',
            labelOutlineWidth: 4, labelAlign: 'cm',
            fontSize: "16px"
        });

        _layer = new OpenLayers.Layer.Vector("Cities Overlay", {
            rendererOptions: { zIndexing: true },
            uniqueName: layerid,
            shortcutKey: "S+" + 0,
            layerGroup: 'cities_overlay',
            zIndex: -9999,
            displayInLayerSwitcher: true,
            visibility: _settings.layerVisible,
            styleMap: layerStyle
        });
        I18n.translations[I18n.locale].layers.name[layerid] = "Cities Overlay";
        W.map.addLayer(_layer);
        if(_settings.layerVisible) //"reusing" this setting - should have set it up to enable/disable the moveend handler from the start instead of just hiding the layer. Durp
            W.map.events.register("moveend", null, updateCitiesLayer);

        if(!_settings.ShowCityLabels)
            _layer.styleMap.styles.default.defaultStyle.label = "";

        updateCitiesLayer();
        // Add the layer checkbox to the Layers menu.
        WazeWrap.Interface.AddLayerCheckbox("display", "Cities Overlay", _settings.layerVisible, layerToggled);

        var $section = $("<div>", {style:"padding:8px 16px", id:"WMECitiesOverlaySettings"});
        $section.html([
            `<h4 style="margin-bottom:0px;"><i id="citiesPower" class="fa fa-power-off" aria-hidden="true" style="color:${_settings.layerVisible ? 'rgb(0,180,0)' : 'black'}; cursor:pointer;"></i> <b>WME Cities Overlay</b></h4>`,
            `<h6 style="margin-top:0px;">${GM_info.script.version}</h6>`,
            '<div id="divWMECOFillPolygons"><input type="checkbox" id="_cbCOFillPolygons" class="wmecoSettingsCheckbox" /><label for="_cbCOFillPolygons">Fill polygons</label></div>',
            '<div id="divWMECOShowCityLabels"><input type="checkbox" id="_cbCOShowCityLabels" class="wmecoSettingsCheckbox" /><label for="_cbCOShowCityLabels">Show city labels</label></div>',
            '<div id="divWMECOHighlightFocusedCity"><input type="checkbox" id="_cbCOHighlightFocusedCity" class="wmecoSettingsCheckbox" /><label for="_cbCOHighlightFocusedCity">Highlight focused city</label></div>',
            '<fieldset id="fieldUpdates" style="border: 1px solid silver; padding: 8px; border-radius: 4px;">',
            '<legend style="margin-bottom:0px; border-bottom-style:none;width:auto;"><h4>Update Settings</h4></legend>',
            '<div id="divWMECOUpdateMaps" title="Checks for new state files for the current country"><button id="WMECOupdateMaps" type="button">Update database</button></div>',
            '<div id="WMECOupdateStatus"></div>',
            '<div id="divWMECOAutoUpdateKMLs" title="Checks for updated state files for the current country when WME loads"><input type="checkbox" id="_cbCOAutoUpdateKMLs" class="wmecoSettingsCheckbox" /><label for="_cbCOAutoUpdateKMLs">Automatically update database</label></div>','</fieldset>',
            '</div>'
        ].join(' '));

        new WazeWrap.Interface.Tab('Cities', $section.html(), init2);
    }

    function init2(){
        $('.wmecoSettingsCheckbox').change(function() {
             var settingName = $(this)[0].id.substr(5);
            _settings[settingName] = this.checked;
            saveSettings();
        });

        setChecked('_cbCOShowCityLabels', _settings.ShowCityLabels);
        setChecked('_cbCOFillPolygons', _settings.FillPolygons);
        setChecked('_cbCOHighlightFocusedCity', _settings.HighlightFocusedCity);
        setChecked('_cbCOAutoUpdateKMLs', _settings.AutoUpdateKMLs);

        $('#citiesPower').click(function(){
            _settings.layerVisible = !_settings.layerVisible;
            layerToggled(_settings.layerVisible);
            if(_settings.layerVisible)
                W.map.events.register("moveend", null, updateCitiesLayer);
            else
                W.map.events.unregister("moveend", null, updateCitiesLayer);
        });

        $('#WMECOupdateMaps').click(updateAllMaps);

        $('#_cbCOFillPolygons').change(function(){
            _layer.styleMap.styles.default.defaultStyle.fillOpacity = this.checked ? defaultFillOpacity : 0;
            _layer.styleMap.styles.default.defaultStyle.strokeOpacity = this.checked ? defaultStrokeOpacity : noFillStrokeOpacity;
            _layer.redraw();
        });

        $('#_cbCOShowCityLabels').change(function(){
            _layer.styleMap.styles.default.defaultStyle.label = this.checked ? "${labelText}" : "";
            _layer.redraw();
        });

        $('#_cbCOHighlightFocusedCity').change(function(){
            if(this.checked){
                insertHighlightingRules();
            }
            else{
                let index = _layer.styleMap.styles.default.rules.findIndex(function(e){ return e.name == "WMECOHighlightCurr";});
                if(index > -1)
                    _layer.styleMap.styles.default.rules.splice(index, 1);

                index = _layer.styleMap.styles.default.rules.findIndex(function(e){ return e.name == "WMECONoHighlight";});
                if(index > -1)
                    _layer.styleMap.styles.default.rules.splice(index, 1);
                _layer.redraw();
            }
        });

        currCity = findCurrCity();

        if(_settings.HighlightFocusedCity)
            insertHighlightingRules();

        if(_settings.layerVisible && _settings.AutoUpdateKMLs)
            updateAllMaps();
    }

    function insertHighlightingRules(){
        //********** Highlighting Rules ***********
        let myRule = new W.Rule({
            filter: new OpenLayers.Filter.Comparison({
                type: '==',
                evaluate: function(cityFeature) {
                    return cityFeature.attributes.name === currCity;
                }
            }),
            symbolizer: {
                strokeColor: '#f7ad25',
                fillColor: '#f7ad25'
            },
            name: "WMECOHighlightCurr"
        });
        let myRule2 = new W.Rule({
            filter: new OpenLayers.Filter.Comparison({
                type: '!=',
                evaluate: function(cityFeature) {
                    return cityFeature.attributes.name != currCity;
                }
            }),
            symbolizer: {
                strokeColor: _color,
                fillColor: _color
            },
            name: "WMECONoHighlight"
        });
        _layer.styleMap.styles['default'].rules.push(myRule);
        _layer.styleMap.styles['default'].rules.push(myRule2);
        _layer.redraw();
    }

    function layerToggled(visible) {
        _settings.layerVisible = visible;
        _layer.setVisibility(visible);
        if(visible){
            $('#citiesPower').css("color", "rgb(0,180,0)");
            W.map.events.register("moveend", null, updateCitiesLayer);
        }
        else{
            $('#citiesPower').css("color", "black");
            W.map.events.unregister("moveend", null, updateCitiesLayer);
        }
        saveSettings();
    }

    async function updateCityPolygons(){
        if(currState != W.model.states.top.name)
        {
            _layer.destroyFeatures();
            currState = W.model.states.top.name;
            let countryAbbr = W.model.countries.top.abbr;
            let stateAbbr;

            if(countryAbbr === "US")
                stateAbbr = _US_States.getAbbreviation(currState);
            else if(countryAbbr === "MX")
                stateAbbr = _MX_States.getAbbreviation(currState);

            if(typeof stateAbbr !== "undefined"){
                if(typeof kmlCache[stateAbbr] == 'undefined'){
                    //get the current state info from the store.
                    var request = await idbKeyval.get(`${countryAbbr}_states_cities`, stateAbbr);

                    //if the store didn't have the state, look it up from github and enter it in the store
                    if(!request){
                        let kml = await fetch(`https://raw.githubusercontent.com/${repoOwner}/WME-Cities-Overlay/master/KMLs/${countryAbbr}/${stateAbbr}_Cities.kml`);
                        _kml = kml;
                        updatePolygons();

                        await idbKeyval.set(`${countryAbbr}_states_cities`, {
                            kml: kml,
                            state: stateAbbr,
                            kmlsize: 0
                        });
                        kmlCache[stateAbbr] = _kml; //keep a local cache so we don't have to hit the indexeddb repeatedly if the user crosses state lines multiple times
                    }
                    else{
                        _kml = request.kml;
                        kmlCache[stateAbbr] = _kml;//keep a local cache so we don't have to hit the indexeddb repeatedly if the user crosses state lines multiple times
                        updatePolygons();
                    }
                }
                else{
                    _kml = kmlCache[stateAbbr];
                    updatePolygons();
                }
            }
        }
    }

    function updatePolygons(){
        var _features = GetFeaturesFromKMLString(_kml);
        _layer.destroyFeatures();
        for(let i=0; i< _features.length; i++){
            _features[i].attributes.name = _features[i].attributes.name.replace('<at><openparen>', '').replace('<closeparen>','');
            _features[i].attributes.labelText = _features[i].attributes.name;
        }

        _layer.addFeatures(_features);
    }

    function bootstrap(tries = 1) {
        if (W && W.loginManager && W.loginManager.user && W.model.states.top && WazeWrap.Ready) {
            init();
            console.log('WME Cities Overlay:', 'Initialized');
        } else if(tries < 1000){
            console.log('WME Cities Overlay: ', 'Bootstrap failed.  Trying again...');
            window.setTimeout(() => bootstrap(tries++), 100);
        }
    }

    bootstrap();
})();
