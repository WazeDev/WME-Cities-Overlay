// ==UserScript==
// @name         WME Cities Overlay
// @namespace    https://greasyfork.org/users/45389
// @version      2018.04.30.01
// @description  Adds a city overlay for selected states
// @author       WazeDev
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @license      GNU GPLv3
// @grant        none
// ==/UserScript==

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

    let currState = "";
    let currCity = "";
    let States = {};
    let kmlCache = {};

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
            FillPolygons: true
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
                HighlightFocusedCity: _settings.HighlightFocusedCity
            };
            localStorage.setItem(_settingsStoreName, JSON.stringify(settings));
        }
    }

    function GetFeaturesFromKMLString(strKML) {
        var format = new OpenLayers.Format.KML({
            'internalProjection': Waze.map.baseLayer.projection,
            'externalProjection': new OpenLayers.Projection("EPSG:4326")
        });
        return format.read(strKML);
    }

    function findCurrCity(){
        let newCity = "";
        var mapCenter = new OpenLayers.Geometry.Point(W.map.center.lon,W.map.center.lat);
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
                    var $div = $('<div>', {id:'wmecitiesoverlay', class:"wmecitiesoverlay-region", style:'display:inline-block;margin-left:10px;'})//, title:'Click to toggle color on/off for this group'})
                    .css({color:color, cursor:"pointer"});
                    //.click(toggleAreaFill);
                    var $span = $('<span>').css({display:'inline-block'});
                    $span.text(currCity).appendTo($div);
                    $('.location-info-region').parent().append($div);
                }
            }
        }
        else
            _layer.destroyFeatures();
    }

    function pointInFeature(geometry, mapCenter){
        if(geometry.CLASS_NAME == "OpenLayers.Geometry.Collection"){
            for(let i=0; i<geometry.components.length; i++){
                if(geometry.components[i].containsPoint(mapCenter))
                    return true;
            }
        }
        else
            return geometry.containsPoint(mapCenter);
        return false;
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
        States = {
            Alabama:"AL", Alaska:"AK", Arizona:"AZ", Arkansas:"AR", California:"CA", Colorado:"CO", Connecticut:"CT",
            "District of Columbia":"DC", Delaware:"DE", Florida:"FL", Georgia:"GA", Hawaii:"HI", Idaho:"ID", Illinois:"IL", Indiana:"IN",
            Iowa:"IA", Kansas:"KS", Kentucky:"KY", Louisiana:"LA", Maine:"ME", Maryland:"MD", Massachusetts:"MA",
            Michigan:"MI", Minnesota:"MN", Mississippi:"MS", Missouri:"MO", Montana:"MT", Nebraska:"NE", Nevada:"NV", "New Hampshire":"NH",
            "New Jersey":"NJ", "New Mexico":"NM", "New York":"NY", "North Carolina":"NC", "North Dakota":"ND", Ohio:"OH", Oklahoma:"OK", Oregon:"OR", Pennsylvania:"PA",
            "Rhode Island":"RI", "South Carolina":"SC", "South Dakota":"SD", Tennessee:"TN", Texas:"TX", Utah:"UT",
            Vermont:"VT", Virginia:"VA", Washington:"WA", "West Virginia":"WV", Wisconsin:"WI", Wyoming:"WY",
            getAbbreviation: function(state) { return this[state];},
            getStatesArray: function() { return Object.keys(States).filter(x => {if(typeof States[x] !== "function") return x;});},
            getStateAbbrArray: function() { return Object.values(States).filter(x => {if(typeof x !== "function") return x;});}
        };

        InstallKML();
        loadSettings();

        var layerid = 'wme_cities_overlay';
        var layerStyle = new OpenLayers.StyleMap({
            strokeDashstyle: 'solid',
            strokeColor: _color,
            strokeOpacity: _settings.FillPolygons ? defaultStrokeOpacity : noFillStrokeOpacity,
            strokeWidth: 2,
            fillOpacity: _settings.FillPolygons ? defaultFillOpacity : 0,
            fillColor: _color,
            fontColor: '#ffffff',
            label : "${labelText}",
            labelOutlineColor: '#000000',
            labelOutlineWidth: 4,
            labelAlign: 'cm',
            fontSize: "16px"
        });

        _layer = new OL.Layer.Vector("Cities Overlay", {
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
        W.map.events.register("moveend", null, updateCitiesLayer);

        if(!_settings.ShowCityLabels)
            _layer.styleMap.styles.default.defaultStyle.label = "";

        updateCitiesLayer();

        // Add the layer checkbox to the Layers menu.
        WazeWrap.Interface.AddLayerCheckbox("display", "Cities Overlay", _settings.layerVisible, layerToggled);

        var $section = $("<div>", {style:"padding:8px 16px", id:"WMECitiesOverlaySettings"});
        $section.html([
            '<h4 style="margin-bottom:0px;"><b>WME Cities Overlay</b></h4>',
            '<h6 style="margin-top:0px;">' + GM_info.script.version + '</h6>',
            '<div id="divWMECOFillPolygons"><input type="checkbox" id="_cbCOFillPolygons" class="wmecoSettingsCheckbox" /><label for="_cbCOFillPolygons">Fill polygons</label></div>',
            '<div id="divWMECOShowCityLabels"><input type="checkbox" id="_cbCOShowCityLabels" class="wmecoSettingsCheckbox" /><label for="_cbCOShowCityLabels">Show city labels</label></div>',
            '<div id="divWMECOHighlightFocusedCity"><input type="checkbox" id="_cbCOHighlightFocusedCity" class="wmecoSettingsCheckbox" /><label for="_cbCOHighlightFocusedCity">Highlight focused city</label></div>',
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
    }

    function insertHighlightingRules(){
        //********** Rules ***********
        let myRule = new W.Rule({
            filter: new OL.Filter.Comparison({
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
            filter: new OL.Filter.Comparison({
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
        _layer.setVisibility(visible);
        saveSettings();
    }

    function bootstrap(tries = 1) {
        if (W && W.loginManager && W.loginManager.isLoggedIn() && W.model.states.top && WazeWrap.Ready) {
            init();
            console.log('WME Cities Overlay:', 'Initialized');
        } else if(tries < 1000){
            console.log('WME Cities Overlay: ', 'Bootstrap failed.  Trying again...');
            window.setTimeout(() => bootstrap(tries++), 100);
        }
    }

    bootstrap();

    function InstallKML(){
        /* jshint ignore:start */
        OpenLayers.Format.KML=OpenLayers.Class(OpenLayers.Format.XML,{namespaces:{kml:"http://www.opengis.net/kml/2.2",gx:"http://www.google.com/kml/ext/2.2"},kmlns:"http://earth.google.com/kml/2.0",placemarksDesc:"No description available",foldersName:"OpenLayers export",foldersDesc:"Exported on "+new Date,extractAttributes:!0,kvpAttributes:!1,extractStyles:!1,extractTracks:!1,trackAttributes:null,internalns:null,features:null,styles:null,styleBaseUrl:"",fetched:null,maxDepth:0,initialize:function(a){this.regExes=
            {trimSpace:/^\s*|\s*$/g,removeSpace:/\s*/g,splitSpace:/\s+/,trimComma:/\s*,\s*/g,kmlColor:/(\w{2})(\w{2})(\w{2})(\w{2})/,kmlIconPalette:/root:\/\/icons\/palette-(\d+)(\.\w+)/,straightBracket:/\$\[(.*?)\]/g};this.externalProjection=new OpenLayers.Projection("EPSG:4326");OpenLayers.Format.XML.prototype.initialize.apply(this,[a])},read:function(a){this.features=[];this.styles={};this.fetched={};return this.parseData(a,{depth:0,styleBaseUrl:this.styleBaseUrl})},parseData:function(a,b){"string"==typeof a&&
                (a=OpenLayers.Format.XML.prototype.read.apply(this,[a]));for(var c=["Link","NetworkLink","Style","StyleMap","Placemark"],d=0,e=c.length;d<e;++d){var f=c[d],g=this.getElementsByTagNameNS(a,"*",f);if(0!=g.length)switch(f.toLowerCase()){case "link":case "networklink":this.parseLinks(g,b);break;case "style":this.extractStyles&&this.parseStyles(g,b);break;case "stylemap":this.extractStyles&&this.parseStyleMaps(g,b);break;case "placemark":this.parseFeatures(g,b)}}return this.features},parseLinks:function(a,
b){if(b.depth>=this.maxDepth)return!1;var c=OpenLayers.Util.extend({},b);c.depth++;for(var d=0,e=a.length;d<e;d++){var f=this.parseProperty(a[d],"*","href");f&&!this.fetched[f]&&(this.fetched[f]=!0,(f=this.fetchLink(f))&&this.parseData(f,c))}},fetchLink:function(a){if(a=OpenLayers.Request.GET({url:a,async:!1}))return a.responseText},parseStyles:function(a,b){for(var c=0,d=a.length;c<d;c++){var e=this.parseStyle(a[c]);e&&(this.styles[(b.styleBaseUrl||"")+"#"+e.id]=e)}},parseKmlColor:function(a){var b=
                null;a&&(a=a.match(this.regExes.kmlColor))&&(b={color:"#"+a[4]+a[3]+a[2],opacity:parseInt(a[1],16)/255});return b},parseStyle:function(a){for(var b={},c=["LineStyle","PolyStyle","IconStyle","BalloonStyle","LabelStyle"],d,e,f=0,g=c.length;f<g;++f)if(d=c[f],e=this.getElementsByTagNameNS(a,"*",d)[0])switch(d.toLowerCase()){case "linestyle":d=this.parseProperty(e,"*","color");if(d=this.parseKmlColor(d))b.strokeColor=d.color,b.strokeOpacity=d.opacity;(d=this.parseProperty(e,"*","width"))&&(b.strokeWidth=
d);break;case "polystyle":d=this.parseProperty(e,"*","color");if(d=this.parseKmlColor(d))b.fillOpacity=d.opacity,b.fillColor=d.color;"0"==this.parseProperty(e,"*","fill")&&(b.fillColor="none");"0"==this.parseProperty(e,"*","outline")&&(b.strokeWidth="0");break;case "iconstyle":var h=parseFloat(this.parseProperty(e,"*","scale")||1);d=32*h;var i=32*h,j=this.getElementsByTagNameNS(e,"*","Icon")[0];if(j){var k=this.parseProperty(j,"*","href");if(k){var l=this.parseProperty(j,"*","w"),m=this.parseProperty(j,
"*","h");OpenLayers.String.startsWith(k,"http://maps.google.com/mapfiles/kml")&&(!l&&!m)&&(m=l=64,h/=2);l=l||m;m=m||l;l&&(d=parseInt(l)*h);m&&(i=parseInt(m)*h);if(m=k.match(this.regExes.kmlIconPalette))l=m[1],m=m[2],k=this.parseProperty(j,"*","x"),j=this.parseProperty(j,"*","y"),k="http://maps.google.com/mapfiles/kml/pal"+l+"/icon"+(8*(j?7-j/32:7)+(k?k/32:0))+m;b.graphicOpacity=1;b.externalGraphic=k}}if(e=this.getElementsByTagNameNS(e,"*","hotSpot")[0])k=parseFloat(e.getAttribute("x")),j=parseFloat(e.getAttribute("y")),
                    l=e.getAttribute("xunits"),"pixels"==l?b.graphicXOffset=-k*h:"insetPixels"==l?b.graphicXOffset=-d+k*h:"fraction"==l&&(b.graphicXOffset=-d*k),e=e.getAttribute("yunits"),"pixels"==e?b.graphicYOffset=-i+j*h+1:"insetPixels"==e?b.graphicYOffset=-(j*h)+1:"fraction"==e&&(b.graphicYOffset=-i*(1-j)+1);b.graphicWidth=d;b.graphicHeight=i;break;case "balloonstyle":(e=OpenLayers.Util.getXmlNodeValue(e))&&(b.balloonStyle=e.replace(this.regExes.straightBracket,"${$1}"));break;case "labelstyle":if(d=this.parseProperty(e,
"*","color"),d=this.parseKmlColor(d))b.fontColor=d.color,b.fontOpacity=d.opacity}!b.strokeColor&&b.fillColor&&(b.strokeColor=b.fillColor);if((a=a.getAttribute("id"))&&b)b.id=a;return b},parseStyleMaps:function(a,b){for(var c=0,d=a.length;c<d;c++)for(var e=a[c],f=this.getElementsByTagNameNS(e,"*","Pair"),e=e.getAttribute("id"),g=0,h=f.length;g<h;g++){var i=f[g],j=this.parseProperty(i,"*","key");(i=this.parseProperty(i,"*","styleUrl"))&&"normal"==j&&(this.styles[(b.styleBaseUrl||"")+"#"+e]=this.styles[(b.styleBaseUrl||
"")+i])}},parseFeatures:function(a,b){for(var c=[],d=0,e=a.length;d<e;d++){var f=a[d],g=this.parseFeature.apply(this,[f]);if(g){this.extractStyles&&(g.attributes&&g.attributes.styleUrl)&&(g.style=this.getStyle(g.attributes.styleUrl,b));if(this.extractStyles){var h=this.getElementsByTagNameNS(f,"*","Style")[0];if(h&&(h=this.parseStyle(h)))g.style=OpenLayers.Util.extend(g.style,h)}if(this.extractTracks){if((f=this.getElementsByTagNameNS(f,this.namespaces.gx,"Track"))&&0<f.length)g={features:[],feature:g},
                    this.readNode(f[0],g),0<g.features.length&&c.push.apply(c,g.features)}else c.push(g)}else throw"Bad Placemark: "+d;}this.features=this.features.concat(c)},readers:{kml:{when:function(a,b){b.whens.push(OpenLayers.Date.parse(this.getChildValue(a)))},_trackPointAttribute:function(a,b){var c=a.nodeName.split(":").pop();b.attributes[c].push(this.getChildValue(a))}},gx:{Track:function(a,b){var c={whens:[],points:[],angles:[]};if(this.trackAttributes){var d;c.attributes={};for(var e=0,f=this.trackAttributes.length;e<
f;++e)d=this.trackAttributes[e],c.attributes[d]=[],d in this.readers.kml||(this.readers.kml[d]=this.readers.kml._trackPointAttribute)}this.readChildNodes(a,c);if(c.whens.length!==c.points.length)throw Error("gx:Track with unequal number of when ("+c.whens.length+") and gx:coord ("+c.points.length+") elements.");var g=0<c.angles.length;if(g&&c.whens.length!==c.angles.length)throw Error("gx:Track with unequal number of when ("+c.whens.length+") and gx:angles ("+c.angles.length+") elements.");for(var h,
i,e=0,f=c.whens.length;e<f;++e){h=b.feature.clone();h.fid=b.feature.fid||b.feature.id;i=c.points[e];h.geometry=i;"z"in i&&(h.attributes.altitude=i.z);this.internalProjection&&this.externalProjection&&h.geometry.transform(this.externalProjection,this.internalProjection);if(this.trackAttributes){i=0;for(var j=this.trackAttributes.length;i<j;++i)h.attributes[d]=c.attributes[this.trackAttributes[i]][e]}h.attributes.when=c.whens[e];h.attributes.trackId=b.feature.id;g&&(i=c.angles[e],h.attributes.heading=
parseFloat(i[0]),h.attributes.tilt=parseFloat(i[1]),h.attributes.roll=parseFloat(i[2]));b.features.push(h)}},coord:function(a,b){var c=this.getChildValue(a).replace(this.regExes.trimSpace,"").split(/\s+/),d=new OpenLayers.Geometry.Point(c[0],c[1]);2<c.length&&(d.z=parseFloat(c[2]));b.points.push(d)},angles:function(a,b){var c=this.getChildValue(a).replace(this.regExes.trimSpace,"").split(/\s+/);b.angles.push(c)}}},parseFeature:function(a){for(var b=["MultiGeometry","Polygon","LineString","Point"],
c,d,e,f=0,g=b.length;f<g;++f)if(c=b[f],this.internalns=a.namespaceURI?a.namespaceURI:this.kmlns,d=this.getElementsByTagNameNS(a,this.internalns,c),0<d.length){if(b=this.parseGeometry[c.toLowerCase()])e=b.apply(this,[d[0]]),this.internalProjection&&this.externalProjection&&e.transform(this.externalProjection,this.internalProjection);else throw new TypeError("Unsupported geometry type: "+c);break}var h;this.extractAttributes&&(h=this.parseAttributes(a));c=new OpenLayers.Feature.Vector(e,h);a=a.getAttribute("id")||
                    a.getAttribute("name");null!=a&&(c.fid=a);return c},getStyle:function(a,b){var c=OpenLayers.Util.removeTail(a),d=OpenLayers.Util.extend({},b);d.depth++;d.styleBaseUrl=c;!this.styles[a]&&!OpenLayers.String.startsWith(a,"#")&&d.depth<=this.maxDepth&&!this.fetched[c]&&(c=this.fetchLink(c))&&this.parseData(c,d);return OpenLayers.Util.extend({},this.styles[a])},parseGeometry:{point:function(a){var b=this.getElementsByTagNameNS(a,this.internalns,"coordinates"),a=[];if(0<b.length)var c=b[0].firstChild.nodeValue,
                    c=c.replace(this.regExes.removeSpace,""),a=c.split(",");b=null;if(1<a.length)2==a.length&&(a[2]=null),b=new OpenLayers.Geometry.Point(a[0],a[1],a[2]);else throw"Bad coordinate string: "+c;return b},linestring:function(a,b){var c=this.getElementsByTagNameNS(a,this.internalns,"coordinates"),d=null;if(0<c.length){for(var c=this.getChildValue(c[0]),c=c.replace(this.regExes.trimSpace,""),c=c.replace(this.regExes.trimComma,","),d=c.split(this.regExes.splitSpace),e=d.length,f=Array(e),g,h,i=0;i<e;++i)if(g=
d[i].split(","),h=g.length,1<h)2==g.length&&(g[2]=null),f[i]=new OpenLayers.Geometry.Point(g[0],g[1],g[2]);else throw"Bad LineString point coordinates: "+d[i];if(e)d=b?new OpenLayers.Geometry.LinearRing(f):new OpenLayers.Geometry.LineString(f);else throw"Bad LineString coordinates: "+c;}return d},polygon:function(a){var a=this.getElementsByTagNameNS(a,this.internalns,"LinearRing"),b=a.length,c=Array(b);if(0<b)for(var d=0,e=a.length;d<e;++d)if(b=this.parseGeometry.linestring.apply(this,[a[d],!0]))c[d]=
                        b;else throw"Bad LinearRing geometry: "+d;return new OpenLayers.Geometry.Polygon(c)},multigeometry:function(a){for(var b,c=[],d=a.childNodes,e=0,f=d.length;e<f;++e)a=d[e],1==a.nodeType&&(b=this.parseGeometry[(a.prefix?a.nodeName.split(":")[1]:a.nodeName).toLowerCase()])&&c.push(b.apply(this,[a]));return new OpenLayers.Geometry.Collection(c)}},parseAttributes:function(a){var b={},c=a.getElementsByTagName("ExtendedData");c.length&&(b=this.parseExtendedData(c[0]));for(var d,e,f,a=a.childNodes,c=0,g=
a.length;c<g;++c)if(d=a[c],1==d.nodeType&&(e=d.childNodes,1<=e.length&&3>=e.length)){switch(e.length){case 1:f=e[0];break;case 2:f=e[0];e=e[1];f=3==f.nodeType||4==f.nodeType?f:e;break;default:f=e[1]}if(3==f.nodeType||4==f.nodeType)if(d=d.prefix?d.nodeName.split(":")[1]:d.nodeName,f=OpenLayers.Util.getXmlNodeValue(f))f=f.replace(this.regExes.trimSpace,""),b[d]=f}return b},parseExtendedData:function(a){var b={},c,d,e,f,g=a.getElementsByTagName("Data");c=0;for(d=g.length;c<d;c++){e=g[c];f=e.getAttribute("name");
var h={},i=e.getElementsByTagName("value");i.length&&(h.value=this.getChildValue(i[0]));this.kvpAttributes?b[f]=h.value:(e=e.getElementsByTagName("displayName"),e.length&&(h.displayName=this.getChildValue(e[0])),b[f]=h)}a=a.getElementsByTagName("SimpleData");c=0;for(d=a.length;c<d;c++)h={},e=a[c],f=e.getAttribute("name"),h.value=this.getChildValue(e),this.kvpAttributes?b[f]=h.value:(h.displayName=f,b[f]=h);return b},parseProperty:function(a,b,c){var d,a=this.getElementsByTagNameNS(a,b,c);try{d=OpenLayers.Util.getXmlNodeValue(a[0])}catch(e){d=
    null}return d},write:function(a){OpenLayers.Util.isArray(a)||(a=[a]);for(var b=this.createElementNS(this.kmlns,"kml"),c=this.createFolderXML(),d=0,e=a.length;d<e;++d)c.appendChild(this.createPlacemarkXML(a[d]));b.appendChild(c);return OpenLayers.Format.XML.prototype.write.apply(this,[b])},createFolderXML:function(){var a=this.createElementNS(this.kmlns,"Folder");if(this.foldersName){var b=this.createElementNS(this.kmlns,"name"),c=this.createTextNode(this.foldersName);b.appendChild(c);a.appendChild(b)}this.foldersDesc&&
        (b=this.createElementNS(this.kmlns,"description"),c=this.createTextNode(this.foldersDesc),b.appendChild(c),a.appendChild(b));return a},createPlacemarkXML:function(a){var b=this.createElementNS(this.kmlns,"name");b.appendChild(this.createTextNode(a.style&&a.style.label?a.style.label:a.attributes.name||a.id));var c=this.createElementNS(this.kmlns,"description");c.appendChild(this.createTextNode(a.attributes.description||this.placemarksDesc));var d=this.createElementNS(this.kmlns,"Placemark");null!=
        a.fid&&d.setAttribute("id",a.fid);d.appendChild(b);d.appendChild(c);b=this.buildGeometryNode(a.geometry);d.appendChild(b);a.attributes&&(a=this.buildExtendedData(a.attributes))&&d.appendChild(a);return d},buildGeometryNode:function(a){var b=a.CLASS_NAME,b=this.buildGeometry[b.substring(b.lastIndexOf(".")+1).toLowerCase()],c=null;b&&(c=b.apply(this,[a]));return c},buildGeometry:{point:function(a){var b=this.createElementNS(this.kmlns,"Point");b.appendChild(this.buildCoordinatesNode(a));return b},multipoint:function(a){return this.buildGeometry.collection.apply(this,
[a])},linestring:function(a){var b=this.createElementNS(this.kmlns,"LineString");b.appendChild(this.buildCoordinatesNode(a));return b},multilinestring:function(a){return this.buildGeometry.collection.apply(this,[a])},linearring:function(a){var b=this.createElementNS(this.kmlns,"LinearRing");b.appendChild(this.buildCoordinatesNode(a));return b},polygon:function(a){for(var b=this.createElementNS(this.kmlns,"Polygon"),a=a.components,c,d,e=0,f=a.length;e<f;++e)c=0==e?"outerBoundaryIs":"innerBoundaryIs",
        c=this.createElementNS(this.kmlns,c),d=this.buildGeometry.linearring.apply(this,[a[e]]),c.appendChild(d),b.appendChild(c);return b},multipolygon:function(a){return this.buildGeometry.collection.apply(this,[a])},collection:function(a){for(var b=this.createElementNS(this.kmlns,"MultiGeometry"),c,d=0,e=a.components.length;d<e;++d)(c=this.buildGeometryNode.apply(this,[a.components[d]]))&&b.appendChild(c);return b}},buildCoordinatesNode:function(a){var b=this.createElementNS(this.kmlns,"coordinates"),
        c;if(c=a.components){for(var d=c.length,e=Array(d),f=0;f<d;++f)a=c[f],e[f]=this.buildCoordinates(a);c=e.join(" ")}else c=this.buildCoordinates(a);c=this.createTextNode(c);b.appendChild(c);return b},buildCoordinates:function(a){this.internalProjection&&this.externalProjection&&(a=a.clone(),a.transform(this.internalProjection,this.externalProjection));return a.x+","+a.y},buildExtendedData:function(a){var b=this.createElementNS(this.kmlns,"ExtendedData"),c;for(c in a)if(a[c]&&"name"!=c&&"description"!=
c&&"styleUrl"!=c){var d=this.createElementNS(this.kmlns,"Data");d.setAttribute("name",c);var e=this.createElementNS(this.kmlns,"value");if("object"==typeof a[c]){if(a[c].value&&e.appendChild(this.createTextNode(a[c].value)),a[c].displayName){var f=this.createElementNS(this.kmlns,"displayName");f.appendChild(this.getXMLDoc().createCDATASection(a[c].displayName));d.appendChild(f)}}else e.appendChild(this.createTextNode(a[c]));d.appendChild(e);b.appendChild(d)}return this.isSimpleContent(b)?null:b},
                                                                      CLASS_NAME:"OpenLayers.Format.KML"});
        /* jshint ignore:end */
    }

    function updateCityPolygons(){
        if(currState != W.model.states.top.name)
        {
            _layer.destroyFeatures();
            currState = W.model.states.top.name;

            let stateAbbr = States.getAbbreviation(currState);

            if(typeof stateAbbr !== "undefined"){
                if(typeof kmlCache[stateAbbr] == 'undefined'){
                    return $.get(`https://raw.githubusercontent.com/WazeDev/WME-Cities-Overlay/master/KMLs/${stateAbbr}_Cities.kml`, function(kml){
                        _kml = kml;
                        updatePolygons();
                    });
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
})();
