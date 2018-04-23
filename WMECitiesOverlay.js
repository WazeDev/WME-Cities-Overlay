// ==UserScript==
// @name         WME Cities Overlay
// @namespace    https://greasyfork.org/users/45389
// @version      2018.04.20.01
// @description  Adds a city overlay for selected states
// @author       WazeDev
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @license      GNU GPLv3
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var _color = '#7cb342';
    var _settingsStoreName = '_wme_cities';
    var _settings;
    var _features;
    var _kml;
    var _layerName = 'Cities Overlay';
    var _layer = null;
    var defaultFillOpacity = 0.3;

    function loadSettingsFromStorage() {
        _settings = $.parseJSON(localStorage.getItem(_settingsStoreName));
        if(!_settings) {
            _settings = {
                layerVisible: true
                //hiddenAreas: []
            };
        } else {
            _settings.layerVisible = (_settings.layerVisible === true);
            //_settings.hiddenAreas = _settings.hiddenAreas || [];
        }
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            var settings = {
                layerVisible: _layer.visibility
                //hiddenAreas: _settings.hiddenAreas
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

    function updateDistrictNameDisplay(){
        $('.wmecitiesoverlay-region').remove();
        if (_layer !== null) {
            var mapCenter = new OpenLayers.Geometry.Point(W.map.center.lon,W.map.center.lat);
            for (var i=0;i<_layer.features.length;i++){
                var feature = _layer.features[i];
                var color;
                var text = '';
                var num;
                var url;
                if(feature.geometry.containsPoint(mapCenter)) {
                    text = feature.attributes.name;
                    color = '#00ffff';
                    var $div = $('<div>', {id:'wmecitiesoverlay', class:"wmecitiesoverlay-region", style:'display:inline-block;margin-left:10px;', title:'Click to toggle color on/off for this group'})
                    .css({color:color, cursor:"pointer"})
                    .click(toggleAreaFill);
                    var $span = $('<span>').css({display:'inline-block'});
                    $span.text(text).appendTo($div);
                    $('.location-info-region').parent().append($div);
                    if (color) {
                        break;
                    }
                }
            }
        }
    }

    function toggleAreaFill() {
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
    }

    function init() {
        InstallKML();
        loadSettingsFromStorage();
        var layerid = 'wme_cities';
        var _features = GetFeaturesFromKMLString(_kml);
        debugger;
        for(let i=0; i< _features.length; i++){
            _features[i].attributes.name = _features[i].attributes.name.replace('<at><openparen>', '').replace('<closeparen>','');
            _features[i].attributes.labelText = _features[i].attributes.name;
        }

        var layerStyle = new OpenLayers.StyleMap({
            strokeDashstyle: 'solid',
            strokeColor: '#E6E6E6',
            strokeOpacity: 0.4,
            strokeWidth: 2,
            fillOpacity: defaultFillOpacity,
            fillColor: '#E6E6E6', //'#7cb342',
            label : "${labelText}",
            fontColor: '#ffffff',
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
        _layer.addFeatures(_features);
        W.map.addLayer(_layer);
        W.map.events.register("moveend", null, updateDistrictNameDisplay);
        //window.addEventListener('beforeunload', function saveOnClose() { saveSettingsToStorage(); }, false);
        updateDistrictNameDisplay();

        // Add the layer checkbox to the Layers menu.
        WazeWrap.Interface.AddLayerCheckbox("display", "Cities Overlay", _settings.layerVisible, layerToggled);
    }

    function layerToggled(visible) {
        _layer.setVisibility(visible);
        saveSettingsToStorage();
    }

    function bootstrap() {
        if (W && W.loginManager && W.loginManager.isLoggedIn()) {
            init();
            console.log('WME Cities Overlay:', 'Initialized');
        } else {
            console.log('WME Cities Overlay: ', 'Bootstrap failed.  Trying again...');
            window.setTimeout(() => bootstrap(), 500);
        }
    }

    bootstrap();

    function InstallKML(){
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

        _kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:atom="http://www.w3.org/2005/Atom" xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>cb_2017_54_place_500k</name>
<visibility>1</visibility>
<Style id="KMLStyler">
<IconStyle>
<scale>0.8</scale>
</IconStyle>
<LabelStyle>
<scale>1.0</scale>
</LabelStyle>
<LineStyle>
<color>ffbc822f</color>
<width>2</width>
<gx:labelVisibility>0</gx:labelVisibility>
</LineStyle>
<PolyStyle>
<color>7fe1ca9e</color>
</PolyStyle>
</Style>
<Schema name="cb_2017_54_place_500k" id="kml_schema_ft_cb_2017_54_place_500k">
<SimpleField type="xsd:string" name="STATEFP">
<displayName>STATEFP</displayName>
</SimpleField>
<SimpleField type="xsd:string" name="PLACEFP">
<displayName>PLACEFP</displayName>
</SimpleField>
<SimpleField type="xsd:string" name="PLACENS">
<displayName>PLACENS</displayName>
</SimpleField>
<SimpleField type="xsd:string" name="AFFGEOID">
<displayName>AFFGEOID</displayName>
</SimpleField>
<SimpleField type="xsd:string" name="GEOID">
<displayName>GEOID</displayName>
</SimpleField>
<SimpleField type="xsd:string" name="NAME">
<displayName>NAME</displayName>
</SimpleField>
<SimpleField type="xsd:string" name="LSAD">
<displayName>LSAD</displayName>
</SimpleField>
<SimpleField type="xsd:double" name="ALAND">
<displayName>ALAND</displayName>
</SimpleField>
<SimpleField type="xsd:double" name="AWATER">
<displayName>AWATER</displayName>
</SimpleField>
</Schema>
<Folder id="kml_ft_cb_2017_54_place_500k">
<name>cb_2017_54_place_500k</name>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Accoville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>00196</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586752</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5400196</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5400196</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Accoville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>8458001</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>17676</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">00196</SimpleData>
<SimpleData name="PLACENS">02586752</SimpleData>
<SimpleData name="AFFGEOID">1600000US5400196</SimpleData>
<SimpleData name="GEOID">5400196</SimpleData>
<SimpleData name="NAME">Accoville</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">8458001</SimpleData>
<SimpleData name="AWATER">17676</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.86356,37.7798,0.0 -81.864066,37.778797,0.0 -81.863036,37.777611,0.0 -81.859055,37.776495,0.0 -81.854886,37.773551,0.0 -81.853004,37.774845,0.0 -81.849011,37.775872,0.0 -81.850925,37.765027,0.0 -81.847378,37.765661,0.0 -81.842222,37.762357,0.0 -81.84185,37.762945,0.0 -81.841866,37.763787,0.0 -81.840736,37.765238,0.0 -81.838089,37.766827,0.0 -81.821644,37.75926,0.0 -81.828926,37.747155,0.0 -81.82284,37.749471,0.0 -81.817844,37.750183,0.0 -81.816288,37.749989,0.0 -81.812931,37.748564,0.0 -81.807607,37.747722,0.0 -81.803922,37.748111,0.0 -81.80072,37.747096,0.0 -81.799735,37.752523,0.0 -81.799652,37.752848,0.0 -81.798312,37.753198,0.0 -81.800229,37.754857,0.0 -81.800754,37.757296,0.0 -81.800089,37.760951,0.0 -81.800649,37.766972,0.0 -81.802691,37.766582,0.0 -81.804809,37.767088,0.0 -81.807238,37.766907,0.0 -81.810444,37.767185,0.0 -81.827368,37.767178,0.0 -81.831565,37.771352,0.0 -81.831771,37.771503,0.0 -81.831186,37.771657,0.0 -81.830972,37.772136,0.0 -81.831581,37.773295,0.0 -81.83271,37.77513,0.0 -81.833658,37.776306,0.0 -81.834732,37.777146,0.0 -81.835348,37.777551,0.0 -81.837104,37.777907,0.0 -81.837171,37.778061,0.0 -81.839758,37.787526,0.0 -81.840923,37.78397,0.0 -81.843793,37.782952,0.0 -81.844941,37.783815,0.0 -81.846685,37.783715,0.0 -81.848074,37.782303,0.0 -81.850273,37.782262,0.0 -81.853927,37.783128,0.0 -81.853983,37.781032,0.0 -81.857223,37.780358,0.0 -81.859323,37.781086,0.0 -81.86356,37.7798,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Addison (Webster Springs)&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>00364</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390697</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5400364</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5400364</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Addison (Webster Springs)</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1163442</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>63190</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">00364</SimpleData>
<SimpleData name="PLACENS">02390697</SimpleData>
<SimpleData name="AFFGEOID">1600000US5400364</SimpleData>
<SimpleData name="GEOID">5400364</SimpleData>
<SimpleData name="NAME">Addison (Webster Springs)</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1163442</SimpleData>
<SimpleData name="AWATER">63190</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.417093,38.479823,0.0 -80.416319,38.478885,0.0 -80.413076,38.474224,0.0 -80.409281,38.472308,0.0 -80.406253,38.472512,0.0 -80.399177,38.479289,0.0 -80.398011,38.480131,0.0 -80.405344,38.482391,0.0 -80.410187,38.483314,0.0 -80.413388,38.482181,0.0 -80.416264,38.480191,0.0 -80.417093,38.479823,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Albright&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>00748</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390699</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5400748</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5400748</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Albright</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>600784</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>106870</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">00748</SimpleData>
<SimpleData name="PLACENS">02390699</SimpleData>
<SimpleData name="AFFGEOID">1600000US5400748</SimpleData>
<SimpleData name="GEOID">5400748</SimpleData>
<SimpleData name="NAME">Albright</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">600784</SimpleData>
<SimpleData name="AWATER">106870</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.64559,39.498684,0.0 -79.645545,39.493712,0.0 -79.645073,39.492612,0.0 -79.642356,39.491143,0.0 -79.639055,39.490214,0.0 -79.636295,39.489862,0.0 -79.634146,39.487798,0.0 -79.632294,39.488813,0.0 -79.632496,39.490465,0.0 -79.638306,39.495878,0.0 -79.641243,39.499107,0.0 -79.64559,39.498684,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Alderson&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>00772</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390700</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5400772</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5400772</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Alderson</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2307083</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>157686</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">00772</SimpleData>
<SimpleData name="PLACENS">02390700</SimpleData>
<SimpleData name="AFFGEOID">1600000US5400772</SimpleData>
<SimpleData name="GEOID">5400772</SimpleData>
<SimpleData name="NAME">Alderson</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2307083</SimpleData>
<SimpleData name="AWATER">157686</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.656258,37.72809,0.0 -80.657421,37.724551,0.0 -80.647447,37.72234,0.0 -80.646784,37.718915,0.0 -80.646232,37.718539,0.0 -80.644375,37.720335,0.0 -80.6367,37.722037,0.0 -80.636787,37.723369,0.0 -80.636628,37.724223,0.0 -80.633848,37.725432,0.0 -80.633024,37.726799,0.0 -80.630841,37.730847,0.0 -80.630975,37.73108,0.0 -80.639798,37.735579,0.0 -80.650615,37.731396,0.0 -80.650232,37.733157,0.0 -80.651979,37.733345,0.0 -80.652725,37.730371,0.0 -80.652431,37.729461,0.0 -80.656062,37.728701,0.0 -80.656258,37.72809,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Alum Creek&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>01396</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389129</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5401396</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5401396</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Alum Creek</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>26402754</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>178721</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">01396</SimpleData>
<SimpleData name="PLACENS">02389129</SimpleData>
<SimpleData name="AFFGEOID">1600000US5401396</SimpleData>
<SimpleData name="GEOID">5401396</SimpleData>
<SimpleData name="NAME">Alum Creek</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">26402754</SimpleData>
<SimpleData name="AWATER">178721</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.864874,38.266239,0.0 -81.867515,38.264123,0.0 -81.864029,38.263085,0.0 -81.860991,38.263137,0.0 -81.857109,38.26217,0.0 -81.854822,38.260339,0.0 -81.852185,38.254766,0.0 -81.850889,38.254663,0.0 -81.848088,38.255481,0.0 -81.844639,38.259572,0.0 -81.843228,38.260323,0.0 -81.837009,38.260582,0.0 -81.835159,38.261219,0.0 -81.832311,38.264515,0.0 -81.82623,38.267341,0.0 -81.824299,38.267954,0.0 -81.821463,38.267838,0.0 -81.817621,38.26577,0.0 -81.814527,38.264834,0.0 -81.81073,38.265327,0.0 -81.805239,38.267157,0.0 -81.807993,38.269143,0.0 -81.806344,38.270841,0.0 -81.802257,38.271347,0.0 -81.799686,38.272913,0.0 -81.799363,38.279129,0.0 -81.800063,38.281043,0.0 -81.801186,38.282382,0.0 -81.806754,38.286486,0.0 -81.806505,38.293711,0.0 -81.806745,38.294335,0.0 -81.808702,38.297464,0.0 -81.811961,38.300799,0.0 -81.812601,38.305119,0.0 -81.811593,38.308655,0.0 -81.812825,38.311407,0.0 -81.814329,38.312767,0.0 -81.816874,38.315759,0.0 -81.818234,38.316751,0.0 -81.830634,38.322526,0.0 -81.836646,38.320432,0.0 -81.839594,38.319038,0.0 -81.842906,38.314558,0.0 -81.843962,38.313726,0.0 -81.846627,38.31333,0.0 -81.84709,38.313351,0.0 -81.844052,38.31252,0.0 -81.844359,38.308869,0.0 -81.847154,38.30637,0.0 -81.84928,38.306631,0.0 -81.852459,38.30562,0.0 -81.856475,38.306528,0.0 -81.858071,38.3058,0.0 -81.860273,38.303224,0.0 -81.859991,38.300185,0.0 -81.858296,38.297403,0.0 -81.856718,38.293247,0.0 -81.857789,38.290346,0.0 -81.856938,38.288536,0.0 -81.857942,38.285044,0.0 -81.856489,38.28429,0.0 -81.855198,38.281382,0.0 -81.858573,38.279574,0.0 -81.860763,38.276361,0.0 -81.862792,38.27123,0.0 -81.861674,38.268368,0.0 -81.861802,38.267211,0.0 -81.863722,38.265971,0.0 -81.864874,38.266239,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Amherstdale&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>01660</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586753</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5401660</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5401660</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Amherstdale</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>7644705</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>45620</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">01660</SimpleData>
<SimpleData name="PLACENS">02586753</SimpleData>
<SimpleData name="AFFGEOID">1600000US5401660</SimpleData>
<SimpleData name="GEOID">5401660</SimpleData>
<SimpleData name="NAME">Amherstdale</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">7644705</SimpleData>
<SimpleData name="AWATER">45620</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.839758,37.787526,0.0 -81.837171,37.778061,0.0 -81.837104,37.777907,0.0 -81.835348,37.777551,0.0 -81.834732,37.777146,0.0 -81.833658,37.776306,0.0 -81.83271,37.77513,0.0 -81.831581,37.773295,0.0 -81.830972,37.772136,0.0 -81.831186,37.771657,0.0 -81.831771,37.771503,0.0 -81.831565,37.771352,0.0 -81.827368,37.767178,0.0 -81.810444,37.767185,0.0 -81.807238,37.766907,0.0 -81.804809,37.767088,0.0 -81.802691,37.766582,0.0 -81.802706,37.786969,0.0 -81.802625,37.795481,0.0 -81.804121,37.795718,0.0 -81.808296,37.793367,0.0 -81.811439,37.791901,0.0 -81.813364,37.793972,0.0 -81.814658,37.796791,0.0 -81.814497,37.794604,0.0 -81.813302,37.791873,0.0 -81.81519,37.789946,0.0 -81.81788,37.790882,0.0 -81.820256,37.790465,0.0 -81.821928,37.791914,0.0 -81.824739,37.792271,0.0 -81.827169,37.791308,0.0 -81.829255,37.790512,0.0 -81.830248,37.788944,0.0 -81.832918,37.787288,0.0 -81.83642,37.78752,0.0 -81.83696,37.787206,0.0 -81.839758,37.787526,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Anawalt&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>01780</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390703</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5401780</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5401780</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Anawalt</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1490163</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">01780</SimpleData>
<SimpleData name="PLACENS">02390703</SimpleData>
<SimpleData name="AFFGEOID">1600000US5401780</SimpleData>
<SimpleData name="GEOID">5401780</SimpleData>
<SimpleData name="NAME">Anawalt</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1490163</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.448521,37.345446,0.0 -81.448136,37.343593,0.0 -81.445321,37.341814,0.0 -81.444842,37.328194,0.0 -81.440451,37.327831,0.0 -81.440512,37.326457,0.0 -81.43937,37.328613,0.0 -81.435122,37.331991,0.0 -81.435279,37.334372,0.0 -81.433391,37.336746,0.0 -81.430738,37.337811,0.0 -81.432211,37.341415,0.0 -81.436374,37.338231,0.0 -81.439659,37.337944,0.0 -81.439666,37.339842,0.0 -81.442427,37.345263,0.0 -81.44554,37.344831,0.0 -81.446285,37.346999,0.0 -81.448521,37.345446,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Anmoore&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>01900</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390704</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5401900</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5401900</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Anmoore</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2737072</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">01900</SimpleData>
<SimpleData name="PLACENS">02390704</SimpleData>
<SimpleData name="AFFGEOID">1600000US5401900</SimpleData>
<SimpleData name="GEOID">5401900</SimpleData>
<SimpleData name="NAME">Anmoore</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2737072</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.301557,39.254221,0.0 -80.302829,39.252902,0.0 -80.299669,39.252596,0.0 -80.300082,39.253917,0.0 -80.297946,39.253966,0.0 -80.297798,39.25397,0.0 -80.297379,39.252708,0.0 -80.292626,39.251037,0.0 -80.291597,39.251623,0.0 -80.290214,39.252852,0.0 -80.284788,39.250898,0.0 -80.283842,39.253593,0.0 -80.285311,39.254582,0.0 -80.2862,39.256564,0.0 -80.280608,39.257452,0.0 -80.277546,39.258219,0.0 -80.2765,39.259226,0.0 -80.276814,39.261972,0.0 -80.279371,39.261734,0.0 -80.279064,39.263559,0.0 -80.273094,39.264899,0.0 -80.266887,39.267871,0.0 -80.270776,39.271974,0.0 -80.273936,39.270139,0.0 -80.280322,39.268281,0.0 -80.280208,39.268478,0.0 -80.283096,39.268321,0.0 -80.281216,39.266314,0.0 -80.283626,39.264665,0.0 -80.282847,39.261451,0.0 -80.286266,39.260448,0.0 -80.288369,39.26075,0.0 -80.289776,39.263751,0.0 -80.289566,39.268019,0.0 -80.288672,39.269376,0.0 -80.288614,39.271957,0.0 -80.290387,39.272577,0.0 -80.290829,39.272063,0.0 -80.291886,39.266789,0.0 -80.295602,39.266775,0.0 -80.295436,39.264215,0.0 -80.296486,39.259924,0.0 -80.297895,39.2606,0.0 -80.298421,39.259638,0.0 -80.298151,39.259027,0.0 -80.297376,39.257851,0.0 -80.297423,39.256096,0.0 -80.29843,39.256024,0.0 -80.30146,39.255809,0.0 -80.301557,39.254221,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Ansted&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>01996</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390705</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5401996</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5401996</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Ansted</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4297767</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>11768</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">01996</SimpleData>
<SimpleData name="PLACENS">02390705</SimpleData>
<SimpleData name="AFFGEOID">1600000US5401996</SimpleData>
<SimpleData name="GEOID">5401996</SimpleData>
<SimpleData name="NAME">Ansted</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">4297767</SimpleData>
<SimpleData name="AWATER">11768</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.125372,38.12681,0.0 -81.126514,38.125108,0.0 -81.124961,38.121736,0.0 -81.121207,38.121057,0.0 -81.117553,38.121279,0.0 -81.116067,38.12228,0.0 -81.112986,38.121487,0.0 -81.106681,38.127032,0.0 -81.106547,38.128745,0.0 -81.105359,38.129643,0.0 -81.100393,38.130476,0.0 -81.100076,38.131311,0.0 -81.099336,38.131987,0.0 -81.095851,38.130962,0.0 -81.093431,38.13187,0.0 -81.081137,38.132491,0.0 -81.081015,38.133517,0.0 -81.080891,38.135107,0.0 -81.093297,38.138601,0.0 -81.097322,38.138526,0.0 -81.099167,38.13919,0.0 -81.099284,38.140638,0.0 -81.097256,38.143612,0.0 -81.090352,38.148607,0.0 -81.094531,38.15101,0.0 -81.096106,38.151845,0.0 -81.098838,38.151996,0.0 -81.100968,38.150638,0.0 -81.104598,38.15052,0.0 -81.106732,38.152037,0.0 -81.108352,38.15141,0.0 -81.108631,38.148513,0.0 -81.106493,38.146826,0.0 -81.106229,38.139577,0.0 -81.104488,38.136586,0.0 -81.106416,38.133745,0.0 -81.109244,38.132044,0.0 -81.116911,38.128968,0.0 -81.12097,38.12896,0.0 -81.125372,38.12681,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Apple Grove&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>02188</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586754</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5402188</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5402188</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Apple Grove</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5965424</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>402083</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">02188</SimpleData>
<SimpleData name="PLACENS">02586754</SimpleData>
<SimpleData name="AFFGEOID">1600000US5402188</SimpleData>
<SimpleData name="GEOID">5402188</SimpleData>
<SimpleData name="NAME">Apple Grove</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">5965424</SimpleData>
<SimpleData name="AWATER">402083</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.1865543894045,38.6685802484289,0.0 -82.186067,38.666783,0.0 -82.185567,38.659583,0.0 -82.1843829142628,38.6576338127095,0.0 -82.181333,38.658492,0.0 -82.18059,38.657157,0.0 -82.1734,38.657102,0.0 -82.172846,38.650475,0.0 -82.1636,38.650548,0.0 -82.157386,38.650327,0.0 -82.161594,38.660188,0.0 -82.157382,38.660792,0.0 -82.15866,38.665686,0.0 -82.15982,38.670239,0.0 -82.158297,38.682237,0.0 -82.15959,38.681083,0.0 -82.167581,38.678508,0.0 -82.16755,38.679107,0.0 -82.16823,38.679859,0.0 -82.169302,38.679925,0.0 -82.169505,38.680453,0.0 -82.170283,38.681205,0.0 -82.170339,38.681597,0.0 -82.173492,38.681582,0.0 -82.17914,38.680827,0.0 -82.182133,38.672961,0.0 -82.182575,38.670748,0.0 -82.182378,38.670528,0.0 -82.183398,38.66846,0.0 -82.1865543894045,38.6685802484289,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Arbovale&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>02260</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586755</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5402260</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5402260</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Arbovale</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1508393</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">02260</SimpleData>
<SimpleData name="PLACENS">02586755</SimpleData>
<SimpleData name="AFFGEOID">1600000US5402260</SimpleData>
<SimpleData name="GEOID">5402260</SimpleData>
<SimpleData name="NAME">Arbovale</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1508393</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.818546,38.438591,0.0 -79.822796,38.437061,0.0 -79.815932,38.433768,0.0 -79.813917,38.4334,0.0 -79.81434,38.432782,0.0 -79.815262,38.431817,0.0 -79.81463,38.431762,0.0 -79.813257,38.430318,0.0 -79.808055,38.427668,0.0 -79.807317,38.426348,0.0 -79.803772,38.425634,0.0 -79.803618,38.428733,0.0 -79.804053,38.431133,0.0 -79.805302,38.432641,0.0 -79.806811,38.433337,0.0 -79.808103,38.436203,0.0 -79.807915,38.437336,0.0 -79.808878,38.442068,0.0 -79.810624,38.443365,0.0 -79.813658,38.444596,0.0 -79.813643,38.444024,0.0 -79.814385,38.442141,0.0 -79.816767,38.443351,0.0 -79.81659,38.441374,0.0 -79.818546,38.438591,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Athens&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>03292</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390709</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5403292</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5403292</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Athens</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1021360</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>630</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">03292</SimpleData>
<SimpleData name="PLACENS">02390709</SimpleData>
<SimpleData name="AFFGEOID">1600000US5403292</SimpleData>
<SimpleData name="GEOID">5403292</SimpleData>
<SimpleData name="NAME">Athens</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1021360</SimpleData>
<SimpleData name="AWATER">630</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.023558,37.426534,0.0 -81.021478,37.425334,0.0 -81.021488,37.424088,0.0 -81.020222,37.423678,0.0 -81.021161,37.422211,0.0 -81.0171,37.41978,0.0 -81.016435,37.416622,0.0 -81.015394,37.416202,0.0 -81.014148,37.41836,0.0 -81.01155,37.418585,0.0 -81.010473,37.420031,0.0 -81.009606,37.41957,0.0 -81.007931,37.42119,0.0 -81.006702,37.419489,0.0 -81.00554,37.420079,0.0 -81.006024,37.42185,0.0 -81.008812,37.422806,0.0 -81.008451,37.424164,0.0 -81.013626,37.426044,0.0 -81.014002,37.42711,0.0 -81.016921,37.428121,0.0 -81.01619,37.429095,0.0 -81.01747,37.429899,0.0 -81.018769,37.428379,0.0 -81.020871,37.427716,0.0 -81.018552,37.427018,0.0 -81.018588,37.426316,0.0 -81.023558,37.426534,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Auburn&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>03364</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390710</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5403364</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5403364</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Auburn</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>866923</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">03364</SimpleData>
<SimpleData name="PLACENS">02390710</SimpleData>
<SimpleData name="AFFGEOID">1600000US5403364</SimpleData>
<SimpleData name="GEOID">5403364</SimpleData>
<SimpleData name="NAME">Auburn</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">866923</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.862931,39.100873,0.0 -80.864181,39.094871,0.0 -80.849953,39.091643,0.0 -80.849741,39.092233,0.0 -80.847513,39.096943,0.0 -80.862931,39.100873,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Aurora&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>03460</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586756</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5403460</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5403460</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Aurora</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5459312</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">03460</SimpleData>
<SimpleData name="PLACENS">02586756</SimpleData>
<SimpleData name="AFFGEOID">1600000US5403460</SimpleData>
<SimpleData name="GEOID">5403460</SimpleData>
<SimpleData name="NAME">Aurora</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">5459312</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.568749,39.330216,0.0 -79.566396,39.323352,0.0 -79.565227,39.320974,0.0 -79.563151,39.308744,0.0 -79.562789,39.30756,0.0 -79.554818,39.308544,0.0 -79.552925,39.308594,0.0 -79.553002,39.309681,0.0 -79.55069,39.311923,0.0 -79.549798,39.314858,0.0 -79.551049,39.317432,0.0 -79.550469,39.319236,0.0 -79.549104,39.321431,0.0 -79.549202,39.323334,0.0 -79.544675,39.324553,0.0 -79.543789,39.324718,0.0 -79.541254,39.329183,0.0 -79.537766,39.330115,0.0 -79.540459,39.333527,0.0 -79.540013,39.335251,0.0 -79.54108,39.336485,0.0 -79.539842,39.337727,0.0 -79.540368,39.340524,0.0 -79.544175,39.34104,0.0 -79.546733,39.340272,0.0 -79.551728,39.336273,0.0 -79.553846,39.335858,0.0 -79.554913,39.336366,0.0 -79.556197,39.335335,0.0 -79.557204,39.336075,0.0 -79.560805,39.335672,0.0 -79.564775,39.334468,0.0 -79.565291,39.333295,0.0 -79.568749,39.330216,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bancroft&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>04204</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390711</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5404204</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5404204</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bancroft</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>359845</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>15349</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">04204</SimpleData>
<SimpleData name="PLACENS">02390711</SimpleData>
<SimpleData name="AFFGEOID">1600000US5404204</SimpleData>
<SimpleData name="GEOID">5404204</SimpleData>
<SimpleData name="NAME">Bancroft</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">359845</SimpleData>
<SimpleData name="AWATER">15349</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.845466,38.513939,0.0 -81.845082,38.512599,0.0 -81.842357,38.506303,0.0 -81.840428,38.506722,0.0 -81.838823,38.507402,0.0 -81.837662,38.50785,0.0 -81.838669,38.510542,0.0 -81.842999,38.515617,0.0 -81.843999,38.514978,0.0 -81.845466,38.513939,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Barboursville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>04276</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02391537</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5404276</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5404276</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Barboursville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>47</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>10595531</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>247440</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">04276</SimpleData>
<SimpleData name="PLACENS">02391537</SimpleData>
<SimpleData name="AFFGEOID">1600000US5404276</SimpleData>
<SimpleData name="GEOID">5404276</SimpleData>
<SimpleData name="NAME">Barboursville</SimpleData>
<SimpleData name="LSAD">47</SimpleData>
<SimpleData name="ALAND">10595531</SimpleData>
<SimpleData name="AWATER">247440</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.351751,38.413725,0.0 -82.355157,38.413173,0.0 -82.348644,38.413317,0.0 -82.351331,38.410287,0.0 -82.353801,38.40956,0.0 -82.353805,38.409446,0.0 -82.353283,38.409498,0.0 -82.352805,38.409096,0.0 -82.344757,38.412924,0.0 -82.343814,38.412814,0.0 -82.333493,38.409804,0.0 -82.331364,38.40978,0.0 -82.320916,38.411022,0.0 -82.319988,38.403853,0.0 -82.320413,38.39886,0.0 -82.320924,38.397892,0.0 -82.322965,38.396835,0.0 -82.322691,38.395827,0.0 -82.320289,38.395201,0.0 -82.321052,38.392294,0.0 -82.320242,38.392925,0.0 -82.319403,38.395205,0.0 -82.321836,38.396139,0.0 -82.322012,38.396592,0.0 -82.320325,38.397764,0.0 -82.319478,38.400219,0.0 -82.319454,38.411601,0.0 -82.312011,38.412354,0.0 -82.307386,38.413204,0.0 -82.299635,38.414702,0.0 -82.298592,38.412494,0.0 -82.297522,38.410467,0.0 -82.296563,38.410356,0.0 -82.297566,38.409495,0.0 -82.302619,38.410079,0.0 -82.307148,38.411217,0.0 -82.31183,38.411669,0.0 -82.316879,38.411657,0.0 -82.317599,38.411305,0.0 -82.317208,38.408413,0.0 -82.312847,38.400785,0.0 -82.312707,38.399543,0.0 -82.31419,38.397618,0.0 -82.317119,38.395331,0.0 -82.321404,38.39179,0.0 -82.322318,38.389909,0.0 -82.321591,38.388061,0.0 -82.319545,38.38776,0.0 -82.313357,38.389122,0.0 -82.308624,38.391189,0.0 -82.307173,38.390954,0.0 -82.303424,38.387289,0.0 -82.30208,38.384253,0.0 -82.300709,38.383595,0.0 -82.298753,38.38436,0.0 -82.293574,38.389167,0.0 -82.290932,38.390177,0.0 -82.290779,38.392388,0.0 -82.289342,38.396819,0.0 -82.286786,38.396142,0.0 -82.286396,38.397582,0.0 -82.283592,38.397554,0.0 -82.286222,38.398787,0.0 -82.282956,38.398016,0.0 -82.282985,38.399298,0.0 -82.284883,38.399452,0.0 -82.285153,38.398623,0.0 -82.285933,38.398922,0.0 -82.28772,38.39867,0.0 -82.28739,38.399686,0.0 -82.284991,38.399828,0.0 -82.285269,38.402277,0.0 -82.283531,38.404629,0.0 -82.284398,38.406578,0.0 -82.28244,38.40506,0.0 -82.280147,38.404168,0.0 -82.27726,38.403785,0.0 -82.276717,38.403772,0.0 -82.277571,38.404336,0.0 -82.27945,38.404258,0.0 -82.282224,38.405161,0.0 -82.283825,38.406591,0.0 -82.28262,38.407662,0.0 -82.280166,38.406304,0.0 -82.280969,38.410428,0.0 -82.281577,38.410565,0.0 -82.27782,38.41083,0.0 -82.26922,38.409072,0.0 -82.267512,38.4091,0.0 -82.264977,38.409889,0.0 -82.261413,38.412288,0.0 -82.257824,38.413827,0.0 -82.258427,38.415458,0.0 -82.253508,38.416589,0.0 -82.250735,38.41649,0.0 -82.251998,38.418356,0.0 -82.253866,38.417172,0.0 -82.258771,38.416167,0.0 -82.259108,38.416906,0.0 -82.252396,38.420637,0.0 -82.252173,38.420712,0.0 -82.252216,38.420824,0.0 -82.252271,38.420869,0.0 -82.252339,38.421023,0.0 -82.260293,38.419505,0.0 -82.260772,38.420764,0.0 -82.259383,38.421551,0.0 -82.258425,38.422481,0.0 -82.258607,38.422688,0.0 -82.259587,38.421765,0.0 -82.260868,38.420992,0.0 -82.264223,38.428153,0.0 -82.266695,38.426626,0.0 -82.270622,38.42233,0.0 -82.270427,38.421242,0.0 -82.269444,38.418522,0.0 -82.268517,38.416482,0.0 -82.268611,38.416092,0.0 -82.268712,38.416074,0.0 -82.273202,38.415429,0.0 -82.276446,38.415711,0.0 -82.283853,38.417701,0.0 -82.283108,38.42084,0.0 -82.283845,38.422744,0.0 -82.286385,38.423663,0.0 -82.288456,38.42352,0.0 -82.289777,38.42259,0.0 -82.289655,38.422566,0.0 -82.290171,38.419735,0.0 -82.297709,38.42209,0.0 -82.301638,38.426931,0.0 -82.303625,38.427861,0.0 -82.308945,38.428699,0.0 -82.317837,38.427969,0.0 -82.311198,38.428428,0.0 -82.308684,38.42843,0.0 -82.302845,38.427327,0.0 -82.300937,38.425752,0.0 -82.298194,38.422246,0.0 -82.299377,38.422605,0.0 -82.311291,38.426409,0.0 -82.315332,38.426535,0.0 -82.316195,38.42645,0.0 -82.317954,38.426173,0.0 -82.323238,38.424495,0.0 -82.327518,38.423388,0.0 -82.33532,38.422244,0.0 -82.336133,38.421949,0.0 -82.345518,38.416948,0.0 -82.346471,38.416175,0.0 -82.349613,38.41511,0.0 -82.351751,38.413725,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-82.346185,38.413915,0.0 -82.345396,38.416161,0.0 -82.336704,38.41988,0.0 -82.332756,38.421147,0.0 -82.330543,38.421463,0.0 -82.327309,38.422967,0.0 -82.323243,38.423891,0.0 -82.317275,38.425686,0.0 -82.316131,38.426159,0.0 -82.314042,38.426247,0.0 -82.312956,38.426194,0.0 -82.312803,38.425916,0.0 -82.311489,38.425901,0.0 -82.298755,38.421948,0.0 -82.297641,38.421611,0.0 -82.294969,38.416554,0.0 -82.294858,38.416187,0.0 -82.29544,38.416072,0.0 -82.295477,38.415736,0.0 -82.299562,38.414992,0.0 -82.29967,38.41523,0.0 -82.31212,38.413035,0.0 -82.324149,38.411583,0.0 -82.331612,38.410455,0.0 -82.334466,38.41057,0.0 -82.338844,38.41164,0.0 -82.346185,38.413915,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-82.298902,38.414106,0.0 -82.299269,38.414755,0.0 -82.295514,38.415432,0.0 -82.296259,38.413459,0.0 -82.296442,38.411486,0.0 -82.2967,38.411412,0.0 -82.297461,38.411201,0.0 -82.298083,38.412463,0.0 -82.298432,38.412911,0.0 -82.298902,38.414106,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-82.290152,38.416525,0.0 -82.290276,38.41654,0.0 -82.289672,38.416534,0.0 -82.288947,38.417461,0.0 -82.289664,38.417271,0.0 -82.289595,38.419064,0.0 -82.287368,38.418251,0.0 -82.282844,38.416949,0.0 -82.277077,38.415089,0.0 -82.273498,38.414823,0.0 -82.27069,38.415074,0.0 -82.268467,38.415442,0.0 -82.268353,38.415466,0.0 -82.267117,38.413111,0.0 -82.267031,38.411335,0.0 -82.266928,38.411245,0.0 -82.267305,38.410299,0.0 -82.267822,38.409857,0.0 -82.269044,38.409821,0.0 -82.271054,38.410552,0.0 -82.2734,38.410679,0.0 -82.275724,38.411307,0.0 -82.276255,38.411721,0.0 -82.277385,38.414119,0.0 -82.279019,38.413709,0.0 -82.27749,38.411527,0.0 -82.279439,38.411334,0.0 -82.282259,38.411299,0.0 -82.284242,38.411579,0.0 -82.285358,38.412292,0.0 -82.285624,38.413019,0.0 -82.28547,38.413593,0.0 -82.284708,38.414336,0.0 -82.282998,38.415288,0.0 -82.28514,38.417093,0.0 -82.286244,38.417018,0.0 -82.286384,38.415584,0.0 -82.286628,38.415022,0.0 -82.286935,38.414852,0.0 -82.287578,38.414886,0.0 -82.288339,38.415337,0.0 -82.288869,38.415998,0.0 -82.290152,38.416525,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Barrackville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>04612</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390714</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5404612</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5404612</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Barrackville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1785681</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>49012</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">04612</SimpleData>
<SimpleData name="PLACENS">02390714</SimpleData>
<SimpleData name="AFFGEOID">1600000US5404612</SimpleData>
<SimpleData name="GEOID">5404612</SimpleData>
<SimpleData name="NAME">Barrackville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1785681</SimpleData>
<SimpleData name="AWATER">49012</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.186813,39.500425,0.0 -80.186413,39.498707,0.0 -80.181844,39.499354,0.0 -80.177391,39.499256,0.0 -80.174559,39.500067,0.0 -80.169498,39.495793,0.0 -80.168431,39.493504,0.0 -80.166105,39.493859,0.0 -80.16304,39.494562,0.0 -80.162415,39.494831,0.0 -80.162778,39.49538,0.0 -80.161326,39.497104,0.0 -80.159127,39.498456,0.0 -80.158258,39.501082,0.0 -80.160394,39.501753,0.0 -80.162597,39.504062,0.0 -80.167625,39.506372,0.0 -80.167494,39.507271,0.0 -80.16683,39.506536,0.0 -80.165546,39.506691,0.0 -80.164626,39.508883,0.0 -80.166514,39.508493,0.0 -80.167641,39.511641,0.0 -80.166943,39.516592,0.0 -80.167884,39.517112,0.0 -80.16883,39.512853,0.0 -80.167723,39.509805,0.0 -80.168802,39.508099,0.0 -80.16831,39.505831,0.0 -80.17191,39.504412,0.0 -80.172496,39.505317,0.0 -80.177371,39.503359,0.0 -80.185037,39.502066,0.0 -80.184469,39.49965,0.0 -80.185146,39.49965,0.0 -80.186813,39.500425,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bartley&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>04732</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586757</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5404732</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5404732</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bartley</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2956698</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>35890</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">04732</SimpleData>
<SimpleData name="PLACENS">02586757</SimpleData>
<SimpleData name="AFFGEOID">1600000US5404732</SimpleData>
<SimpleData name="GEOID">5404732</SimpleData>
<SimpleData name="NAME">Bartley</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2956698</SimpleData>
<SimpleData name="AWATER">35890</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.742999,37.344797,0.0 -81.744227,37.344615,0.0 -81.742516,37.341031,0.0 -81.741714,37.33512,0.0 -81.743047,37.330843,0.0 -81.740257,37.3292,0.0 -81.737406,37.329386,0.0 -81.733594,37.328054,0.0 -81.730618,37.327806,0.0 -81.728356,37.32824,0.0 -81.726837,37.328705,0.0 -81.723738,37.332548,0.0 -81.723242,37.334996,0.0 -81.725858,37.341653,0.0 -81.72463,37.341149,0.0 -81.726605,37.342482,0.0 -81.727175,37.347711,0.0 -81.730296,37.347209,0.0 -81.739363,37.344876,0.0 -81.741135,37.344204,0.0 -81.742999,37.344797,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bartow&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>04780</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586758</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5404780</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5404780</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bartow</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1202913</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">04780</SimpleData>
<SimpleData name="PLACENS">02586758</SimpleData>
<SimpleData name="AFFGEOID">1600000US5404780</SimpleData>
<SimpleData name="GEOID">5404780</SimpleData>
<SimpleData name="NAME">Bartow</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1202913</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.799824,38.544141,0.0 -79.800202,38.543299,0.0 -79.797727,38.543224,0.0 -79.794832,38.541247,0.0 -79.788397,38.539959,0.0 -79.783305,38.538559,0.0 -79.77896,38.539068,0.0 -79.774905,38.538494,0.0 -79.773227,38.53885,0.0 -79.771759,38.540574,0.0 -79.771808,38.542247,0.0 -79.769719,38.543519,0.0 -79.777944,38.542541,0.0 -79.785895,38.543674,0.0 -79.786949,38.544708,0.0 -79.790575,38.545628,0.0 -79.796393,38.546644,0.0 -79.797752,38.547225,0.0 -79.799824,38.544141,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bath (Berkeley Springs)&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>04876</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>01877535</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5404876</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5404876</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bath (Berkeley Springs)</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>869254</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">04876</SimpleData>
<SimpleData name="PLACENS">01877535</SimpleData>
<SimpleData name="AFFGEOID">1600000US5404876</SimpleData>
<SimpleData name="GEOID">5404876</SimpleData>
<SimpleData name="NAME">Bath (Berkeley Springs)</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">869254</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.23099,39.617588,0.0 -78.231014,39.617479,0.0 -78.229125,39.616977,0.0 -78.22883,39.617527,0.0 -78.225863,39.616943,0.0 -78.225917,39.618664,0.0 -78.227315,39.619479,0.0 -78.228216,39.619046,0.0 -78.229177,39.619599,0.0 -78.230617,39.618836,0.0 -78.23099,39.617588,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.235543,39.620142,0.0 -78.235712,39.618894,0.0 -78.233175,39.619405,0.0 -78.232394,39.621335,0.0 -78.23143,39.621657,0.0 -78.231025,39.622879,0.0 -78.2312,39.621973,0.0 -78.23002,39.621635,0.0 -78.23001,39.621644,0.0 -78.226629,39.619801,0.0 -78.226053,39.620024,0.0 -78.225339,39.620923,0.0 -78.225039,39.620839,0.0 -78.223695,39.623267,0.0 -78.223707,39.624062,0.0 -78.22406,39.625786,0.0 -78.22305,39.626924,0.0 -78.221603,39.629661,0.0 -78.222593,39.630105,0.0 -78.222378,39.630415,0.0 -78.222167,39.630329,0.0 -78.221702,39.631006,0.0 -78.222539,39.631246,0.0 -78.22315,39.630345,0.0 -78.224745,39.631057,0.0 -78.223486,39.632812,0.0 -78.222762,39.633885,0.0 -78.224354,39.634425,0.0 -78.224705,39.633302,0.0 -78.225716,39.631559,0.0 -78.226264,39.631762,0.0 -78.230913,39.624964,0.0 -78.231016,39.623557,0.0 -78.232518,39.62406,0.0 -78.234437,39.622593,0.0 -78.234449,39.620254,0.0 -78.235543,39.620142,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bayard&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>04924</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390716</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5404924</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5404924</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bayard</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>804948</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">04924</SimpleData>
<SimpleData name="PLACENS">02390716</SimpleData>
<SimpleData name="AFFGEOID">1600000US5404924</SimpleData>
<SimpleData name="GEOID">5404924</SimpleData>
<SimpleData name="NAME">Bayard</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">804948</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.372595,39.274025,0.0 -79.371305,39.26744,0.0 -79.365384,39.265304,0.0 -79.360553,39.272552,0.0 -79.359042,39.273335,0.0 -79.3576803684354,39.2764268170473,0.0 -79.361343,39.274924,0.0 -79.372595,39.274025,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Beards Fork&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>05068</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586759</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5405068</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5405068</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Beards Fork</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4356527</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>4559</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">05068</SimpleData>
<SimpleData name="PLACENS">02586759</SimpleData>
<SimpleData name="AFFGEOID">1600000US5405068</SimpleData>
<SimpleData name="GEOID">5405068</SimpleData>
<SimpleData name="NAME">Beards Fork</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">4356527</SimpleData>
<SimpleData name="AWATER">4559</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.243815,38.070519,0.0 -81.238346,38.0653,0.0 -81.235294,38.061152,0.0 -81.236165,38.059808,0.0 -81.2363,38.056107,0.0 -81.234548,38.053496,0.0 -81.231898,38.050867,0.0 -81.231103,38.052206,0.0 -81.232468,38.054252,0.0 -81.229793,38.053118,0.0 -81.214623,38.056303,0.0 -81.212579,38.056192,0.0 -81.223561,38.076936,0.0 -81.229372,38.076672,0.0 -81.243815,38.070519,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Beaver&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>05260</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389185</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5405260</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5405260</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Beaver</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>11284327</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>83923</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">05260</SimpleData>
<SimpleData name="PLACENS">02389185</SimpleData>
<SimpleData name="AFFGEOID">1600000US5405260</SimpleData>
<SimpleData name="GEOID">5405260</SimpleData>
<SimpleData name="NAME">Beaver</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">11284327</SimpleData>
<SimpleData name="AWATER">83923</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.174572,37.731401,0.0 -81.176843,37.728818,0.0 -81.172283,37.726517,0.0 -81.170711,37.724854,0.0 -81.167033,37.723242,0.0 -81.166369,37.721593,0.0 -81.163235,37.719223,0.0 -81.160654,37.718318,0.0 -81.156023,37.718252,0.0 -81.159785,37.718273,0.0 -81.160019,37.717867,0.0 -81.155539,37.717673,0.0 -81.153789,37.716899,0.0 -81.152595,37.715812,0.0 -81.151736,37.713219,0.0 -81.149905,37.712516,0.0 -81.149309,37.712813,0.0 -81.147812,37.714355,0.0 -81.145826,37.715339,0.0 -81.144686,37.718074,0.0 -81.144164,37.720503,0.0 -81.142775,37.721317,0.0 -81.137898,37.722171,0.0 -81.136222,37.721117,0.0 -81.136031,37.722715,0.0 -81.135148,37.723311,0.0 -81.13168,37.723802,0.0 -81.13434,37.724341,0.0 -81.133543,37.727556,0.0 -81.136296,37.728244,0.0 -81.134441,37.72926,0.0 -81.134495,37.730968,0.0 -81.13683,37.735849,0.0 -81.134353,37.739318,0.0 -81.131599,37.744707,0.0 -81.133818,37.744263,0.0 -81.134014,37.746363,0.0 -81.13741,37.746916,0.0 -81.138088,37.747729,0.0 -81.136681,37.747427,0.0 -81.134496,37.748895,0.0 -81.130577,37.748193,0.0 -81.128949,37.747361,0.0 -81.129625,37.748428,0.0 -81.13031,37.748554,0.0 -81.132937,37.75098,0.0 -81.130778,37.753923,0.0 -81.127045,37.75686,0.0 -81.126848,37.759537,0.0 -81.12486,37.76041,0.0 -81.126479,37.762723,0.0 -81.126042,37.763991,0.0 -81.125931,37.764214,0.0 -81.128129,37.762152,0.0 -81.131789,37.760218,0.0 -81.133016,37.758436,0.0 -81.135292,37.758125,0.0 -81.136375,37.755892,0.0 -81.137666,37.755114,0.0 -81.139063,37.752006,0.0 -81.139831,37.751879,0.0 -81.140327,37.752101,0.0 -81.142144,37.750485,0.0 -81.144069,37.751243,0.0 -81.146566,37.750977,0.0 -81.147792,37.751714,0.0 -81.148164,37.75287,0.0 -81.14924,37.754064,0.0 -81.150917,37.755364,0.0 -81.155901,37.756455,0.0 -81.1585,37.755822,0.0 -81.15816,37.755137,0.0 -81.155555,37.755432,0.0 -81.15488,37.754384,0.0 -81.15613,37.753264,0.0 -81.155867,37.749108,0.0 -81.158109,37.748066,0.0 -81.16017,37.744602,0.0 -81.158895,37.742957,0.0 -81.161281,37.741819,0.0 -81.163356,37.740218,0.0 -81.164186,37.73834,0.0 -81.171177,37.736993,0.0 -81.171582,37.736035,0.0 -81.171551,37.732756,0.0 -81.174572,37.731401,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Beckley&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>05332</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390563</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5405332</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5405332</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Beckley</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>24605754</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>28272</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">05332</SimpleData>
<SimpleData name="PLACENS">02390563</SimpleData>
<SimpleData name="AFFGEOID">1600000US5405332</SimpleData>
<SimpleData name="GEOID">5405332</SimpleData>
<SimpleData name="NAME">Beckley</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">24605754</SimpleData>
<SimpleData name="AWATER">28272</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.22035,37.786552,0.0 -81.220509,37.781816,0.0 -81.218225,37.784413,0.0 -81.214602,37.781871,0.0 -81.213323,37.779614,0.0 -81.211623,37.779914,0.0 -81.211223,37.781814,0.0 -81.206788,37.784681,0.0 -81.20712,37.783329,0.0 -81.208819,37.782439,0.0 -81.211716,37.77956,0.0 -81.215213,37.778378,0.0 -81.214812,37.777086,0.0 -81.213152,37.776215,0.0 -81.206679,37.774927,0.0 -81.201757,37.772615,0.0 -81.201253,37.772406,0.0 -81.201636,37.771584,0.0 -81.205062,37.769599,0.0 -81.205181,37.769027,0.0 -81.203261,37.766875,0.0 -81.202956,37.765874,0.0 -81.205014,37.765529,0.0 -81.205611,37.765275,0.0 -81.206193,37.764844,0.0 -81.207704,37.763315,0.0 -81.209729,37.761411,0.0 -81.210054,37.76116,0.0 -81.212983,37.758633,0.0 -81.212945,37.75852,0.0 -81.212812,37.758212,0.0 -81.21258,37.758374,0.0 -81.205627,37.76491,0.0 -81.204079,37.765542,0.0 -81.202863,37.765611,0.0 -81.201575,37.764747,0.0 -81.193461,37.763509,0.0 -81.190685,37.762644,0.0 -81.190049,37.762646,0.0 -81.18968,37.762746,0.0 -81.189342,37.762897,0.0 -81.188869,37.76319,0.0 -81.185987,37.764002,0.0 -81.181416,37.761906,0.0 -81.181277,37.761997,0.0 -81.180242,37.763284,0.0 -81.180417,37.764813,0.0 -81.17853,37.763288,0.0 -81.178383,37.762196,0.0 -81.174921,37.759215,0.0 -81.173032,37.759396,0.0 -81.170445,37.75864,0.0 -81.169569,37.758994,0.0 -81.168268,37.761334,0.0 -81.167341,37.761806,0.0 -81.168512,37.763434,0.0 -81.167677,37.765399,0.0 -81.167027,37.76534,0.0 -81.164789,37.763826,0.0 -81.16352,37.762706,0.0 -81.159984,37.762554,0.0 -81.158276,37.759618,0.0 -81.15733,37.75765,0.0 -81.156547,37.759175,0.0 -81.154097,37.760218,0.0 -81.151938,37.762064,0.0 -81.155036,37.764751,0.0 -81.156785,37.764705,0.0 -81.156833,37.765994,0.0 -81.159274,37.767864,0.0 -81.159539,37.770044,0.0 -81.161541,37.774346,0.0 -81.161056,37.775628,0.0 -81.162327,37.775663,0.0 -81.165207,37.778774,0.0 -81.164429,37.779227,0.0 -81.161597,37.777613,0.0 -81.160611,37.77689,0.0 -81.159167,37.776035,0.0 -81.157919,37.77666,0.0 -81.158104,37.771862,0.0 -81.156894,37.772149,0.0 -81.156596,37.773656,0.0 -81.154909,37.774613,0.0 -81.152674,37.774612,0.0 -81.151524,37.773134,0.0 -81.149671,37.773561,0.0 -81.149314,37.775019,0.0 -81.152388,37.776547,0.0 -81.155139,37.780347,0.0 -81.154013,37.781276,0.0 -81.1508,37.782672,0.0 -81.150578,37.780996,0.0 -81.152091,37.780356,0.0 -81.150595,37.777946,0.0 -81.147669,37.778843,0.0 -81.145599,37.780115,0.0 -81.150713,37.782713,0.0 -81.14963,37.783225,0.0 -81.145238,37.780682,0.0 -81.141907,37.784406,0.0 -81.143621,37.78753,0.0 -81.153781,37.781764,0.0 -81.154756,37.786729,0.0 -81.157191,37.791176,0.0 -81.15774,37.792181,0.0 -81.153468,37.793999,0.0 -81.15214,37.796775,0.0 -81.15045,37.798886,0.0 -81.149365,37.803919,0.0 -81.15245,37.803741,0.0 -81.153639,37.802281,0.0 -81.154729,37.803727,0.0 -81.158864,37.805377,0.0 -81.160697,37.804128,0.0 -81.161813,37.801078,0.0 -81.163807,37.80047,0.0 -81.164795,37.800762,0.0 -81.166273,37.802218,0.0 -81.166956,37.80232,0.0 -81.167064,37.801722,0.0 -81.16813,37.800371,0.0 -81.169275,37.800932,0.0 -81.168772,37.802528,0.0 -81.168708,37.805657,0.0 -81.171431,37.805504,0.0 -81.179822,37.806014,0.0 -81.181134,37.80687,0.0 -81.181443,37.806725,0.0 -81.181254,37.807113,0.0 -81.178795,37.808775,0.0 -81.178496,37.808878,0.0 -81.173794,37.811901,0.0 -81.170737,37.809772,0.0 -81.169722,37.809364,0.0 -81.168576,37.811841,0.0 -81.170674,37.814248,0.0 -81.171523,37.814915,0.0 -81.174122,37.813214,0.0 -81.176922,37.813614,0.0 -81.178355,37.813749,0.0 -81.176922,37.816114,0.0 -81.184074,37.821363,0.0 -81.185557,37.819357,0.0 -81.18684,37.816806,0.0 -81.189446,37.819753,0.0 -81.189009,37.813851,0.0 -81.192823,37.816113,0.0 -81.19887,37.811399,0.0 -81.203115,37.813967,0.0 -81.204449,37.81344,0.0 -81.206262,37.814457,0.0 -81.208409,37.814501,0.0 -81.207175,37.814776,0.0 -81.206268,37.815983,0.0 -81.204331,37.816689,0.0 -81.204058,37.81782,0.0 -81.20947,37.81939,0.0 -81.211353,37.817709,0.0 -81.209339,37.814766,0.0 -81.208409,37.811555,0.0 -81.21107,37.81234,0.0 -81.211902,37.812664,0.0 -81.214058,37.813436,0.0 -81.212431,37.809677,0.0 -81.212063,37.806247,0.0 -81.212209,37.801095,0.0 -81.212399,37.799144,0.0 -81.212864,37.797728,0.0 -81.212642,37.797601,0.0 -81.21479,37.793981,0.0 -81.21479,37.79156,0.0 -81.216035,37.792611,0.0 -81.216488,37.793262,0.0 -81.217418,37.794256,0.0 -81.217716,37.7947,0.0 -81.22012,37.794682,0.0 -81.217195,37.792593,0.0 -81.216697,37.792134,0.0 -81.217321,37.791227,0.0 -81.215153,37.789707,0.0 -81.21344,37.790947,0.0 -81.21158,37.790385,0.0 -81.210672,37.790362,0.0 -81.212358,37.78815,0.0 -81.217205,37.785419,0.0 -81.219408,37.786669,0.0 -81.22035,37.786552,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.195716,37.787597,0.0 -81.198216,37.791315,0.0 -81.193932,37.790101,0.0 -81.193152,37.78896,0.0 -81.189527,37.788725,0.0 -81.188461,37.787894,0.0 -81.190199,37.785551,0.0 -81.195117,37.785579,0.0 -81.1976,37.78511,0.0 -81.195716,37.787597,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.191975,37.791924,0.0 -81.19195,37.791951,0.0 -81.190604,37.793403,0.0 -81.190058,37.794017,0.0 -81.188415,37.795634,0.0 -81.186856,37.794991,0.0 -81.188686,37.798791,0.0 -81.188352,37.79957,0.0 -81.18948,37.802949,0.0 -81.188635,37.802294,0.0 -81.184807,37.802458,0.0 -81.185049,37.800956,0.0 -81.184792,37.798099,0.0 -81.186323,37.799944,0.0 -81.18759,37.799731,0.0 -81.186199,37.797075,0.0 -81.184708,37.797645,0.0 -81.183927,37.796462,0.0 -81.184017,37.793519,0.0 -81.185493,37.789416,0.0 -81.186201,37.789344,0.0 -81.186623,37.789686,0.0 -81.187488,37.789746,0.0 -81.188098,37.789846,0.0 -81.188555,37.789742,0.0 -81.189249,37.789946,0.0 -81.191975,37.791924,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.188993,37.811007,0.0 -81.188141,37.81199,0.0 -81.187559,37.810764,0.0 -81.187255,37.810125,0.0 -81.188041,37.809898,0.0 -81.188993,37.811007,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.188696,37.806041,0.0 -81.187422,37.807314,0.0 -81.188622,37.808614,0.0 -81.186984,37.809632,0.0 -81.185094,37.805708,0.0 -81.184813,37.80268,0.0 -81.186439,37.80252,0.0 -81.187064,37.802641,0.0 -81.188696,37.806041,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.187878,37.787012,0.0 -81.187882,37.787111,0.0 -81.187867,37.787209,0.0 -81.187845,37.787277,0.0 -81.187805,37.787365,0.0 -81.187779,37.787407,0.0 -81.187682,37.78737,0.0 -81.187499,37.787338,0.0 -81.187865,37.786953,0.0 -81.187878,37.787012,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.18581,37.788806,0.0 -81.184403,37.790541,0.0 -81.183728,37.793151,0.0 -81.179117,37.791628,0.0 -81.178184,37.791854,0.0 -81.176942,37.793121,0.0 -81.175568,37.793662,0.0 -81.174215,37.793363,0.0 -81.174182,37.79346,0.0 -81.172657,37.792893,0.0 -81.17253,37.790077,0.0 -81.173761,37.790173,0.0 -81.173626,37.78992,0.0 -81.173464,37.789711,0.0 -81.173787,37.789713,0.0 -81.174472,37.789905,0.0 -81.175859,37.790863,0.0 -81.176544,37.789894,0.0 -81.177437,37.787843,0.0 -81.180013,37.7864,0.0 -81.183236,37.786425,0.0 -81.18581,37.788806,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.183397,37.79589,0.0 -81.184735,37.800167,0.0 -81.18082,37.800852,0.0 -81.180115,37.801073,0.0 -81.175635,37.796404,0.0 -81.17301,37.793467,0.0 -81.175128,37.793889,0.0 -81.175982,37.793751,0.0 -81.177316,37.793135,0.0 -81.178703,37.791824,0.0 -81.179709,37.791895,0.0 -81.182792,37.793248,0.0 -81.180676,37.794339,0.0 -81.179217,37.794247,0.0 -81.179365,37.796228,0.0 -81.180298,37.795261,0.0 -81.181732,37.795934,0.0 -81.18358,37.793908,0.0 -81.183397,37.79589,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.18457,37.805782,0.0 -81.184497,37.805721,0.0 -81.18445,37.805677,0.0 -81.181805,37.802437,0.0 -81.182066,37.802378,0.0 -81.184319,37.802528,0.0 -81.18457,37.805782,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.181659,37.811148,0.0 -81.181511,37.811938,0.0 -81.179322,37.811811,0.0 -81.179375,37.811439,0.0 -81.180272,37.810888,0.0 -81.181659,37.811148,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.172524,37.789811,0.0 -81.172335,37.789825,0.0 -81.172324,37.79589,0.0 -81.170222,37.796014,0.0 -81.168992,37.795161,0.0 -81.168277,37.793295,0.0 -81.16559,37.792891,0.0 -81.16516,37.791442,0.0 -81.165106,37.788511,0.0 -81.167931,37.785282,0.0 -81.16925,37.783402,0.0 -81.170495,37.784846,0.0 -81.170166,37.784991,0.0 -81.168921,37.784714,0.0 -81.168198,37.785951,0.0 -81.169661,37.786381,0.0 -81.171611,37.786329,0.0 -81.172266,37.78786,0.0 -81.172524,37.789811,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Beech Bottom&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>05452</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02391543</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5405452</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5405452</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Beech Bottom</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>47</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3009843</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>1820716</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">05452</SimpleData>
<SimpleData name="PLACENS">02391543</SimpleData>
<SimpleData name="AFFGEOID">1600000US5405452</SimpleData>
<SimpleData name="GEOID">5405452</SimpleData>
<SimpleData name="NAME">Beech Bottom</SimpleData>
<SimpleData name="LSAD">47</SimpleData>
<SimpleData name="ALAND">3009843</SimpleData>
<SimpleData name="AWATER">1820716</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.6726,40.192371,0.0 -80.6764935647059,40.1890336588235,0.0 -80.672435,40.186664,0.0 -80.66961,40.189763,0.0 -80.664824,40.196615,0.0 -80.663453,40.196911,0.0 -80.656307,40.207158,0.0 -80.655498,40.21085,0.0 -80.652031,40.221258,0.0 -80.650286,40.225024,0.0 -80.649611,40.226329,0.0 -80.648262,40.227606,0.0 -80.646893,40.233916,0.0 -80.647675,40.24125,0.0 -80.6531998861081,40.243199982421,0.0 -80.6600181839449,40.232247392185,0.0 -80.6615358809184,40.229809435755,0.0 -80.661543,40.229798,0.0 -80.664299,40.21917,0.0 -80.6645832119675,40.2173369749158,0.0 -80.666299,40.206271,0.0 -80.6681,40.199671,0.0 -80.6726,40.192371,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Belington&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>05788</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390718</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5405788</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5405788</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Belington</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5339116</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>176122</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">05788</SimpleData>
<SimpleData name="PLACENS">02390718</SimpleData>
<SimpleData name="AFFGEOID">1600000US5405788</SimpleData>
<SimpleData name="GEOID">5405788</SimpleData>
<SimpleData name="NAME">Belington</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">5339116</SimpleData>
<SimpleData name="AWATER">176122</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.95517,39.025249,0.0 -79.954996,39.025258,0.0 -79.95275,39.018115,0.0 -79.943733,39.017349,0.0 -79.943824,39.016472,0.0 -79.946733,39.0139,0.0 -79.946236,39.012915,0.0 -79.946068,39.01173,0.0 -79.945258,39.010792,0.0 -79.945304,39.009951,0.0 -79.944874,39.009703,0.0 -79.943919,39.009553,0.0 -79.943188,39.008699,0.0 -79.942101,39.009161,0.0 -79.941124,39.00893,0.0 -79.940461,39.009418,0.0 -79.936133,39.008711,0.0 -79.928139,39.009988,0.0 -79.929811,39.012599,0.0 -79.925906,39.014074,0.0 -79.923975,39.014854,0.0 -79.924757,39.016013,0.0 -79.923399,39.016809,0.0 -79.924056,39.018893,0.0 -79.925442,39.019358,0.0 -79.928044,39.021616,0.0 -79.92376,39.026051,0.0 -79.922109,39.026784,0.0 -79.927027,39.030081,0.0 -79.927034,39.031058,0.0 -79.933616,39.034036,0.0 -79.943801,39.032786,0.0 -79.952969,39.030494,0.0 -79.953533,39.029304,0.0 -79.952346,39.027995,0.0 -79.953795,39.025936,0.0 -79.95517,39.025249,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Belle&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>05836</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390719</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5405836</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5405836</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Belle</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1787312</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>233583</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">05836</SimpleData>
<SimpleData name="PLACENS">02390719</SimpleData>
<SimpleData name="AFFGEOID">1600000US5405836</SimpleData>
<SimpleData name="GEOID">5405836</SimpleData>
<SimpleData name="NAME">Belle</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1787312</SimpleData>
<SimpleData name="AWATER">233583</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.558874,38.24809,0.0 -81.558739,38.247548,0.0 -81.549171,38.241579,0.0 -81.54361,38.237614,0.0 -81.54504,38.23593,0.0 -81.547485,38.234871,0.0 -81.540527,38.228809,0.0 -81.531841,38.223347,0.0 -81.529003,38.22518,0.0 -81.525342,38.227984,0.0 -81.529636,38.232072,0.0 -81.532256,38.234197,0.0 -81.531648,38.234725,0.0 -81.53792,38.239973,0.0 -81.541121,38.237616,0.0 -81.542386,38.238311,0.0 -81.54807,38.242978,0.0 -81.556683,38.249183,0.0 -81.558874,38.24809,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Belmont&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06004</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390564</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406004</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406004</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Belmont</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1057027</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>3974</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06004</SimpleData>
<SimpleData name="PLACENS">02390564</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406004</SimpleData>
<SimpleData name="GEOID">5406004</SimpleData>
<SimpleData name="NAME">Belmont</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">1057027</SimpleData>
<SimpleData name="AWATER">3974</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.27779,39.375834,0.0 -81.276733,39.373898,0.0 -81.258232,39.377428,0.0 -81.258167,39.373957,0.0 -81.254653,39.375332,0.0 -81.256382,39.377331,0.0 -81.253691,39.381054,0.0 -81.255766,39.38294,0.0 -81.255852,39.384604,0.0 -81.2641,39.382081,0.0 -81.266855,39.380115,0.0 -81.260583,39.381618,0.0 -81.27779,39.375834,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Belva&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06052</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586760</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406052</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406052</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Belva</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>354910</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>63853</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06052</SimpleData>
<SimpleData name="PLACENS">02586760</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406052</SimpleData>
<SimpleData name="GEOID">5406052</SimpleData>
<SimpleData name="NAME">Belva</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">354910</SimpleData>
<SimpleData name="AWATER">63853</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.194905,38.232763,0.0 -81.194319,38.230127,0.0 -81.191802,38.228495,0.0 -81.190131,38.230832,0.0 -81.187166,38.23166,0.0 -81.183278,38.232758,0.0 -81.18563,38.237038,0.0 -81.185928,38.236474,0.0 -81.188407,38.234863,0.0 -81.193997,38.233516,0.0 -81.194905,38.232763,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Benwood&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06340</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390565</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406340</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406340</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Benwood</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3360750</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>1458880</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06340</SimpleData>
<SimpleData name="PLACENS">02390565</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406340</SimpleData>
<SimpleData name="GEOID">5406340</SimpleData>
<SimpleData name="NAME">Benwood</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">3360750</SimpleData>
<SimpleData name="AWATER">1458880</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.741901,40.007929,0.0 -80.742045,40.005641,0.0 -80.7412884376936,39.9987184548969,0.0 -80.741085,39.996857,0.0 -80.7401932311608,39.9943463277297,0.0 -80.740168814366,39.9942775850612,0.0 -80.740047695861,39.9939365898856,0.0 -80.73629,39.994515,0.0 -80.731594,39.994484,0.0 -80.729782,39.9948,0.0 -80.727996,39.994979,0.0 -80.728132,39.996045,0.0 -80.726787,39.999332,0.0 -80.728176,40.003076,0.0 -80.72959,40.00525,0.0 -80.73094,40.010409,0.0 -80.730748,40.015817,0.0 -80.73022,40.016809,0.0 -80.727836,40.017369,0.0 -80.725292,40.017386,0.0 -80.722778,40.018813,0.0 -80.720987,40.021059,0.0 -80.7203,40.023047,0.0 -80.723084,40.028393,0.0 -80.725916,40.028137,0.0 -80.723068,40.032569,0.0 -80.724525,40.032552,0.0 -80.725134,40.032497,0.0 -80.7332673845788,40.0333574359829,0.0 -80.733304,40.033272,0.0 -80.7363,40.029929,0.0 -80.737389,40.027593,0.0 -80.737341,40.022969,0.0 -80.737805,40.020761,0.0 -80.7383154158568,40.019716006589,0.0 -80.7404451632553,40.0153556953472,0.0 -80.740509,40.015225,0.0 -80.7410270287743,40.0125098147004,0.0 -80.741901,40.007929,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bergoo&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06436</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586761</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406436</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406436</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bergoo</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>548839</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>32153</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06436</SimpleData>
<SimpleData name="PLACENS">02586761</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406436</SimpleData>
<SimpleData name="GEOID">5406436</SimpleData>
<SimpleData name="NAME">Bergoo</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">548839</SimpleData>
<SimpleData name="AWATER">32153</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.301721,38.487801,0.0 -80.299824,38.480869,0.0 -80.300186,38.477364,0.0 -80.299159,38.476899,0.0 -80.29932,38.4774,0.0 -80.294464,38.479905,0.0 -80.296599,38.483612,0.0 -80.296294,38.489851,0.0 -80.295129,38.493534,0.0 -80.297263,38.493007,0.0 -80.299152,38.491188,0.0 -80.298923,38.489037,0.0 -80.301721,38.487801,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Berwind&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06748</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586762</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406748</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406748</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Berwind</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>747301</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>30124</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06748</SimpleData>
<SimpleData name="PLACENS">02586762</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406748</SimpleData>
<SimpleData name="GEOID">5406748</SimpleData>
<SimpleData name="NAME">Berwind</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">747301</SimpleData>
<SimpleData name="AWATER">30124</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.67396,37.272221,0.0 -81.672124,37.27093,0.0 -81.672118,37.267853,0.0 -81.664222,37.265072,0.0 -81.658774,37.260341,0.0 -81.654032,37.258441,0.0 -81.654463,37.26188,0.0 -81.664607,37.269502,0.0 -81.664521,37.271529,0.0 -81.662884,37.273545,0.0 -81.664228,37.274121,0.0 -81.663939,37.273525,0.0 -81.666918,37.269588,0.0 -81.669992,37.271131,0.0 -81.67396,37.272221,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bethany&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06844</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390725</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406844</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406844</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bethany</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1897482</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>6287</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06844</SimpleData>
<SimpleData name="PLACENS">02390725</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406844</SimpleData>
<SimpleData name="GEOID">5406844</SimpleData>
<SimpleData name="NAME">Bethany</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1897482</SimpleData>
<SimpleData name="AWATER">6287</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.573096,40.20322,0.0 -80.572959,40.201535,0.0 -80.572169,40.200394,0.0 -80.566706,40.197611,0.0 -80.563719,40.196536,0.0 -80.561879,40.19652,0.0 -80.560654,40.197534,0.0 -80.562739,40.200033,0.0 -80.563755,40.201951,0.0 -80.56228,40.203455,0.0 -80.560088,40.203752,0.0 -80.555196,40.203378,0.0 -80.553713,40.201539,0.0 -80.551134,40.201795,0.0 -80.550884,40.202479,0.0 -80.553863,40.207207,0.0 -80.553684,40.209337,0.0 -80.551574,40.210668,0.0 -80.553633,40.212454,0.0 -80.557703,40.210929,0.0 -80.560509,40.210662,0.0 -80.566637,40.212246,0.0 -80.56871,40.211264,0.0 -80.568426,40.207642,0.0 -80.570672,40.207535,0.0 -80.572165,40.207212,0.0 -80.572058,40.206811,0.0 -80.573096,40.20322,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bethlehem&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06940</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02391550</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406940</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406940</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bethlehem</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>47</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9179825</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>2841</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06940</SimpleData>
<SimpleData name="PLACENS">02391550</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406940</SimpleData>
<SimpleData name="GEOID">5406940</SimpleData>
<SimpleData name="NAME">Bethlehem</SimpleData>
<SimpleData name="LSAD">47</SimpleData>
<SimpleData name="ALAND">9179825</SimpleData>
<SimpleData name="AWATER">2841</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.712167,40.053464,0.0 -80.713628,40.051803,0.0 -80.706582,40.053467,0.0 -80.702319,40.053984,0.0 -80.702107,40.053278,0.0 -80.707083,40.051208,0.0 -80.711355,40.046664,0.0 -80.705281,40.043326,0.0 -80.703989,40.043074,0.0 -80.707681,40.040323,0.0 -80.704088,40.03904,0.0 -80.701986,40.036431,0.0 -80.699821,40.034664,0.0 -80.695877,40.034316,0.0 -80.695109,40.033833,0.0 -80.694563,40.031464,0.0 -80.694346,40.030569,0.0 -80.691163,40.030454,0.0 -80.669253,40.028626,0.0 -80.669565,40.034735,0.0 -80.672064,40.039703,0.0 -80.670248,40.040685,0.0 -80.670062,40.040427,0.0 -80.668936,40.04161,0.0 -80.666667,40.042568,0.0 -80.667007,40.043989,0.0 -80.666719,40.04422,0.0 -80.667971,40.04645,0.0 -80.668935,40.046866,0.0 -80.670208,40.046075,0.0 -80.671471,40.045757,0.0 -80.670844,40.047504,0.0 -80.676097,40.049359,0.0 -80.682891,40.053554,0.0 -80.686026,40.057549,0.0 -80.690743,40.062057,0.0 -80.700034,40.06239,0.0 -80.706299,40.062536,0.0 -80.709177,40.057788,0.0 -80.70962,40.057157,0.0 -80.712167,40.053464,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Beverly&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>06988</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390729</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5406988</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5406988</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Beverly</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1137196</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">06988</SimpleData>
<SimpleData name="PLACENS">02390729</SimpleData>
<SimpleData name="AFFGEOID">1600000US5406988</SimpleData>
<SimpleData name="GEOID">5406988</SimpleData>
<SimpleData name="NAME">Beverly</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1137196</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.881258,38.840553,0.0 -79.881605,38.838564,0.0 -79.880412,38.837811,0.0 -79.87723,38.837211,0.0 -79.875684,38.837509,0.0 -79.872832,38.837174,0.0 -79.871913,38.836412,0.0 -79.870179,38.836337,0.0 -79.868842,38.842202,0.0 -79.86702,38.848507,0.0 -79.867699,38.849422,0.0 -79.866787,38.852579,0.0 -79.86572,38.854365,0.0 -79.861131,38.860413,0.0 -79.859811,38.861382,0.0 -79.852672,38.864595,0.0 -79.846557,38.865947,0.0 -79.844527,38.867408,0.0 -79.842408,38.871967,0.0 -79.841865,38.873287,0.0 -79.842001,38.873319,0.0 -79.842128,38.873372,0.0 -79.844662,38.867687,0.0 -79.845743,38.866633,0.0 -79.848442,38.865712,0.0 -79.853733,38.864417,0.0 -79.859575,38.861764,0.0 -79.861315,38.860534,0.0 -79.865987,38.854476,0.0 -79.867491,38.851455,0.0 -79.868082,38.849014,0.0 -79.871318,38.850714,0.0 -79.8737,38.846738,0.0 -79.876274,38.845176,0.0 -79.875973,38.842956,0.0 -79.87679,38.841943,0.0 -79.879698,38.841937,0.0 -79.881258,38.840553,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Big Chimney&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>07204</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586763</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5407204</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5407204</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Big Chimney</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5189532</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>161727</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">07204</SimpleData>
<SimpleData name="PLACENS">02586763</SimpleData>
<SimpleData name="AFFGEOID">1600000US5407204</SimpleData>
<SimpleData name="GEOID">5407204</SimpleData>
<SimpleData name="NAME">Big Chimney</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">5189532</SimpleData>
<SimpleData name="AWATER">161727</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.561503,38.409262,0.0 -81.56005,38.406256,0.0 -81.558016,38.405976,0.0 -81.557073,38.404907,0.0 -81.555026,38.405299,0.0 -81.555316,38.403237,0.0 -81.554112,38.401104,0.0 -81.555736,38.398861,0.0 -81.556909,38.398046,0.0 -81.555676,38.39678,0.0 -81.551787,38.399224,0.0 -81.547057,38.404018,0.0 -81.541513,38.404151,0.0 -81.541104,38.404067,0.0 -81.53693,38.404424,0.0 -81.532685,38.403763,0.0 -81.520816,38.406501,0.0 -81.520844,38.407846,0.0 -81.522875,38.41005,0.0 -81.521142,38.412423,0.0 -81.520498,38.414688,0.0 -81.520959,38.415975,0.0 -81.520867,38.419579,0.0 -81.529398,38.425784,0.0 -81.537131,38.424505,0.0 -81.538957,38.421278,0.0 -81.54188,38.414885,0.0 -81.545395,38.41355,0.0 -81.561503,38.409262,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Big Creek&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>07228</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586764</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5407228</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5407228</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Big Creek</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1505510</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">07228</SimpleData>
<SimpleData name="PLACENS">02586764</SimpleData>
<SimpleData name="AFFGEOID">1600000US5407228</SimpleData>
<SimpleData name="GEOID">5407228</SimpleData>
<SimpleData name="NAME">Big Creek</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1505510</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.048898,38.011387,0.0 -82.048904,38.009209,0.0 -82.046018,38.008387,0.0 -82.041113,38.003668,0.0 -82.040357,38.002935,0.0 -82.038005,37.998082,0.0 -82.024205,38.003699,0.0 -82.024003,38.004569,0.0 -82.025555,38.005129,0.0 -82.025891,38.006446,0.0 -82.027898,38.007345,0.0 -82.028177,38.007213,0.0 -82.028475,38.00781,0.0 -82.031488,38.008776,0.0 -82.044097,38.010219,0.0 -82.044722,38.011307,0.0 -82.048898,38.011387,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Big Sandy&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>07516</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586765</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5407516</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5407516</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Big Sandy</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1378485</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>53660</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">07516</SimpleData>
<SimpleData name="PLACENS">02586765</SimpleData>
<SimpleData name="AFFGEOID">1600000US5407516</SimpleData>
<SimpleData name="GEOID">5407516</SimpleData>
<SimpleData name="NAME">Big Sandy</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1378485</SimpleData>
<SimpleData name="AWATER">53660</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.713366,37.459723,0.0 -81.711021,37.454758,0.0 -81.707148,37.45321,0.0 -81.708004,37.452201,0.0 -81.70783,37.451147,0.0 -81.707593,37.451317,0.0 -81.707622,37.45135,0.0 -81.706351,37.452743,0.0 -81.704445,37.454389,0.0 -81.701047,37.458536,0.0 -81.697368,37.462503,0.0 -81.697621,37.46561,0.0 -81.698585,37.467074,0.0 -81.702209,37.468683,0.0 -81.702631,37.468402,0.0 -81.702694,37.468007,0.0 -81.708316,37.465389,0.0 -81.710329,37.462918,0.0 -81.709885,37.460992,0.0 -81.713366,37.459723,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Birch River&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>07756</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586766</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5407756</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5407756</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Birch River</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>952741</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>34779</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">07756</SimpleData>
<SimpleData name="PLACENS">02586766</SimpleData>
<SimpleData name="AFFGEOID">1600000US5407756</SimpleData>
<SimpleData name="GEOID">5407756</SimpleData>
<SimpleData name="NAME">Birch River</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">952741</SimpleData>
<SimpleData name="AWATER">34779</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.757994,38.495639,0.0 -80.758544,38.493603,0.0 -80.738597,38.492616,0.0 -80.738732,38.494121,0.0 -80.742355,38.496553,0.0 -80.746166,38.497165,0.0 -80.747307,38.499006,0.0 -80.750263,38.500734,0.0 -80.753178,38.500717,0.0 -80.755228,38.500649,0.0 -80.757994,38.495639,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Blacksville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>08092</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390733</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5408092</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5408092</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Blacksville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>775505</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>24048</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">08092</SimpleData>
<SimpleData name="PLACENS">02390733</SimpleData>
<SimpleData name="AFFGEOID">1600000US5408092</SimpleData>
<SimpleData name="GEOID">5408092</SimpleData>
<SimpleData name="NAME">Blacksville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">775505</SimpleData>
<SimpleData name="AWATER">24048</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.2218090273533,39.7213080034901,0.0 -80.219343,39.718854,0.0 -80.219633,39.71333,0.0 -80.213385,39.711672,0.0 -80.210929,39.716585,0.0 -80.207761,39.71854,0.0 -80.207961,39.719985,0.0 -80.2059800335602,39.7213125609648,0.0 -80.2218090273533,39.7213080034901,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Blennerhassett&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>08308</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389216</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5408308</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5408308</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Blennerhassett</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>12868383</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>60209</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">08308</SimpleData>
<SimpleData name="PLACENS">02389216</SimpleData>
<SimpleData name="AFFGEOID">1600000US5408308</SimpleData>
<SimpleData name="GEOID">5408308</SimpleData>
<SimpleData name="NAME">Blennerhassett</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">12868383</SimpleData>
<SimpleData name="AWATER">60209</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.670228,39.262586,0.0 -81.669105,39.261328,0.0 -81.6677,39.260937,0.0 -81.66438,39.261357,0.0 -81.660752,39.260939,0.0 -81.657723,39.260132,0.0 -81.656594,39.259244,0.0 -81.653745,39.258864,0.0 -81.650401,39.257312,0.0 -81.648718,39.255927,0.0 -81.644955,39.253304,0.0 -81.645037,39.251361,0.0 -81.645809,39.24888,0.0 -81.649978,39.248111,0.0 -81.650356,39.247294,0.0 -81.65102,39.237933,0.0 -81.646986,39.237568,0.0 -81.642999,39.239331,0.0 -81.641524,39.238509,0.0 -81.639226,39.239426,0.0 -81.635316,39.237369,0.0 -81.633555,39.23803,0.0 -81.630392,39.23643,0.0 -81.62806,39.238831,0.0 -81.623135,39.242409,0.0 -81.62272,39.243458,0.0 -81.622377,39.245705,0.0 -81.621427,39.246672,0.0 -81.615145,39.247772,0.0 -81.613491,39.249032,0.0 -81.612757,39.250209,0.0 -81.610003,39.251092,0.0 -81.607131,39.249213,0.0 -81.603259,39.248535,0.0 -81.60254,39.253441,0.0 -81.603788,39.256085,0.0 -81.602253,39.258497,0.0 -81.598933,39.259952,0.0 -81.59798,39.261861,0.0 -81.599151,39.262228,0.0 -81.601538,39.265013,0.0 -81.598712,39.265988,0.0 -81.594776,39.265757,0.0 -81.599048,39.266461,0.0 -81.607706,39.267244,0.0 -81.616999,39.268503,0.0 -81.623437,39.268478,0.0 -81.628021,39.267854,0.0 -81.631152,39.267844,0.0 -81.644337,39.269586,0.0 -81.646251,39.270075,0.0 -81.646515,39.268695,0.0 -81.652859,39.269429,0.0 -81.656439,39.269471,0.0 -81.660393,39.268706,0.0 -81.663844,39.267145,0.0 -81.668619,39.264204,0.0 -81.670228,39.262586,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bluefield&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>08524</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390566</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5408524</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5408524</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bluefield</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>23084145</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>825</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">08524</SimpleData>
<SimpleData name="PLACENS">02390566</SimpleData>
<SimpleData name="AFFGEOID">1600000US5408524</SimpleData>
<SimpleData name="GEOID">5408524</SimpleData>
<SimpleData name="NAME">Bluefield</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">23084145</SimpleData>
<SimpleData name="AWATER">825</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.2654005570492,37.2622113207152,0.0 -81.2632664983239,37.2607635680517,0.0 -81.2583184485141,37.2574067943104,0.0 -81.2582765318297,37.2573783578898,0.0 -81.2569873300908,37.2565037590659,0.0 -81.2420528468917,37.246372155107,0.0 -81.2327302271123,37.2400476582895,0.0 -81.225104,37.234874,0.0 -81.204774,37.243013,0.0 -81.1844879477754,37.2544167132402,0.0 -81.178151,37.257979,0.0 -81.1758024670007,37.2590141113795,0.0 -81.179883,37.266337,0.0 -81.175505,37.268354,0.0 -81.168381,37.270666,0.0 -81.166489,37.270609,0.0 -81.16291,37.272409,0.0 -81.155858,37.274594,0.0 -81.147459,37.276109,0.0 -81.145737,37.276626,0.0 -81.1365,37.280699,0.0 -81.125325,37.284433,0.0 -81.122555,37.285213,0.0 -81.119487354377,37.2763395215027,0.0 -81.1169248454677,37.2771417669785,0.0 -81.118311,37.280728,0.0 -81.117366,37.281184,0.0 -81.118328,37.283287,0.0 -81.116762,37.283776,0.0 -81.117656,37.2863,0.0 -81.114711,37.287369,0.0 -81.11156,37.286558,0.0 -81.108386,37.287303,0.0 -81.1058,37.28889,0.0 -81.103846,37.289098,0.0 -81.101854,37.290546,0.0 -81.0999,37.290614,0.0 -81.093147,37.292077,0.0 -81.089658,37.291942,0.0 -81.088645,37.292567,0.0 -81.09316,37.292233,0.0 -81.099193,37.290895,0.0 -81.102081,37.290669,0.0 -81.104144,37.289184,0.0 -81.105989,37.288973,0.0 -81.108146,37.287559,0.0 -81.110892,37.286734,0.0 -81.11474,37.28754,0.0 -81.119826,37.285728,0.0 -81.122828,37.285407,0.0 -81.125377,37.28468,0.0 -81.136645,37.280985,0.0 -81.145355,37.277091,0.0 -81.147883,37.276304,0.0 -81.153456,37.27549,0.0 -81.160831,37.273847,0.0 -81.162525,37.27323,0.0 -81.165841,37.27175,0.0 -81.167222,37.27129,0.0 -81.166175,37.271665,0.0 -81.166166,37.271726,0.0 -81.166161,37.271771,0.0 -81.166204,37.271776,0.0 -81.173343,37.269647,0.0 -81.172929,37.270903,0.0 -81.169676,37.271707,0.0 -81.171381,37.27482,0.0 -81.176759,37.272977,0.0 -81.174077,37.269759,0.0 -81.180267,37.26702,0.0 -81.185768,37.275319,0.0 -81.1901,37.272276,0.0 -81.187249,37.267773,0.0 -81.190323,37.266265,0.0 -81.191917,37.268518,0.0 -81.195309,37.266958,0.0 -81.197593,37.267413,0.0 -81.197615,37.26784,0.0 -81.196775,37.269569,0.0 -81.195952,37.272365,0.0 -81.194692,37.274324,0.0 -81.191226,37.276217,0.0 -81.190722,37.276586,0.0 -81.190257,37.277172,0.0 -81.190062,37.277865,0.0 -81.188,37.278769,0.0 -81.189487,37.27855,0.0 -81.190201,37.278755,0.0 -81.193231,37.278394,0.0 -81.193298,37.278802,0.0 -81.192704,37.279868,0.0 -81.190769,37.280159,0.0 -81.189094,37.280746,0.0 -81.188615,37.284252,0.0 -81.190897,37.283247,0.0 -81.191255,37.280186,0.0 -81.192598,37.280021,0.0 -81.193436,37.279404,0.0 -81.193409,37.278776,0.0 -81.198107,37.286501,0.0 -81.226377,37.27631,0.0 -81.244799,37.269655,0.0 -81.256423,37.265512,0.0 -81.257315,37.266011,0.0 -81.2654005570492,37.2622113207152,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.211687,37.27152,0.0 -81.208882,37.272808,0.0 -81.203328,37.273511,0.0 -81.198372,37.275696,0.0 -81.192731,37.277224,0.0 -81.193264,37.278304,0.0 -81.190308,37.278663,0.0 -81.191304,37.276349,0.0 -81.193656,37.275165,0.0 -81.194824,37.274421,0.0 -81.196149,37.272359,0.0 -81.196725,37.270034,0.0 -81.19691,37.26963,0.0 -81.19748,37.268787,0.0 -81.197946,37.268801,0.0 -81.198183,37.268739,0.0 -81.198303,37.268515,0.0 -81.198225,37.268275,0.0 -81.198098,37.268109,0.0 -81.198105,37.267817,0.0 -81.198316,37.267459,0.0 -81.198564,37.267517,0.0 -81.201825,37.268675,0.0 -81.206335,37.265112,0.0 -81.211687,37.27152,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.198124,37.268408,0.0 -81.198134,37.26856,0.0 -81.197605,37.268638,0.0 -81.197812,37.267434,0.0 -81.198128,37.267444,0.0 -81.197942,37.267797,0.0 -81.197946,37.268181,0.0 -81.198124,37.268408,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bluewell&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>08764</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02585054</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5408764</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5408764</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bluewell</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>11642132</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>69580</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">08764</SimpleData>
<SimpleData name="PLACENS">02585054</SimpleData>
<SimpleData name="AFFGEOID">1600000US5408764</SimpleData>
<SimpleData name="GEOID">5408764</SimpleData>
<SimpleData name="NAME">Bluewell</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">11642132</SimpleData>
<SimpleData name="AWATER">69580</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.287314,37.310346,0.0 -81.286195,37.310139,0.0 -81.283587,37.310891,0.0 -81.281538,37.311146,0.0 -81.278374,37.310261,0.0 -81.27609,37.307743,0.0 -81.27368,37.305964,0.0 -81.27385,37.303027,0.0 -81.271206,37.301653,0.0 -81.269917,37.301393,0.0 -81.267387,37.303184,0.0 -81.266089,37.300789,0.0 -81.265326,37.301422,0.0 -81.25576,37.298997,0.0 -81.255282,37.299143,0.0 -81.255272,37.299433,0.0 -81.25537,37.301429,0.0 -81.253916,37.300455,0.0 -81.251996,37.301583,0.0 -81.25169,37.297559,0.0 -81.251079,37.296841,0.0 -81.251131,37.298153,0.0 -81.246091,37.298325,0.0 -81.241489,37.300477,0.0 -81.239526,37.300677,0.0 -81.236738,37.300297,0.0 -81.235396,37.300549,0.0 -81.233527,37.301898,0.0 -81.230529,37.303312,0.0 -81.232326,37.305205,0.0 -81.23404,37.308528,0.0 -81.234054,37.309492,0.0 -81.237059,37.314038,0.0 -81.237811,37.316155,0.0 -81.237466,37.317742,0.0 -81.236261,37.319528,0.0 -81.23627,37.320609,0.0 -81.236393,37.32053,0.0 -81.239378,37.319057,0.0 -81.239656,37.320299,0.0 -81.245803,37.32291,0.0 -81.246821,37.326433,0.0 -81.248363,37.327606,0.0 -81.251025,37.326826,0.0 -81.254023,37.327477,0.0 -81.254013,37.329132,0.0 -81.260008,37.334249,0.0 -81.274402,37.329276,0.0 -81.276338,37.327759,0.0 -81.276826,37.32434,0.0 -81.276265,37.32309,0.0 -81.276682,37.322039,0.0 -81.277783,37.321478,0.0 -81.279439,37.321888,0.0 -81.281278,37.321736,0.0 -81.279776,37.321241,0.0 -81.279944,37.320761,0.0 -81.278805,37.319777,0.0 -81.285686,37.312504,0.0 -81.287314,37.310346,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Boaz&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>08836</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389222</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5408836</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5408836</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Boaz</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9479375</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>2133819</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">08836</SimpleData>
<SimpleData name="PLACENS">02389222</SimpleData>
<SimpleData name="AFFGEOID">1600000US5408836</SimpleData>
<SimpleData name="GEOID">5408836</SimpleData>
<SimpleData name="NAME">Boaz</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">9479375</SimpleData>
<SimpleData name="AWATER">2133819</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.524309,39.36161,0.0 -81.5261431161509,39.3610006135099,0.0 -81.523958,39.358894,0.0 -81.519875,39.359129,0.0 -81.512508,39.360986,0.0 -81.510348,39.359238,0.0 -81.503603,39.359553,0.0 -81.499706,39.360008,0.0 -81.49393,39.361893,0.0 -81.491272,39.361996,0.0 -81.485939,39.360401,0.0 -81.486092,39.358157,0.0 -81.485513,39.355938,0.0 -81.486428,39.354434,0.0 -81.486697,39.352141,0.0 -81.482323,39.347844,0.0 -81.482302,39.345715,0.0 -81.480138,39.344901,0.0 -81.478179,39.345761,0.0 -81.47783,39.348202,0.0 -81.475842,39.350774,0.0 -81.475123,39.352346,0.0 -81.47292,39.353432,0.0 -81.469429,39.353272,0.0 -81.468203,39.354364,0.0 -81.46346,39.35638,0.0 -81.462446,39.356445,0.0 -81.461422,39.358192,0.0 -81.461557,39.359695,0.0 -81.45943,39.363661,0.0 -81.460513,39.366873,0.0 -81.459843,39.368162,0.0 -81.461565,39.369838,0.0 -81.462173,39.371967,0.0 -81.46401,39.372354,0.0 -81.464263,39.373332,0.0 -81.466011,39.373949,0.0 -81.476678,39.380967,0.0 -81.473967,39.386397,0.0 -81.473704,39.387646,0.0 -81.477613,39.385561,0.0 -81.479108,39.385578,0.0 -81.478928,39.38719,0.0 -81.482139,39.389116,0.0 -81.4836765745529,39.3889661846523,0.0 -81.489044,39.384074,0.0 -81.503189,39.373242,0.0 -81.513493,39.36705,0.0 -81.524309,39.36161,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bolivar&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>08932</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390738</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5408932</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5408932</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bolivar</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1121872</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">08932</SimpleData>
<SimpleData name="PLACENS">02390738</SimpleData>
<SimpleData name="AFFGEOID">1600000US5408932</SimpleData>
<SimpleData name="GEOID">5408932</SimpleData>
<SimpleData name="NAME">Bolivar</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1121872</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-77.758876,39.32581,0.0 -77.760136,39.323752,0.0 -77.757579,39.321291,0.0 -77.758288,39.320943,0.0 -77.758849,39.320651,0.0 -77.753366,39.321268,0.0 -77.748082,39.318073,0.0 -77.744427,39.320401,0.0 -77.744252,39.326449,0.0 -77.745683,39.326919,0.0 -77.750357,39.327914,0.0 -77.754198,39.328614,0.0 -77.754162,39.330177,0.0 -77.754615,39.330965,0.0 -77.755872,39.331126,0.0 -77.757872,39.327305,0.0 -77.759161,39.326117,0.0 -77.758876,39.32581,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bolt&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>08956</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586767</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5408956</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5408956</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bolt</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>14103074</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>16129</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">08956</SimpleData>
<SimpleData name="PLACENS">02586767</SimpleData>
<SimpleData name="AFFGEOID">1600000US5408956</SimpleData>
<SimpleData name="GEOID">5408956</SimpleData>
<SimpleData name="NAME">Bolt</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">14103074</SimpleData>
<SimpleData name="AWATER">16129</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.45137,37.773155,0.0 -81.450927,37.771612,0.0 -81.447627,37.769212,0.0 -81.447127,37.767112,0.0 -81.444227,37.763612,0.0 -81.445427,37.761412,0.0 -81.442527,37.759712,0.0 -81.439726,37.756612,0.0 -81.437826,37.753112,0.0 -81.435526,37.752612,0.0 -81.430741,37.749684,0.0 -81.427713,37.749257,0.0 -81.423941,37.743995,0.0 -81.420287,37.74428,0.0 -81.417256,37.745329,0.0 -81.413562,37.745479,0.0 -81.408637,37.74473,0.0 -81.406174,37.743231,0.0 -81.404892,37.741711,0.0 -81.397433,37.743778,0.0 -81.400102,37.746202,0.0 -81.401491,37.748428,0.0 -81.403214,37.748361,0.0 -81.403018,37.751383,0.0 -81.401848,37.752834,0.0 -81.403492,37.753711,0.0 -81.404009,37.755835,0.0 -81.400998,37.755846,0.0 -81.400958,37.754441,0.0 -81.391037,37.754441,0.0 -81.391001,37.768298,0.0 -81.391038,37.771269,0.0 -81.404725,37.771282,0.0 -81.405876,37.770942,0.0 -81.405514,37.773054,0.0 -81.406317,37.774883,0.0 -81.405769,37.776376,0.0 -81.408245,37.777291,0.0 -81.411936,37.777599,0.0 -81.414088,37.778252,0.0 -81.416664,37.778441,0.0 -81.419117,37.779682,0.0 -81.420352,37.77699,0.0 -81.424808,37.778471,0.0 -81.425657,37.77754,0.0 -81.427215,37.777155,0.0 -81.435937,37.776363,0.0 -81.442742,37.776686,0.0 -81.445923,37.775277,0.0 -81.448676,37.774494,0.0 -81.45137,37.773155,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Boomer&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09100</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586768</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409100</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409100</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Boomer</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3580094</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>256256</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09100</SimpleData>
<SimpleData name="PLACENS">02586768</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409100</SimpleData>
<SimpleData name="GEOID">5409100</SimpleData>
<SimpleData name="NAME">Boomer</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3580094</SimpleData>
<SimpleData name="AWATER">256256</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.29694,38.156704,0.0 -81.297109,38.156195,0.0 -81.295361,38.153918,0.0 -81.293961,38.152786,0.0 -81.291282,38.149817,0.0 -81.288488,38.148149,0.0 -81.28701,38.145613,0.0 -81.286166,38.141938,0.0 -81.283264,38.13818,0.0 -81.278783,38.141116,0.0 -81.278038,38.141185,0.0 -81.276448,38.141335,0.0 -81.272557,38.143564,0.0 -81.270167,38.14658,0.0 -81.268278,38.14776,0.0 -81.264053,38.148109,0.0 -81.26539,38.151803,0.0 -81.27117,38.155205,0.0 -81.273007,38.154169,0.0 -81.274844,38.154061,0.0 -81.276264,38.153129,0.0 -81.278303,38.153269,0.0 -81.281302,38.152514,0.0 -81.283403,38.157684,0.0 -81.282736,38.160222,0.0 -81.285115,38.161176,0.0 -81.285249,38.162775,0.0 -81.287733,38.16268,0.0 -81.290073,38.165357,0.0 -81.295197,38.163975,0.0 -81.295596,38.158765,0.0 -81.295885,38.158343,0.0 -81.29694,38.156704,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bowden&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09364</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586769</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409364</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409364</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bowden</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>307294</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09364</SimpleData>
<SimpleData name="PLACENS">02586769</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409364</SimpleData>
<SimpleData name="GEOID">5409364</SimpleData>
<SimpleData name="NAME">Bowden</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">307294</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.715109,38.90757,0.0 -79.715512,38.906472,0.0 -79.713279,38.906264,0.0 -79.711715,38.906676,0.0 -79.706675,38.908819,0.0 -79.705066,38.909242,0.0 -79.70126,38.90934,0.0 -79.702311,38.910091,0.0 -79.704005,38.910572,0.0 -79.705265,38.911846,0.0 -79.70777,38.911627,0.0 -79.71083,38.910219,0.0 -79.713896,38.907931,0.0 -79.715109,38.90757,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bradley&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09676</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389229</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409676</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409676</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bradley</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>10953714</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>21417</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09676</SimpleData>
<SimpleData name="PLACENS">02389229</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409676</SimpleData>
<SimpleData name="GEOID">5409676</SimpleData>
<SimpleData name="NAME">Bradley</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">10953714</SimpleData>
<SimpleData name="AWATER">21417</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.235996,37.859931,0.0 -81.237052,37.859197,0.0 -81.234235,37.858882,0.0 -81.233661,37.856758,0.0 -81.229362,37.85502,0.0 -81.226661,37.855084,0.0 -81.22301,37.857536,0.0 -81.220694,37.856968,0.0 -81.21811,37.859396,0.0 -81.214354,37.861169,0.0 -81.211761,37.860535,0.0 -81.208963,37.856749,0.0 -81.204957,37.853195,0.0 -81.200598,37.852235,0.0 -81.197362,37.852219,0.0 -81.19696,37.851253,0.0 -81.19665,37.850493,0.0 -81.192638,37.852848,0.0 -81.189071,37.85602,0.0 -81.187629,37.858642,0.0 -81.187206,37.860392,0.0 -81.182314,37.863993,0.0 -81.18117,37.86696,0.0 -81.179029,37.869257,0.0 -81.179214,37.871031,0.0 -81.180499,37.873461,0.0 -81.18283,37.875511,0.0 -81.184871,37.880024,0.0 -81.185487,37.882403,0.0 -81.185692,37.882426,0.0 -81.186122,37.882486,0.0 -81.187847,37.882493,0.0 -81.190373,37.882649,0.0 -81.190693,37.882668,0.0 -81.190827,37.882675,0.0 -81.21072,37.883676,0.0 -81.207898,37.877501,0.0 -81.209873,37.876628,0.0 -81.213165,37.874326,0.0 -81.22129,37.873499,0.0 -81.227186,37.871274,0.0 -81.230187,37.871142,0.0 -81.229319,37.869406,0.0 -81.230709,37.866512,0.0 -81.233103,37.864746,0.0 -81.236317,37.863065,0.0 -81.235377,37.861811,0.0 -81.235996,37.859931,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bradshaw&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09700</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390746</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409700</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409700</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bradshaw</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2004122</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>67351</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09700</SimpleData>
<SimpleData name="PLACENS">02390746</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409700</SimpleData>
<SimpleData name="GEOID">5409700</SimpleData>
<SimpleData name="NAME">Bradshaw</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2004122</SimpleData>
<SimpleData name="AWATER">67351</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.809441,37.359393,0.0 -81.808983,37.35743,0.0 -81.806657,37.346906,0.0 -81.805492,37.346549,0.0 -81.803399,37.345866,0.0 -81.791623,37.345719,0.0 -81.791579,37.347492,0.0 -81.791576,37.347883,0.0 -81.791558,37.348613,0.0 -81.799455,37.361199,0.0 -81.800972,37.362657,0.0 -81.80237,37.364005,0.0 -81.809441,37.359393,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bramwell&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09796</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390747</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409796</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409796</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bramwell</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1436512</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>75912</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09796</SimpleData>
<SimpleData name="PLACENS">02390747</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409796</SimpleData>
<SimpleData name="GEOID">5409796</SimpleData>
<SimpleData name="NAME">Bramwell</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1436512</SimpleData>
<SimpleData name="AWATER">75912</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.329916,37.32302,0.0 -81.328686,37.32074,0.0 -81.321148,37.323553,0.0 -81.319855,37.326786,0.0 -81.312656,37.322436,0.0 -81.309701,37.322057,0.0 -81.307404,37.324171,0.0 -81.306439,37.32728,0.0 -81.303218,37.327354,0.0 -81.300735,37.326407,0.0 -81.299569,37.326644,0.0 -81.299799,37.33,0.0 -81.30125,37.332588,0.0 -81.302513,37.332962,0.0 -81.303497,37.333574,0.0 -81.303274,37.332052,0.0 -81.306694,37.331738,0.0 -81.30861,37.331556,0.0 -81.314199,37.330189,0.0 -81.31565,37.32609,0.0 -81.317949,37.327342,0.0 -81.320148,37.329233,0.0 -81.32319,37.328875,0.0 -81.32503,37.32608,0.0 -81.326444,37.325945,0.0 -81.326548,37.324614,0.0 -81.329916,37.32302,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Brandonville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09844</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390749</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409844</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409844</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Brandonville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>998171</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09844</SimpleData>
<SimpleData name="PLACENS">02390749</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409844</SimpleData>
<SimpleData name="GEOID">5409844</SimpleData>
<SimpleData name="NAME">Brandonville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">998171</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.638246,39.667041,0.0 -79.638612,39.665847,0.0 -79.631704,39.665793,0.0 -79.631399,39.663567,0.0 -79.620898,39.663272,0.0 -79.620642,39.664792,0.0 -79.618034,39.664848,0.0 -79.61824,39.665982,0.0 -79.616062,39.665979,0.0 -79.615975,39.667143,0.0 -79.618886,39.666651,0.0 -79.618776,39.667511,0.0 -79.620667,39.66875,0.0 -79.621314,39.666989,0.0 -79.623118,39.667006,0.0 -79.62467,39.671628,0.0 -79.626291,39.671571,0.0 -79.627653,39.671153,0.0 -79.631249,39.67062,0.0 -79.632733,39.670285,0.0 -79.635577,39.669369,0.0 -79.636369,39.668814,0.0 -79.638246,39.667041,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Brandywine&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09868</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586770</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409868</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409868</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Brandywine</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1272140</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>470</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09868</SimpleData>
<SimpleData name="PLACENS">02586770</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409868</SimpleData>
<SimpleData name="GEOID">5409868</SimpleData>
<SimpleData name="NAME">Brandywine</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1272140</SimpleData>
<SimpleData name="AWATER">470</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.247827,38.626835,0.0 -79.245499,38.62323,0.0 -79.245529,38.622005,0.0 -79.246893,38.62062,0.0 -79.247044,38.619001,0.0 -79.244487,38.616845,0.0 -79.243309,38.614958,0.0 -79.238927,38.615753,0.0 -79.235667,38.615359,0.0 -79.234283,38.620578,0.0 -79.234915,38.621648,0.0 -79.23411,38.623326,0.0 -79.236092,38.623864,0.0 -79.23886,38.624161,0.0 -79.240922,38.627199,0.0 -79.242476,38.628659,0.0 -79.241436,38.630766,0.0 -79.243758,38.630894,0.0 -79.244946,38.630687,0.0 -79.247827,38.626835,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Brenton&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>09964</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586771</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5409964</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5409964</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Brenton</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1628843</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>34801</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">09964</SimpleData>
<SimpleData name="PLACENS">02586771</SimpleData>
<SimpleData name="AFFGEOID">1600000US5409964</SimpleData>
<SimpleData name="GEOID">5409964</SimpleData>
<SimpleData name="NAME">Brenton</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1628843</SimpleData>
<SimpleData name="AWATER">34801</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.644684,37.604191,0.0 -81.644043,37.603809,0.0 -81.64351,37.599843,0.0 -81.641794,37.597838,0.0 -81.638789,37.595681,0.0 -81.635975,37.594376,0.0 -81.632662,37.594242,0.0 -81.630146,37.594797,0.0 -81.627258,37.594708,0.0 -81.625247,37.59513,0.0 -81.627019,37.595578,0.0 -81.627185,37.605262,0.0 -81.630815,37.604654,0.0 -81.636952,37.605633,0.0 -81.640979,37.607381,0.0 -81.64381,37.604062,0.0 -81.644684,37.604191,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bridgeport&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>10180</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390568</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5410180</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5410180</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bridgeport</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>27825047</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>113069</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">10180</SimpleData>
<SimpleData name="PLACENS">02390568</SimpleData>
<SimpleData name="AFFGEOID">1600000US5410180</SimpleData>
<SimpleData name="GEOID">5410180</SimpleData>
<SimpleData name="NAME">Bridgeport</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">27825047</SimpleData>
<SimpleData name="AWATER">113069</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.282414,39.300325,0.0 -80.284109,39.29899,0.0 -80.279279,39.29688,0.0 -80.279195,39.296331,0.0 -80.278404,39.296237,0.0 -80.277441,39.292383,0.0 -80.27801,39.291571,0.0 -80.278395,39.288962,0.0 -80.27754,39.289059,0.0 -80.279154,39.287948,0.0 -80.27889,39.286623,0.0 -80.277738,39.285379,0.0 -80.277703,39.282216,0.0 -80.277912,39.280599,0.0 -80.277539,39.278948,0.0 -80.276857,39.277853,0.0 -80.274601,39.275719,0.0 -80.270726,39.272269,0.0 -80.263533,39.273722,0.0 -80.262711,39.272571,0.0 -80.260461,39.273406,0.0 -80.2615,39.274276,0.0 -80.255723,39.275837,0.0 -80.25549,39.274071,0.0 -80.254269,39.271688,0.0 -80.253299,39.267294,0.0 -80.251603,39.26471,0.0 -80.250942,39.263819,0.0 -80.250045,39.265354,0.0 -80.24873,39.265035,0.0 -80.247967,39.265511,0.0 -80.245292,39.265704,0.0 -80.245309,39.265891,0.0 -80.244714,39.266177,0.0 -80.244598,39.266329,0.0 -80.242418,39.265805,0.0 -80.242153,39.265672,0.0 -80.241611,39.265263,0.0 -80.239434,39.263284,0.0 -80.23852,39.262182,0.0 -80.237981,39.261894,0.0 -80.234734,39.261855,0.0 -80.234547,39.263155,0.0 -80.231136,39.262063,0.0 -80.229461,39.264886,0.0 -80.234883,39.267746,0.0 -80.237231,39.264358,0.0 -80.235722,39.263986,0.0 -80.236981,39.262126,0.0 -80.238451,39.262293,0.0 -80.24168,39.265664,0.0 -80.245856,39.266799,0.0 -80.246564,39.267577,0.0 -80.24251,39.27406,0.0 -80.240676,39.275581,0.0 -80.245796,39.277357,0.0 -80.244767,39.279272,0.0 -80.243946,39.280791,0.0 -80.244403,39.282494,0.0 -80.243197,39.282742,0.0 -80.241819,39.28261,0.0 -80.239022,39.282271,0.0 -80.237247,39.279517,0.0 -80.236411,39.279086,0.0 -80.238603,39.281838,0.0 -80.239484,39.285587,0.0 -80.238379,39.286211,0.0 -80.23531,39.284877,0.0 -80.230589,39.28607,0.0 -80.228702,39.287632,0.0 -80.227675,39.289008,0.0 -80.224965,39.290244,0.0 -80.225484,39.28643,0.0 -80.224766,39.285095,0.0 -80.222349,39.286129,0.0 -80.222011,39.287319,0.0 -80.216837,39.285013,0.0 -80.216849,39.286201,0.0 -80.21491,39.287514,0.0 -80.213207,39.287148,0.0 -80.213494,39.28907,0.0 -80.216298,39.289896,0.0 -80.217774,39.291628,0.0 -80.214836,39.292707,0.0 -80.215557,39.293859,0.0 -80.21456,39.294959,0.0 -80.213426,39.295312,0.0 -80.211648,39.295196,0.0 -80.209272,39.295649,0.0 -80.207513,39.295395,0.0 -80.206865,39.295522,0.0 -80.205883,39.296008,0.0 -80.204573,39.297537,0.0 -80.202301,39.298166,0.0 -80.202301,39.298263,0.0 -80.202301,39.298345,0.0 -80.204329,39.298136,0.0 -80.206289,39.30049,0.0 -80.206158,39.306836,0.0 -80.213012,39.308634,0.0 -80.212425,39.305148,0.0 -80.21356,39.30676,0.0 -80.217825,39.308148,0.0 -80.217765,39.309777,0.0 -80.216449,39.311298,0.0 -80.221086,39.312762,0.0 -80.222063,39.313777,0.0 -80.220929,39.31453,0.0 -80.217067,39.318346,0.0 -80.216671,39.322282,0.0 -80.21683,39.322816,0.0 -80.218379,39.327103,0.0 -80.218423,39.330835,0.0 -80.218831,39.33241,0.0 -80.22049,39.335775,0.0 -80.22149,39.337161,0.0 -80.221071,39.337859,0.0 -80.22075,39.341236,0.0 -80.219542,39.343756,0.0 -80.218171,39.350134,0.0 -80.22104,39.350498,0.0 -80.222355,39.347616,0.0 -80.223307,39.346548,0.0 -80.224478,39.343855,0.0 -80.22754,39.34351,0.0 -80.232462,39.344066,0.0 -80.233365,39.343973,0.0 -80.233137,39.34681,0.0 -80.23222,39.349831,0.0 -80.232868,39.351199,0.0 -80.234369,39.351138,0.0 -80.235022,39.349865,0.0 -80.237477,39.348554,0.0 -80.2373,39.347597,0.0 -80.238616,39.345931,0.0 -80.238778,39.344499,0.0 -80.240272,39.344892,0.0 -80.243872,39.343935,0.0 -80.24401,39.343929,0.0 -80.244646,39.341189,0.0 -80.245937,39.339048,0.0 -80.246627,39.336632,0.0 -80.246333,39.336629,0.0 -80.245727,39.338897,0.0 -80.244497,39.340872,0.0 -80.243746,39.343857,0.0 -80.23997,39.344711,0.0 -80.236286,39.343433,0.0 -80.232734,39.343833,0.0 -80.230043,39.343394,0.0 -80.227339,39.343286,0.0 -80.224455,39.343696,0.0 -80.224251,39.341311,0.0 -80.225911,39.342029,0.0 -80.228722,39.339972,0.0 -80.232378,39.34158,0.0 -80.232731,39.33763,0.0 -80.235113,39.337211,0.0 -80.236851,39.3344,0.0 -80.238942,39.333497,0.0 -80.24517,39.334796,0.0 -80.246199,39.329119,0.0 -80.243815,39.326356,0.0 -80.244781,39.325051,0.0 -80.239485,39.323427,0.0 -80.24281,39.321966,0.0 -80.247242,39.318148,0.0 -80.251075,39.316139,0.0 -80.254956,39.317853,0.0 -80.25856,39.319373,0.0 -80.259305,39.320772,0.0 -80.260424,39.319659,0.0 -80.264176,39.312677,0.0 -80.262398,39.312213,0.0 -80.262382,39.311422,0.0 -80.265879,39.311095,0.0 -80.268559,39.310523,0.0 -80.268921,39.311836,0.0 -80.266256,39.311971,0.0 -80.264936,39.312423,0.0 -80.264497,39.313278,0.0 -80.269201,39.315217,0.0 -80.269439,39.320742,0.0 -80.272506,39.320764,0.0 -80.274701,39.323455,0.0 -80.275514,39.324451,0.0 -80.278164,39.322953,0.0 -80.278011,39.318914,0.0 -80.279301,39.31989,0.0 -80.283771,39.317811,0.0 -80.283726,39.317687,0.0 -80.278435,39.318412,0.0 -80.277039,39.319129,0.0 -80.275119,39.318118,0.0 -80.275768,39.316868,0.0 -80.274699,39.316104,0.0 -80.275266,39.313737,0.0 -80.277231,39.31196,0.0 -80.277827,39.310372,0.0 -80.279306,39.309349,0.0 -80.281575,39.30955,0.0 -80.283145,39.311842,0.0 -80.282694,39.314413,0.0 -80.283856,39.310899,0.0 -80.282803,39.308893,0.0 -80.28255,39.308761,0.0 -80.28141,39.308257,0.0 -80.279542,39.308779,0.0 -80.280378,39.307488,0.0 -80.277732,39.306395,0.0 -80.279559,39.305101,0.0 -80.279924,39.302238,0.0 -80.280671,39.301762,0.0 -80.279734,39.298932,0.0 -80.281326,39.299856,0.0 -80.282414,39.300325,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.278654,39.298297,0.0 -80.278526,39.300298,0.0 -80.277701,39.300036,0.0 -80.277552,39.298826,0.0 -80.277393,39.298462,0.0 -80.277482,39.297791,0.0 -80.277838,39.297599,0.0 -80.278505,39.298202,0.0 -80.278654,39.298297,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.277153,39.285544,0.0 -80.277476,39.288603,0.0 -80.273862,39.288694,0.0 -80.271554,39.288081,0.0 -80.270549,39.286322,0.0 -80.271393,39.284835,0.0 -80.273877,39.285621,0.0 -80.277153,39.285544,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.268049,39.277145,0.0 -80.269624,39.278699,0.0 -80.267638,39.278933,0.0 -80.266478,39.278879,0.0 -80.263449,39.278241,0.0 -80.26291,39.277282,0.0 -80.263359,39.276529,0.0 -80.268639,39.275132,0.0 -80.269268,39.276392,0.0 -80.268049,39.277145,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.254386,39.277358,0.0 -80.255288,39.279155,0.0 -80.250825,39.279749,0.0 -80.250335,39.279147,0.0 -80.248513,39.278443,0.0 -80.246863,39.277085,0.0 -80.252371,39.27263,0.0 -80.250975,39.269557,0.0 -80.252078,39.269489,0.0 -80.252588,39.272141,0.0 -80.253816,39.273783,0.0 -80.254386,39.277358,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.253417,39.297676,0.0 -80.252896,39.299489,0.0 -80.251849,39.299369,0.0 -80.250674,39.298898,0.0 -80.250401,39.298462,0.0 -80.251962,39.297066,0.0 -80.253417,39.297676,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.245296,39.296308,0.0 -80.244973,39.297731,0.0 -80.244425,39.299624,0.0 -80.242787,39.297929,0.0 -80.241211,39.298258,0.0 -80.240729,39.297321,0.0 -80.242479,39.296669,0.0 -80.241432,39.295701,0.0 -80.242194,39.294501,0.0 -80.242155,39.295753,0.0 -80.243586,39.296032,0.0 -80.245296,39.296308,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.242384,39.289179,0.0 -80.242301,39.290172,0.0 -80.240396,39.291368,0.0 -80.239469,39.293364,0.0 -80.236769,39.29529,0.0 -80.235011,39.294663,0.0 -80.233384,39.295926,0.0 -80.231561,39.295674,0.0 -80.233106,39.2937,0.0 -80.235036,39.288547,0.0 -80.234718,39.287187,0.0 -80.233278,39.286206,0.0 -80.235651,39.285855,0.0 -80.237511,39.286367,0.0 -80.239277,39.288359,0.0 -80.240897,39.289255,0.0 -80.242384,39.289179,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.239463,39.295904,0.0 -80.240256,39.296531,0.0 -80.237145,39.298231,0.0 -80.238453,39.299454,0.0 -80.239658,39.305964,0.0 -80.236191,39.30661,0.0 -80.235903,39.302675,0.0 -80.233347,39.300399,0.0 -80.234432,39.299335,0.0 -80.234842,39.299114,0.0 -80.234043,39.297847,0.0 -80.234611,39.296757,0.0 -80.237005,39.297217,0.0 -80.239463,39.295904,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.234363,39.326768,0.0 -80.233399,39.329,0.0 -80.228961,39.33111,0.0 -80.226502,39.333216,0.0 -80.225367,39.332717,0.0 -80.223906,39.334532,0.0 -80.220843,39.334912,0.0 -80.218633,39.330532,0.0 -80.218643,39.32691,0.0 -80.218395,39.32575,0.0 -80.216889,39.321899,0.0 -80.217359,39.32015,0.0 -80.217343,39.318332,0.0 -80.219563,39.316415,0.0 -80.223202,39.318984,0.0 -80.221613,39.320953,0.0 -80.222892,39.3226,0.0 -80.223449,39.326009,0.0 -80.224233,39.326513,0.0 -80.231262,39.324575,0.0 -80.231612,39.326243,0.0 -80.234363,39.326768,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.230852,39.287616,0.0 -80.229267,39.289809,0.0 -80.22963,39.29065,0.0 -80.226659,39.290365,0.0 -80.228802,39.288905,0.0 -80.230852,39.287616,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.225396,39.291018,0.0 -80.225816,39.292434,0.0 -80.224332,39.294634,0.0 -80.220266,39.293513,0.0 -80.222478,39.293058,0.0 -80.223149,39.2926,0.0 -80.223703,39.291594,0.0 -80.225396,39.291018,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.223221,39.310406,0.0 -80.22503,39.311373,0.0 -80.222603,39.313438,0.0 -80.222542,39.313394,0.0 -80.222109,39.313017,0.0 -80.223221,39.310406,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.224093,39.343474,0.0 -80.223319,39.345994,0.0 -80.222015,39.347694,0.0 -80.219872,39.348086,0.0 -80.221673,39.342951,0.0 -80.224093,39.343474,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.215636,39.294059,0.0 -80.217633,39.294201,0.0 -80.21552,39.29788,0.0 -80.212926,39.299175,0.0 -80.208393,39.296948,0.0 -80.207739,39.297974,0.0 -80.208896,39.298719,0.0 -80.207214,39.299436,0.0 -80.204919,39.297649,0.0 -80.20609,39.296073,0.0 -80.213876,39.295478,0.0 -80.214492,39.295238,0.0 -80.215636,39.294059,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.288391,39.326885,0.0 -80.288575,39.32579,0.0 -80.288381,39.325518,0.0 -80.287853,39.325183,0.0 -80.287572,39.325089,0.0 -80.286854,39.325904,0.0 -80.286869,39.326323,0.0 -80.287074,39.327024,0.0 -80.287689,39.328133,0.0 -80.288341,39.328344,0.0 -80.288391,39.326885,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.306024,39.345308,0.0 -80.306507,39.343059,0.0 -80.303781,39.342042,0.0 -80.299481,39.342489,0.0 -80.301467,39.3403,0.0 -80.301093,39.339207,0.0 -80.299621,39.338162,0.0 -80.298556,39.336572,0.0 -80.29682,39.336798,0.0 -80.295341,39.335713,0.0 -80.292376,39.334216,0.0 -80.290638,39.333506,0.0 -80.289328,39.332255,0.0 -80.289693,39.330267,0.0 -80.288705,39.328733,0.0 -80.289254,39.324153,0.0 -80.288762,39.321986,0.0 -80.285491,39.317893,0.0 -80.285733,39.316399,0.0 -80.28873,39.310877,0.0 -80.28595,39.310235,0.0 -80.285885,39.311758,0.0 -80.284158,39.311516,0.0 -80.284045,39.3115,0.0 -80.282969,39.314983,0.0 -80.284779,39.319373,0.0 -80.28561,39.31957,0.0 -80.287156,39.321326,0.0 -80.287909,39.322732,0.0 -80.288019,39.324099,0.0 -80.287806,39.324874,0.0 -80.288827,39.325873,0.0 -80.288384,39.328453,0.0 -80.287922,39.328723,0.0 -80.288691,39.329005,0.0 -80.289468,39.330128,0.0 -80.289242,39.332305,0.0 -80.290112,39.33329,0.0 -80.295568,39.335932,0.0 -80.297065,39.33714,0.0 -80.297665,39.339957,0.0 -80.296603,39.342118,0.0 -80.300823,39.345497,0.0 -80.301831,39.347283,0.0 -80.304337,39.348344,0.0 -80.303461,39.347791,0.0 -80.302576,39.346696,0.0 -80.306024,39.345308,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Brookhaven&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>10420</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389247</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5410420</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5410420</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Brookhaven</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>23898064</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>137222</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">10420</SimpleData>
<SimpleData name="PLACENS">02389247</SimpleData>
<SimpleData name="AFFGEOID">1600000US5410420</SimpleData>
<SimpleData name="GEOID">5410420</SimpleData>
<SimpleData name="NAME">Brookhaven</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">23898064</SimpleData>
<SimpleData name="AWATER">137222</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.921317,39.60891,0.0 -79.921589,39.608806,0.0 -79.920665,39.607779,0.0 -79.918983,39.607151,0.0 -79.91823,39.602908,0.0 -79.917372,39.602476,0.0 -79.913467,39.603009,0.0 -79.910789,39.603183,0.0 -79.910618,39.599188,0.0 -79.909081,39.599723,0.0 -79.905546,39.598162,0.0 -79.905379,39.596405,0.0 -79.90742,39.595355,0.0 -79.907757,39.594949,0.0 -79.907637,39.594788,0.0 -79.906275,39.589941,0.0 -79.906325,39.588255,0.0 -79.905282,39.58434,0.0 -79.904163,39.582616,0.0 -79.901056,39.580904,0.0 -79.897962,39.580423,0.0 -79.894067,39.579624,0.0 -79.891012,39.578258,0.0 -79.890406,39.578365,0.0 -79.888442,39.57816,0.0 -79.88745,39.581599,0.0 -79.885176,39.582281,0.0 -79.88285,39.584611,0.0 -79.878093,39.587021,0.0 -79.873594,39.588034,0.0 -79.868954,39.584357,0.0 -79.866436,39.5854,0.0 -79.865653,39.587181,0.0 -79.862629,39.590228,0.0 -79.861861,39.591939,0.0 -79.86313,39.59652,0.0 -79.857312,39.600795,0.0 -79.856654,39.602953,0.0 -79.855071,39.604816,0.0 -79.852387,39.604938,0.0 -79.849143,39.606218,0.0 -79.843263,39.603622,0.0 -79.841886,39.604328,0.0 -79.836839,39.603481,0.0 -79.834689,39.602303,0.0 -79.832563,39.600377,0.0 -79.831263,39.600505,0.0 -79.829327,39.604178,0.0 -79.829288,39.606955,0.0 -79.830287,39.607732,0.0 -79.832969,39.607578,0.0 -79.833126,39.610215,0.0 -79.83513,39.614058,0.0 -79.83763,39.615777,0.0 -79.836962,39.617469,0.0 -79.837644,39.619166,0.0 -79.841202,39.619187,0.0 -79.842573,39.617758,0.0 -79.845413,39.616781,0.0 -79.849006,39.616856,0.0 -79.853211,39.619497,0.0 -79.8541,39.622374,0.0 -79.854954,39.624033,0.0 -79.855387,39.624406,0.0 -79.856735,39.625081,0.0 -79.857286,39.625183,0.0 -79.859715,39.625182,0.0 -79.86088,39.625079,0.0 -79.864262,39.626613,0.0 -79.866826,39.626903,0.0 -79.868061,39.625678,0.0 -79.867602,39.624456,0.0 -79.867196,39.622177,0.0 -79.868295,39.61914,0.0 -79.870865,39.618688,0.0 -79.875914,39.616516,0.0 -79.882894,39.616844,0.0 -79.883069,39.619972,0.0 -79.881953,39.622903,0.0 -79.883772,39.624222,0.0 -79.885762,39.629922,0.0 -79.887163,39.629762,0.0 -79.896503,39.629425,0.0 -79.896689,39.629297,0.0 -79.903475,39.627202,0.0 -79.907785,39.624449,0.0 -79.917139,39.616029,0.0 -79.918141,39.614016,0.0 -79.918099,39.613369,0.0 -79.917533,39.611961,0.0 -79.920821,39.609399,0.0 -79.920663,39.609217,0.0 -79.921317,39.60891,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bruceton Mills&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>10852</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390758</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5410852</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5410852</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bruceton Mills</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>143622</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">10852</SimpleData>
<SimpleData name="PLACENS">02390758</SimpleData>
<SimpleData name="AFFGEOID">1600000US5410852</SimpleData>
<SimpleData name="GEOID">5410852</SimpleData>
<SimpleData name="NAME">Bruceton Mills</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">143622</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.642798,39.661011,0.0 -79.642867,39.657561,0.0 -79.639145,39.657691,0.0 -79.638599,39.658615,0.0 -79.638036,39.659933,0.0 -79.637983,39.660394,0.0 -79.638091,39.661019,0.0 -79.642798,39.661011,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bruno&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>10876</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586773</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5410876</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5410876</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bruno</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3366054</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>62102</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">10876</SimpleData>
<SimpleData name="PLACENS">02586773</SimpleData>
<SimpleData name="AFFGEOID">1600000US5410876</SimpleData>
<SimpleData name="GEOID">5410876</SimpleData>
<SimpleData name="NAME">Bruno</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3366054</SimpleData>
<SimpleData name="AWATER">62102</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.888111,37.693243,0.0 -81.888484,37.689253,0.0 -81.881272,37.677754,0.0 -81.881572,37.67697,0.0 -81.881205,37.677349,0.0 -81.869533,37.683773,0.0 -81.854205,37.686225,0.0 -81.855855,37.690529,0.0 -81.859304,37.692831,0.0 -81.861471,37.692988,0.0 -81.867376,37.691965,0.0 -81.871508,37.694069,0.0 -81.871787,37.696163,0.0 -81.888111,37.693243,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Brush Fork&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>10948</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586774</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5410948</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5410948</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Brush Fork</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4923659</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>4374</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">10948</SimpleData>
<SimpleData name="PLACENS">02586774</SimpleData>
<SimpleData name="AFFGEOID">1600000US5410948</SimpleData>
<SimpleData name="GEOID">5410948</SimpleData>
<SimpleData name="NAME">Brush Fork</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">4923659</SimpleData>
<SimpleData name="AWATER">4374</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.260902,37.287143,0.0 -81.260687,37.277386,0.0 -81.256148,37.276898,0.0 -81.256321,37.276721,0.0 -81.258559,37.27538,0.0 -81.244799,37.269655,0.0 -81.226377,37.27631,0.0 -81.228196,37.277253,0.0 -81.227112,37.279672,0.0 -81.229423,37.280022,0.0 -81.229416,37.283571,0.0 -81.22941,37.286837,0.0 -81.238923,37.286837,0.0 -81.2507,37.291037,0.0 -81.254481,37.290659,0.0 -81.25469,37.291049,0.0 -81.254597,37.29078,0.0 -81.25451,37.289365,0.0 -81.254691,37.288904,0.0 -81.260902,37.287143,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Buckhannon&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>11188</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390570</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5411188</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5411188</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Buckhannon</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>7596424</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">11188</SimpleData>
<SimpleData name="PLACENS">02390570</SimpleData>
<SimpleData name="AFFGEOID">1600000US5411188</SimpleData>
<SimpleData name="GEOID">5411188</SimpleData>
<SimpleData name="NAME">Buckhannon</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">7596424</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.273983,39.005569,0.0 -80.275147,39.005096,0.0 -80.267104,39.00359,0.0 -80.267317,39.001451,0.0 -80.264536,39.001314,0.0 -80.264399,39.002043,0.0 -80.263206,39.003226,0.0 -80.258751,39.002788,0.0 -80.257212,39.001396,0.0 -80.255103,39.000918,0.0 -80.249,38.99668,0.0 -80.251467,38.995581,0.0 -80.254098,38.995374,0.0 -80.254573,38.997285,0.0 -80.256551,38.997773,0.0 -80.259355,38.997032,0.0 -80.257993,38.995422,0.0 -80.259165,38.994953,0.0 -80.262465,38.992798,0.0 -80.264022,38.994899,0.0 -80.267785,38.994149,0.0 -80.269398,38.994466,0.0 -80.266923,38.989272,0.0 -80.265089,38.989889,0.0 -80.263162,38.990067,0.0 -80.26334,38.991354,0.0 -80.262447,38.992706,0.0 -80.259122,38.994873,0.0 -80.257205,38.995437,0.0 -80.252664,38.99531,0.0 -80.251029,38.9956,0.0 -80.249887,38.995978,0.0 -80.248887,38.996611,0.0 -80.246665,38.995883,0.0 -80.242816,38.995509,0.0 -80.242324,38.996073,0.0 -80.240558,38.99641,0.0 -80.239763,38.996003,0.0 -80.237817,38.995215,0.0 -80.235568,38.993075,0.0 -80.235768,38.992362,0.0 -80.237309,38.990981,0.0 -80.237372,38.990931,0.0 -80.237563,38.990783,0.0 -80.237627,38.990734,0.0 -80.237659,38.990787,0.0 -80.237671,38.990802,0.0 -80.240362,38.989001,0.0 -80.243418,38.988113,0.0 -80.242893,38.986574,0.0 -80.241932,38.985922,0.0 -80.240946,38.986278,0.0 -80.238774,38.98688,0.0 -80.238724,38.986712,0.0 -80.238654,38.985606,0.0 -80.23897,38.985577,0.0 -80.238961,38.985478,0.0 -80.238604,38.985455,0.0 -80.231731,38.984641,0.0 -80.229085,38.980527,0.0 -80.230047,38.978517,0.0 -80.235443,38.978783,0.0 -80.235485,38.978741,0.0 -80.235559,38.978671,0.0 -80.235619,38.978718,0.0 -80.235666,38.978755,0.0 -80.236435,38.977943,0.0 -80.234517,38.975732,0.0 -80.231207,38.977314,0.0 -80.230951,38.977141,0.0 -80.229005,38.977489,0.0 -80.228917,38.977676,0.0 -80.228761,38.978145,0.0 -80.228424,38.978925,0.0 -80.225423,38.977427,0.0 -80.226022,38.974658,0.0 -80.227471,38.974044,0.0 -80.224973,38.971887,0.0 -80.224574,38.972216,0.0 -80.221522,38.97597,0.0 -80.220418,38.978116,0.0 -80.218591,38.979273,0.0 -80.217745,38.977756,0.0 -80.215542,38.977199,0.0 -80.214076,38.98037,0.0 -80.214805,38.980625,0.0 -80.21841,38.979467,0.0 -80.216649,38.981114,0.0 -80.212889,38.987682,0.0 -80.2123,38.988303,0.0 -80.210289,38.987587,0.0 -80.208558,38.987768,0.0 -80.207852,38.98825,0.0 -80.206756,38.989491,0.0 -80.208414,38.990291,0.0 -80.212053,38.989208,0.0 -80.211971,38.991882,0.0 -80.212134,38.992572,0.0 -80.212797,38.992887,0.0 -80.2148,38.993389,0.0 -80.21472,38.993606,0.0 -80.212839,38.993736,0.0 -80.214504,38.995648,0.0 -80.213541,38.996512,0.0 -80.211603,38.997559,0.0 -80.208899,38.997238,0.0 -80.195957,38.991062,0.0 -80.195725,38.991724,0.0 -80.194975,38.992773,0.0 -80.209797,38.999343,0.0 -80.207436,39.000598,0.0 -80.208618,39.004879,0.0 -80.2091,39.005256,0.0 -80.20945,39.004407,0.0 -80.214937,39.006553,0.0 -80.214428,39.007184,0.0 -80.216658,39.007988,0.0 -80.217362,39.006849,0.0 -80.212665,39.00551,0.0 -80.212518,39.002943,0.0 -80.217079,39.001526,0.0 -80.224557,39.003123,0.0 -80.224258,39.004738,0.0 -80.227221,39.004648,0.0 -80.227128,39.003093,0.0 -80.23204,39.002566,0.0 -80.232267,39.005055,0.0 -80.232878,39.005161,0.0 -80.232805,39.006098,0.0 -80.234319,39.007588,0.0 -80.233702,39.008838,0.0 -80.236607,39.008778,0.0 -80.238002,39.007331,0.0 -80.236014,39.006154,0.0 -80.235159,39.002473,0.0 -80.236538,39.002394,0.0 -80.237043,39.005383,0.0 -80.240718,39.005377,0.0 -80.240157,38.999471,0.0 -80.239536,38.999256,0.0 -80.240781,38.997332,0.0 -80.242066,38.996953,0.0 -80.245602,38.996815,0.0 -80.248381,38.997463,0.0 -80.251227,38.999433,0.0 -80.251602,39.000842,0.0 -80.254858,39.003438,0.0 -80.256334,39.003896,0.0 -80.263337,39.003527,0.0 -80.268952,39.004373,0.0 -80.273983,39.005569,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Bud&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>11212</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586775</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5411212</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5411212</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Bud</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>8086651</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>64514</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">11212</SimpleData>
<SimpleData name="PLACENS">02586775</SimpleData>
<SimpleData name="AFFGEOID">1600000US5411212</SimpleData>
<SimpleData name="GEOID">5411212</SimpleData>
<SimpleData name="NAME">Bud</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">8086651</SimpleData>
<SimpleData name="AWATER">64514</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.402453,37.539316,0.0 -81.401868,37.536446,0.0 -81.396437,37.536411,0.0 -81.396569,37.533292,0.0 -81.393816,37.532491,0.0 -81.394245,37.530454,0.0 -81.393566,37.528747,0.0 -81.393882,37.526277,0.0 -81.392625,37.523306,0.0 -81.390249,37.521763,0.0 -81.388841,37.521801,0.0 -81.387715,37.520632,0.0 -81.386274,37.521063,0.0 -81.383331,37.519569,0.0 -81.38369,37.518459,0.0 -81.382198,37.516409,0.0 -81.382448,37.514623,0.0 -81.381594,37.513466,0.0 -81.376043,37.515554,0.0 -81.3734,37.518147,0.0 -81.371249,37.519247,0.0 -81.369519,37.521605,0.0 -81.367181,37.522072,0.0 -81.36705,37.523053,0.0 -81.36674,37.524198,0.0 -81.364857,37.523952,0.0 -81.363842,37.522249,0.0 -81.36107,37.523657,0.0 -81.360077,37.525098,0.0 -81.358711,37.525395,0.0 -81.373202,37.539656,0.0 -81.374234,37.540666,0.0 -81.376442,37.549461,0.0 -81.380807,37.547062,0.0 -81.384976,37.545953,0.0 -81.387191,37.546449,0.0 -81.387512,37.548222,0.0 -81.388629,37.549386,0.0 -81.390581,37.549837,0.0 -81.394416,37.54788,0.0 -81.400226,37.548109,0.0 -81.400414,37.544554,0.0 -81.40125,37.542131,0.0 -81.400347,37.540453,0.0 -81.4013,37.53822,0.0 -81.401474,37.53982,0.0 -81.402453,37.539316,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Buffalo&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>11284</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390760</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5411284</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5411284</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Buffalo</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3625737</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>639219</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">11284</SimpleData>
<SimpleData name="PLACENS">02390760</SimpleData>
<SimpleData name="AFFGEOID">1600000US5411284</SimpleData>
<SimpleData name="GEOID">5411284</SimpleData>
<SimpleData name="NAME">Buffalo</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">3625737</SimpleData>
<SimpleData name="AWATER">639219</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.997905,38.60787,0.0 -81.99696,38.607375,0.0 -81.993248,38.60549,0.0 -81.99261,38.604194,0.0 -81.995084,38.600968,0.0 -81.997186,38.594326,0.0 -81.9972,38.592774,0.0 -81.995618,38.586487,0.0 -81.994018,38.586581,0.0 -81.993336,38.590947,0.0 -81.996777,38.591978,0.0 -81.996882,38.594272,0.0 -81.994814,38.600849,0.0 -81.988454,38.598601,0.0 -81.983602,38.605244,0.0 -81.98316,38.605114,0.0 -81.969445,38.600896,0.0 -81.968809,38.60445,0.0 -81.971609,38.605205,0.0 -81.970502,38.608104,0.0 -81.971615,38.608894,0.0 -81.974664,38.607998,0.0 -81.975787,38.61234,0.0 -81.977105,38.612828,0.0 -81.974855,38.615795,0.0 -81.969487,38.624071,0.0 -81.967125,38.622788,0.0 -81.966313,38.623069,0.0 -81.96486,38.624662,0.0 -81.965046,38.625014,0.0 -81.96821,38.626044,0.0 -81.969055,38.62613,0.0 -81.975265,38.628108,0.0 -81.97642,38.628436,0.0 -81.979263,38.624807,0.0 -81.982412,38.621401,0.0 -81.986988,38.617338,0.0 -81.989928,38.615101,0.0 -81.994748,38.610347,0.0 -81.997905,38.60787,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.990623,38.606404,0.0 -81.989882,38.607349,0.0 -81.988612,38.606895,0.0 -81.989146,38.605778,0.0 -81.990623,38.606404,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Burlington&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>11620</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586776</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5411620</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5411620</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Burlington</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3175929</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">11620</SimpleData>
<SimpleData name="PLACENS">02586776</SimpleData>
<SimpleData name="AFFGEOID">1600000US5411620</SimpleData>
<SimpleData name="GEOID">5411620</SimpleData>
<SimpleData name="NAME">Burlington</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3175929</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.93527,39.345812,0.0 -78.933622,39.343147,0.0 -78.932368,39.340096,0.0 -78.931595,39.339924,0.0 -78.93181,39.338994,0.0 -78.931847,39.329507,0.0 -78.930098,39.329439,0.0 -78.916475,39.325686,0.0 -78.915794,39.326665,0.0 -78.916615,39.330007,0.0 -78.916242,39.332567,0.0 -78.914739,39.33508,0.0 -78.910709,39.337146,0.0 -78.908217,39.339472,0.0 -78.906302,39.340114,0.0 -78.904299,39.34292,0.0 -78.9045,39.343673,0.0 -78.906542,39.342828,0.0 -78.907398,39.341236,0.0 -78.912129,39.342055,0.0 -78.919638,39.344264,0.0 -78.923697,39.344737,0.0 -78.927473,39.345566,0.0 -78.93527,39.345812,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Burnsville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>11716</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390763</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5411716</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5411716</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Burnsville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2737712</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>85429</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">11716</SimpleData>
<SimpleData name="PLACENS">02390763</SimpleData>
<SimpleData name="AFFGEOID">1600000US5411716</SimpleData>
<SimpleData name="GEOID">5411716</SimpleData>
<SimpleData name="NAME">Burnsville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2737712</SimpleData>
<SimpleData name="AWATER">85429</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.667427,38.858435,0.0 -80.667928,38.857321,0.0 -80.666274,38.852206,0.0 -80.659125,38.850854,0.0 -80.644063,38.848932,0.0 -80.644496,38.851377,0.0 -80.63979,38.850032,0.0 -80.640743,38.85241,0.0 -80.650912,38.855211,0.0 -80.652569,38.859019,0.0 -80.640536,38.86368,0.0 -80.639828,38.866817,0.0 -80.64315,38.86727,0.0 -80.643408,38.868424,0.0 -80.64647,38.868063,0.0 -80.649501,38.86764,0.0 -80.656523,38.862864,0.0 -80.659992,38.863731,0.0 -80.663261,38.86141,0.0 -80.663901,38.859493,0.0 -80.667427,38.858435,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cairo&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>12124</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390764</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5412124</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5412124</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cairo</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1223220</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>36737</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">12124</SimpleData>
<SimpleData name="PLACENS">02390764</SimpleData>
<SimpleData name="AFFGEOID">1600000US5412124</SimpleData>
<SimpleData name="GEOID">5412124</SimpleData>
<SimpleData name="NAME">Cairo</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1223220</SimpleData>
<SimpleData name="AWATER">36737</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.161818,39.208845,0.0 -81.161609,39.205373,0.0 -81.157323,39.200831,0.0 -81.151328,39.201726,0.0 -81.144944,39.206469,0.0 -81.14855,39.208844,0.0 -81.149912,39.211986,0.0 -81.158442,39.21192,0.0 -81.161818,39.208845,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Camden-on-Gauley&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>12436</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390766</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5412436</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5412436</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Camden-on-Gauley</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>841987</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>20809</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">12436</SimpleData>
<SimpleData name="PLACENS">02390766</SimpleData>
<SimpleData name="AFFGEOID">1600000US5412436</SimpleData>
<SimpleData name="GEOID">5412436</SimpleData>
<SimpleData name="NAME">Camden-on-Gauley</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">841987</SimpleData>
<SimpleData name="AWATER">20809</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.606178,38.372103,0.0 -80.606124,38.371614,0.0 -80.604016,38.368199,0.0 -80.603883,38.366308,0.0 -80.593039,38.365347,0.0 -80.588182,38.369853,0.0 -80.589597,38.37102,0.0 -80.606178,38.372103,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cameron&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>12484</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390572</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5412484</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5412484</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cameron</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2224176</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>31130</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">12484</SimpleData>
<SimpleData name="PLACENS">02390572</SimpleData>
<SimpleData name="AFFGEOID">1600000US5412484</SimpleData>
<SimpleData name="GEOID">5412484</SimpleData>
<SimpleData name="NAME">Cameron</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">2224176</SimpleData>
<SimpleData name="AWATER">31130</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.584554,39.82874,0.0 -80.583724,39.828476,0.0 -80.582089,39.825218,0.0 -80.572601,39.822955,0.0 -80.568909,39.823239,0.0 -80.556318,39.821815,0.0 -80.561295,39.824572,0.0 -80.561981,39.825768,0.0 -80.550999,39.826048,0.0 -80.550534,39.827718,0.0 -80.554527,39.829001,0.0 -80.563665,39.829234,0.0 -80.560857,39.835202,0.0 -80.561531,39.835287,0.0 -80.563146,39.835636,0.0 -80.563706,39.833178,0.0 -80.568195,39.833296,0.0 -80.57395,39.831636,0.0 -80.574569,39.833058,0.0 -80.574208,39.835633,0.0 -80.57528,39.835985,0.0 -80.575429,39.832295,0.0 -80.576248,39.830778,0.0 -80.582673,39.832801,0.0 -80.584554,39.82874,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Capon Bridge&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>13108</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390769</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5413108</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5413108</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Capon Bridge</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1736249</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>68659</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">13108</SimpleData>
<SimpleData name="PLACENS">02390769</SimpleData>
<SimpleData name="AFFGEOID">1600000US5413108</SimpleData>
<SimpleData name="GEOID">5413108</SimpleData>
<SimpleData name="NAME">Capon Bridge</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1736249</SimpleData>
<SimpleData name="AWATER">68659</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.442592,39.30182,0.0 -78.441794,39.297031,0.0 -78.437931,39.293445,0.0 -78.429563,39.291744,0.0 -78.426788,39.296358,0.0 -78.425577,39.297748,0.0 -78.42464,39.298489,0.0 -78.426704,39.299384,0.0 -78.425913,39.30131,0.0 -78.429916,39.302872,0.0 -78.429552,39.307101,0.0 -78.427864,39.309237,0.0 -78.4334,39.309827,0.0 -78.433582,39.3056,0.0 -78.436769,39.306805,0.0 -78.43676,39.30519,0.0 -78.440516,39.302845,0.0 -78.441459,39.302641,0.0 -78.442592,39.30182,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Carolina&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>13468</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586777</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5413468</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5413468</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Carolina</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2150363</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>2047</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">13468</SimpleData>
<SimpleData name="PLACENS">02586777</SimpleData>
<SimpleData name="AFFGEOID">1600000US5413468</SimpleData>
<SimpleData name="GEOID">5413468</SimpleData>
<SimpleData name="NAME">Carolina</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2150363</SimpleData>
<SimpleData name="AWATER">2047</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.282904,39.484533,0.0 -80.283022,39.482879,0.0 -80.279876,39.480365,0.0 -80.279745,39.478751,0.0 -80.276561,39.477998,0.0 -80.276463,39.476937,0.0 -80.274501,39.475715,0.0 -80.273738,39.473583,0.0 -80.272393,39.472573,0.0 -80.270503,39.468224,0.0 -80.268389,39.467376,0.0 -80.263461,39.472117,0.0 -80.261528,39.474645,0.0 -80.265001,39.477855,0.0 -80.266464,39.480302,0.0 -80.272901,39.484841,0.0 -80.275577,39.490233,0.0 -80.27715,39.491237,0.0 -80.279698,39.491642,0.0 -80.281317,39.489709,0.0 -80.281088,39.487118,0.0 -80.282904,39.484533,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Carpendale&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>13525</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390771</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5413525</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5413525</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Carpendale</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3397820</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">13525</SimpleData>
<SimpleData name="PLACENS">02390771</SimpleData>
<SimpleData name="AFFGEOID">1600000US5413525</SimpleData>
<SimpleData name="GEOID">5413525</SimpleData>
<SimpleData name="NAME">Carpendale</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">3397820</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.80082,39.628901,0.0 -78.801741,39.627488,0.0 -78.795964,39.614205,0.0 -78.7959451590799,39.6140945150744,0.0 -78.795466,39.614006,0.0 -78.786302,39.618043,0.0 -78.783088,39.624914,0.0 -78.782369,39.626258,0.0 -78.775189,39.639687,0.0 -78.777702,39.640419,0.0 -78.7783924134169,39.6410890361622,0.0 -78.781341,39.636787,0.0 -78.784041,39.636687,0.0 -78.790941,39.638287,0.0 -78.7945895776023,39.6370086110267,0.0 -78.7948177157633,39.6369286759558,0.0 -78.795282,39.636766,0.0 -78.794097,39.634559,0.0 -78.796752,39.632103,0.0 -78.797397,39.629455,0.0 -78.798647,39.628708,0.0 -78.80082,39.628901,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cass&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>13684</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586778</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5413684</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5413684</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cass</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2048140</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">13684</SimpleData>
<SimpleData name="PLACENS">02586778</SimpleData>
<SimpleData name="AFFGEOID">1600000US5413684</SimpleData>
<SimpleData name="GEOID">5413684</SimpleData>
<SimpleData name="NAME">Cass</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2048140</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.936275,38.397542,0.0 -79.93248,38.395702,0.0 -79.930077,38.395172,0.0 -79.927433,38.395674,0.0 -79.922525,38.393293,0.0 -79.919951,38.389452,0.0 -79.912829,38.387316,0.0 -79.912642,38.388087,0.0 -79.907181,38.387086,0.0 -79.905238,38.389165,0.0 -79.907986,38.389489,0.0 -79.915494,38.392904,0.0 -79.913617,38.395702,0.0 -79.913895,38.39633,0.0 -79.909744,38.40049,0.0 -79.911104,38.401078,0.0 -79.913074,38.403258,0.0 -79.916285,38.404849,0.0 -79.917656,38.407221,0.0 -79.919215,38.407958,0.0 -79.917644,38.402854,0.0 -79.922295,38.401028,0.0 -79.936275,38.397542,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cassville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>13756</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389284</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5413756</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5413756</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cassville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9183067</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>14591</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">13756</SimpleData>
<SimpleData name="PLACENS">02389284</SimpleData>
<SimpleData name="AFFGEOID">1600000US5413756</SimpleData>
<SimpleData name="GEOID">5413756</SimpleData>
<SimpleData name="NAME">Cassville</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">9183067</SimpleData>
<SimpleData name="AWATER">14591</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.097177,39.666933,0.0 -80.094997,39.665131,0.0 -80.089286,39.666447,0.0 -80.085861,39.668275,0.0 -80.082512,39.670939,0.0 -80.08012,39.669821,0.0 -80.077612,39.667144,0.0 -80.07512,39.666844,0.0 -80.071074,39.664114,0.0 -80.067804,39.664201,0.0 -80.068824,39.663565,0.0 -80.064226,39.663641,0.0 -80.057629,39.6614,0.0 -80.051007,39.664035,0.0 -80.044144,39.662826,0.0 -80.042399,39.663212,0.0 -80.042339,39.66733,0.0 -80.042507,39.66957,0.0 -80.043742,39.671848,0.0 -80.0457,39.672893,0.0 -80.047051,39.675277,0.0 -80.047732,39.678386,0.0 -80.049758,39.68027,0.0 -80.051046,39.682749,0.0 -80.058397,39.684,0.0 -80.060526,39.68613,0.0 -80.064365,39.686288,0.0 -80.067529,39.687974,0.0 -80.06782,39.689115,0.0 -80.070306,39.692367,0.0 -80.072168,39.692822,0.0 -80.074692,39.691141,0.0 -80.075795,39.691373,0.0 -80.088113,39.679588,0.0 -80.097177,39.666933,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cedar Grove&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>13924</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390774</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5413924</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5413924</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cedar Grove</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1856249</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">13924</SimpleData>
<SimpleData name="PLACENS">02390774</SimpleData>
<SimpleData name="AFFGEOID">1600000US5413924</SimpleData>
<SimpleData name="GEOID">5413924</SimpleData>
<SimpleData name="NAME">Cedar Grove</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1856249</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.455115,38.225305,0.0 -81.455873,38.222709,0.0 -81.454184,38.220113,0.0 -81.450689,38.219156,0.0 -81.450372,38.218777,0.0 -81.446392,38.220896,0.0 -81.441455,38.222024,0.0 -81.4391,38.221915,0.0 -81.437094,38.221251,0.0 -81.433821,38.219254,0.0 -81.429587,38.215101,0.0 -81.427923,38.21627,0.0 -81.42692,38.217441,0.0 -81.425408,38.215721,0.0 -81.424694,38.215829,0.0 -81.424736,38.218032,0.0 -81.419981,38.223731,0.0 -81.41996,38.227044,0.0 -81.420892,38.227365,0.0 -81.421688,38.227629,0.0 -81.425181,38.224135,0.0 -81.427181,38.222823,0.0 -81.429116,38.225704,0.0 -81.431257,38.225125,0.0 -81.430573,38.222359,0.0 -81.436525,38.223175,0.0 -81.441725,38.222711,0.0 -81.443104,38.224152,0.0 -81.44401,38.22721,0.0 -81.44714,38.228075,0.0 -81.450051,38.227575,0.0 -81.455115,38.225305,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Century&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14212</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586779</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414212</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414212</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Century</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>340387</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14212</SimpleData>
<SimpleData name="PLACENS">02586779</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414212</SimpleData>
<SimpleData name="GEOID">5414212</SimpleData>
<SimpleData name="NAME">Century</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">340387</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.19239,39.100003,0.0 -80.190703,39.098517,0.0 -80.187242,39.097565,0.0 -80.183731,39.098406,0.0 -80.182531,39.099937,0.0 -80.185622,39.100323,0.0 -80.190424,39.104639,0.0 -80.19239,39.100003,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Ceredo&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14308</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390573</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414308</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414308</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Ceredo</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3964125</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>1885683</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14308</SimpleData>
<SimpleData name="PLACENS">02390573</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414308</SimpleData>
<SimpleData name="GEOID">5414308</SimpleData>
<SimpleData name="NAME">Ceredo</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">3964125</SimpleData>
<SimpleData name="AWATER">1885683</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.574416,38.385867,0.0 -82.575264,38.3858,0.0 -82.573647,38.384716,0.0 -82.567196,38.38264,0.0 -82.561798,38.381665,0.0 -82.554807,38.380973,0.0 -82.553146,38.383702,0.0 -82.555162,38.387552,0.0 -82.554912,38.389947,0.0 -82.552194,38.390176,0.0 -82.5473,38.391367,0.0 -82.545728,38.391903,0.0 -82.534207,38.393684,0.0 -82.525369,38.394597,0.0 -82.525395,38.394881,0.0 -82.525428,38.39533,0.0 -82.528711,38.395209,0.0 -82.536623,38.394497,0.0 -82.546021,38.392921,0.0 -82.548064,38.392352,0.0 -82.555125,38.391141,0.0 -82.554834,38.392363,0.0 -82.549518,38.392761,0.0 -82.540912,38.394358,0.0 -82.533131,38.395464,0.0 -82.526208,38.39598,0.0 -82.526315,38.396221,0.0 -82.528991,38.396091,0.0 -82.540372,38.394653,0.0 -82.549478,38.393004,0.0 -82.554754,38.392586,0.0 -82.554621,38.393201,0.0 -82.55078,38.39339,0.0 -82.550246,38.394511,0.0 -82.54882,38.393696,0.0 -82.544088,38.394464,0.0 -82.542405,38.395107,0.0 -82.541176,38.396154,0.0 -82.536285,38.395576,0.0 -82.5302,38.396522,0.0 -82.529432,38.39623,0.0 -82.525995,38.396349,0.0 -82.526021,38.396553,0.0 -82.529831,38.39645,0.0 -82.530033,38.396729,0.0 -82.53015,38.396707,0.0 -82.536264,38.395866,0.0 -82.540977,38.39638,0.0 -82.539306,38.398237,0.0 -82.536019,38.396067,0.0 -82.53366,38.396539,0.0 -82.530522,38.400042,0.0 -82.528436,38.401744,0.0 -82.5293290908971,38.4052459007797,0.0 -82.529579,38.405182,0.0 -82.5368479907873,38.4041443549874,0.0 -82.540199,38.403666,0.0 -82.5439147063637,38.4034864075258,0.0 -82.549799,38.403202,0.0 -82.56059,38.404715,0.0 -82.571613,38.405138,0.0 -82.572707,38.403542,0.0 -82.573315,38.402148,0.0 -82.565509,38.399914,0.0 -82.565456,38.399638,0.0 -82.565252,38.398251,0.0 -82.565497,38.396182,0.0 -82.56558,38.395389,0.0 -82.565324,38.393001,0.0 -82.565619,38.392347,0.0 -82.565994,38.391998,0.0 -82.566951,38.391586,0.0 -82.568001,38.391538,0.0 -82.567398,38.391359,0.0 -82.565826,38.391063,0.0 -82.566063,38.390695,0.0 -82.565787,38.390468,0.0 -82.571599,38.391509,0.0 -82.574136,38.390857,0.0 -82.573868,38.39008,0.0 -82.573314,38.388905,0.0 -82.574416,38.385867,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Chapmanville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14524</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390776</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414524</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414524</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Chapmanville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1701581</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>60857</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14524</SimpleData>
<SimpleData name="PLACENS">02390776</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414524</SimpleData>
<SimpleData name="GEOID">5414524</SimpleData>
<SimpleData name="NAME">Chapmanville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1701581</SimpleData>
<SimpleData name="AWATER">60857</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.035857,37.971672,0.0 -82.034906,37.972135,0.0 -82.033539,37.972604,0.0 -82.032284,37.969986,0.0 -82.032316,37.96753,0.0 -82.028717,37.966596,0.0 -82.02734,37.968363,0.0 -82.026989,37.970248,0.0 -82.028979,37.973157,0.0 -82.028255,37.97457,0.0 -82.024222,37.976201,0.0 -82.022142,37.975764,0.0 -82.02211,37.975574,0.0 -82.020239,37.975368,0.0 -82.020527,37.973752,0.0 -82.020649,37.97366,0.0 -82.020997,37.971884,0.0 -82.023566,37.968302,0.0 -82.022259,37.966036,0.0 -82.022197,37.965974,0.0 -82.020938,37.964791,0.0 -82.020448,37.962117,0.0 -82.020394,37.961648,0.0 -82.018602,37.95986,0.0 -82.018482,37.959934,0.0 -82.017787,37.960479,0.0 -82.019657,37.962868,0.0 -82.019713,37.964948,0.0 -82.018338,37.965552,0.0 -82.016972,37.964773,0.0 -82.01765,37.966539,0.0 -82.0156,37.967957,0.0 -82.015424,37.970178,0.0 -82.01561,37.971954,0.0 -82.013663,37.974086,0.0 -82.005333,37.971612,0.0 -82.006334,37.973827,0.0 -82.009367,37.975032,0.0 -82.014135,37.975335,0.0 -82.017672,37.98083,0.0 -82.017469,37.982484,0.0 -82.019044,37.98244,0.0 -82.01846,37.980801,0.0 -82.019046,37.979582,0.0 -82.024811,37.978936,0.0 -82.027506,37.978121,0.0 -82.026354,37.976648,0.0 -82.027687,37.976347,0.0 -82.028731,37.977656,0.0 -82.032968,37.97441,0.0 -82.035857,37.971672,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Charles Town&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14610</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390574</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414610</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414610</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Charles Town</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>15133200</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14610</SimpleData>
<SimpleData name="PLACENS">02390574</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414610</SimpleData>
<SimpleData name="GEOID">5414610</SimpleData>
<SimpleData name="NAME">Charles Town</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">15133200</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-77.826049,39.289966,0.0 -77.825677,39.288872,0.0 -77.823614,39.288722,0.0 -77.82208,39.287615,0.0 -77.820719,39.291686,0.0 -77.821224,39.291635,0.0 -77.820629,39.293816,0.0 -77.821968,39.294066,0.0 -77.822607,39.294185,0.0 -77.823504,39.292067,0.0 -77.823737,39.291351,0.0 -77.825086,39.29119,0.0 -77.826049,39.289966,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-77.903246,39.263719,0.0 -77.904124,39.261989,0.0 -77.901288,39.261219,0.0 -77.899953,39.260083,0.0 -77.897979,39.259702,0.0 -77.88713,39.261142,0.0 -77.887691,39.261693,0.0 -77.886679,39.262494,0.0 -77.885648,39.261566,0.0 -77.886592,39.260698,0.0 -77.88306,39.258618,0.0 -77.882868,39.256519,0.0 -77.877004,39.259007,0.0 -77.876789,39.258539,0.0 -77.882147,39.255504,0.0 -77.873585,39.250665,0.0 -77.870318,39.254003,0.0 -77.873847,39.255967,0.0 -77.87419,39.257104,0.0 -77.876547,39.258637,0.0 -77.868676,39.260946,0.0 -77.865735,39.261538,0.0 -77.865615,39.261927,0.0 -77.864747,39.261826,0.0 -77.86454,39.262231,0.0 -77.861527,39.263394,0.0 -77.863021,39.260155,0.0 -77.863889,39.260142,0.0 -77.864364,39.258786,0.0 -77.860992,39.256488,0.0 -77.855633,39.261335,0.0 -77.85331,39.260338,0.0 -77.849193,39.255988,0.0 -77.848278,39.258135,0.0 -77.844451,39.268988,0.0 -77.8408,39.266597,0.0 -77.839123,39.264922,0.0 -77.836033,39.266025,0.0 -77.832125,39.265796,0.0 -77.828104,39.281086,0.0 -77.825677,39.288872,0.0 -77.828462,39.289532,0.0 -77.830715,39.283424,0.0 -77.830182,39.284902,0.0 -77.833287,39.285476,0.0 -77.831881,39.289705,0.0 -77.833472,39.291566,0.0 -77.833002,39.292875,0.0 -77.834357,39.293451,0.0 -77.834982,39.293965,0.0 -77.836393,39.291657,0.0 -77.838631,39.295312,0.0 -77.835504,39.295863,0.0 -77.832229,39.296775,0.0 -77.822008,39.300609,0.0 -77.820793,39.300346,0.0 -77.815734,39.302144,0.0 -77.815367,39.300832,0.0 -77.812732,39.301363,0.0 -77.812729,39.302614,0.0 -77.816061,39.303071,0.0 -77.816178,39.303327,0.0 -77.816233,39.303504,0.0 -77.81635,39.304046,0.0 -77.823205,39.300973,0.0 -77.833394,39.297449,0.0 -77.83585,39.296448,0.0 -77.837288,39.296265,0.0 -77.841609,39.295869,0.0 -77.843688,39.295259,0.0 -77.84862,39.292971,0.0 -77.849219,39.29456,0.0 -77.851356,39.293696,0.0 -77.851385,39.292045,0.0 -77.853498,39.292905,0.0 -77.854375,39.294756,0.0 -77.854785,39.294741,0.0 -77.861515,39.292408,0.0 -77.865284,39.291104,0.0 -77.867533,39.291382,0.0 -77.86751,39.290325,0.0 -77.870083,39.289481,0.0 -77.870723,39.28708,0.0 -77.871713,39.285057,0.0 -77.86825,39.286219,0.0 -77.865471,39.281459,0.0 -77.867135,39.278485,0.0 -77.870698,39.267627,0.0 -77.871964,39.266049,0.0 -77.874336,39.268431,0.0 -77.876903,39.270144,0.0 -77.873789,39.27454,0.0 -77.878599,39.275582,0.0 -77.878381,39.277028,0.0 -77.880769,39.276487,0.0 -77.881684,39.280239,0.0 -77.882631,39.280458,0.0 -77.879299,39.282483,0.0 -77.873132,39.284575,0.0 -77.870849,39.288545,0.0 -77.872159,39.288969,0.0 -77.875254,39.283895,0.0 -77.879846,39.282298,0.0 -77.883557,39.280307,0.0 -77.888458,39.279825,0.0 -77.895231,39.281423,0.0 -77.896766,39.284154,0.0 -77.898273,39.284178,0.0 -77.895976,39.28121,0.0 -77.902834,39.277856,0.0 -77.903199,39.275863,0.0 -77.903262,39.269535,0.0 -77.902366,39.267736,0.0 -77.899082,39.267256,0.0 -77.899276,39.264321,0.0 -77.903246,39.263719,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.876674,39.259419,0.0 -77.876683,39.260188,0.0 -77.874059,39.263299,0.0 -77.873146,39.262199,0.0 -77.870543,39.261482,0.0 -77.869004,39.264723,0.0 -77.872092,39.265589,0.0 -77.870802,39.267144,0.0 -77.870331,39.268076,0.0 -77.869288,39.267587,0.0 -77.870141,39.266082,0.0 -77.870197,39.265096,0.0 -77.86748,39.2644,0.0 -77.867049,39.264331,0.0 -77.863934,39.263575,0.0 -77.864028,39.263382,0.0 -77.864473,39.26312,0.0 -77.865381,39.262957,0.0 -77.866474,39.263004,0.0 -77.86718,39.26318,0.0 -77.866454,39.262429,0.0 -77.876674,39.259419,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.869168,39.271155,0.0 -77.868014,39.274923,0.0 -77.867401,39.27387,0.0 -77.864323,39.273422,0.0 -77.864038,39.274834,0.0 -77.867944,39.275411,0.0 -77.8669,39.278713,0.0 -77.866428,39.279709,0.0 -77.856951,39.277655,0.0 -77.855804,39.278549,0.0 -77.855221,39.279679,0.0 -77.853535,39.278677,0.0 -77.854704,39.276916,0.0 -77.852964,39.27594,0.0 -77.855713,39.273377,0.0 -77.856675,39.271241,0.0 -77.860038,39.271884,0.0 -77.860915,39.269619,0.0 -77.869168,39.271155,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.854358,39.280034,0.0 -77.854623,39.280486,0.0 -77.852548,39.281067,0.0 -77.852374,39.279579,0.0 -77.853395,39.280301,0.0 -77.854358,39.280034,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.851219,39.27787,0.0 -77.85083,39.279174,0.0 -77.85064,39.281938,0.0 -77.849962,39.281807,0.0 -77.850027,39.281611,0.0 -77.84782,39.280878,0.0 -77.846458,39.280509,0.0 -77.848459,39.28055,0.0 -77.84976,39.277157,0.0 -77.851219,39.27787,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.849873,39.282072,0.0 -77.850551,39.282206,0.0 -77.848931,39.286927,0.0 -77.84851,39.292855,0.0 -77.845855,39.293118,0.0 -77.846311,39.291456,0.0 -77.845599,39.290048,0.0 -77.841914,39.289953,0.0 -77.842288,39.2886,0.0 -77.845547,39.288786,0.0 -77.845477,39.287329,0.0 -77.847079,39.286334,0.0 -77.845887,39.286658,0.0 -77.842106,39.286398,0.0 -77.837602,39.285096,0.0 -77.834949,39.283748,0.0 -77.838096,39.277993,0.0 -77.836828,39.277618,0.0 -77.839296,39.270602,0.0 -77.840613,39.271357,0.0 -77.841919,39.270431,0.0 -77.844522,39.272093,0.0 -77.843284,39.273861,0.0 -77.841672,39.272732,0.0 -77.839587,39.278434,0.0 -77.840143,39.278602,0.0 -77.845975,39.280718,0.0 -77.845238,39.28285,0.0 -77.848025,39.283425,0.0 -77.849828,39.282208,0.0 -77.849873,39.282072,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.847919,39.274361,0.0 -77.847705,39.275315,0.0 -77.846916,39.276753,0.0 -77.846355,39.276625,0.0 -77.847071,39.275177,0.0 -77.847919,39.274361,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.847103,39.273794,0.0 -77.845953,39.274161,0.0 -77.845648,39.273355,0.0 -77.84457,39.272673,0.0 -77.844002,39.273207,0.0 -77.844526,39.272265,0.0 -77.847103,39.273794,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.845706,39.292823,0.0 -77.845751,39.293781,0.0 -77.843974,39.294261,0.0 -77.843804,39.293029,0.0 -77.844547,39.292612,0.0 -77.845706,39.292823,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.845294,39.291619,0.0 -77.845361,39.292618,0.0 -77.840881,39.291794,0.0 -77.840915,39.29138,0.0 -77.841499,39.291017,0.0 -77.845294,39.291619,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.843154,39.293043,0.0 -77.843479,39.294413,0.0 -77.842165,39.294661,0.0 -77.841665,39.293057,0.0 -77.842392,39.292941,0.0 -77.843154,39.293043,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-77.841584,39.292002,0.0 -77.840685,39.29276,0.0 -77.840665,39.293594,0.0 -77.839772,39.293396,0.0 -77.839802,39.291709,0.0 -77.841584,39.292002,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Charleston&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14600</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390575</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414600</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414600</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Charleston</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>81586955</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>2948456</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14600</SimpleData>
<SimpleData name="PLACENS">02390575</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414600</SimpleData>
<SimpleData name="GEOID">5414600</SimpleData>
<SimpleData name="NAME">Charleston</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">81586955</SimpleData>
<SimpleData name="AWATER">2948456</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.727777,38.309751,0.0 -81.727737,38.309673,0.0 -81.725487,38.308342,0.0 -81.726681,38.307678,0.0 -81.72512,38.304874,0.0 -81.721814,38.306295,0.0 -81.718237,38.305487,0.0 -81.716525,38.306239,0.0 -81.717894,38.307528,0.0 -81.715152,38.30909,0.0 -81.712938,38.30775,0.0 -81.712853,38.307611,0.0 -81.712752,38.307705,0.0 -81.712413,38.307799,0.0 -81.711687,38.307912,0.0 -81.711622,38.307942,0.0 -81.70985,38.308536,0.0 -81.70598,38.309209,0.0 -81.704458,38.309692,0.0 -81.703599,38.310652,0.0 -81.704359,38.31313,0.0 -81.709672,38.314419,0.0 -81.712054,38.313807,0.0 -81.708742,38.317536,0.0 -81.707535,38.319804,0.0 -81.712197,38.319654,0.0 -81.709213,38.321731,0.0 -81.709891,38.323604,0.0 -81.714623,38.322928,0.0 -81.714692,38.323553,0.0 -81.712682,38.325662,0.0 -81.712383,38.326196,0.0 -81.711454,38.326654,0.0 -81.711279,38.326995,0.0 -81.711081,38.327702,0.0 -81.711592,38.328831,0.0 -81.711034,38.329461,0.0 -81.710281,38.329541,0.0 -81.709859,38.329681,0.0 -81.709761,38.330042,0.0 -81.710669,38.329917,0.0 -81.709566,38.334035,0.0 -81.710066,38.33529,0.0 -81.705819,38.339072,0.0 -81.705164,38.340213,0.0 -81.705047,38.339827,0.0 -81.702203,38.340992,0.0 -81.702325,38.340139,0.0 -81.702339,38.340046,0.0 -81.703013,38.340075,0.0 -81.703672,38.337843,0.0 -81.701501,38.336419,0.0 -81.700576,38.333083,0.0 -81.699879,38.332229,0.0 -81.69872,38.332221,0.0 -81.697341,38.333857,0.0 -81.693818,38.332729,0.0 -81.693525,38.334164,0.0 -81.694561,38.334688,0.0 -81.692966,38.336134,0.0 -81.687711,38.336559,0.0 -81.68906,38.335733,0.0 -81.690846,38.331786,0.0 -81.686359,38.331812,0.0 -81.685456,38.330899,0.0 -81.685293,38.331766,0.0 -81.683069,38.331554,0.0 -81.682936,38.331196,0.0 -81.678001,38.329168,0.0 -81.67686,38.328123,0.0 -81.67381,38.332891,0.0 -81.671473,38.332583,0.0 -81.67608,38.328076,0.0 -81.676836,38.327109,0.0 -81.677582,38.326521,0.0 -81.675416,38.326076,0.0 -81.674318,38.326356,0.0 -81.674239,38.327093,0.0 -81.671964,38.327464,0.0 -81.671351,38.32827,0.0 -81.670513,38.328719,0.0 -81.669342,38.327514,0.0 -81.668303,38.328341,0.0 -81.665546,38.328429,0.0 -81.667335,38.329775,0.0 -81.666538,38.330673,0.0 -81.665572,38.329896,0.0 -81.664205,38.32922,0.0 -81.661397,38.330085,0.0 -81.663406,38.328013,0.0 -81.665129,38.32721,0.0 -81.667732,38.327603,0.0 -81.667312,38.326065,0.0 -81.669016,38.325094,0.0 -81.669452,38.323132,0.0 -81.666823,38.322489,0.0 -81.664058,38.323349,0.0 -81.662645,38.324561,0.0 -81.659581,38.32434,0.0 -81.657529,38.325095,0.0 -81.659559,38.327174,0.0 -81.655578,38.329406,0.0 -81.653886,38.32932,0.0 -81.654613,38.326593,0.0 -81.653096,38.323399,0.0 -81.65706,38.321141,0.0 -81.657135,38.318715,0.0 -81.658296,38.314974,0.0 -81.657806,38.313939,0.0 -81.655807,38.309702,0.0 -81.65151,38.311694,0.0 -81.652442,38.313274,0.0 -81.646187,38.312189,0.0 -81.640256,38.309568,0.0 -81.639635,38.307573,0.0 -81.640698,38.30668,0.0 -81.638819,38.306074,0.0 -81.634929,38.310117,0.0 -81.639821,38.314525,0.0 -81.63153,38.315181,0.0 -81.624056,38.321087,0.0 -81.616459,38.316797,0.0 -81.617569,38.317098,0.0 -81.623234,38.310556,0.0 -81.620752,38.310449,0.0 -81.620554,38.309187,0.0 -81.61902,38.309084,0.0 -81.618601,38.307487,0.0 -81.614606,38.306419,0.0 -81.613611,38.308879,0.0 -81.610692,38.311502,0.0 -81.611478,38.313946,0.0 -81.608743,38.312399,0.0 -81.612942,38.3065,0.0 -81.615681,38.302144,0.0 -81.613427,38.301437,0.0 -81.606439,38.302927,0.0 -81.601227,38.304927,0.0 -81.601202,38.303764,0.0 -81.597407,38.304582,0.0 -81.59769,38.302986,0.0 -81.594802,38.301747,0.0 -81.593171,38.302338,0.0 -81.593587,38.305251,0.0 -81.589306,38.307217,0.0 -81.588869,38.306685,0.0 -81.589774,38.305561,0.0 -81.589628,38.303719,0.0 -81.589118,38.302835,0.0 -81.587261,38.302257,0.0 -81.587047,38.302403,0.0 -81.587141,38.30285,0.0 -81.588213,38.303959,0.0 -81.588322,38.304219,0.0 -81.588328,38.305233,0.0 -81.587675,38.304872,0.0 -81.586171,38.304893,0.0 -81.586329,38.303865,0.0 -81.585773,38.301591,0.0 -81.588899,38.298754,0.0 -81.599757,38.299118,0.0 -81.598786,38.301192,0.0 -81.60197,38.300442,0.0 -81.606313,38.29996,0.0 -81.606798,38.296343,0.0 -81.610328,38.293983,0.0 -81.61078,38.293228,0.0 -81.607931,38.291262,0.0 -81.60699,38.291164,0.0 -81.603473,38.294166,0.0 -81.603665,38.294466,0.0 -81.601491,38.297601,0.0 -81.603126,38.298503,0.0 -81.603172,38.299728,0.0 -81.602144,38.29968,0.0 -81.601787,38.298079,0.0 -81.59907,38.296602,0.0 -81.596679,38.295902,0.0 -81.596859,38.295229,0.0 -81.592505,38.295573,0.0 -81.591947,38.295002,0.0 -81.594134,38.29375,0.0 -81.594866,38.292634,0.0 -81.595269,38.291067,0.0 -81.595121,38.289045,0.0 -81.598652,38.287104,0.0 -81.599653,38.285309,0.0 -81.59997,38.284342,0.0 -81.600714,38.28406,0.0 -81.601853,38.284266,0.0 -81.602618,38.284064,0.0 -81.602617,38.282398,0.0 -81.600708,38.282249,0.0 -81.599307,38.281139,0.0 -81.5985,38.281452,0.0 -81.599316,38.285384,0.0 -81.595324,38.283621,0.0 -81.594606,38.284739,0.0 -81.596941,38.285569,0.0 -81.596933,38.287538,0.0 -81.593847,38.287545,0.0 -81.59342,38.292516,0.0 -81.594179,38.29336,0.0 -81.591615,38.294668,0.0 -81.591654,38.295075,0.0 -81.587576,38.296434,0.0 -81.588669,38.298614,0.0 -81.585564,38.301076,0.0 -81.586094,38.304987,0.0 -81.586023,38.305115,0.0 -81.58749,38.305077,0.0 -81.587733,38.305156,0.0 -81.588192,38.305431,0.0 -81.588498,38.305404,0.0 -81.588602,38.305144,0.0 -81.588359,38.303756,0.0 -81.587406,38.302507,0.0 -81.58915,38.303355,0.0 -81.589451,38.305592,0.0 -81.588519,38.306625,0.0 -81.588687,38.30707,0.0 -81.589131,38.307363,0.0 -81.587843,38.310299,0.0 -81.584244,38.308641,0.0 -81.582706,38.303312,0.0 -81.580915,38.302723,0.0 -81.579634,38.30349,0.0 -81.579747,38.304707,0.0 -81.581059,38.304867,0.0 -81.581635,38.307571,0.0 -81.577643,38.305999,0.0 -81.574243,38.302699,0.0 -81.569513,38.305174,0.0 -81.568378,38.299984,0.0 -81.569328,38.29428,0.0 -81.567564,38.293751,0.0 -81.564555,38.292987,0.0 -81.5636,38.292748,0.0 -81.560405,38.297993,0.0 -81.559345,38.303838,0.0 -81.560411,38.31004,0.0 -81.560572,38.311096,0.0 -81.562472,38.316705,0.0 -81.562671,38.316935,0.0 -81.567608,38.320701,0.0 -81.577401,38.32722,0.0 -81.580552,38.3289,0.0 -81.581206,38.329117,0.0 -81.582269,38.329483,0.0 -81.58683,38.331669,0.0 -81.586488,38.33238,0.0 -81.586421,38.33254,0.0 -81.586023,38.333052,0.0 -81.582003,38.33143,0.0 -81.580993,38.330863,0.0 -81.579113,38.331126,0.0 -81.57621,38.333368,0.0 -81.575195,38.333165,0.0 -81.575106,38.333226,0.0 -81.57491,38.334278,0.0 -81.576022,38.336219,0.0 -81.573232,38.339272,0.0 -81.576901,38.337311,0.0 -81.57665,38.34047,0.0 -81.57761,38.341738,0.0 -81.583368,38.339974,0.0 -81.583619,38.336754,0.0 -81.584835,38.333509,0.0 -81.586326,38.333814,0.0 -81.586541,38.335631,0.0 -81.584998,38.339526,0.0 -81.582661,38.340731,0.0 -81.581476,38.344604,0.0 -81.580121,38.344831,0.0 -81.578187,38.346073,0.0 -81.577044,38.346634,0.0 -81.576885,38.346891,0.0 -81.575551,38.348898,0.0 -81.568288,38.351677,0.0 -81.567688,38.35214,0.0 -81.566203,38.355238,0.0 -81.566594,38.356863,0.0 -81.568889,38.35956,0.0 -81.569963,38.36201,0.0 -81.570221,38.36411,0.0 -81.57288,38.365689,0.0 -81.575038,38.367821,0.0 -81.57592,38.367762,0.0 -81.580603,38.36632,0.0 -81.581992,38.366423,0.0 -81.581818,38.366539,0.0 -81.578456,38.36985,0.0 -81.575967,38.371241,0.0 -81.573779,38.370154,0.0 -81.571535,38.370854,0.0 -81.571469,38.370877,0.0 -81.571338,38.370803,0.0 -81.570643,38.371123,0.0 -81.569903,38.371731,0.0 -81.569652,38.371822,0.0 -81.569282,38.37181,0.0 -81.568779,38.371979,0.0 -81.568444,38.372224,0.0 -81.567353,38.372591,0.0 -81.568734,38.372953,0.0 -81.569369,38.375645,0.0 -81.569282,38.375682,0.0 -81.571439,38.377762,0.0 -81.576058,38.375775,0.0 -81.57791,38.375772,0.0 -81.577312,38.37506,0.0 -81.58139,38.372689,0.0 -81.582049,38.367223,0.0 -81.583077,38.366139,0.0 -81.58371,38.366224,0.0 -81.583829,38.366187,0.0 -81.58388,38.366094,0.0 -81.583742,38.365981,0.0 -81.583804,38.365655,0.0 -81.583781,38.365556,0.0 -81.583986,38.365439,0.0 -81.584153,38.36453,0.0 -81.585398,38.360871,0.0 -81.585865,38.360548,0.0 -81.587421,38.359667,0.0 -81.592974,38.358404,0.0 -81.593538,38.358648,0.0 -81.593908,38.359397,0.0 -81.594207,38.359753,0.0 -81.594945,38.364549,0.0 -81.595887,38.365901,0.0 -81.597283,38.366214,0.0 -81.59931,38.36575,0.0 -81.599738,38.365686,0.0 -81.600261,38.365681,0.0 -81.600469,38.365729,0.0 -81.600791,38.365876,0.0 -81.601079,38.366213,0.0 -81.601429,38.366961,0.0 -81.601829,38.367121,0.0 -81.602247,38.366992,0.0 -81.604715,38.366549,0.0 -81.607559,38.365853,0.0 -81.608364,38.365724,0.0 -81.610495,38.365731,0.0 -81.610405,38.365841,0.0 -81.610619,38.367549,0.0 -81.610763,38.372715,0.0 -81.611652,38.374727,0.0 -81.615388,38.374738,0.0 -81.617925,38.374143,0.0 -81.618913,38.37453,0.0 -81.619513,38.377815,0.0 -81.622539,38.381064,0.0 -81.624948,38.382203,0.0 -81.624894,38.383947,0.0 -81.622945,38.38629,0.0 -81.619782,38.388272,0.0 -81.619558,38.389024,0.0 -81.622166,38.389984,0.0 -81.62255,38.391392,0.0 -81.62511,38.3936,0.0 -81.62495,38.394736,0.0 -81.621542,38.397184,0.0 -81.621926,38.398736,0.0 -81.621062,38.400768,0.0 -81.624822,38.401264,0.0 -81.629286,38.405759,0.0 -81.632358,38.405391,0.0 -81.633206,38.404351,0.0 -81.639943,38.402623,0.0 -81.642967,38.400527,0.0 -81.646903,38.400767,0.0 -81.648567,38.402975,0.0 -81.651403,38.401904,0.0 -81.652773,38.402031,0.0 -81.655328,38.399552,0.0 -81.658281,38.399004,0.0 -81.663688,38.399194,0.0 -81.667784,38.401751,0.0 -81.673207,38.399032,0.0 -81.673801,38.396879,0.0 -81.677735,38.394191,0.0 -81.678975,38.3944,0.0 -81.682739,38.393941,0.0 -81.688201,38.390049,0.0 -81.690928,38.390008,0.0 -81.691913,38.386714,0.0 -81.695129,38.384276,0.0 -81.697032,38.383775,0.0 -81.7002,38.378271,0.0 -81.702096,38.376829,0.0 -81.703079,38.376703,0.0 -81.705059,38.376242,0.0 -81.705816,38.376175,0.0 -81.706312,38.375951,0.0 -81.706357,38.375774,0.0 -81.706717,38.375007,0.0 -81.707081,38.37276,0.0 -81.707156,38.372489,0.0 -81.706989,38.371478,0.0 -81.700964,38.37383,0.0 -81.696093,38.374634,0.0 -81.690503,38.374248,0.0 -81.688493,38.373453,0.0 -81.679741,38.372398,0.0 -81.66827,38.366935,0.0 -81.668967,38.366013,0.0 -81.671309,38.362157,0.0 -81.671729,38.359615,0.0 -81.674446,38.358096,0.0 -81.672536,38.350863,0.0 -81.670943,38.351109,0.0 -81.670133,38.35126,0.0 -81.669779,38.34978,0.0 -81.668699,38.348049,0.0 -81.670758,38.347168,0.0 -81.669788,38.345832,0.0 -81.671324,38.346799,0.0 -81.67355,38.345166,0.0 -81.677035,38.345809,0.0 -81.677316,38.344912,0.0 -81.684353,38.345529,0.0 -81.68531,38.340698,0.0 -81.685848,38.3452,0.0 -81.686953,38.344592,0.0 -81.685981,38.341216,0.0 -81.688699,38.344029,0.0 -81.689641,38.343593,0.0 -81.68809,38.340856,0.0 -81.688484,38.339976,0.0 -81.691815,38.339395,0.0 -81.695147,38.339118,0.0 -81.69688,38.34045,0.0 -81.704015,38.343964,0.0 -81.702893,38.34273,0.0 -81.703691,38.341712,0.0 -81.704866,38.34102,0.0 -81.705008,38.340804,0.0 -81.705362,38.340544,0.0 -81.706024,38.34103,0.0 -81.710067,38.336154,0.0 -81.711274,38.334341,0.0 -81.712147,38.330213,0.0 -81.712608,38.329966,0.0 -81.716854,38.330797,0.0 -81.717308,38.328919,0.0 -81.717362,38.324994,0.0 -81.717049,38.324501,0.0 -81.715508,38.323579,0.0 -81.716499,38.321597,0.0 -81.715134,38.320531,0.0 -81.715674,38.318228,0.0 -81.718546,38.318431,0.0 -81.718926,38.319308,0.0 -81.723538,38.316032,0.0 -81.723364,38.3142,0.0 -81.725422,38.312164,0.0 -81.724814,38.311948,0.0 -81.727777,38.309751,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.679318,38.337054,0.0 -81.679323,38.338013,0.0 -81.678713,38.338044,0.0 -81.678483,38.338324,0.0 -81.678469,38.339213,0.0 -81.67552,38.338637,0.0 -81.67541,38.337941,0.0 -81.675923,38.337223,0.0 -81.677116,38.336683,0.0 -81.677683,38.336763,0.0 -81.678296,38.336604,0.0 -81.679318,38.337054,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Charlton Heights&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14630</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586780</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414630</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414630</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Charlton Heights</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1072688</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>193835</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14630</SimpleData>
<SimpleData name="PLACENS">02586780</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414630</SimpleData>
<SimpleData name="GEOID">5414630</SimpleData>
<SimpleData name="NAME">Charlton Heights</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1072688</SimpleData>
<SimpleData name="AWATER">193835</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.243686,38.12903,0.0 -81.244717,38.126829,0.0 -81.243548,38.123303,0.0 -81.242737,38.123297,0.0 -81.23759,38.122619,0.0 -81.228848,38.121571,0.0 -81.223108,38.123257,0.0 -81.220814,38.125263,0.0 -81.222402,38.1252,0.0 -81.221961,38.12571,0.0 -81.223781,38.126695,0.0 -81.224256,38.128542,0.0 -81.236671,38.128353,0.0 -81.243686,38.12903,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Chattaroy&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14692</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389306</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414692</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414692</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Chattaroy</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5282651</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14692</SimpleData>
<SimpleData name="PLACENS">02389306</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414692</SimpleData>
<SimpleData name="GEOID">5414692</SimpleData>
<SimpleData name="NAME">Chattaroy</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">5282651</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.2975369216655,37.7034940303458,0.0 -82.296634,37.702403,0.0 -82.2969716188482,37.7011394944409,0.0 -82.295247,37.700696,0.0 -82.295991,37.699768,0.0 -82.297367,37.698755,0.0 -82.295478,37.696995,0.0 -82.275478,37.699601,0.0 -82.263978,37.693851,0.0 -82.256825,37.694552,0.0 -82.256825,37.700162,0.0 -82.264959,37.701845,0.0 -82.262076,37.708971,0.0 -82.26325,37.708815,0.0 -82.263445,37.711758,0.0 -82.259826,37.716322,0.0 -82.259875,37.71885,0.0 -82.261273,37.718692,0.0 -82.264098,37.71716,0.0 -82.266114,37.719129,0.0 -82.269917,37.720962,0.0 -82.272261,37.720867,0.0 -82.275633,37.718939,0.0 -82.278254,37.716946,0.0 -82.279863,37.714874,0.0 -82.280298,37.713218,0.0 -82.281763,37.711769,0.0 -82.28179,37.705351,0.0 -82.2975369216655,37.7034940303458,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Chauncey&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14716</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586781</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414716</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414716</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Chauncey</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3722489</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>20378</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14716</SimpleData>
<SimpleData name="PLACENS">02586781</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414716</SimpleData>
<SimpleData name="GEOID">5414716</SimpleData>
<SimpleData name="NAME">Chauncey</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3722489</SimpleData>
<SimpleData name="AWATER">20378</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.000947,37.774272,0.0 -82.001081,37.771182,0.0 -81.999143,37.770134,0.0 -81.997202,37.767437,0.0 -81.993946,37.766512,0.0 -81.98979,37.765333,0.0 -81.989719,37.765396,0.0 -81.988199,37.765051,0.0 -81.990695,37.763029,0.0 -81.984854,37.754617,0.0 -81.979379,37.753662,0.0 -81.970966,37.755627,0.0 -81.973854,37.772881,0.0 -81.991253,37.773771,0.0 -82.000947,37.774272,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cheat Lake&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14775</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389307</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414775</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414775</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cheat Lake</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>37062456</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>3940081</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14775</SimpleData>
<SimpleData name="PLACENS">02389307</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414775</SimpleData>
<SimpleData name="GEOID">5414775</SimpleData>
<SimpleData name="NAME">Cheat Lake</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">37062456</SimpleData>
<SimpleData name="AWATER">3940081</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.901322,39.629537,0.0 -79.903475,39.627202,0.0 -79.896689,39.629297,0.0 -79.896503,39.629425,0.0 -79.887163,39.629762,0.0 -79.885762,39.629922,0.0 -79.883772,39.624222,0.0 -79.881953,39.622903,0.0 -79.883069,39.619972,0.0 -79.882894,39.616844,0.0 -79.875914,39.616516,0.0 -79.870865,39.618688,0.0 -79.868295,39.61914,0.0 -79.867196,39.622177,0.0 -79.867602,39.624456,0.0 -79.868061,39.625678,0.0 -79.866826,39.626903,0.0 -79.863994,39.629733,0.0 -79.861197,39.631986,0.0 -79.858406,39.633382,0.0 -79.854429,39.633027,0.0 -79.853044,39.633534,0.0 -79.851976,39.635285,0.0 -79.851559,39.638662,0.0 -79.850033,39.639033,0.0 -79.847983,39.640964,0.0 -79.844274,39.642169,0.0 -79.840747,39.643917,0.0 -79.841308,39.647304,0.0 -79.842737,39.649287,0.0 -79.844823,39.65387,0.0 -79.84414,39.654054,0.0 -79.844708,39.655969,0.0 -79.843692,39.657256,0.0 -79.840779,39.65788,0.0 -79.834106,39.655286,0.0 -79.826312,39.657753,0.0 -79.820874,39.661226,0.0 -79.820969,39.661762,0.0 -79.820529,39.662006,0.0 -79.819434,39.662157,0.0 -79.818141,39.662162,0.0 -79.815768,39.66161,0.0 -79.815142,39.661302,0.0 -79.814446,39.660426,0.0 -79.813842,39.660032,0.0 -79.812727,39.659647,0.0 -79.812021,39.65967,0.0 -79.822186,39.689023,0.0 -79.820025,39.691891,0.0 -79.816103,39.693695,0.0 -79.815072,39.695608,0.0 -79.816709,39.69723,0.0 -79.818206,39.699738,0.0 -79.816282,39.701717,0.0 -79.818374,39.70189,0.0 -79.820754,39.700743,0.0 -79.824637,39.701192,0.0 -79.828401,39.700597,0.0 -79.828865,39.70125,0.0 -79.829471,39.703378,0.0 -79.830841,39.705004,0.0 -79.831912,39.706007,0.0 -79.837915,39.709404,0.0 -79.841072,39.710352,0.0 -79.840209,39.711733,0.0 -79.840429,39.713723,0.0 -79.839699,39.715771,0.0 -79.840731,39.715781,0.0 -79.842406,39.714503,0.0 -79.843075,39.712746,0.0 -79.844712,39.712687,0.0 -79.847201,39.714875,0.0 -79.849035,39.717211,0.0 -79.851963,39.719187,0.0 -79.852166,39.72019,0.0 -79.8536939925397,39.7207146095175,0.0 -79.8573819400102,39.7207251528471,0.0 -79.8580319370733,39.7207270110984,0.0 -79.85781,39.720107,0.0 -79.853795,39.716926,0.0 -79.849075,39.713121,0.0 -79.847017,39.709901,0.0 -79.84658,39.706584,0.0 -79.850888,39.70221,0.0 -79.85646,39.699692,0.0 -79.860742,39.69856,0.0 -79.874779,39.696982,0.0 -79.879858,39.696006,0.0 -79.88243,39.695534,0.0 -79.886595,39.694267,0.0 -79.89005,39.692756,0.0 -79.89175,39.691454,0.0 -79.893779,39.688459,0.0 -79.894658,39.687498,0.0 -79.894684,39.687498,0.0 -79.895577,39.685988,0.0 -79.895653,39.685836,0.0 -79.895869,39.685095,0.0 -79.895828,39.684301,0.0 -79.895629,39.683957,0.0 -79.894518,39.682963,0.0 -79.888996,39.683142,0.0 -79.882028,39.68441,0.0 -79.879712,39.684184,0.0 -79.876236,39.683458,0.0 -79.871167,39.680043,0.0 -79.865486,39.672989,0.0 -79.862671,39.669638,0.0 -79.862972,39.669534,0.0 -79.869874,39.667136,0.0 -79.8741,39.665334,0.0 -79.882334,39.66104,0.0 -79.884114,39.659462,0.0 -79.889114,39.653614,0.0 -79.893556,39.64835,0.0 -79.894659,39.646606,0.0 -79.901322,39.629537,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Chelyan&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>14812</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586782</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5414812</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5414812</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Chelyan</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1044493</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>69315</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">14812</SimpleData>
<SimpleData name="PLACENS">02586782</SimpleData>
<SimpleData name="AFFGEOID">1600000US5414812</SimpleData>
<SimpleData name="GEOID">5414812</SimpleData>
<SimpleData name="NAME">Chelyan</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1044493</SimpleData>
<SimpleData name="AWATER">69315</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.512102,38.200998,0.0 -81.512799,38.200456,0.0 -81.505637,38.196253,0.0 -81.501391,38.1934,0.0 -81.500019,38.192866,0.0 -81.498475,38.192575,0.0 -81.490631,38.192696,0.0 -81.480555,38.195546,0.0 -81.479154,38.195534,0.0 -81.478674,38.196514,0.0 -81.479786,38.198715,0.0 -81.484205,38.198999,0.0 -81.489781,38.197691,0.0 -81.497313,38.196704,0.0 -81.499074,38.196674,0.0 -81.506416,38.197958,0.0 -81.507961,38.198456,0.0 -81.512102,38.200998,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Chesapeake&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>15028</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390782</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5415028</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5415028</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Chesapeake</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1246784</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>416290</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">15028</SimpleData>
<SimpleData name="PLACENS">02390782</SimpleData>
<SimpleData name="AFFGEOID">1600000US5415028</SimpleData>
<SimpleData name="GEOID">5415028</SimpleData>
<SimpleData name="NAME">Chesapeake</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1246784</SimpleData>
<SimpleData name="AWATER">416290</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.550731,38.233044,0.0 -81.550401,38.232158,0.0 -81.550719,38.231079,0.0 -81.543162,38.225396,0.0 -81.53312,38.217302,0.0 -81.527978,38.212394,0.0 -81.527396,38.212644,0.0 -81.524271,38.213919,0.0 -81.522299,38.21536,0.0 -81.522848,38.216743,0.0 -81.524752,38.218757,0.0 -81.531841,38.223347,0.0 -81.540527,38.228809,0.0 -81.547485,38.234871,0.0 -81.549007,38.236019,0.0 -81.550731,38.233044,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Chester&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>15076</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390576</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5415076</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5415076</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Chester</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2587584</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">15076</SimpleData>
<SimpleData name="PLACENS">02390576</SimpleData>
<SimpleData name="AFFGEOID">1600000US5415076</SimpleData>
<SimpleData name="GEOID">5415076</SimpleData>
<SimpleData name="NAME">Chester</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">2587584</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.581446,40.610785,0.0 -80.581529,40.609561,0.0 -80.57916,40.604468,0.0 -80.577812,40.604315,0.0 -80.574715,40.605645,0.0 -80.564153,40.607214,0.0 -80.562431,40.607158,0.0 -80.560161,40.607691,0.0 -80.555827,40.610109,0.0 -80.55409,40.611145,0.0 -80.558838,40.614224,0.0 -80.55733,40.613971,0.0 -80.554626,40.611989,0.0 -80.553624,40.612256,0.0 -80.5538,40.611285,0.0 -80.549792,40.609325,0.0 -80.549665,40.611366,0.0 -80.550177,40.61249,0.0 -80.551361,40.612919,0.0 -80.549953,40.616578,0.0 -80.547132,40.623637,0.0 -80.546927,40.624191,0.0 -80.547081,40.624287,0.0 -80.547859,40.62438,0.0 -80.548526,40.624698,0.0 -80.549008,40.624696,0.0 -80.549375,40.624474,0.0 -80.560404,40.618056,0.0 -80.563193,40.616765,0.0 -80.568216,40.613563,0.0 -80.573483,40.611714,0.0 -80.579255,40.611239,0.0 -80.581239,40.611525,0.0 -80.581446,40.610785,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Clarksburg&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>15628</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390577</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5415628</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5415628</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Clarksburg</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>25202268</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>3888</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">15628</SimpleData>
<SimpleData name="PLACENS">02390577</SimpleData>
<SimpleData name="AFFGEOID">1600000US5415628</SimpleData>
<SimpleData name="GEOID">5415628</SimpleData>
<SimpleData name="NAME">Clarksburg</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">25202268</SimpleData>
<SimpleData name="AWATER">3888</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.288691,39.329005,0.0 -80.287922,39.328723,0.0 -80.280318,39.327925,0.0 -80.280337,39.327014,0.0 -80.276444,39.324721,0.0 -80.272934,39.326194,0.0 -80.271456,39.32507,0.0 -80.274701,39.323455,0.0 -80.272506,39.320764,0.0 -80.269439,39.320742,0.0 -80.269201,39.315217,0.0 -80.264497,39.313278,0.0 -80.264936,39.312423,0.0 -80.264755,39.312485,0.0 -80.264484,39.312592,0.0 -80.264176,39.312677,0.0 -80.260424,39.319659,0.0 -80.259305,39.320772,0.0 -80.25856,39.319373,0.0 -80.254956,39.317853,0.0 -80.248182,39.323294,0.0 -80.249659,39.325094,0.0 -80.250745,39.327577,0.0 -80.251806,39.328783,0.0 -80.251183,39.329616,0.0 -80.246199,39.329119,0.0 -80.24517,39.334796,0.0 -80.247355,39.334546,0.0 -80.24689,39.336117,0.0 -80.248883,39.336191,0.0 -80.252353,39.33193,0.0 -80.25861,39.331365,0.0 -80.259199,39.330896,0.0 -80.264847,39.334569,0.0 -80.267646,39.334392,0.0 -80.270423,39.333338,0.0 -80.27157,39.333949,0.0 -80.27598,39.329784,0.0 -80.278716,39.329918,0.0 -80.280201,39.328136,0.0 -80.288691,39.329005,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.399215,39.277881,0.0 -80.400745,39.276208,0.0 -80.396682,39.274294,0.0 -80.391467,39.274014,0.0 -80.388659,39.271862,0.0 -80.386029,39.270654,0.0 -80.385433,39.269222,0.0 -80.383505,39.268327,0.0 -80.381718,39.268803,0.0 -80.380995,39.268027,0.0 -80.379327,39.266308,0.0 -80.380568,39.263769,0.0 -80.37934,39.263427,0.0 -80.37836,39.264408,0.0 -80.378195,39.262417,0.0 -80.375449,39.262381,0.0 -80.374949,39.264149,0.0 -80.372825,39.263703,0.0 -80.368992,39.266,0.0 -80.366627,39.266306,0.0 -80.3641,39.263793,0.0 -80.363753,39.262834,0.0 -80.362959,39.263814,0.0 -80.367061,39.268606,0.0 -80.369638,39.270541,0.0 -80.369518,39.271995,0.0 -80.372128,39.273724,0.0 -80.371296,39.274399,0.0 -80.368987,39.273405,0.0 -80.368947,39.274112,0.0 -80.367763,39.272959,0.0 -80.366526,39.271491,0.0 -80.363751,39.268687,0.0 -80.362692,39.266597,0.0 -80.358152,39.267125,0.0 -80.354612,39.268519,0.0 -80.354074,39.268579,0.0 -80.353075,39.267983,0.0 -80.352809,39.267512,0.0 -80.351954,39.266581,0.0 -80.350859,39.266518,0.0 -80.349264,39.266256,0.0 -80.349391,39.265995,0.0 -80.351809,39.265929,0.0 -80.352965,39.263729,0.0 -80.35282,39.261536,0.0 -80.35239,39.261239,0.0 -80.357744,39.2581,0.0 -80.357011,39.256762,0.0 -80.353383,39.254521,0.0 -80.35158,39.255306,0.0 -80.348729,39.253936,0.0 -80.345763,39.254046,0.0 -80.341559,39.249929,0.0 -80.338267,39.251189,0.0 -80.337407,39.25009,0.0 -80.336121,39.251194,0.0 -80.333077,39.253806,0.0 -80.333408,39.25462,0.0 -80.336944,39.263675,0.0 -80.340719,39.263379,0.0 -80.340756,39.265026,0.0 -80.340647,39.26803,0.0 -80.342641,39.268673,0.0 -80.341799,39.270181,0.0 -80.336283,39.267159,0.0 -80.336927,39.266895,0.0 -80.337324,39.266183,0.0 -80.335795,39.266476,0.0 -80.335275,39.265456,0.0 -80.334524,39.26573,0.0 -80.333991,39.265069,0.0 -80.332062,39.265963,0.0 -80.331456,39.264944,0.0 -80.328194,39.266142,0.0 -80.328913,39.268038,0.0 -80.327083,39.269632,0.0 -80.326891,39.269773,0.0 -80.326661,39.269936,0.0 -80.326313,39.270247,0.0 -80.326299,39.270235,0.0 -80.326623,39.269891,0.0 -80.32706,39.269617,0.0 -80.326785,39.269436,0.0 -80.325811,39.26879,0.0 -80.32718,39.267452,0.0 -80.326395,39.266916,0.0 -80.324366,39.265781,0.0 -80.32412,39.265597,0.0 -80.325237,39.264401,0.0 -80.325201,39.262582,0.0 -80.32347,39.262655,0.0 -80.320951,39.267232,0.0 -80.319687,39.266584,0.0 -80.31767,39.266089,0.0 -80.314843,39.264916,0.0 -80.314637,39.265611,0.0 -80.314348,39.26783,0.0 -80.314189,39.269114,0.0 -80.31535,39.274764,0.0 -80.315823,39.275239,0.0 -80.31783,39.27627,0.0 -80.318222,39.27615,0.0 -80.318574,39.276255,0.0 -80.318414,39.276426,0.0 -80.318884,39.276551,0.0 -80.318884,39.276725,0.0 -80.318183,39.276706,0.0 -80.317227,39.276682,0.0 -80.316306,39.276659,0.0 -80.298208,39.27594,0.0 -80.296033,39.27609,0.0 -80.288165,39.276527,0.0 -80.288147,39.275794,0.0 -80.286433,39.273037,0.0 -80.287686,39.261443,0.0 -80.282847,39.261451,0.0 -80.283626,39.264665,0.0 -80.281216,39.266314,0.0 -80.283096,39.268321,0.0 -80.280208,39.268478,0.0 -80.279955,39.268781,0.0 -80.28611,39.268856,0.0 -80.285399,39.269676,0.0 -80.275993,39.276247,0.0 -80.275693,39.276463,0.0 -80.277635,39.277052,0.0 -80.277539,39.278948,0.0 -80.277912,39.280599,0.0 -80.277703,39.282216,0.0 -80.281274,39.281966,0.0 -80.282117,39.281277,0.0 -80.28072,39.283771,0.0 -80.280717,39.284936,0.0 -80.279591,39.287963,0.0 -80.27924,39.289635,0.0 -80.278474,39.289765,0.0 -80.27801,39.291571,0.0 -80.277441,39.292383,0.0 -80.278404,39.296237,0.0 -80.279195,39.296331,0.0 -80.279279,39.29688,0.0 -80.284109,39.29899,0.0 -80.282414,39.300325,0.0 -80.281517,39.301608,0.0 -80.283296,39.303352,0.0 -80.280548,39.307019,0.0 -80.28141,39.308257,0.0 -80.28255,39.308761,0.0 -80.282803,39.308893,0.0 -80.283856,39.310899,0.0 -80.282694,39.314413,0.0 -80.282713,39.315146,0.0 -80.282902,39.315784,0.0 -80.283078,39.316135,0.0 -80.283726,39.317687,0.0 -80.283771,39.317811,0.0 -80.284512,39.319516,0.0 -80.284151,39.322525,0.0 -80.284419,39.322966,0.0 -80.285456,39.324303,0.0 -80.287572,39.325089,0.0 -80.287853,39.325183,0.0 -80.288381,39.325518,0.0 -80.288575,39.32579,0.0 -80.288391,39.326885,0.0 -80.288341,39.328344,0.0 -80.288384,39.328453,0.0 -80.288827,39.325873,0.0 -80.287806,39.324874,0.0 -80.286639,39.324528,0.0 -80.285202,39.323754,0.0 -80.284469,39.322708,0.0 -80.284373,39.322285,0.0 -80.284857,39.320946,0.0 -80.284779,39.319373,0.0 -80.282969,39.314983,0.0 -80.284045,39.3115,0.0 -80.283883,39.310623,0.0 -80.282991,39.308803,0.0 -80.28098,39.306945,0.0 -80.283503,39.30358,0.0 -80.283048,39.302135,0.0 -80.285784,39.302991,0.0 -80.285992,39.300515,0.0 -80.287766,39.300364,0.0 -80.288955,39.298984,0.0 -80.293405,39.296915,0.0 -80.294384,39.295438,0.0 -80.290861,39.293051,0.0 -80.291909,39.291089,0.0 -80.292508,39.292265,0.0 -80.296732,39.289723,0.0 -80.298292,39.29135,0.0 -80.299812,39.291514,0.0 -80.30193,39.289868,0.0 -80.299962,39.288323,0.0 -80.296156,39.289306,0.0 -80.292891,39.289663,0.0 -80.288106,39.289555,0.0 -80.285255,39.288788,0.0 -80.282815,39.288848,0.0 -80.282546,39.289635,0.0 -80.280407,39.289568,0.0 -80.283049,39.285747,0.0 -80.285179,39.285401,0.0 -80.28531,39.286557,0.0 -80.287127,39.286514,0.0 -80.287523,39.284909,0.0 -80.28906,39.285916,0.0 -80.288473,39.287608,0.0 -80.290175,39.288194,0.0 -80.296816,39.287688,0.0 -80.298205,39.286968,0.0 -80.305011,39.286645,0.0 -80.307846,39.284801,0.0 -80.307798,39.28268,0.0 -80.305572,39.281941,0.0 -80.306115,39.279557,0.0 -80.300207,39.280581,0.0 -80.29938,39.281512,0.0 -80.297017,39.28166,0.0 -80.293934,39.280081,0.0 -80.293806,39.278365,0.0 -80.291505,39.278106,0.0 -80.290423,39.279204,0.0 -80.284045,39.280399,0.0 -80.284191,39.279135,0.0 -80.284375,39.278805,0.0 -80.286996,39.27822,0.0 -80.290049,39.278128,0.0 -80.291538,39.278008,0.0 -80.292387,39.277773,0.0 -80.295248,39.277702,0.0 -80.296334,39.277799,0.0 -80.297558,39.27794,0.0 -80.317373,39.278225,0.0 -80.317594,39.278234,0.0 -80.31849,39.279143,0.0 -80.323439,39.280838,0.0 -80.322828,39.282132,0.0 -80.32424,39.284798,0.0 -80.332223,39.287582,0.0 -80.334706,39.28805,0.0 -80.338817,39.29169,0.0 -80.338653,39.293101,0.0 -80.341353,39.294157,0.0 -80.3423,39.295341,0.0 -80.342623,39.295854,0.0 -80.342737,39.295962,0.0 -80.34081,39.297122,0.0 -80.343266,39.296615,0.0 -80.343808,39.297386,0.0 -80.345349,39.297901,0.0 -80.34687,39.301177,0.0 -80.351654,39.302235,0.0 -80.350308,39.304038,0.0 -80.350329,39.306039,0.0 -80.352906,39.30621,0.0 -80.353041,39.307082,0.0 -80.353701,39.307896,0.0 -80.354083,39.307998,0.0 -80.354759,39.308345,0.0 -80.354803,39.308269,0.0 -80.354807,39.30914,0.0 -80.354212,39.310221,0.0 -80.358474,39.312286,0.0 -80.357933,39.313794,0.0 -80.359874,39.313957,0.0 -80.36058,39.311531,0.0 -80.361877,39.31171,0.0 -80.361723,39.311229,0.0 -80.356778,39.308201,0.0 -80.353865,39.307786,0.0 -80.353289,39.307099,0.0 -80.353746,39.30536,0.0 -80.356054,39.305694,0.0 -80.357647,39.305174,0.0 -80.357417,39.303277,0.0 -80.354984,39.30229,0.0 -80.355714,39.301185,0.0 -80.355939,39.299895,0.0 -80.359822,39.296652,0.0 -80.363508,39.295429,0.0 -80.364483,39.29648,0.0 -80.368265,39.295791,0.0 -80.366918,39.291989,0.0 -80.367024,39.290381,0.0 -80.36744,39.283265,0.0 -80.367496,39.282306,0.0 -80.368703,39.274551,0.0 -80.37233,39.27722,0.0 -80.371241,39.280583,0.0 -80.372206,39.28072,0.0 -80.373228,39.277559,0.0 -80.372295,39.275115,0.0 -80.373604,39.27133,0.0 -80.375352,39.272818,0.0 -80.377139,39.272054,0.0 -80.374764,39.271107,0.0 -80.370623,39.270187,0.0 -80.369695,39.268932,0.0 -80.370314,39.26778,0.0 -80.370932,39.268077,0.0 -80.372221,39.266668,0.0 -80.372656,39.26652,0.0 -80.373364,39.267896,0.0 -80.372943,39.2685,0.0 -80.373701,39.269027,0.0 -80.37498,39.270833,0.0 -80.375423,39.271013,0.0 -80.37566,39.27069,0.0 -80.375961,39.27074,0.0 -80.377199,39.270958,0.0 -80.378458,39.270926,0.0 -80.37972,39.270594,0.0 -80.383581,39.268591,0.0 -80.385208,39.269378,0.0 -80.386182,39.271136,0.0 -80.388815,39.272318,0.0 -80.391241,39.274221,0.0 -80.395887,39.274535,0.0 -80.394818,39.27864,0.0 -80.396625,39.279173,0.0 -80.398193,39.277474,0.0 -80.399215,39.277881,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.352597,39.262134,0.0 -80.351911,39.264949,0.0 -80.349609,39.265491,0.0 -80.350866,39.261378,0.0 -80.347962,39.260356,0.0 -80.349565,39.259553,0.0 -80.350642,39.260203,0.0 -80.352597,39.262134,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.34756,39.265458,0.0 -80.347324,39.266068,0.0 -80.346677,39.266051,0.0 -80.346222,39.266022,0.0 -80.343388,39.265523,0.0 -80.343069,39.264541,0.0 -80.34756,39.265458,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.334194,39.267181,0.0 -80.334547,39.267848,0.0 -80.33213,39.269092,0.0 -80.331755,39.268405,0.0 -80.334016,39.26727,0.0 -80.334194,39.267181,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-80.331851,39.268086,0.0 -80.331349,39.269182,0.0 -80.329832,39.269804,0.0 -80.328887,39.26866,0.0 -80.329262,39.267584,0.0 -80.329643,39.267981,0.0 -80.33134,39.267481,0.0 -80.331851,39.268086,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Clay&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>15676</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390798</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5415676</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5415676</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Clay</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1444683</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>147764</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">15676</SimpleData>
<SimpleData name="PLACENS">02390798</SimpleData>
<SimpleData name="AFFGEOID">1600000US5415676</SimpleData>
<SimpleData name="GEOID">5415676</SimpleData>
<SimpleData name="NAME">Clay</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1444683</SimpleData>
<SimpleData name="AWATER">147764</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.097958,38.446995,0.0 -81.098684,38.446165,0.0 -81.096169,38.445045,0.0 -81.094324,38.444943,0.0 -81.090958,38.446626,0.0 -81.090428,38.448916,0.0 -81.091052,38.45476,0.0 -81.090379,38.458395,0.0 -81.089075,38.458149,0.0 -81.089045,38.458224,0.0 -81.087072,38.460346,0.0 -81.082837,38.458731,0.0 -81.080175,38.458814,0.0 -81.076961,38.459691,0.0 -81.074362,38.461296,0.0 -81.073532,38.465106,0.0 -81.073336,38.465211,0.0 -81.075013,38.467749,0.0 -81.073945,38.468561,0.0 -81.075102,38.470405,0.0 -81.075715,38.470397,0.0 -81.078384,38.471718,0.0 -81.081451,38.472538,0.0 -81.082393,38.473666,0.0 -81.082115,38.474388,0.0 -81.081437,38.474449,0.0 -81.078655,38.473523,0.0 -81.075888,38.473047,0.0 -81.074211,38.473075,0.0 -81.072827,38.47341,0.0 -81.071968,38.474041,0.0 -81.071164,38.475411,0.0 -81.071982,38.475678,0.0 -81.077067,38.476354,0.0 -81.079445,38.47615,0.0 -81.084481,38.47681,0.0 -81.08874,38.476538,0.0 -81.090431,38.477336,0.0 -81.090899,38.476996,0.0 -81.090749,38.47643,0.0 -81.0896,38.475515,0.0 -81.084601,38.475656,0.0 -81.085517,38.473664,0.0 -81.083395,38.470351,0.0 -81.076438,38.466445,0.0 -81.076211,38.463987,0.0 -81.077631,38.463414,0.0 -81.083916,38.464144,0.0 -81.08935,38.462383,0.0 -81.090608,38.458443,0.0 -81.091451,38.45467,0.0 -81.090776,38.448788,0.0 -81.091601,38.44733,0.0 -81.093271,38.446245,0.0 -81.095356,38.44583,0.0 -81.097958,38.446995,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Clearview&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>15916</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02391611</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5415916</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5415916</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Clearview</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>47</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1047650</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>690</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">15916</SimpleData>
<SimpleData name="PLACENS">02391611</SimpleData>
<SimpleData name="AFFGEOID">1600000US5415916</SimpleData>
<SimpleData name="GEOID">5415916</SimpleData>
<SimpleData name="NAME">Clearview</SimpleData>
<SimpleData name="LSAD">47</SimpleData>
<SimpleData name="ALAND">1047650</SimpleData>
<SimpleData name="AWATER">690</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.699021,40.134965,0.0 -80.700136,40.13328,0.0 -80.698758,40.130956,0.0 -80.695674,40.131943,0.0 -80.693779,40.136615,0.0 -80.692258,40.138031,0.0 -80.691538,40.13749,0.0 -80.687422,40.140046,0.0 -80.688367,40.140124,0.0 -80.686452,40.141929,0.0 -80.684264,40.141733,0.0 -80.681902,40.142304,0.0 -80.677172,40.141258,0.0 -80.674685,40.140743,0.0 -80.675492,40.141243,0.0 -80.676288,40.14312,0.0 -80.678877,40.144562,0.0 -80.677247,40.147279,0.0 -80.678561,40.147767,0.0 -80.679531,40.14816,0.0 -80.681552,40.145478,0.0 -80.688654,40.142465,0.0 -80.688787,40.143145,0.0 -80.688814,40.143979,0.0 -80.688816,40.144125,0.0 -80.688807,40.144215,0.0 -80.688769,40.144404,0.0 -80.691532,40.143484,0.0 -80.692068,40.142302,0.0 -80.692305,40.141438,0.0 -80.690742,40.140708,0.0 -80.694248,40.139935,0.0 -80.695039,40.140976,0.0 -80.695825,40.140871,0.0 -80.696041,40.141651,0.0 -80.698116,40.139988,0.0 -80.699572,40.139847,0.0 -80.699021,40.134965,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Clendenin&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>16012</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390801</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5416012</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5416012</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Clendenin</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3734352</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>207203</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">16012</SimpleData>
<SimpleData name="PLACENS">02390801</SimpleData>
<SimpleData name="AFFGEOID">1600000US5416012</SimpleData>
<SimpleData name="GEOID">5416012</SimpleData>
<SimpleData name="NAME">Clendenin</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">3734352</SimpleData>
<SimpleData name="AWATER">207203</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.370014,38.478784,0.0 -81.367383,38.479863,0.0 -81.362751,38.482183,0.0 -81.362275,38.476684,0.0 -81.359494,38.476389,0.0 -81.356478,38.477318,0.0 -81.353937,38.476697,0.0 -81.352123,38.475417,0.0 -81.349806,38.475222,0.0 -81.348485,38.477527,0.0 -81.345136,38.477386,0.0 -81.343953,38.478861,0.0 -81.343063,38.481476,0.0 -81.343664,38.484042,0.0 -81.343047,38.486604,0.0 -81.339579,38.487175,0.0 -81.335193,38.486954,0.0 -81.334495,38.487967,0.0 -81.332987,38.487891,0.0 -81.331347,38.487765,0.0 -81.331117,38.490407,0.0 -81.331199,38.492242,0.0 -81.333405,38.493072,0.0 -81.344412,38.494185,0.0 -81.34975,38.495034,0.0 -81.353757,38.494008,0.0 -81.354331,38.493885,0.0 -81.365101,38.486673,0.0 -81.3639,38.483203,0.0 -81.370014,38.478784,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Coal City&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>16516</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389337</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5416516</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5416516</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Coal City</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>16334201</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>17649</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">16516</SimpleData>
<SimpleData name="PLACENS">02389337</SimpleData>
<SimpleData name="AFFGEOID">1600000US5416516</SimpleData>
<SimpleData name="GEOID">5416516</SimpleData>
<SimpleData name="NAME">Coal City</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">16334201</SimpleData>
<SimpleData name="AWATER">17649</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.242205,37.68719,0.0 -81.245065,37.682586,0.0 -81.242031,37.681329,0.0 -81.239928,37.678651,0.0 -81.23967,37.676296,0.0 -81.238607,37.674715,0.0 -81.237835,37.670791,0.0 -81.237749,37.670577,0.0 -81.237622,37.670439,0.0 -81.237074,37.670118,0.0 -81.236563,37.669268,0.0 -81.232703,37.666485,0.0 -81.228421,37.666325,0.0 -81.228072,37.66391,0.0 -81.228505,37.660671,0.0 -81.227586,37.65937,0.0 -81.226236,37.660028,0.0 -81.224563,37.65917,0.0 -81.221811,37.656556,0.0 -81.222254,37.654583,0.0 -81.221889,37.653064,0.0 -81.223878,37.652233,0.0 -81.221308,37.650865,0.0 -81.220993,37.649266,0.0 -81.221393,37.648587,0.0 -81.220211,37.647525,0.0 -81.220435,37.646859,0.0 -81.219974,37.646705,0.0 -81.219696,37.646382,0.0 -81.219912,37.644975,0.0 -81.22024,37.64478,0.0 -81.219259,37.645147,0.0 -81.219655,37.64646,0.0 -81.219943,37.64688,0.0 -81.220372,37.650331,0.0 -81.219969,37.652444,0.0 -81.219096,37.651846,0.0 -81.219394,37.651237,0.0 -81.219296,37.649703,0.0 -81.218429,37.647988,0.0 -81.216869,37.64907,0.0 -81.203068,37.65194,0.0 -81.202082,37.653258,0.0 -81.202152,37.655409,0.0 -81.200133,37.658081,0.0 -81.198702,37.658659,0.0 -81.200959,37.66,0.0 -81.200734,37.661073,0.0 -81.201868,37.661477,0.0 -81.20213,37.666128,0.0 -81.20263,37.668306,0.0 -81.201309,37.667546,0.0 -81.198345,37.668538,0.0 -81.197662,37.671306,0.0 -81.196002,37.67298,0.0 -81.199292,37.67617,0.0 -81.200795,37.678863,0.0 -81.200169,37.681349,0.0 -81.20171,37.681478,0.0 -81.204087,37.68296,0.0 -81.204418,37.684016,0.0 -81.201488,37.686334,0.0 -81.200597,37.688835,0.0 -81.199051,37.690013,0.0 -81.194505,37.690147,0.0 -81.196967,37.692802,0.0 -81.196684,37.69516,0.0 -81.19842,37.696389,0.0 -81.198669,37.697725,0.0 -81.197929,37.699721,0.0 -81.194265,37.702994,0.0 -81.193905,37.706219,0.0 -81.192799,37.706474,0.0 -81.194489,37.710204,0.0 -81.194125,37.706634,0.0 -81.196165,37.702796,0.0 -81.200946,37.702308,0.0 -81.204763,37.698848,0.0 -81.20655,37.696745,0.0 -81.207795,37.696637,0.0 -81.210745,37.698134,0.0 -81.211035,37.699818,0.0 -81.214248,37.701342,0.0 -81.213292,37.700094,0.0 -81.212811,37.697648,0.0 -81.211092,37.696066,0.0 -81.211361,37.693016,0.0 -81.213676,37.692677,0.0 -81.21613,37.695444,0.0 -81.220153,37.69667,0.0 -81.223305,37.698118,0.0 -81.22593,37.698555,0.0 -81.230823,37.69821,0.0 -81.233694,37.699914,0.0 -81.235962,37.704251,0.0 -81.239587,37.705806,0.0 -81.240684,37.705551,0.0 -81.241638,37.703642,0.0 -81.240367,37.703639,0.0 -81.242657,37.7018,0.0 -81.240233,37.702319,0.0 -81.236196,37.700378,0.0 -81.234606,37.698945,0.0 -81.234984,37.697823,0.0 -81.236677,37.694409,0.0 -81.237044,37.692428,0.0 -81.239331,37.689927,0.0 -81.240333,37.689564,0.0 -81.241154,37.68746,0.0 -81.242205,37.68719,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Coal Fork&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>16612</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389338</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5416612</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5416612</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Coal Fork</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>13282120</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>64774</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">16612</SimpleData>
<SimpleData name="PLACENS">02389338</SimpleData>
<SimpleData name="AFFGEOID">1600000US5416612</SimpleData>
<SimpleData name="GEOID">5416612</SimpleData>
<SimpleData name="NAME">Coal Fork</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">13282120</SimpleData>
<SimpleData name="AWATER">64774</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.553885,38.319672,0.0 -81.553565,38.318618,0.0 -81.551598,38.317857,0.0 -81.550564,38.316455,0.0 -81.551794,38.312902,0.0 -81.551561,38.311815,0.0 -81.550342,38.31143,0.0 -81.545253,38.312644,0.0 -81.541346,38.31237,0.0 -81.538709,38.312731,0.0 -81.536152,38.314481,0.0 -81.535488,38.313986,0.0 -81.53609,38.313601,0.0 -81.532408,38.312743,0.0 -81.53042,38.310092,0.0 -81.531161,38.306747,0.0 -81.52969,38.304254,0.0 -81.523438,38.299942,0.0 -81.520581,38.297029,0.0 -81.518625,38.29576,0.0 -81.515076,38.297682,0.0 -81.512598,38.29821,0.0 -81.509256,38.298299,0.0 -81.507369,38.297838,0.0 -81.50601,38.296705,0.0 -81.505387,38.295027,0.0 -81.503324,38.29331,0.0 -81.503182,38.291133,0.0 -81.501376,38.289627,0.0 -81.500402,38.291767,0.0 -81.500691,38.293528,0.0 -81.499244,38.296427,0.0 -81.498915,38.299562,0.0 -81.49813,38.300976,0.0 -81.496053,38.302608,0.0 -81.498548,38.305276,0.0 -81.498563,38.306529,0.0 -81.501822,38.309255,0.0 -81.505447,38.311,0.0 -81.506622,38.310716,0.0 -81.509073,38.311452,0.0 -81.512752,38.314065,0.0 -81.518365,38.313882,0.0 -81.52117,38.3168,0.0 -81.516669,38.318629,0.0 -81.514503,38.32039,0.0 -81.511215,38.321559,0.0 -81.508969,38.324119,0.0 -81.50568,38.32797,0.0 -81.502092,38.329016,0.0 -81.508607,38.336545,0.0 -81.5134,38.340332,0.0 -81.517373,38.343665,0.0 -81.517039,38.342802,0.0 -81.518019,38.34063,0.0 -81.519964,38.339328,0.0 -81.527059,38.33912,0.0 -81.530578,38.338811,0.0 -81.537442,38.335581,0.0 -81.536697,38.333789,0.0 -81.536893,38.332238,0.0 -81.539314,38.330275,0.0 -81.542997,38.328483,0.0 -81.547361,38.324836,0.0 -81.546099,38.325754,0.0 -81.545821,38.325846,0.0 -81.546445,38.325497,0.0 -81.546864,38.325096,0.0 -81.547281,38.324789,0.0 -81.547426,38.324526,0.0 -81.548114,38.323695,0.0 -81.550139,38.322335,0.0 -81.550314,38.321986,0.0 -81.550331,38.321948,0.0 -81.553885,38.319672,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Comfort&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>17380</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586784</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5417380</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5417380</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Comfort</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2601081</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">17380</SimpleData>
<SimpleData name="PLACENS">02586784</SimpleData>
<SimpleData name="AFFGEOID">1600000US5417380</SimpleData>
<SimpleData name="GEOID">5417380</SimpleData>
<SimpleData name="NAME">Comfort</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2601081</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.619545,38.135666,0.0 -81.619877,38.135073,0.0 -81.619049,38.13482,0.0 -81.617844,38.132272,0.0 -81.618119,38.128228,0.0 -81.616023,38.123679,0.0 -81.61559,38.121486,0.0 -81.615721,38.121077,0.0 -81.61351,38.120749,0.0 -81.611479,38.119647,0.0 -81.61148,38.126114,0.0 -81.605295,38.125525,0.0 -81.600936,38.122462,0.0 -81.597332,38.1223,0.0 -81.597343,38.123817,0.0 -81.605495,38.13013,0.0 -81.602048,38.132561,0.0 -81.602356,38.13589,0.0 -81.601807,38.137781,0.0 -81.609745,38.141217,0.0 -81.613392,38.1422,0.0 -81.615951,38.140276,0.0 -81.618814,38.136088,0.0 -81.619545,38.135666,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Corinne&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>17836</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586785</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5417836</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5417836</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Corinne</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>955773</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>66108</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">17836</SimpleData>
<SimpleData name="PLACENS">02586785</SimpleData>
<SimpleData name="AFFGEOID">1600000US5417836</SimpleData>
<SimpleData name="GEOID">5417836</SimpleData>
<SimpleData name="NAME">Corinne</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">955773</SimpleData>
<SimpleData name="AWATER">66108</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.370152,37.568289,0.0 -81.370646,37.56801,0.0 -81.368289,37.563976,0.0 -81.367867,37.563623,0.0 -81.365337,37.562847,0.0 -81.356844,37.571142,0.0 -81.356086,37.5713,0.0 -81.354622,37.572365,0.0 -81.35251,37.576011,0.0 -81.353381,37.578364,0.0 -81.355569,37.580431,0.0 -81.35575,37.581877,0.0 -81.353234,37.585923,0.0 -81.353862,37.586751,0.0 -81.356777,37.582175,0.0 -81.356508,37.580372,0.0 -81.354519,37.57851,0.0 -81.354079,37.577087,0.0 -81.355189,37.574478,0.0 -81.356982,37.573508,0.0 -81.359557,37.575511,0.0 -81.361368,37.575097,0.0 -81.362632,37.573997,0.0 -81.364772,37.57046,0.0 -81.367619,37.569078,0.0 -81.365735,37.569523,0.0 -81.370152,37.568289,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Covel&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>18388</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586787</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5418388</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5418388</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Covel</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>549481</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">18388</SimpleData>
<SimpleData name="PLACENS">02586787</SimpleData>
<SimpleData name="AFFGEOID">1600000US5418388</SimpleData>
<SimpleData name="GEOID">5418388</SimpleData>
<SimpleData name="NAME">Covel</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">549481</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.325156,37.492919,0.0 -81.330012,37.494381,0.0 -81.323933,37.490337,0.0 -81.322329,37.485344,0.0 -81.31921,37.485444,0.0 -81.319982,37.488666,0.0 -81.315262,37.488439,0.0 -81.314414,37.489259,0.0 -81.317106,37.491284,0.0 -81.315474,37.492845,0.0 -81.311778,37.493014,0.0 -81.311778,37.495687,0.0 -81.320481,37.492524,0.0 -81.323443,37.491846,0.0 -81.325156,37.492919,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cowen&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>18412</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390814</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5418412</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5418412</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cowen</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1629675</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>893</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">18412</SimpleData>
<SimpleData name="PLACENS">02390814</SimpleData>
<SimpleData name="AFFGEOID">1600000US5418412</SimpleData>
<SimpleData name="GEOID">5418412</SimpleData>
<SimpleData name="NAME">Cowen</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1629675</SimpleData>
<SimpleData name="AWATER">893</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.561003,38.413325,0.0 -80.563048,38.406309,0.0 -80.553987,38.404586,0.0 -80.552432,38.405096,0.0 -80.549364,38.407142,0.0 -80.544082,38.409908,0.0 -80.544842,38.413924,0.0 -80.548983,38.41505,0.0 -80.55748,38.417765,0.0 -80.55949,38.418574,0.0 -80.560205,38.415507,0.0 -80.561003,38.413325,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Crab Orchard&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>18508</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389365</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5418508</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5418508</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Crab Orchard</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5824535</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>18105</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">18508</SimpleData>
<SimpleData name="PLACENS">02389365</SimpleData>
<SimpleData name="AFFGEOID">1600000US5418508</SimpleData>
<SimpleData name="GEOID">5418508</SimpleData>
<SimpleData name="NAME">Crab Orchard</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">5824535</SimpleData>
<SimpleData name="AWATER">18105</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.254814,37.748039,0.0 -81.255046,37.743022,0.0 -81.248749,37.742016,0.0 -81.243902,37.742428,0.0 -81.241289,37.74179,0.0 -81.236086,37.739088,0.0 -81.235857,37.738501,0.0 -81.23406,37.739529,0.0 -81.230676,37.740587,0.0 -81.235688,37.73816,0.0 -81.236931,37.736813,0.0 -81.238047,37.734295,0.0 -81.235963,37.732983,0.0 -81.236683,37.731589,0.0 -81.23974,37.73057,0.0 -81.238612,37.729956,0.0 -81.232797,37.730405,0.0 -81.231634,37.731535,0.0 -81.232106,37.728549,0.0 -81.229397,37.728966,0.0 -81.224803,37.728049,0.0 -81.221046,37.728628,0.0 -81.218071,37.730409,0.0 -81.218093,37.731515,0.0 -81.215445,37.732832,0.0 -81.215421,37.734395,0.0 -81.214524,37.734552,0.0 -81.211488,37.73659,0.0 -81.213084,37.739742,0.0 -81.209966,37.740641,0.0 -81.210447,37.742166,0.0 -81.209383,37.745205,0.0 -81.211831,37.745856,0.0 -81.214366,37.744514,0.0 -81.21836,37.745457,0.0 -81.220321,37.745032,0.0 -81.22255,37.748073,0.0 -81.223132,37.748202,0.0 -81.224509,37.750648,0.0 -81.22772,37.75185,0.0 -81.227524,37.750672,0.0 -81.22903,37.750766,0.0 -81.229845,37.751956,0.0 -81.231769,37.752579,0.0 -81.234323,37.752319,0.0 -81.237458,37.753219,0.0 -81.238457,37.752964,0.0 -81.238254,37.751413,0.0 -81.236453,37.748326,0.0 -81.240423,37.749563,0.0 -81.241459,37.74888,0.0 -81.253179,37.748741,0.0 -81.254814,37.748039,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Craigsville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>18604</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389368</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5418604</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5418604</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Craigsville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>15720595</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>46409</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">18604</SimpleData>
<SimpleData name="PLACENS">02389368</SimpleData>
<SimpleData name="AFFGEOID">1600000US5418604</SimpleData>
<SimpleData name="GEOID">5418604</SimpleData>
<SimpleData name="NAME">Craigsville</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">15720595</SimpleData>
<SimpleData name="AWATER">46409</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.674001,38.307916,0.0 -80.673105,38.307874,0.0 -80.672158,38.308588,0.0 -80.669594,38.305855,0.0 -80.66704,38.302185,0.0 -80.666059,38.299757,0.0 -80.663173,38.295477,0.0 -80.663334,38.29262,0.0 -80.6625,38.293952,0.0 -80.660776,38.293973,0.0 -80.657816,38.29558,0.0 -80.65768,38.300145,0.0 -80.656725,38.302152,0.0 -80.654077,38.304437,0.0 -80.652889,38.304593,0.0 -80.653581,38.304937,0.0 -80.651502,38.304662,0.0 -80.649725,38.305124,0.0 -80.647283,38.304517,0.0 -80.645533,38.304586,0.0 -80.642743,38.301405,0.0 -80.639338,38.30056,0.0 -80.636922,38.302114,0.0 -80.633349,38.317728,0.0 -80.632507,38.324695,0.0 -80.61223,38.342285,0.0 -80.612043,38.342749,0.0 -80.613162,38.344706,0.0 -80.614452,38.344373,0.0 -80.616512,38.347924,0.0 -80.618828,38.347607,0.0 -80.620808,38.349614,0.0 -80.619568,38.349402,0.0 -80.617813,38.34961,0.0 -80.617369,38.349752,0.0 -80.617004,38.350091,0.0 -80.616306,38.35099,0.0 -80.615952,38.351574,0.0 -80.61583,38.351872,0.0 -80.614311,38.352634,0.0 -80.613847,38.353875,0.0 -80.615815,38.352884,0.0 -80.616861,38.352103,0.0 -80.616582,38.351485,0.0 -80.617343,38.350899,0.0 -80.617295,38.351935,0.0 -80.614927,38.353748,0.0 -80.616254,38.354564,0.0 -80.617926,38.35412,0.0 -80.621445,38.350905,0.0 -80.623375,38.350323,0.0 -80.624507,38.349144,0.0 -80.628458,38.348518,0.0 -80.631153,38.350518,0.0 -80.638977,38.350185,0.0 -80.641705,38.348622,0.0 -80.642081,38.347569,0.0 -80.640808,38.347369,0.0 -80.638575,38.343552,0.0 -80.638806,38.342218,0.0 -80.63769,38.339307,0.0 -80.635163,38.336324,0.0 -80.639677,38.334701,0.0 -80.640947,38.337082,0.0 -80.642448,38.336698,0.0 -80.64499,38.337519,0.0 -80.647403,38.339899,0.0 -80.65114,38.340505,0.0 -80.654729,38.339169,0.0 -80.66121,38.339781,0.0 -80.662892,38.338765,0.0 -80.663397,38.338599,0.0 -80.661912,38.335369,0.0 -80.661191,38.334628,0.0 -80.655106,38.331369,0.0 -80.658595,38.330078,0.0 -80.662255,38.330427,0.0 -80.663837,38.329371,0.0 -80.665318,38.329481,0.0 -80.665521,38.32641,0.0 -80.666544,38.325996,0.0 -80.666427,38.323885,0.0 -80.667556,38.323412,0.0 -80.666958,38.322252,0.0 -80.667957,38.319955,0.0 -80.669427,38.319417,0.0 -80.669099,38.317423,0.0 -80.667198,38.31534,0.0 -80.668057,38.312592,0.0 -80.669263,38.312201,0.0 -80.670575,38.310414,0.0 -80.674001,38.307916,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cross Lanes&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>19108</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389377</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5419108</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5419108</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cross Lanes</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>16525740</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>104475</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">19108</SimpleData>
<SimpleData name="PLACENS">02389377</SimpleData>
<SimpleData name="AFFGEOID">1600000US5419108</SimpleData>
<SimpleData name="GEOID">5419108</SimpleData>
<SimpleData name="NAME">Cross Lanes</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">16525740</SimpleData>
<SimpleData name="AWATER">104475</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.81431,38.426788,0.0 -81.813788,38.426618,0.0 -81.8133,38.426421,0.0 -81.812836,38.426189,0.0 -81.812278,38.425858,0.0 -81.807718,38.422615,0.0 -81.798804,38.41605,0.0 -81.79649,38.413372,0.0 -81.794569,38.410713,0.0 -81.789759,38.413016,0.0 -81.787141,38.413866,0.0 -81.784509,38.420853,0.0 -81.781387,38.420644,0.0 -81.77927,38.419783,0.0 -81.779721,38.420324,0.0 -81.779992,38.421575,0.0 -81.778867,38.424291,0.0 -81.7777,38.424889,0.0 -81.774146,38.424863,0.0 -81.769179,38.427126,0.0 -81.766393,38.426829,0.0 -81.763307,38.425601,0.0 -81.761268,38.425565,0.0 -81.756609,38.426622,0.0 -81.753189,38.424847,0.0 -81.752393,38.425298,0.0 -81.751351,38.426454,0.0 -81.747182,38.427256,0.0 -81.744966,38.425978,0.0 -81.744485,38.426517,0.0 -81.744212,38.426356,0.0 -81.743225,38.428352,0.0 -81.743098,38.432226,0.0 -81.741572,38.433195,0.0 -81.738317,38.43285,0.0 -81.737417,38.431594,0.0 -81.734388,38.434524,0.0 -81.733537,38.436376,0.0 -81.733085,38.439331,0.0 -81.730536,38.440068,0.0 -81.73037,38.441104,0.0 -81.731614,38.442282,0.0 -81.738084,38.445576,0.0 -81.73831,38.448787,0.0 -81.73938,38.450015,0.0 -81.741092,38.450671,0.0 -81.745039,38.450615,0.0 -81.749854,38.452774,0.0 -81.754303,38.455751,0.0 -81.775874,38.447558,0.0 -81.777115,38.447052,0.0 -81.795583,38.441042,0.0 -81.804683,38.438057,0.0 -81.804767,38.438029,0.0 -81.803727,38.436866,0.0 -81.80494,38.434892,0.0 -81.796086,38.435427,0.0 -81.79454,38.431122,0.0 -81.803034,38.429283,0.0 -81.807951,38.428519,0.0 -81.81431,38.426788,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Crum&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>19300</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586790</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5419300</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5419300</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Crum</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1321198</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">19300</SimpleData>
<SimpleData name="PLACENS">02586790</SimpleData>
<SimpleData name="AFFGEOID">1600000US5419300</SimpleData>
<SimpleData name="GEOID">5419300</SimpleData>
<SimpleData name="NAME">Crum</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1321198</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.4588044726958,37.9093358330249,0.0 -82.457794,37.909089,0.0 -82.452883,37.908998,0.0 -82.451352,37.908472,0.0 -82.447596,37.904352,0.0 -82.4473025458504,37.9042186531843,0.0 -82.4429130593558,37.9022240518218,0.0 -82.442068,37.903816,0.0 -82.437828,37.906432,0.0 -82.439648,37.90798,0.0 -82.442322,37.912208,0.0 -82.444697,37.915013,0.0 -82.447477,37.91658,0.0 -82.45238,37.913068,0.0 -82.454224,37.912835,0.0 -82.457204,37.910596,0.0 -82.4588044726958,37.9093358330249,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Crumpler&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>19324</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586791</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5419324</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5419324</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Crumpler</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3884201</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">19324</SimpleData>
<SimpleData name="PLACENS">02586791</SimpleData>
<SimpleData name="AFFGEOID">1600000US5419324</SimpleData>
<SimpleData name="GEOID">5419324</SimpleData>
<SimpleData name="NAME">Crumpler</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3884201</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.353533,37.425467,0.0 -81.350994,37.425294,0.0 -81.349052,37.42319,0.0 -81.34793,37.422952,0.0 -81.347913,37.424602,0.0 -81.345953,37.423383,0.0 -81.346475,37.422847,0.0 -81.344438,37.421919,0.0 -81.34293,37.423546,0.0 -81.340254,37.422998,0.0 -81.339163,37.423868,0.0 -81.336149,37.424075,0.0 -81.331785,37.41968,0.0 -81.329727,37.419625,0.0 -81.324145,37.417976,0.0 -81.321093,37.418174,0.0 -81.315322,37.417498,0.0 -81.311201,37.424509,0.0 -81.315007,37.426239,0.0 -81.317438,37.426666,0.0 -81.32073,37.428321,0.0 -81.323414,37.428604,0.0 -81.326601,37.431178,0.0 -81.326589,37.433428,0.0 -81.3273,37.434486,0.0 -81.330143,37.435406,0.0 -81.33354,37.433784,0.0 -81.33825,37.433066,0.0 -81.340667,37.434379,0.0 -81.342713,37.434508,0.0 -81.346199,37.433531,0.0 -81.347173,37.429432,0.0 -81.350266,37.427215,0.0 -81.351918,37.42759,0.0 -81.350923,37.426468,0.0 -81.353533,37.425467,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Cucumber&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>19492</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586793</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5419492</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5419492</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Cucumber</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1169784</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">19492</SimpleData>
<SimpleData name="PLACENS">02586793</SimpleData>
<SimpleData name="AFFGEOID">1600000US5419492</SimpleData>
<SimpleData name="GEOID">5419492</SimpleData>
<SimpleData name="NAME">Cucumber</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1169784</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.632013,37.28353,0.0 -81.631991,37.282133,0.0 -81.629781,37.281716,0.0 -81.630809,37.27882,0.0 -81.630486,37.276966,0.0 -81.624775,37.276662,0.0 -81.624407,37.270045,0.0 -81.621182,37.270045,0.0 -81.619367,37.270045,0.0 -81.619681,37.285434,0.0 -81.624584,37.284755,0.0 -81.627378,37.283223,0.0 -81.627778,37.283548,0.0 -81.632013,37.28353,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Culloden&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>19516</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389383</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5419516</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5419516</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Culloden</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>10749667</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>42266</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">19516</SimpleData>
<SimpleData name="PLACENS">02389383</SimpleData>
<SimpleData name="AFFGEOID">1600000US5419516</SimpleData>
<SimpleData name="GEOID">5419516</SimpleData>
<SimpleData name="NAME">Culloden</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">10749667</SimpleData>
<SimpleData name="AWATER">42266</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.10625,38.426253,0.0 -82.107436,38.424394,0.0 -82.105368,38.422913,0.0 -82.103508,38.41925,0.0 -82.104944,38.415798,0.0 -82.103589,38.414378,0.0 -82.087619,38.411142,0.0 -82.085994,38.41095,0.0 -82.07876,38.411467,0.0 -82.077908,38.408413,0.0 -82.079692,38.399701,0.0 -82.07595,38.399367,0.0 -82.068816,38.400578,0.0 -82.050383,38.403664,0.0 -82.050429,38.404523,0.0 -82.05105,38.414223,0.0 -82.047287,38.416256,0.0 -82.048833,38.418139,0.0 -82.048993,38.419011,0.0 -82.0514,38.41937,0.0 -82.051418,38.41964,0.0 -82.05144,38.419848,0.0 -82.044839,38.418882,0.0 -82.040368,38.418718,0.0 -82.037946,38.419127,0.0 -82.040699,38.419897,0.0 -82.044827,38.425385,0.0 -82.046707,38.425279,0.0 -82.048896,38.427741,0.0 -82.05201,38.426513,0.0 -82.052024,38.426697,0.0 -82.052163,38.428814,0.0 -82.074782,38.423988,0.0 -82.092105,38.424774,0.0 -82.092521,38.424185,0.0 -82.101763,38.428941,0.0 -82.101953,38.427983,0.0 -82.102809,38.428475,0.0 -82.10625,38.426253,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Dailey&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>19948</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586795</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5419948</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5419948</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Dailey</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1310763</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">19948</SimpleData>
<SimpleData name="PLACENS">02586795</SimpleData>
<SimpleData name="AFFGEOID">1600000US5419948</SimpleData>
<SimpleData name="GEOID">5419948</SimpleData>
<SimpleData name="NAME">Dailey</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1310763</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.904576,38.803101,0.0 -79.904266,38.801346,0.0 -79.901964,38.797756,0.0 -79.902969,38.796089,0.0 -79.901953,38.792322,0.0 -79.901111,38.791525,0.0 -79.899314,38.791108,0.0 -79.896083,38.791948,0.0 -79.894287,38.790676,0.0 -79.89153,38.792163,0.0 -79.889531,38.791951,0.0 -79.88828,38.794932,0.0 -79.887495,38.796206,0.0 -79.893815,38.800427,0.0 -79.896576,38.802074,0.0 -79.899914,38.803528,0.0 -79.899861,38.80366,0.0 -79.904576,38.803101,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Daniels&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>20164</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389393</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5420164</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5420164</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Daniels</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>11993037</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>20609</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">20164</SimpleData>
<SimpleData name="PLACENS">02389393</SimpleData>
<SimpleData name="AFFGEOID">1600000US5420164</SimpleData>
<SimpleData name="GEOID">5420164</SimpleData>
<SimpleData name="NAME">Daniels</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">11993037</SimpleData>
<SimpleData name="AWATER">20609</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.151736,37.713219,0.0 -81.151643,37.706617,0.0 -81.150045,37.703956,0.0 -81.148479,37.702623,0.0 -81.147715,37.702159,0.0 -81.147108,37.703011,0.0 -81.146271,37.701962,0.0 -81.142986,37.702147,0.0 -81.142238,37.704329,0.0 -81.133462,37.705362,0.0 -81.132264,37.706125,0.0 -81.130474,37.704987,0.0 -81.126048,37.704909,0.0 -81.121317,37.708382,0.0 -81.120538,37.709917,0.0 -81.118387,37.711059,0.0 -81.114058,37.711749,0.0 -81.109693,37.710631,0.0 -81.107902,37.711474,0.0 -81.107885,37.712254,0.0 -81.110449,37.714602,0.0 -81.11005,37.716602,0.0 -81.110604,37.717739,0.0 -81.110059,37.719455,0.0 -81.107203,37.721548,0.0 -81.102285,37.72369,0.0 -81.102697,37.725495,0.0 -81.10161,37.726888,0.0 -81.102087,37.727281,0.0 -81.10432,37.72796,0.0 -81.111665,37.729748,0.0 -81.113108,37.730966,0.0 -81.114232,37.738531,0.0 -81.112383,37.739129,0.0 -81.111823,37.74031,0.0 -81.114767,37.745524,0.0 -81.117266,37.746655,0.0 -81.119925,37.749104,0.0 -81.121184,37.748845,0.0 -81.125498,37.749418,0.0 -81.128566,37.749313,0.0 -81.129625,37.748428,0.0 -81.128949,37.747361,0.0 -81.130577,37.748193,0.0 -81.134496,37.748895,0.0 -81.136681,37.747427,0.0 -81.138088,37.747729,0.0 -81.13741,37.746916,0.0 -81.134014,37.746363,0.0 -81.133818,37.744263,0.0 -81.131599,37.744707,0.0 -81.134353,37.739318,0.0 -81.13683,37.735849,0.0 -81.134495,37.730968,0.0 -81.134441,37.72926,0.0 -81.136296,37.728244,0.0 -81.133543,37.727556,0.0 -81.13434,37.724341,0.0 -81.13168,37.723802,0.0 -81.135148,37.723311,0.0 -81.136031,37.722715,0.0 -81.136222,37.721117,0.0 -81.137898,37.722171,0.0 -81.142775,37.721317,0.0 -81.144164,37.720503,0.0 -81.144686,37.718074,0.0 -81.145826,37.715339,0.0 -81.147812,37.714355,0.0 -81.149309,37.712813,0.0 -81.149905,37.712516,0.0 -81.151736,37.713219,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Danville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>20212</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390820</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5420212</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5420212</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Danville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2771179</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>37455</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">20212</SimpleData>
<SimpleData name="PLACENS">02390820</SimpleData>
<SimpleData name="AFFGEOID">1600000US5420212</SimpleData>
<SimpleData name="GEOID">5420212</SimpleData>
<SimpleData name="NAME">Danville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2771179</SimpleData>
<SimpleData name="AWATER">37455</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.85038,38.07634,0.0 -81.849222,38.075451,0.0 -81.847332,38.077257,0.0 -81.844395,38.077611,0.0 -81.84599,38.073983,0.0 -81.843771,38.073211,0.0 -81.845122,38.069646,0.0 -81.84701,38.067462,0.0 -81.845875,38.066984,0.0 -81.844689,38.0665,0.0 -81.84321,38.068501,0.0 -81.843141,38.069967,0.0 -81.840786,38.070253,0.0 -81.839975,38.071997,0.0 -81.842292,38.072633,0.0 -81.840829,38.075834,0.0 -81.839193,38.074848,0.0 -81.838827,38.07574,0.0 -81.841176,38.077358,0.0 -81.84031,38.079313,0.0 -81.83778,38.077971,0.0 -81.838104,38.080837,0.0 -81.835038,38.076806,0.0 -81.828588,38.075033,0.0 -81.828265,38.075508,0.0 -81.825217,38.077375,0.0 -81.820863,38.07992,0.0 -81.818018,38.080737,0.0 -81.82027,38.08391,0.0 -81.822288,38.082966,0.0 -81.823028,38.086679,0.0 -81.824583,38.08654,0.0 -81.825426,38.088785,0.0 -81.827814,38.089575,0.0 -81.830617,38.08953,0.0 -81.832507,38.087552,0.0 -81.834377,38.086657,0.0 -81.835169,38.087199,0.0 -81.83787,38.085653,0.0 -81.838072,38.085816,0.0 -81.84202,38.08763,0.0 -81.842899,38.087041,0.0 -81.841635,38.086578,0.0 -81.842507,38.085486,0.0 -81.844518,38.083035,0.0 -81.847058,38.078982,0.0 -81.849171,38.078009,0.0 -81.85038,38.07634,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Davis&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>20428</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390821</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5420428</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5420428</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Davis</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4742235</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">20428</SimpleData>
<SimpleData name="PLACENS">02390821</SimpleData>
<SimpleData name="AFFGEOID">1600000US5420428</SimpleData>
<SimpleData name="GEOID">5420428</SimpleData>
<SimpleData name="NAME">Davis</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">4742235</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.481127,39.135875,0.0 -79.479936,39.13474,0.0 -79.47335,39.128876,0.0 -79.473044,39.124357,0.0 -79.46903,39.125138,0.0 -79.460549,39.127197,0.0 -79.460289,39.106432,0.0 -79.445309,39.10639,0.0 -79.445707,39.110288,0.0 -79.44652,39.111944,0.0 -79.450801,39.116286,0.0 -79.4546,39.118871,0.0 -79.454616,39.123051,0.0 -79.456124,39.124927,0.0 -79.459193,39.127194,0.0 -79.458065,39.127917,0.0 -79.457139,39.136765,0.0 -79.457564,39.137636,0.0 -79.443967,39.144078,0.0 -79.445737,39.147268,0.0 -79.448118,39.146393,0.0 -79.456856,39.141261,0.0 -79.459059,39.139479,0.0 -79.466122,39.139564,0.0 -79.47244,39.139189,0.0 -79.47631,39.138259,0.0 -79.479629,39.136609,0.0 -79.479746,39.136543,0.0 -79.481127,39.135875,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Davy&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>20500</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390822</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5420500</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5420500</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Davy</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3297047</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>55094</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">20500</SimpleData>
<SimpleData name="PLACENS">02390822</SimpleData>
<SimpleData name="AFFGEOID">1600000US5420500</SimpleData>
<SimpleData name="GEOID">5420500</SimpleData>
<SimpleData name="NAME">Davy</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">3297047</SimpleData>
<SimpleData name="AWATER">55094</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.663931,37.473348,0.0 -81.664257,37.47153,0.0 -81.647476,37.467537,0.0 -81.646561,37.467689,0.0 -81.642493,37.468411,0.0 -81.639223,37.469791,0.0 -81.638411,37.469571,0.0 -81.633724,37.485904,0.0 -81.63368,37.486715,0.0 -81.650333,37.481329,0.0 -81.653027,37.481869,0.0 -81.656859,37.480112,0.0 -81.657078,37.478337,0.0 -81.658682,37.47785,0.0 -81.661784,37.474674,0.0 -81.663931,37.473348,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Deep Water&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>20764</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586797</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5420764</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5420764</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Deep Water</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2284162</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>287010</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">20764</SimpleData>
<SimpleData name="PLACENS">02586797</SimpleData>
<SimpleData name="AFFGEOID">1600000US5420764</SimpleData>
<SimpleData name="GEOID">5420764</SimpleData>
<SimpleData name="NAME">Deep Water</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2284162</SimpleData>
<SimpleData name="AWATER">287010</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.267381,38.120871,0.0 -81.267502,38.120484,0.0 -81.265331,38.119556,0.0 -81.265254,38.118816,0.0 -81.243331,38.115552,0.0 -81.237934,38.114536,0.0 -81.237484,38.116993,0.0 -81.237807,38.121733,0.0 -81.23759,38.122619,0.0 -81.242737,38.123297,0.0 -81.243548,38.123303,0.0 -81.247657,38.124139,0.0 -81.250961,38.125995,0.0 -81.25755,38.128914,0.0 -81.263396,38.130217,0.0 -81.26481,38.12682,0.0 -81.265209,38.125349,0.0 -81.265992,38.123569,0.0 -81.266219,38.122079,0.0 -81.267381,38.120871,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Delbarton&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>20980</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390825</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5420980</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5420980</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Delbarton</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5146493</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">20980</SimpleData>
<SimpleData name="PLACENS">02390825</SimpleData>
<SimpleData name="AFFGEOID">1600000US5420980</SimpleData>
<SimpleData name="GEOID">5420980</SimpleData>
<SimpleData name="NAME">Delbarton</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">5146493</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.198993,37.702558,0.0 -82.200075,37.699408,0.0 -82.190424,37.693456,0.0 -82.183663,37.692743,0.0 -82.183107,37.692612,0.0 -82.179755,37.693923,0.0 -82.173726,37.692598,0.0 -82.171987,37.693897,0.0 -82.176293,37.700698,0.0 -82.177173,37.70543,0.0 -82.174017,37.70777,0.0 -82.172114,37.706819,0.0 -82.171785,37.706469,0.0 -82.171311,37.705522,0.0 -82.171018,37.705132,0.0 -82.171018,37.705364,0.0 -82.170783,37.705296,0.0 -82.169532,37.704529,0.0 -82.1684,37.70398,0.0 -82.166573,37.703318,0.0 -82.165531,37.703076,0.0 -82.158872,37.704205,0.0 -82.156913,37.70389,0.0 -82.154859,37.703907,0.0 -82.151819,37.702333,0.0 -82.150393,37.702034,0.0 -82.151384,37.702298,0.0 -82.154717,37.704018,0.0 -82.155368,37.704142,0.0 -82.156915,37.704033,0.0 -82.158865,37.70435,0.0 -82.160968,37.704256,0.0 -82.163548,37.703915,0.0 -82.163912,37.703815,0.0 -82.165828,37.703247,0.0 -82.169262,37.704475,0.0 -82.17069,37.705364,0.0 -82.171206,37.705579,0.0 -82.171763,37.706673,0.0 -82.172221,37.706994,0.0 -82.173858,37.707808,0.0 -82.174144,37.710269,0.0 -82.176132,37.717153,0.0 -82.179393,37.716595,0.0 -82.185559,37.712955,0.0 -82.187417,37.713344,0.0 -82.188035,37.715382,0.0 -82.187281,37.717531,0.0 -82.187712,37.719038,0.0 -82.190099,37.720411,0.0 -82.193059,37.721495,0.0 -82.19411,37.720913,0.0 -82.194612,37.720532,0.0 -82.196704,37.709469,0.0 -82.198993,37.702558,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Despard&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>21316</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389404</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5421316</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5421316</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Despard</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3794656</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">21316</SimpleData>
<SimpleData name="PLACENS">02389404</SimpleData>
<SimpleData name="AFFGEOID">1600000US5421316</SimpleData>
<SimpleData name="GEOID">5421316</SimpleData>
<SimpleData name="NAME">Despard</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3794656</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.331593,39.289165,0.0 -80.332223,39.287582,0.0 -80.32424,39.284798,0.0 -80.322828,39.282132,0.0 -80.323439,39.280838,0.0 -80.31849,39.279143,0.0 -80.317594,39.278234,0.0 -80.317373,39.278225,0.0 -80.297558,39.27794,0.0 -80.296334,39.277799,0.0 -80.296682,39.279778,0.0 -80.299418,39.280177,0.0 -80.300207,39.280581,0.0 -80.306115,39.279557,0.0 -80.305572,39.281941,0.0 -80.307798,39.28268,0.0 -80.307846,39.284801,0.0 -80.305011,39.286645,0.0 -80.298205,39.286968,0.0 -80.29898,39.287571,0.0 -80.299506,39.287903,0.0 -80.300931,39.287893,0.0 -80.299962,39.288323,0.0 -80.30193,39.289868,0.0 -80.304636,39.291976,0.0 -80.307098,39.292733,0.0 -80.325885,39.298505,0.0 -80.327597,39.294579,0.0 -80.329641,39.291847,0.0 -80.331593,39.289165,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Dixie&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>21628</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586798</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5421628</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5421628</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Dixie</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1888928</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">21628</SimpleData>
<SimpleData name="PLACENS">02586798</SimpleData>
<SimpleData name="AFFGEOID">1600000US5421628</SimpleData>
<SimpleData name="GEOID">5421628</SimpleData>
<SimpleData name="NAME">Dixie</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1888928</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.20743,38.250025,0.0 -81.204275,38.248883,0.0 -81.203097,38.248822,0.0 -81.203261,38.24778,0.0 -81.196987,38.247757,0.0 -81.196987,38.239907,0.0 -81.193011,38.239911,0.0 -81.192364,38.240354,0.0 -81.187609,38.237371,0.0 -81.186175,38.237499,0.0 -81.185311,38.237965,0.0 -81.185294,38.240785,0.0 -81.189357,38.240785,0.0 -81.189393,38.254893,0.0 -81.19089,38.254283,0.0 -81.193618,38.25892,0.0 -81.195128,38.263793,0.0 -81.197977,38.267328,0.0 -81.200551,38.26691,0.0 -81.2026,38.267199,0.0 -81.202418,38.264653,0.0 -81.199694,38.263398,0.0 -81.1955,38.254734,0.0 -81.194918,38.252101,0.0 -81.199663,38.251458,0.0 -81.199379,38.249233,0.0 -81.204225,38.249099,0.0 -81.20743,38.250025,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Dunbar&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>22564</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390584</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5422564</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5422564</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Dunbar</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>7258041</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>9810</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">22564</SimpleData>
<SimpleData name="PLACENS">02390584</SimpleData>
<SimpleData name="AFFGEOID">1600000US5422564</SimpleData>
<SimpleData name="GEOID">5422564</SimpleData>
<SimpleData name="NAME">Dunbar</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">7258041</SimpleData>
<SimpleData name="AWATER">9810</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.739725,38.380184,0.0 -81.740338,38.378577,0.0 -81.738102,38.377817,0.0 -81.735163,38.376882,0.0 -81.734595,38.379633,0.0 -81.730312,38.384446,0.0 -81.73012,38.385854,0.0 -81.731753,38.388382,0.0 -81.735268,38.391732,0.0 -81.73696,38.394494,0.0 -81.737215,38.394865,0.0 -81.737104,38.392912,0.0 -81.736938,38.385609,0.0 -81.737876,38.384855,0.0 -81.73937,38.38329,0.0 -81.739992,38.382221,0.0 -81.740099,38.381394,0.0 -81.739725,38.380184,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.759402,38.36873,0.0 -81.759256,38.368409,0.0 -81.759202,38.366752,0.0 -81.759349,38.366445,0.0 -81.755926,38.361983,0.0 -81.753339,38.359594,0.0 -81.750833,38.358028,0.0 -81.750424,38.357799,0.0 -81.748416,38.356962,0.0 -81.744241,38.356299,0.0 -81.740002,38.356142,0.0 -81.736925,38.356518,0.0 -81.732523,38.357378,0.0 -81.725993,38.359185,0.0 -81.72518,38.360124,0.0 -81.720734,38.363297,0.0 -81.718119,38.364027,0.0 -81.715371,38.366452,0.0 -81.707837,38.37117,0.0 -81.706989,38.371478,0.0 -81.707156,38.372489,0.0 -81.707081,38.37276,0.0 -81.707557,38.372958,0.0 -81.708487,38.374095,0.0 -81.709215,38.376054,0.0 -81.70998,38.375363,0.0 -81.710366,38.375606,0.0 -81.711224,38.375782,0.0 -81.712852,38.375688,0.0 -81.715173,38.375064,0.0 -81.718072,38.372109,0.0 -81.718654,38.372014,0.0 -81.720953,38.372139,0.0 -81.723309,38.377105,0.0 -81.722599,38.378032,0.0 -81.723981,38.378436,0.0 -81.724875,38.379219,0.0 -81.724472,38.380559,0.0 -81.724877,38.380758,0.0 -81.726094,38.379766,0.0 -81.727795,38.37999,0.0 -81.728635,38.377114,0.0 -81.727076,38.374051,0.0 -81.733631,38.374974,0.0 -81.735021,38.376069,0.0 -81.735585,38.376214,0.0 -81.736541,38.372689,0.0 -81.740045,38.374982,0.0 -81.74148,38.373358,0.0 -81.747911,38.371789,0.0 -81.748448,38.371656,0.0 -81.749773,38.372255,0.0 -81.750929,38.369346,0.0 -81.752521,38.368646,0.0 -81.757991,38.369671,0.0 -81.759402,38.36873,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Durbin&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>22852</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390154</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5422852</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5422852</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Durbin</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1481534</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">22852</SimpleData>
<SimpleData name="PLACENS">02390154</SimpleData>
<SimpleData name="AFFGEOID">1600000US5422852</SimpleData>
<SimpleData name="GEOID">5422852</SimpleData>
<SimpleData name="NAME">Durbin</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1481534</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.835155,38.54999,0.0 -79.835262,38.541879,0.0 -79.820697,38.541839,0.0 -79.820636,38.544376,0.0 -79.820533,38.548691,0.0 -79.820445,38.552432,0.0 -79.835185,38.552397,0.0 -79.83518,38.550374,0.0 -79.8314,38.550431,0.0 -79.835155,38.54999,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;East Bank&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>23092</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390156</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5423092</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5423092</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>East Bank</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1247367</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">23092</SimpleData>
<SimpleData name="PLACENS">02390156</SimpleData>
<SimpleData name="AFFGEOID">1600000US5423092</SimpleData>
<SimpleData name="GEOID">5423092</SimpleData>
<SimpleData name="NAME">East Bank</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1247367</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.453603,38.214211,0.0 -81.456515,38.210561,0.0 -81.450945,38.213155,0.0 -81.448544,38.210459,0.0 -81.434706,38.213729,0.0 -81.435212,38.217919,0.0 -81.439183,38.220216,0.0 -81.44387,38.220095,0.0 -81.445994,38.219312,0.0 -81.451738,38.21591,0.0 -81.453603,38.214211,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;East Dailey&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>23140</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586799</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5423140</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5423140</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>East Dailey</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2723305</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">23140</SimpleData>
<SimpleData name="PLACENS">02586799</SimpleData>
<SimpleData name="AFFGEOID">1600000US5423140</SimpleData>
<SimpleData name="GEOID">5423140</SimpleData>
<SimpleData name="NAME">East Dailey</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2723305</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.902264,38.771282,0.0 -79.900334,38.770447,0.0 -79.899792,38.769211,0.0 -79.897945,38.770671,0.0 -79.897348,38.771946,0.0 -79.893157,38.769505,0.0 -79.891086,38.769549,0.0 -79.890303,38.768864,0.0 -79.886778,38.767698,0.0 -79.882512,38.78946,0.0 -79.886028,38.791004,0.0 -79.888829,38.790738,0.0 -79.887345,38.793576,0.0 -79.88828,38.794932,0.0 -79.889531,38.791951,0.0 -79.89153,38.792163,0.0 -79.891496,38.790259,0.0 -79.897291,38.780942,0.0 -79.900297,38.777816,0.0 -79.900096,38.775399,0.0 -79.902264,38.771282,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Eccles&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>23644</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586800</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5423644</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5423644</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Eccles</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1779277</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>4708</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">23644</SimpleData>
<SimpleData name="PLACENS">02586800</SimpleData>
<SimpleData name="AFFGEOID">1600000US5423644</SimpleData>
<SimpleData name="GEOID">5423644</SimpleData>
<SimpleData name="NAME">Eccles</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1779277</SimpleData>
<SimpleData name="AWATER">4708</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.271216,37.786733,0.0 -81.271195,37.776425,0.0 -81.268274,37.776423,0.0 -81.267244,37.771999,0.0 -81.267423,37.771219,0.0 -81.263499,37.771543,0.0 -81.262079,37.774017,0.0 -81.262922,37.775139,0.0 -81.261441,37.775965,0.0 -81.260072,37.777618,0.0 -81.257631,37.785967,0.0 -81.259565,37.790969,0.0 -81.261408,37.788102,0.0 -81.263959,37.789944,0.0 -81.270853,37.787585,0.0 -81.271216,37.786733,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Eleanor&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>24292</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390163</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5424292</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5424292</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Eleanor</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5495590</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>12400</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">24292</SimpleData>
<SimpleData name="PLACENS">02390163</SimpleData>
<SimpleData name="AFFGEOID">1600000US5424292</SimpleData>
<SimpleData name="GEOID">5424292</SimpleData>
<SimpleData name="NAME">Eleanor</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">5495590</SimpleData>
<SimpleData name="AWATER">12400</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.948191,38.547439,0.0 -81.949865,38.540984,0.0 -81.94805,38.540756,0.0 -81.947484,38.542804,0.0 -81.943834,38.541259,0.0 -81.940128,38.53921,0.0 -81.943295,38.536643,0.0 -81.938085,38.533522,0.0 -81.924798,38.526414,0.0 -81.921238,38.525523,0.0 -81.917322,38.525698,0.0 -81.911398,38.528132,0.0 -81.904613,38.532277,0.0 -81.901591,38.534404,0.0 -81.902499,38.535141,0.0 -81.90806,38.531631,0.0 -81.912716,38.530676,0.0 -81.911757,38.532313,0.0 -81.911256,38.537516,0.0 -81.911526,38.538575,0.0 -81.905636,38.537872,0.0 -81.904536,38.536719,0.0 -81.902653,38.536437,0.0 -81.902743,38.538437,0.0 -81.905155,38.541316,0.0 -81.907916,38.543218,0.0 -81.908148,38.542386,0.0 -81.909846,38.543617,0.0 -81.911377,38.543218,0.0 -81.912464,38.544173,0.0 -81.913877,38.542933,0.0 -81.917438,38.54218,0.0 -81.917315,38.547571,0.0 -81.919942,38.547553,0.0 -81.920367,38.539195,0.0 -81.921937,38.539554,0.0 -81.928673,38.542098,0.0 -81.927593,38.544533,0.0 -81.927149,38.547379,0.0 -81.929035,38.549243,0.0 -81.929951,38.549243,0.0 -81.937907,38.5451,0.0 -81.948021,38.548428,0.0 -81.948191,38.547439,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Elizabeth&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>24364</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390164</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5424364</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5424364</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Elizabeth</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1224291</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>163317</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">24364</SimpleData>
<SimpleData name="PLACENS">02390164</SimpleData>
<SimpleData name="AFFGEOID">1600000US5424364</SimpleData>
<SimpleData name="GEOID">5424364</SimpleData>
<SimpleData name="NAME">Elizabeth</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1224291</SimpleData>
<SimpleData name="AWATER">163317</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.405544,39.062818,0.0 -81.405834,39.059663,0.0 -81.401588,39.056631,0.0 -81.398974,39.055685,0.0 -81.397228,39.05679,0.0 -81.396981,39.057111,0.0 -81.397324,39.058607,0.0 -81.389843,39.057022,0.0 -81.388749,39.059487,0.0 -81.388621,39.060709,0.0 -81.389501,39.06308,0.0 -81.390874,39.064364,0.0 -81.393895,39.066089,0.0 -81.399236,39.06717,0.0 -81.402139,39.067547,0.0 -81.404802,39.066832,0.0 -81.403866,39.064815,0.0 -81.405804,39.064016,0.0 -81.402571,39.063455,0.0 -81.402944,39.062313,0.0 -81.405544,39.062818,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Elk Garden&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>24484</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390165</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5424484</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5424484</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Elk Garden</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>667065</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">24484</SimpleData>
<SimpleData name="PLACENS">02390165</SimpleData>
<SimpleData name="AFFGEOID">1600000US5424484</SimpleData>
<SimpleData name="GEOID">5424484</SimpleData>
<SimpleData name="NAME">Elk Garden</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">667065</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.157974,39.392755,0.0 -79.160558,39.384395,0.0 -79.152276,39.380299,0.0 -79.150082,39.384766,0.0 -79.154553,39.387981,0.0 -79.15257,39.390247,0.0 -79.157974,39.392755,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Elkins&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>24580</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390585</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5424580</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5424580</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Elkins</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9394524</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">24580</SimpleData>
<SimpleData name="PLACENS">02390585</SimpleData>
<SimpleData name="AFFGEOID">1600000US5424580</SimpleData>
<SimpleData name="GEOID">5424580</SimpleData>
<SimpleData name="NAME">Elkins</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">9394524</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.88016,38.929533,0.0 -79.878992,38.928587,0.0 -79.878993,38.926557,0.0 -79.877554,38.927167,0.0 -79.87438,38.927246,0.0 -79.87294,38.924997,0.0 -79.874815,38.923858,0.0 -79.868967,38.921171,0.0 -79.871411,38.918667,0.0 -79.874713,38.91895,0.0 -79.874249,38.920441,0.0 -79.876949,38.921276,0.0 -79.878393,38.916867,0.0 -79.876798,38.916155,0.0 -79.877293,38.915413,0.0 -79.874625,38.914533,0.0 -79.874922,38.914899,0.0 -79.871846,38.917361,0.0 -79.873377,38.918397,0.0 -79.872087,38.918041,0.0 -79.86805,38.915691,0.0 -79.866747,38.915312,0.0 -79.867266,38.911364,0.0 -79.868207,38.909936,0.0 -79.866868,38.909439,0.0 -79.865997,38.908883,0.0 -79.864431,38.908224,0.0 -79.86216,38.907879,0.0 -79.861004,38.907973,0.0 -79.860885,38.908202,0.0 -79.855384,38.909558,0.0 -79.85064,38.912936,0.0 -79.844217,38.909546,0.0 -79.844261,38.90811,0.0 -79.845883,38.89754,0.0 -79.846554,38.89377,0.0 -79.847028,38.890748,0.0 -79.848994,38.892057,0.0 -79.848157,38.892758,0.0 -79.851595,38.894528,0.0 -79.854837,38.891666,0.0 -79.850427,38.888006,0.0 -79.848739,38.889068,0.0 -79.848505,38.890623,0.0 -79.84711,38.890459,0.0 -79.844732,38.885124,0.0 -79.841549,38.875565,0.0 -79.842128,38.873372,0.0 -79.842001,38.873319,0.0 -79.841865,38.873287,0.0 -79.841341,38.87478,0.0 -79.841367,38.876591,0.0 -79.84343,38.882662,0.0 -79.839712,38.879747,0.0 -79.83853,38.880773,0.0 -79.844184,38.884906,0.0 -79.84663,38.890643,0.0 -79.845847,38.895592,0.0 -79.845508,38.897466,0.0 -79.843734,38.907833,0.0 -79.845251,38.914728,0.0 -79.843663,38.915507,0.0 -79.842915,38.916994,0.0 -79.839821,38.915989,0.0 -79.841123,38.917627,0.0 -79.840168,38.918392,0.0 -79.839452,38.9212,0.0 -79.833942,38.918592,0.0 -79.833256,38.921061,0.0 -79.834775,38.923268,0.0 -79.832611,38.924009,0.0 -79.83388,38.925114,0.0 -79.835478,38.924673,0.0 -79.837639,38.927774,0.0 -79.837146,38.928338,0.0 -79.838881,38.939103,0.0 -79.839049,38.940156,0.0 -79.846003,38.939774,0.0 -79.846039,38.943804,0.0 -79.847789,38.942465,0.0 -79.847319,38.93961,0.0 -79.849927,38.939434,0.0 -79.850091,38.94156,0.0 -79.853888,38.941439,0.0 -79.854578,38.943177,0.0 -79.851238,38.943061,0.0 -79.850206,38.944519,0.0 -79.847523,38.944179,0.0 -79.846332,38.945151,0.0 -79.848794,38.94685,0.0 -79.851307,38.943147,0.0 -79.854617,38.943274,0.0 -79.854779,38.945408,0.0 -79.855725,38.945544,0.0 -79.855911,38.946094,0.0 -79.858127,38.949191,0.0 -79.857313,38.95277,0.0 -79.857276,38.955717,0.0 -79.857324,38.954932,0.0 -79.857981,38.952619,0.0 -79.858833,38.952657,0.0 -79.859088,38.949512,0.0 -79.855937,38.945573,0.0 -79.854329,38.941429,0.0 -79.858643,38.941325,0.0 -79.859437,38.938758,0.0 -79.860093,38.936673,0.0 -79.860269,38.936282,0.0 -79.861439,38.936526,0.0 -79.861704,38.935757,0.0 -79.860282,38.935363,0.0 -79.860572,38.934803,0.0 -79.861955,38.932187,0.0 -79.865549,38.933204,0.0 -79.865108,38.934095,0.0 -79.867451,38.934795,0.0 -79.86661,38.933473,0.0 -79.867224,38.932191,0.0 -79.868998,38.93331,0.0 -79.87395,38.932377,0.0 -79.872548,38.930005,0.0 -79.88016,38.929533,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-79.876761,38.927742,0.0 -79.876959,38.92923,0.0 -79.87561,38.929329,0.0 -79.875412,38.927841,0.0 -79.876761,38.927742,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-79.875813,38.916115,0.0 -79.874796,38.918715,0.0 -79.873481,38.91787,0.0 -79.875813,38.916115,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-79.872442,38.91843,0.0 -79.870561,38.918105,0.0 -79.868061,38.92095,0.0 -79.865044,38.919691,0.0 -79.86659,38.915402,0.0 -79.867986,38.915812,0.0 -79.872442,38.91843,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-79.871921,38.928039,0.0 -79.872159,38.929607,0.0 -79.867951,38.930902,0.0 -79.867757,38.929504,0.0 -79.866284,38.929044,0.0 -79.868887,38.927461,0.0 -79.869441,38.928297,0.0 -79.871921,38.928039,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Elkview&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>24748</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389034</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5424748</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5424748</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Elkview</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4349826</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>183992</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">24748</SimpleData>
<SimpleData name="PLACENS">02389034</SimpleData>
<SimpleData name="AFFGEOID">1600000US5424748</SimpleData>
<SimpleData name="GEOID">5424748</SimpleData>
<SimpleData name="NAME">Elkview</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">4349826</SimpleData>
<SimpleData name="AWATER">183992</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.489198,38.421724,0.0 -81.49016,38.41811,0.0 -81.488291,38.415783,0.0 -81.487213,38.416526,0.0 -81.488199,38.418284,0.0 -81.486741,38.420308,0.0 -81.486057,38.420524,0.0 -81.483649,38.423087,0.0 -81.480372,38.422616,0.0 -81.477677,38.423532,0.0 -81.474048,38.423413,0.0 -81.470405,38.422532,0.0 -81.468751,38.423472,0.0 -81.467966,38.425659,0.0 -81.466095,38.428142,0.0 -81.462644,38.430058,0.0 -81.462856,38.432283,0.0 -81.464415,38.435107,0.0 -81.46758,38.437636,0.0 -81.468188,38.439048,0.0 -81.468622,38.442301,0.0 -81.467498,38.442841,0.0 -81.464523,38.445498,0.0 -81.464929,38.445586,0.0 -81.465532,38.446009,0.0 -81.467964,38.445237,0.0 -81.477513,38.443545,0.0 -81.48056,38.442698,0.0 -81.483696,38.442245,0.0 -81.487019,38.439884,0.0 -81.489074,38.437631,0.0 -81.488778,38.436562,0.0 -81.488114,38.426341,0.0 -81.489111,38.42386,0.0 -81.488258,38.425072,0.0 -81.488032,38.425632,0.0 -81.487747,38.426339,0.0 -81.487803,38.428243,0.0 -81.486494,38.428074,0.0 -81.486986,38.425957,0.0 -81.489198,38.421724,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Ellenboro&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>24844</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390168</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5424844</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5424844</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Ellenboro</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2913228</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>1274</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">24844</SimpleData>
<SimpleData name="PLACENS">02390168</SimpleData>
<SimpleData name="AFFGEOID">1600000US5424844</SimpleData>
<SimpleData name="GEOID">5424844</SimpleData>
<SimpleData name="NAME">Ellenboro</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2913228</SimpleData>
<SimpleData name="AWATER">1274</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.066819,39.26293,0.0 -81.065256,39.25881,0.0 -81.065014,39.258105,0.0 -81.059398,39.257277,0.0 -81.058559,39.257142,0.0 -81.051182,39.257095,0.0 -81.050209,39.263661,0.0 -81.046865,39.268239,0.0 -81.044917,39.270106,0.0 -81.042549,39.273307,0.0 -81.041022,39.276217,0.0 -81.04161,39.276999,0.0 -81.043745,39.277659,0.0 -81.046668,39.274575,0.0 -81.04677,39.27338,0.0 -81.05019,39.271905,0.0 -81.053732,39.280385,0.0 -81.056998,39.278515,0.0 -81.063235,39.275733,0.0 -81.063229,39.273548,0.0 -81.057577,39.268645,0.0 -81.066819,39.26293,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Enterprise&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>25516</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389047</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5425516</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5425516</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Enterprise</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>7623884</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">25516</SimpleData>
<SimpleData name="PLACENS">02389047</SimpleData>
<SimpleData name="AFFGEOID">1600000US5425516</SimpleData>
<SimpleData name="GEOID">5425516</SimpleData>
<SimpleData name="NAME">Enterprise</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">7623884</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.31451,39.419798,0.0 -80.314469,39.417585,0.0 -80.312689,39.416064,0.0 -80.311707,39.41694,0.0 -80.303701,39.414638,0.0 -80.301182,39.411713,0.0 -80.300205,39.411819,0.0 -80.299853,39.41364,0.0 -80.298428,39.41175,0.0 -80.296964,39.411914,0.0 -80.291698,39.409648,0.0 -80.289379,39.407728,0.0 -80.286949,39.404428,0.0 -80.285283,39.404873,0.0 -80.284319,39.402711,0.0 -80.28189,39.403962,0.0 -80.281606,39.408542,0.0 -80.282481,39.410242,0.0 -80.280531,39.40855,0.0 -80.280201,39.404875,0.0 -80.282179,39.40296,0.0 -80.281873,39.402557,0.0 -80.277867,39.403253,0.0 -80.276934,39.402862,0.0 -80.275582,39.405379,0.0 -80.273231,39.407142,0.0 -80.273369,39.409044,0.0 -80.275507,39.411391,0.0 -80.275139,39.414674,0.0 -80.274015,39.416087,0.0 -80.270161,39.418393,0.0 -80.269802,39.419316,0.0 -80.266495,39.419748,0.0 -80.262409,39.421223,0.0 -80.256922,39.420632,0.0 -80.253101,39.421511,0.0 -80.270696,39.430213,0.0 -80.274868,39.431856,0.0 -80.279759,39.432865,0.0 -80.282776,39.435797,0.0 -80.289275,39.432263,0.0 -80.290142,39.435091,0.0 -80.291124,39.435776,0.0 -80.293459,39.434228,0.0 -80.291606,39.432558,0.0 -80.290073,39.430331,0.0 -80.287074,39.427838,0.0 -80.288904,39.426972,0.0 -80.294634,39.42882,0.0 -80.297089,39.429041,0.0 -80.297217,39.428494,0.0 -80.29432,39.426837,0.0 -80.293252,39.427152,0.0 -80.293232,39.424432,0.0 -80.293999,39.423539,0.0 -80.297481,39.422278,0.0 -80.299369,39.420379,0.0 -80.304592,39.418408,0.0 -80.309875,39.419001,0.0 -80.312916,39.420509,0.0 -80.31451,39.419798,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Fairlea&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>26428</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389062</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5426428</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5426428</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Fairlea</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9684437</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>6854</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">26428</SimpleData>
<SimpleData name="PLACENS">02389062</SimpleData>
<SimpleData name="AFFGEOID">1600000US5426428</SimpleData>
<SimpleData name="GEOID">5426428</SimpleData>
<SimpleData name="NAME">Fairlea</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">9684437</SimpleData>
<SimpleData name="AWATER">6854</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.479093,37.779118,0.0 -80.482098,37.771868,0.0 -80.478626,37.771217,0.0 -80.477634,37.769194,0.0 -80.472198,37.766248,0.0 -80.468598,37.772795,0.0 -80.468423,37.771895,0.0 -80.465477,37.768679,0.0 -80.466558,37.76436,0.0 -80.46532,37.762045,0.0 -80.462086,37.760726,0.0 -80.461396,37.757543,0.0 -80.462684,37.755372,0.0 -80.462326,37.755364,0.0 -80.454139,37.758684,0.0 -80.451155,37.758769,0.0 -80.448272,37.756483,0.0 -80.44733,37.757221,0.0 -80.447165,37.757518,0.0 -80.447402,37.757995,0.0 -80.447516,37.758325,0.0 -80.447553,37.758563,0.0 -80.447458,37.758984,0.0 -80.446577,37.758401,0.0 -80.44564,37.75911,0.0 -80.445895,37.760928,0.0 -80.444628,37.762449,0.0 -80.442676,37.763828,0.0 -80.443482,37.767403,0.0 -80.439809,37.771184,0.0 -80.444785,37.772954,0.0 -80.443187,37.773953,0.0 -80.443445,37.77492,0.0 -80.441745,37.774566,0.0 -80.440784,37.776295,0.0 -80.441723,37.779004,0.0 -80.442129,37.782239,0.0 -80.440841,37.784235,0.0 -80.442695,37.786469,0.0 -80.442167,37.787353,0.0 -80.443658,37.788522,0.0 -80.442899,37.789843,0.0 -80.443591,37.790874,0.0 -80.44563,37.792497,0.0 -80.445955,37.792767,0.0 -80.445924,37.792291,0.0 -80.446815,37.791093,0.0 -80.448916,37.789995,0.0 -80.450288,37.791709,0.0 -80.453311,37.792507,0.0 -80.455038,37.791038,0.0 -80.458215,37.794035,0.0 -80.460836,37.792618,0.0 -80.462567,37.790242,0.0 -80.465616,37.788001,0.0 -80.468997,37.787202,0.0 -80.470893,37.78631,0.0 -80.475366,37.783268,0.0 -80.478098,37.781138,0.0 -80.479093,37.779118,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Fairmont&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>26452</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390586</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5426452</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5426452</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Fairmont</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>22247397</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>994327</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">26452</SimpleData>
<SimpleData name="PLACENS">02390586</SimpleData>
<SimpleData name="AFFGEOID">1600000US5426452</SimpleData>
<SimpleData name="GEOID">5426452</SimpleData>
<SimpleData name="NAME">Fairmont</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">22247397</SimpleData>
<SimpleData name="AWATER">994327</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.212823,39.446979,0.0 -80.213187,39.442919,0.0 -80.210383,39.439927,0.0 -80.208538,39.438792,0.0 -80.206736,39.435948,0.0 -80.204093,39.434597,0.0 -80.203599,39.433652,0.0 -80.205771,39.429821,0.0 -80.205984,39.4281,0.0 -80.199333,39.428773,0.0 -80.197422,39.426023,0.0 -80.195913,39.428097,0.0 -80.194691,39.429187,0.0 -80.192752,39.430384,0.0 -80.188956,39.431858,0.0 -80.186545,39.435024,0.0 -80.187877,39.436011,0.0 -80.187529,39.437189,0.0 -80.19131,39.439313,0.0 -80.192785,39.437249,0.0 -80.19534,39.434721,0.0 -80.198501,39.43405,0.0 -80.19599,39.436266,0.0 -80.196862,39.438766,0.0 -80.200653,39.436383,0.0 -80.203404,39.433739,0.0 -80.204109,39.434898,0.0 -80.20656,39.436086,0.0 -80.208611,39.439224,0.0 -80.211183,39.441487,0.0 -80.209874,39.442769,0.0 -80.209109,39.44861,0.0 -80.204725,39.450602,0.0 -80.204317,39.452657,0.0 -80.206382,39.453342,0.0 -80.202671,39.45659,0.0 -80.201967,39.458362,0.0 -80.198623,39.458886,0.0 -80.197142,39.457825,0.0 -80.195003,39.457109,0.0 -80.193638,39.457203,0.0 -80.190379,39.459567,0.0 -80.18698,39.458967,0.0 -80.18279,39.456495,0.0 -80.182213,39.456456,0.0 -80.17986,39.453651,0.0 -80.176868,39.454305,0.0 -80.175225,39.450695,0.0 -80.174805,39.450706,0.0 -80.174443,39.450891,0.0 -80.173997,39.449841,0.0 -80.172418,39.450256,0.0 -80.161974,39.45417,0.0 -80.158347,39.455907,0.0 -80.157544,39.456809,0.0 -80.155466,39.462314,0.0 -80.153155,39.464741,0.0 -80.148395,39.466287,0.0 -80.146616,39.467595,0.0 -80.14525,39.47115,0.0 -80.145059,39.476553,0.0 -80.144357,39.476196,0.0 -80.143615,39.475984,0.0 -80.133222,39.470736,0.0 -80.132661,39.470988,0.0 -80.132496,39.470894,0.0 -80.130399,39.468901,0.0 -80.13356,39.466123,0.0 -80.130573,39.462961,0.0 -80.129642,39.463397,0.0 -80.128678,39.463487,0.0 -80.127511,39.464136,0.0 -80.126668,39.465436,0.0 -80.12485,39.46545,0.0 -80.124101,39.463234,0.0 -80.12616,39.464161,0.0 -80.126511,39.462932,0.0 -80.126187,39.46218,0.0 -80.123695,39.462229,0.0 -80.123247,39.460662,0.0 -80.125439,39.456398,0.0 -80.13057,39.453256,0.0 -80.136829,39.453548,0.0 -80.133579,39.455924,0.0 -80.131862,39.456224,0.0 -80.133216,39.457563,0.0 -80.131726,39.458827,0.0 -80.137606,39.461869,0.0 -80.140287,39.461066,0.0 -80.141889,39.459417,0.0 -80.140584,39.45734,0.0 -80.138272,39.456714,0.0 -80.138768,39.453693,0.0 -80.132823,39.452976,0.0 -80.130731,39.452977,0.0 -80.130508,39.45321,0.0 -80.12979,39.453367,0.0 -80.128611,39.454018,0.0 -80.12661,39.455457,0.0 -80.125314,39.456189,0.0 -80.124472,39.456937,0.0 -80.123002,39.460524,0.0 -80.124537,39.465497,0.0 -80.122359,39.467748,0.0 -80.119053,39.470007,0.0 -80.119461,39.47067,0.0 -80.123811,39.471271,0.0 -80.129157,39.469479,0.0 -80.130166,39.469013,0.0 -80.131692,39.470404,0.0 -80.129604,39.469876,0.0 -80.126724,39.470659,0.0 -80.122609,39.473164,0.0 -80.127458,39.473242,0.0 -80.128465,39.474118,0.0 -80.132415,39.471157,0.0 -80.128643,39.476787,0.0 -80.122884,39.476474,0.0 -80.122413,39.476264,0.0 -80.122139,39.475175,0.0 -80.120963,39.473715,0.0 -80.118462,39.475095,0.0 -80.118543,39.476536,0.0 -80.112747,39.479077,0.0 -80.10787,39.48284,0.0 -80.104803,39.48635,0.0 -80.105361,39.489762,0.0 -80.104895,39.492215,0.0 -80.106878,39.492437,0.0 -80.105862,39.493992,0.0 -80.106755,39.494324,0.0 -80.118206,39.499121,0.0 -80.118748,39.498506,0.0 -80.122967,39.499911,0.0 -80.124592,39.501126,0.0 -80.125886,39.504065,0.0 -80.129797,39.506054,0.0 -80.131911,39.506461,0.0 -80.133351,39.506478,0.0 -80.145012,39.500776,0.0 -80.146812,39.499723,0.0 -80.147492,39.499376,0.0 -80.154844,39.496261,0.0 -80.156311,39.494902,0.0 -80.156764,39.495982,0.0 -80.157291,39.495766,0.0 -80.157792,39.494263,0.0 -80.167577,39.489558,0.0 -80.173467,39.486794,0.0 -80.170018,39.484493,0.0 -80.170855,39.483598,0.0 -80.173375,39.484614,0.0 -80.175095,39.483479,0.0 -80.172043,39.482338,0.0 -80.173354,39.480877,0.0 -80.174386,39.477004,0.0 -80.17356,39.475184,0.0 -80.17787,39.476287,0.0 -80.179517,39.473529,0.0 -80.175549,39.473589,0.0 -80.173367,39.472777,0.0 -80.177295,39.470365,0.0 -80.177642,39.468097,0.0 -80.180632,39.468704,0.0 -80.184219,39.470318,0.0 -80.185627,39.471144,0.0 -80.184938,39.470271,0.0 -80.184498,39.469934,0.0 -80.179625,39.460259,0.0 -80.177931,39.45684,0.0 -80.179613,39.456288,0.0 -80.180677,39.457468,0.0 -80.181696,39.457214,0.0 -80.181344,39.457714,0.0 -80.184683,39.460532,0.0 -80.186942,39.459194,0.0 -80.19071,39.459775,0.0 -80.195078,39.457318,0.0 -80.196971,39.45799,0.0 -80.198248,39.459016,0.0 -80.198939,39.459153,0.0 -80.201659,39.458737,0.0 -80.202388,39.458323,0.0 -80.202922,39.456728,0.0 -80.206564,39.453486,0.0 -80.206415,39.453111,0.0 -80.204623,39.452604,0.0 -80.204852,39.450771,0.0 -80.207806,39.449298,0.0 -80.212109,39.447995,0.0 -80.212823,39.446979,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Fairview&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>26524</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390174</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5426524</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5426524</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Fairview</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>724404</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">26524</SimpleData>
<SimpleData name="PLACENS">02390174</SimpleData>
<SimpleData name="AFFGEOID">1600000US5426524</SimpleData>
<SimpleData name="GEOID">5426524</SimpleData>
<SimpleData name="NAME">Fairview</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">724404</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.254439,39.591772,0.0 -80.255094,39.591346,0.0 -80.254118,39.590756,0.0 -80.251676,39.590746,0.0 -80.251488,39.589496,0.0 -80.249716,39.589393,0.0 -80.244946,39.588743,0.0 -80.242395,39.588736,0.0 -80.240694,39.595596,0.0 -80.250499,39.597091,0.0 -80.251444,39.592248,0.0 -80.2529,39.592791,0.0 -80.253313,39.592473,0.0 -80.253493,39.592648,0.0 -80.254628,39.592317,0.0 -80.254439,39.591772,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Falling Spring&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>26692</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390175</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5426692</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5426692</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Falling Spring</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1333643</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>32475</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">26692</SimpleData>
<SimpleData name="PLACENS">02390175</SimpleData>
<SimpleData name="AFFGEOID">1600000US5426692</SimpleData>
<SimpleData name="GEOID">5426692</SimpleData>
<SimpleData name="NAME">Falling Spring</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1333643</SimpleData>
<SimpleData name="AWATER">32475</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.367693,37.994517,0.0 -80.366208,37.991206,0.0 -80.365621,37.991177,0.0 -80.363991,37.989324,0.0 -80.364103,37.987646,0.0 -80.364223,37.987336,0.0 -80.361198,37.986938,0.0 -80.358458,37.988985,0.0 -80.356315,37.989417,0.0 -80.351216,37.989716,0.0 -80.344414,37.991853,0.0 -80.344991,37.993549,0.0 -80.352399,37.995599,0.0 -80.35744,37.995713,0.0 -80.358847,37.996302,0.0 -80.359704,37.9978,0.0 -80.361014,37.996976,0.0 -80.361921,37.998148,0.0 -80.365931,37.996663,0.0 -80.365535,37.995476,0.0 -80.367693,37.994517,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Falling Waters&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>26716</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586801</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5426716</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5426716</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Falling Waters</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3225261</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">26716</SimpleData>
<SimpleData name="PLACENS">02586801</SimpleData>
<SimpleData name="AFFGEOID">1600000US5426716</SimpleData>
<SimpleData name="GEOID">5426716</SimpleData>
<SimpleData name="NAME">Falling Waters</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3225261</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-77.901033,39.560417,0.0 -77.905139,39.556477,0.0 -77.893337,39.550589,0.0 -77.891874,39.552701,0.0 -77.889034,39.552285,0.0 -77.889227,39.557201,0.0 -77.8880104731737,39.5591265451314,0.0 -77.887968,39.559198,0.0 -77.886135,39.560432,0.0 -77.8806510292637,39.5626165958386,0.0 -77.878451,39.563493,0.0 -77.872723,39.563895,0.0 -77.8689967488536,39.5637094605238,0.0 -77.868729,39.568907,0.0 -77.872502,39.568024,0.0 -77.877818,39.565123,0.0 -77.879417,39.565374,0.0 -77.877594,39.568429,0.0 -77.877769,39.571097,0.0 -77.876736,39.575449,0.0 -77.878502,39.576452,0.0 -77.878027,39.577787,0.0 -77.876055,39.580063,0.0 -77.877889,39.579566,0.0 -77.879887,39.578638,0.0 -77.881698,39.577254,0.0 -77.887862,39.57022,0.0 -77.887733,39.569961,0.0 -77.892239,39.565891,0.0 -77.901033,39.560417,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Falls View&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>26812</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586802</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5426812</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5426812</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Falls View</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>855440</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>194598</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">26812</SimpleData>
<SimpleData name="PLACENS">02586802</SimpleData>
<SimpleData name="AFFGEOID">1600000US5426812</SimpleData>
<SimpleData name="GEOID">5426812</SimpleData>
<SimpleData name="NAME">Falls View</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">855440</SimpleData>
<SimpleData name="AWATER">194598</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.265436,38.132706,0.0 -81.26615,38.133037,0.0 -81.264086,38.131797,0.0 -81.263396,38.130217,0.0 -81.25755,38.128914,0.0 -81.250961,38.125995,0.0 -81.247657,38.124139,0.0 -81.243548,38.123303,0.0 -81.244717,38.126829,0.0 -81.243686,38.12903,0.0 -81.263918,38.135542,0.0 -81.265436,38.132706,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Farmington&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>26932</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390177</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5426932</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5426932</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Farmington</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1075821</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>29776</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">26932</SimpleData>
<SimpleData name="PLACENS">02390177</SimpleData>
<SimpleData name="AFFGEOID">1600000US5426932</SimpleData>
<SimpleData name="GEOID">5426932</SimpleData>
<SimpleData name="NAME">Farmington</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1075821</SimpleData>
<SimpleData name="AWATER">29776</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.263566,39.511989,0.0 -80.263409,39.511407,0.0 -80.260541,39.512135,0.0 -80.256507,39.512156,0.0 -80.257479,39.511301,0.0 -80.25583,39.508231,0.0 -80.253451,39.504802,0.0 -80.252767,39.504628,0.0 -80.250751,39.505084,0.0 -80.244754,39.512647,0.0 -80.24421,39.51341,0.0 -80.244772,39.514002,0.0 -80.245411,39.514186,0.0 -80.246036,39.518384,0.0 -80.251123,39.518058,0.0 -80.251567,39.516747,0.0 -80.255254,39.515762,0.0 -80.25473,39.513126,0.0 -80.260017,39.513323,0.0 -80.262387,39.512719,0.0 -80.263566,39.511989,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Fayetteville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>27028</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390179</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5427028</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5427028</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Fayetteville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>14380905</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>29196</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">27028</SimpleData>
<SimpleData name="PLACENS">02390179</SimpleData>
<SimpleData name="AFFGEOID">1600000US5427028</SimpleData>
<SimpleData name="GEOID">5427028</SimpleData>
<SimpleData name="NAME">Fayetteville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">14380905</SimpleData>
<SimpleData name="AWATER">29196</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.085674,38.067265,0.0 -81.084868,38.066121,0.0 -81.082481,38.066141,0.0 -81.083345,38.067432,0.0 -81.082599,38.067051,0.0 -81.083454,38.068406,0.0 -81.085674,38.067265,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.135913,38.109941,0.0 -81.137619,38.107326,0.0 -81.133437,38.106938,0.0 -81.130472,38.108972,0.0 -81.127533,38.111886,0.0 -81.128192,38.11295,0.0 -81.127001,38.115777,0.0 -81.127968,38.115853,0.0 -81.127001,38.11732,0.0 -81.122837,38.115471,0.0 -81.119647,38.112006,0.0 -81.118826,38.109027,0.0 -81.116364,38.107915,0.0 -81.115551,38.105469,0.0 -81.113967,38.106914,0.0 -81.115877,38.103681,0.0 -81.117102,38.102417,0.0 -81.10675,38.097913,0.0 -81.106373,38.100887,0.0 -81.102589,38.099326,0.0 -81.101454,38.097171,0.0 -81.102778,38.096056,0.0 -81.102966,38.091895,0.0 -81.104668,38.089072,0.0 -81.107316,38.088774,0.0 -81.110058,38.085503,0.0 -81.110625,38.083869,0.0 -81.109491,38.082978,0.0 -81.110814,38.080599,0.0 -81.110246,38.076735,0.0 -81.109868,38.075546,0.0 -81.106482,38.074973,0.0 -81.102606,38.075712,0.0 -81.102403,38.074211,0.0 -81.105708,38.073999,0.0 -81.105415,38.073281,0.0 -81.102115,38.073527,0.0 -81.101666,38.071477,0.0 -81.100375,38.071592,0.0 -81.099655,38.071307,0.0 -81.097196,38.069896,0.0 -81.098534,38.069107,0.0 -81.099509,38.067634,0.0 -81.100861,38.06637,0.0 -81.101035,38.065943,0.0 -81.099428,38.063815,0.0 -81.099389,38.062122,0.0 -81.098568,38.060873,0.0 -81.097846,38.060254,0.0 -81.097654,38.060031,0.0 -81.098237,38.059717,0.0 -81.099988,38.06017,0.0 -81.100888,38.060103,0.0 -81.103822,38.062126,0.0 -81.102664,38.063258,0.0 -81.100284,38.0626,0.0 -81.099905,38.063818,0.0 -81.101324,38.065322,0.0 -81.10586,38.063539,0.0 -81.106903,38.067047,0.0 -81.111899,38.065286,0.0 -81.111722,38.064749,0.0 -81.113434,38.064646,0.0 -81.112283,38.059716,0.0 -81.10953,38.057816,0.0 -81.111212,38.05464,0.0 -81.113701,38.053399,0.0 -81.115552,38.052328,0.0 -81.116153,38.051923,0.0 -81.118201,38.052162,0.0 -81.118086,38.054047,0.0 -81.123057,38.058118,0.0 -81.126859,38.053613,0.0 -81.126216,38.052571,0.0 -81.128054,38.052295,0.0 -81.12929,38.050884,0.0 -81.127134,38.050317,0.0 -81.126155,38.05083,0.0 -81.124749,38.048403,0.0 -81.125614,38.047881,0.0 -81.13019,38.049947,0.0 -81.135259,38.044454,0.0 -81.133599,38.043624,0.0 -81.131142,38.047021,0.0 -81.127081,38.046316,0.0 -81.1263,38.045187,0.0 -81.123224,38.046767,0.0 -81.121996,38.046252,0.0 -81.123434,38.04093,0.0 -81.123654,38.034768,0.0 -81.125781,38.03569,0.0 -81.128454,38.035102,0.0 -81.129126,38.033069,0.0 -81.1254,38.031639,0.0 -81.123619,38.030406,0.0 -81.123937,38.018381,0.0 -81.123499,38.01838,0.0 -81.123536,38.01713,0.0 -81.122797,38.017175,0.0 -81.122221,38.016997,0.0 -81.121904,38.016873,0.0 -81.120563,38.016196,0.0 -81.120267,38.016297,0.0 -81.117422,38.01905,0.0 -81.116425,38.020966,0.0 -81.11289,38.03163,0.0 -81.110519,38.035509,0.0 -81.109277,38.034887,0.0 -81.107668,38.032161,0.0 -81.106492,38.033621,0.0 -81.105112,38.033213,0.0 -81.103552,38.033849,0.0 -81.103873,38.034705,0.0 -81.101836,38.03613,0.0 -81.103412,38.037907,0.0 -81.103011,38.039517,0.0 -81.105893,38.039335,0.0 -81.109407,38.035628,0.0 -81.102007,38.047319,0.0 -81.09655,38.045069,0.0 -81.097676,38.043413,0.0 -81.095907,38.043077,0.0 -81.092789,38.045826,0.0 -81.090797,38.043688,0.0 -81.087777,38.043081,0.0 -81.08748,38.044417,0.0 -81.086695,38.04429,0.0 -81.08542,38.045163,0.0 -81.093895,38.052429,0.0 -81.09446,38.05314,0.0 -81.093819,38.054023,0.0 -81.090736,38.053878,0.0 -81.087918,38.055831,0.0 -81.085858,38.055523,0.0 -81.085379,38.056404,0.0 -81.089899,38.057826,0.0 -81.090621,38.055827,0.0 -81.092015,38.05622,0.0 -81.091656,38.057256,0.0 -81.093243,38.058333,0.0 -81.090899,38.060452,0.0 -81.08985,38.060461,0.0 -81.091351,38.061846,0.0 -81.090404,38.062738,0.0 -81.091672,38.062061,0.0 -81.093051,38.063053,0.0 -81.094709,38.062088,0.0 -81.091175,38.060422,0.0 -81.093998,38.060249,0.0 -81.097606,38.060226,0.0 -81.098992,38.061554,0.0 -81.099502,38.064261,0.0 -81.100728,38.066278,0.0 -81.099378,38.067517,0.0 -81.09859,38.068857,0.0 -81.096634,38.070077,0.0 -81.095775,38.072019,0.0 -81.095995,38.073192,0.0 -81.094749,38.074273,0.0 -81.093111,38.074412,0.0 -81.090945,38.076192,0.0 -81.088472,38.076037,0.0 -81.088368,38.071617,0.0 -81.087594,38.069803,0.0 -81.085727,38.06733,0.0 -81.083497,38.068475,0.0 -81.085246,38.071901,0.0 -81.086355,38.07783,0.0 -81.086142,38.081601,0.0 -81.086694,38.08385,0.0 -81.087975,38.085777,0.0 -81.098157,38.089421,0.0 -81.100721,38.0914,0.0 -81.101441,38.094197,0.0 -81.10077,38.097276,0.0 -81.100893,38.100172,0.0 -81.10355,38.103722,0.0 -81.107153,38.105473,0.0 -81.112251,38.108709,0.0 -81.112154,38.108993,0.0 -81.11518,38.111121,0.0 -81.118757,38.114367,0.0 -81.120066,38.116461,0.0 -81.121745,38.117681,0.0 -81.12648,38.119261,0.0 -81.127932,38.119182,0.0 -81.130747,38.117571,0.0 -81.131189,38.11356,0.0 -81.133102,38.111463,0.0 -81.135913,38.109941,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
<innerBoundaryIs>
<LinearRing>
<coordinates>-81.124017,38.05069,0.0 -81.125985,38.052651,0.0 -81.122383,38.053747,0.0 -81.123507,38.050457,0.0 -81.124017,38.05069,0.0</coordinates>
</LinearRing>
</innerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Fenwick&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>27196</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586804</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5427196</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5427196</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Fenwick</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>366062</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>31240</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">27196</SimpleData>
<SimpleData name="PLACENS">02586804</SimpleData>
<SimpleData name="AFFGEOID">1600000US5427196</SimpleData>
<SimpleData name="GEOID">5427196</SimpleData>
<SimpleData name="NAME">Fenwick</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">366062</SimpleData>
<SimpleData name="AWATER">31240</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.583823,38.226361,0.0 -80.583108,38.225764,0.0 -80.580902,38.224038,0.0 -80.578655,38.223392,0.0 -80.574888,38.223963,0.0 -80.573689,38.223667,0.0 -80.569981,38.223727,0.0 -80.571222,38.224146,0.0 -80.577121,38.224694,0.0 -80.580273,38.226213,0.0 -80.582097,38.228113,0.0 -80.58032,38.228116,0.0 -80.580274,38.232712,0.0 -80.579906,38.233862,0.0 -80.58163,38.236942,0.0 -80.58377,38.235513,0.0 -80.581938,38.233282,0.0 -80.582841,38.231443,0.0 -80.583823,38.226361,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Flatwoods&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>27868</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390184</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5427868</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5427868</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Flatwoods</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1695838</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>3136</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">27868</SimpleData>
<SimpleData name="PLACENS">02390184</SimpleData>
<SimpleData name="AFFGEOID">1600000US5427868</SimpleData>
<SimpleData name="GEOID">5427868</SimpleData>
<SimpleData name="NAME">Flatwoods</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1695838</SimpleData>
<SimpleData name="AWATER">3136</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.660882,38.71884,0.0 -80.661688,38.71651,0.0 -80.659223,38.711788,0.0 -80.65843,38.711128,0.0 -80.649733,38.711914,0.0 -80.647276,38.716995,0.0 -80.646954,38.720782,0.0 -80.647019,38.722398,0.0 -80.647051,38.723185,0.0 -80.648172,38.723419,0.0 -80.647716,38.725718,0.0 -80.650856,38.725655,0.0 -80.65849,38.725761,0.0 -80.659773,38.722048,0.0 -80.660882,38.71884,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Flemington&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>27940</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390185</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5427940</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5427940</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Flemington</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>789689</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">27940</SimpleData>
<SimpleData name="PLACENS">02390185</SimpleData>
<SimpleData name="AFFGEOID">1600000US5427940</SimpleData>
<SimpleData name="GEOID">5427940</SimpleData>
<SimpleData name="NAME">Flemington</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">789689</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.137074,39.267331,0.0 -80.136556,39.265799,0.0 -80.135451,39.265044,0.0 -80.135668,39.263123,0.0 -80.130358,39.263421,0.0 -80.12445,39.265057,0.0 -80.118485,39.265251,0.0 -80.118033,39.26712,0.0 -80.118061,39.267848,0.0 -80.121071,39.26835,0.0 -80.125368,39.267731,0.0 -80.129246,39.269268,0.0 -80.132458,39.271677,0.0 -80.135185,39.267411,0.0 -80.137074,39.267331,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Follansbee&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>28204</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390587</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5428204</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5428204</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Follansbee</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4773581</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>640485</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">28204</SimpleData>
<SimpleData name="PLACENS">02390587</SimpleData>
<SimpleData name="AFFGEOID">1600000US5428204</SimpleData>
<SimpleData name="GEOID">5428204</SimpleData>
<SimpleData name="NAME">Follansbee</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">4773581</SimpleData>
<SimpleData name="AWATER">640485</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.609019,40.347278,0.0 -80.609048,40.343001,0.0 -80.607697,40.339613,0.0 -80.60456,40.335768,0.0 -80.6076122950621,40.3356300579056,0.0 -80.602895,40.327869,0.0 -80.6028946825271,40.3278681137216,0.0 -80.600495,40.321169,0.0 -80.599895,40.317669,0.0 -80.6004073102762,40.3158588370241,0.0 -80.596832,40.31539,0.0 -80.594967,40.315181,0.0 -80.591825,40.321066,0.0 -80.590442,40.322813,0.0 -80.590341,40.32346,0.0 -80.591337,40.324707,0.0 -80.591519,40.326488,0.0 -80.589644,40.330197,0.0 -80.587893,40.330859,0.0 -80.585058,40.331162,0.0 -80.584643,40.333729,0.0 -80.584474,40.334667,0.0 -80.581616,40.336766,0.0 -80.580613,40.337916,0.0 -80.583613,40.339453,0.0 -80.589191,40.338952,0.0 -80.589724,40.33768,0.0 -80.595433,40.340338,0.0 -80.595237,40.341486,0.0 -80.597123,40.341192,0.0 -80.598013,40.342108,0.0 -80.59455,40.357144,0.0 -80.593507,40.357313,0.0 -80.592275,40.357719,0.0 -80.590994,40.360239,0.0 -80.590998,40.362598,0.0 -80.593792,40.363534,0.0 -80.595867,40.363076,0.0 -80.598691,40.36259,0.0 -80.599418,40.360803,0.0 -80.598119,40.360464,0.0 -80.60121,40.359559,0.0 -80.603791,40.355037,0.0 -80.605091,40.349323,0.0 -80.607228,40.348314,0.0 -80.607212,40.348271,0.0 -80.608606,40.348295,0.0 -80.609019,40.347278,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Fort Ashby&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>28444</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389101</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5428444</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5428444</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Fort Ashby</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9152378</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>95014</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">28444</SimpleData>
<SimpleData name="PLACENS">02389101</SimpleData>
<SimpleData name="AFFGEOID">1600000US5428444</SimpleData>
<SimpleData name="GEOID">5428444</SimpleData>
<SimpleData name="NAME">Fort Ashby</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">9152378</SimpleData>
<SimpleData name="AWATER">95014</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.787106,39.486703,0.0 -78.790034,39.485462,0.0 -78.779371,39.485917,0.0 -78.765551,39.485817,0.0 -78.757771,39.486479,0.0 -78.751644,39.488486,0.0 -78.748931,39.48809,0.0 -78.745846,39.487947,0.0 -78.735698,39.481351,0.0 -78.733996,39.481574,0.0 -78.733928,39.487255,0.0 -78.735042,39.488892,0.0 -78.735298,39.490297,0.0 -78.736617,39.491675,0.0 -78.73992,39.492431,0.0 -78.743372,39.494949,0.0 -78.743508,39.496454,0.0 -78.749117,39.502468,0.0 -78.751269,39.506709,0.0 -78.752884,39.507522,0.0 -78.753972,39.511811,0.0 -78.755799,39.513431,0.0 -78.760364,39.513615,0.0 -78.763443,39.510778,0.0 -78.764068,39.509463,0.0 -78.767852,39.508564,0.0 -78.769312,39.509643,0.0 -78.77149,39.510076,0.0 -78.777104,39.50913,0.0 -78.779145,39.506801,0.0 -78.78209,39.50547,0.0 -78.783693,39.501593,0.0 -78.78391,39.499575,0.0 -78.782578,39.497974,0.0 -78.785118,39.493176,0.0 -78.786576,39.492472,0.0 -78.787346,39.491055,0.0 -78.787106,39.486703,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Fort Gay&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>28516</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390188</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5428516</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5428516</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Fort Gay</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2169585</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>125879</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">28516</SimpleData>
<SimpleData name="PLACENS">02390188</SimpleData>
<SimpleData name="AFFGEOID">1600000US5428516</SimpleData>
<SimpleData name="GEOID">5428516</SimpleData>
<SimpleData name="NAME">Fort Gay</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2169585</SimpleData>
<SimpleData name="AWATER">125879</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.613831,38.121941,0.0 -82.6133529820248,38.1204029166507,0.0 -82.606589,38.120843,0.0 -82.6063295273407,38.1206801026594,0.0 -82.602618,38.11835,0.0 -82.6011670716637,38.1177902480404,0.0 -82.600127,38.117389,0.0 -82.598011,38.115925,0.0 -82.5946785186106,38.1121008906253,0.0 -82.589849,38.113469,0.0 -82.587149,38.116215,0.0 -82.585719,38.115629,0.0 -82.587429,38.11329,0.0 -82.586235,38.112263,0.0 -82.58291,38.116208,0.0 -82.58431,38.121212,0.0 -82.586777,38.122414,0.0 -82.588047,38.125762,0.0 -82.594499,38.126358,0.0 -82.594618,38.127016,0.0 -82.597737,38.12712,0.0 -82.599098,38.126284,0.0 -82.601336,38.126907,0.0 -82.602532,38.125818,0.0 -82.602367,38.124131,0.0 -82.606212,38.122508,0.0 -82.609674,38.122935,0.0 -82.611728,38.124425,0.0 -82.613831,38.121941,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Frank&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>28948</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586806</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5428948</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5428948</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Frank</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>992578</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">28948</SimpleData>
<SimpleData name="PLACENS">02586806</SimpleData>
<SimpleData name="AFFGEOID">1600000US5428948</SimpleData>
<SimpleData name="GEOID">5428948</SimpleData>
<SimpleData name="NAME">Frank</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">992578</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.820533,38.548691,0.0 -79.820636,38.544376,0.0 -79.818142,38.544536,0.0 -79.817465,38.54546,0.0 -79.815981,38.545897,0.0 -79.813893,38.544933,0.0 -79.809425,38.544522,0.0 -79.804484,38.54202,0.0 -79.801696,38.542085,0.0 -79.800202,38.543299,0.0 -79.799824,38.544141,0.0 -79.797752,38.547225,0.0 -79.800367,38.548909,0.0 -79.807106,38.549223,0.0 -79.81166,38.548775,0.0 -79.817572,38.54763,0.0 -79.820533,38.548691,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Franklin&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>29044</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390190</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5429044</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5429044</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Franklin</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1455998</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>3490</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">29044</SimpleData>
<SimpleData name="PLACENS">02390190</SimpleData>
<SimpleData name="AFFGEOID">1600000US5429044</SimpleData>
<SimpleData name="GEOID">5429044</SimpleData>
<SimpleData name="NAME">Franklin</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1455998</SimpleData>
<SimpleData name="AWATER">3490</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.344522,38.635635,0.0 -79.341688,38.63601,0.0 -79.338909,38.638735,0.0 -79.333178,38.639368,0.0 -79.332797,38.639546,0.0 -79.331788,38.639856,0.0 -79.331512,38.639912,0.0 -79.325549,38.6424,0.0 -79.324603,38.643556,0.0 -79.328415,38.645198,0.0 -79.324769,38.651832,0.0 -79.328908,38.654539,0.0 -79.331727,38.65277,0.0 -79.330807,38.651404,0.0 -79.333267,38.647614,0.0 -79.339712,38.649929,0.0 -79.340717,38.649507,0.0 -79.342286,38.647239,0.0 -79.335522,38.644375,0.0 -79.336347,38.643019,0.0 -79.338942,38.642488,0.0 -79.339427,38.641452,0.0 -79.344522,38.635635,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Friendly&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>29404</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390192</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5429404</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5429404</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Friendly</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>244541</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">29404</SimpleData>
<SimpleData name="PLACENS">02390192</SimpleData>
<SimpleData name="AFFGEOID">1600000US5429404</SimpleData>
<SimpleData name="GEOID">5429404</SimpleData>
<SimpleData name="NAME">Friendly</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">244541</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.065853,39.512283,0.0 -81.06325,39.510151,0.0 -81.061136,39.511417,0.0 -81.057304,39.515745,0.0 -81.060358,39.517224,0.0 -81.06207,39.515106,0.0 -81.065853,39.512283,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Gallipolis Ferry&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>29716</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586807</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5429716</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5429716</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Gallipolis Ferry</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5893214</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>1285911</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">29716</SimpleData>
<SimpleData name="PLACENS">02586807</SimpleData>
<SimpleData name="AFFGEOID">1600000US5429716</SimpleData>
<SimpleData name="GEOID">5429716</SimpleData>
<SimpleData name="NAME">Gallipolis Ferry</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">5893214</SimpleData>
<SimpleData name="AWATER">1285911</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.221566,38.787187,0.0 -82.221518,38.77981,0.0 -82.221307291046,38.7786133544809,0.0 -82.220449,38.773739,0.0 -82.216614,38.76835,0.0 -82.212203331315,38.7662980822448,0.0 -82.207141,38.763943,0.0 -82.201537,38.760372,0.0 -82.198882,38.757725,0.0 -82.188024,38.761924,0.0 -82.187786,38.761459,0.0 -82.184697,38.762517,0.0 -82.188283,38.769231,0.0 -82.189456,38.77142,0.0 -82.191404,38.781119,0.0 -82.193713,38.787255,0.0 -82.198988,38.783635,0.0 -82.199559,38.788269,0.0 -82.200598,38.790269,0.0 -82.200946,38.786199,0.0 -82.216593,38.788182,0.0 -82.2205472132405,38.7892006271698,0.0 -82.221566,38.787187,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Galloway&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>29740</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586808</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5429740</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5429740</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Galloway</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1623850</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">29740</SimpleData>
<SimpleData name="PLACENS">02586808</SimpleData>
<SimpleData name="AFFGEOID">1600000US5429740</SimpleData>
<SimpleData name="GEOID">5429740</SimpleData>
<SimpleData name="NAME">Galloway</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1623850</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.13793,39.223906,0.0 -80.136802,39.224714,0.0 -80.135701,39.223959,0.0 -80.133596,39.224327,0.0 -80.135147,39.226285,0.0 -80.135116,39.228232,0.0 -80.132352,39.229085,0.0 -80.130719,39.228837,0.0 -80.127926,39.229318,0.0 -80.12323,39.231289,0.0 -80.120244,39.230574,0.0 -80.120667,39.231446,0.0 -80.118257,39.230582,0.0 -80.117179,39.229138,0.0 -80.118088,39.237985,0.0 -80.119511,39.237921,0.0 -80.12173,39.239004,0.0 -80.126734,39.238801,0.0 -80.129153,39.239876,0.0 -80.13332,39.239622,0.0 -80.135538,39.235939,0.0 -80.136043,39.227589,0.0 -80.13793,39.223906,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Gary&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>30196</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390592</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5430196</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5430196</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Gary</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2177496</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>83592</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">30196</SimpleData>
<SimpleData name="PLACENS">02390592</SimpleData>
<SimpleData name="AFFGEOID">1600000US5430196</SimpleData>
<SimpleData name="GEOID">5430196</SimpleData>
<SimpleData name="NAME">Gary</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">2177496</SimpleData>
<SimpleData name="AWATER">83592</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.502639,37.357827,0.0 -81.50263,37.356498,0.0 -81.500206,37.356418,0.0 -81.500153,37.359063,0.0 -81.501443,37.359249,0.0 -81.502639,37.357827,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.565702,37.379929,0.0 -81.565716,37.3799,0.0 -81.564183,37.378554,0.0 -81.564315,37.376755,0.0 -81.564083,37.375618,0.0 -81.562733,37.374639,0.0 -81.559564,37.373796,0.0 -81.560868,37.372696,0.0 -81.562251,37.369373,0.0 -81.558944,37.367654,0.0 -81.554036,37.3683,0.0 -81.55332,37.365974,0.0 -81.55225,37.365467,0.0 -81.552506,37.365212,0.0 -81.552976,37.364761,0.0 -81.552337,37.362167,0.0 -81.549344,37.361904,0.0 -81.548551,37.359591,0.0 -81.547235,37.358215,0.0 -81.54788,37.355856,0.0 -81.547122,37.352502,0.0 -81.548905,37.351506,0.0 -81.551813,37.349002,0.0 -81.557712,37.347949,0.0 -81.551834,37.348127,0.0 -81.549878,37.350135,0.0 -81.546957,37.351666,0.0 -81.543131,37.349097,0.0 -81.540099,37.345885,0.0 -81.539704,37.343252,0.0 -81.54056,37.340313,0.0 -81.538847,37.337346,0.0 -81.540665,37.334556,0.0 -81.543126,37.332792,0.0 -81.544606,37.329934,0.0 -81.544508,37.328597,0.0 -81.543219,37.325926,0.0 -81.543691,37.323465,0.0 -81.543239,37.321681,0.0 -81.544099,37.318784,0.0 -81.542613,37.320185,0.0 -81.542168,37.322066,0.0 -81.542745,37.324096,0.0 -81.542252,37.325128,0.0 -81.543734,37.328194,0.0 -81.544007,37.329845,0.0 -81.54207,37.333145,0.0 -81.540825,37.333762,0.0 -81.538526,37.336355,0.0 -81.535186,37.334995,0.0 -81.538261,37.337001,0.0 -81.539608,37.340557,0.0 -81.538587,37.343389,0.0 -81.539636,37.347531,0.0 -81.542149,37.349795,0.0 -81.54492,37.351615,0.0 -81.547196,37.355346,0.0 -81.546172,37.358763,0.0 -81.547586,37.360097,0.0 -81.548866,37.363048,0.0 -81.547975,37.364699,0.0 -81.540588,37.366331,0.0 -81.539191,37.363421,0.0 -81.537776,37.362561,0.0 -81.538602,37.361585,0.0 -81.536987,37.36091,0.0 -81.534394,37.36089,0.0 -81.534768,37.362004,0.0 -81.53349,37.361763,0.0 -81.52973,37.362077,0.0 -81.525794,37.364107,0.0 -81.52243,37.366368,0.0 -81.516895,37.368042,0.0 -81.515737,37.367039,0.0 -81.514491,37.366426,0.0 -81.514231,37.365253,0.0 -81.513796,37.36444,0.0 -81.510417,37.365668,0.0 -81.509421,37.364415,0.0 -81.508745,37.363944,0.0 -81.504707,37.362098,0.0 -81.502919,37.360503,0.0 -81.502881,37.359702,0.0 -81.504622,37.35762,0.0 -81.504534,37.356726,0.0 -81.503957,37.35666,0.0 -81.504014,37.357316,0.0 -81.503164,37.358159,0.0 -81.502123,37.358806,0.0 -81.501641,37.359567,0.0 -81.501721,37.360343,0.0 -81.50173,37.36047,0.0 -81.503273,37.361711,0.0 -81.508044,37.364006,0.0 -81.509636,37.366707,0.0 -81.508852,37.36759,0.0 -81.507672,37.37088,0.0 -81.510641,37.366991,0.0 -81.513484,37.366429,0.0 -81.514313,37.368303,0.0 -81.515806,37.369447,0.0 -81.518508,37.369339,0.0 -81.519885,37.368427,0.0 -81.520792,37.372092,0.0 -81.521565,37.370471,0.0 -81.521304,37.368207,0.0 -81.524313,37.367025,0.0 -81.526857,37.364879,0.0 -81.530027,37.363293,0.0 -81.531207,37.363205,0.0 -81.537693,37.364021,0.0 -81.538501,37.367048,0.0 -81.545697,37.367938,0.0 -81.547948,37.36894,0.0 -81.550261,37.367024,0.0 -81.551622,37.367378,0.0 -81.552626,37.368906,0.0 -81.555478,37.369564,0.0 -81.559437,37.36908,0.0 -81.560126,37.369691,0.0 -81.558163,37.372372,0.0 -81.558204,37.374422,0.0 -81.561554,37.376148,0.0 -81.560617,37.378466,0.0 -81.563656,37.380195,0.0 -81.561596,37.38223,0.0 -81.561929,37.384298,0.0 -81.564657,37.382009,0.0 -81.565702,37.379929,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Gassaway&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>30220</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390200</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5430220</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5430220</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Gassaway</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2991884</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>160745</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">30220</SimpleData>
<SimpleData name="PLACENS">02390200</SimpleData>
<SimpleData name="AFFGEOID">1600000US5430220</SimpleData>
<SimpleData name="GEOID">5430220</SimpleData>
<SimpleData name="NAME">Gassaway</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2991884</SimpleData>
<SimpleData name="AWATER">160745</SimpleData>
</SchemaData>
</ExtendedData>
<MultiGeometry>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.767946,38.657004,0.0 -80.767886,38.656887,0.0 -80.767241,38.656254,0.0 -80.765356,38.655683,0.0 -80.765765,38.658256,0.0 -80.767269,38.658113,0.0 -80.767865,38.657049,0.0 -80.767946,38.657004,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.779734,38.680978,0.0 -80.779603,38.671899,0.0 -80.779133,38.669661,0.0 -80.779601,38.667309,0.0 -80.779082,38.666842,0.0 -80.779347,38.665866,0.0 -80.771522,38.655405,0.0 -80.768671,38.656622,0.0 -80.767946,38.657004,0.0 -80.768161,38.659042,0.0 -80.767182,38.661067,0.0 -80.765126,38.667241,0.0 -80.759534,38.672136,0.0 -80.764109,38.675621,0.0 -80.775198,38.683499,0.0 -80.779734,38.680978,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</MultiGeometry>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Gauley Bridge&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>30364</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390202</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5430364</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5430364</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Gauley Bridge</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4098274</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>119591</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">30364</SimpleData>
<SimpleData name="PLACENS">02390202</SimpleData>
<SimpleData name="AFFGEOID">1600000US5430364</SimpleData>
<SimpleData name="GEOID">5430364</SimpleData>
<SimpleData name="NAME">Gauley Bridge</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">4098274</SimpleData>
<SimpleData name="AWATER">119591</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.222432,38.165964,0.0 -81.222065,38.165878,0.0 -81.205881,38.162312,0.0 -81.199973,38.163316,0.0 -81.195875,38.16284,0.0 -81.188408,38.158306,0.0 -81.18433,38.15601,0.0 -81.182382,38.15413,0.0 -81.180741,38.153512,0.0 -81.178329,38.15435,0.0 -81.184954,38.159656,0.0 -81.191058,38.172202,0.0 -81.192184,38.172528,0.0 -81.193357,38.172668,0.0 -81.22057,38.178382,0.0 -81.222432,38.165964,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Ghent&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>30724</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586809</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5430724</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5430724</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Ghent</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3317425</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>858462</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">30724</SimpleData>
<SimpleData name="PLACENS">02586809</SimpleData>
<SimpleData name="AFFGEOID">1600000US5430724</SimpleData>
<SimpleData name="GEOID">5430724</SimpleData>
<SimpleData name="NAME">Ghent</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3317425</SimpleData>
<SimpleData name="AWATER">858462</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.12025,37.614391,0.0 -81.118701,37.615036,0.0 -81.116138,37.61463,0.0 -81.114249,37.61488,0.0 -81.113948,37.614882,0.0 -81.113603,37.614959,0.0 -81.113486,37.615086,0.0 -81.113458,37.615214,0.0 -81.113396,37.615356,0.0 -81.113199,37.615615,0.0 -81.113162,37.616796,0.0 -81.111526,37.617478,0.0 -81.109865,37.616359,0.0 -81.110486,37.614584,0.0 -81.110014,37.61348,0.0 -81.108605,37.614147,0.0 -81.107533,37.613359,0.0 -81.107614,37.610733,0.0 -81.108185,37.609464,0.0 -81.107189,37.608288,0.0 -81.105994,37.609496,0.0 -81.104714,37.609646,0.0 -81.103589,37.611304,0.0 -81.102022,37.610225,0.0 -81.100976,37.610699,0.0 -81.102497,37.613044,0.0 -81.101472,37.61422,0.0 -81.102003,37.616268,0.0 -81.101221,37.617477,0.0 -81.102011,37.618447,0.0 -81.101574,37.620262,0.0 -81.100809,37.620267,0.0 -81.098085,37.618259,0.0 -81.097104,37.617023,0.0 -81.094694,37.615338,0.0 -81.095031,37.611549,0.0 -81.093165,37.610134,0.0 -81.092429,37.610275,0.0 -81.091553,37.612866,0.0 -81.091664,37.614318,0.0 -81.087989,37.614735,0.0 -81.089448,37.616126,0.0 -81.092404,37.617519,0.0 -81.093845,37.619522,0.0 -81.0937,37.620685,0.0 -81.091705,37.620715,0.0 -81.093258,37.623412,0.0 -81.096125,37.624165,0.0 -81.096081,37.628765,0.0 -81.096663,37.629148,0.0 -81.0995,37.628952,0.0 -81.101059,37.630456,0.0 -81.100582,37.631382,0.0 -81.104032,37.63378,0.0 -81.104443,37.635137,0.0 -81.110396,37.633501,0.0 -81.112158,37.634223,0.0 -81.118265,37.622181,0.0 -81.12025,37.614391,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Gilbert&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>30772</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390204</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5430772</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5430772</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Gilbert</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2577186</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>119053</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">30772</SimpleData>
<SimpleData name="PLACENS">02390204</SimpleData>
<SimpleData name="AFFGEOID">1600000US5430772</SimpleData>
<SimpleData name="GEOID">5430772</SimpleData>
<SimpleData name="NAME">Gilbert</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2577186</SimpleData>
<SimpleData name="AWATER">119053</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.88716,37.620382,0.0 -81.886943,37.61926,0.0 -81.883695,37.618876,0.0 -81.885094,37.61575,0.0 -81.883495,37.61317,0.0 -81.882872,37.61236,0.0 -81.881855,37.611218,0.0 -81.87484,37.609198,0.0 -81.863787,37.605042,0.0 -81.861675,37.604266,0.0 -81.857202,37.613846,0.0 -81.856926,37.614399,0.0 -81.8694,37.625593,0.0 -81.870753,37.625413,0.0 -81.873971,37.620402,0.0 -81.871501,37.616638,0.0 -81.874961,37.614325,0.0 -81.878729,37.613537,0.0 -81.883148,37.615617,0.0 -81.883258,37.616261,0.0 -81.881914,37.618676,0.0 -81.882285,37.619595,0.0 -81.885981,37.620628,0.0 -81.88716,37.620382,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Gilbert Creek&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>30777</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389840</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5430777</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5430777</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Gilbert Creek</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>29969810</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">30777</SimpleData>
<SimpleData name="PLACENS">02389840</SimpleData>
<SimpleData name="AFFGEOID">1600000US5430777</SimpleData>
<SimpleData name="GEOID">5430777</SimpleData>
<SimpleData name="NAME">Gilbert Creek</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">29969810</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.92397,37.595977,0.0 -81.920654,37.596128,0.0 -81.917612,37.594568,0.0 -81.916838,37.59374,0.0 -81.917083,37.592426,0.0 -81.916676,37.58968,0.0 -81.91912,37.586162,0.0 -81.917589,37.584873,0.0 -81.917615,37.583505,0.0 -81.919369,37.58027,0.0 -81.921721,37.57842,0.0 -81.92075,37.577249,0.0 -81.921786,37.573849,0.0 -81.905294,37.566964,0.0 -81.907031,37.564431,0.0 -81.90992,37.563832,0.0 -81.914261,37.565195,0.0 -81.896243,37.545225,0.0 -81.897706,37.544732,0.0 -81.900433,37.542451,0.0 -81.901787,37.539369,0.0 -81.901815,37.537199,0.0 -81.901058,37.534255,0.0 -81.900113,37.532638,0.0 -81.900211,37.530638,0.0 -81.901923,37.529156,0.0 -81.904173,37.526205,0.0 -81.90007,37.52469,0.0 -81.897951,37.524395,0.0 -81.893511,37.525254,0.0 -81.891017,37.526471,0.0 -81.889236,37.528387,0.0 -81.888002,37.532892,0.0 -81.88605,37.536744,0.0 -81.882936,37.53821,0.0 -81.876238,37.53711,0.0 -81.874839,37.537382,0.0 -81.869139,37.53811,0.0 -81.865739,37.54321,0.0 -81.862939,37.54331,0.0 -81.861139,37.54661,0.0 -81.855939,37.54891,0.0 -81.856439,37.55281,0.0 -81.857839,37.554309,0.0 -81.855939,37.558009,0.0 -81.855339,37.560709,0.0 -81.855739,37.56151,0.0 -81.872749,37.583978,0.0 -81.889413,37.583547,0.0 -81.890799,37.583865,0.0 -81.891291,37.588178,0.0 -81.892012,37.590244,0.0 -81.894316,37.591693,0.0 -81.896015,37.591468,0.0 -81.895816,37.593486,0.0 -81.897803,37.594934,0.0 -81.899618,37.594892,0.0 -81.898843,37.597163,0.0 -81.900141,37.600605,0.0 -81.897295,37.602373,0.0 -81.894823,37.604852,0.0 -81.893097,37.60584,0.0 -81.891947,37.607583,0.0 -81.889043,37.610199,0.0 -81.883495,37.61317,0.0 -81.885094,37.61575,0.0 -81.883695,37.618876,0.0 -81.886943,37.61926,0.0 -81.888957,37.617491,0.0 -81.889844,37.617356,0.0 -81.89286,37.618628,0.0 -81.89262,37.620112,0.0 -81.894434,37.619715,0.0 -81.896547,37.617633,0.0 -81.898845,37.617033,0.0 -81.89942,37.61466,0.0 -81.901065,37.614987,0.0 -81.903493,37.613866,0.0 -81.904891,37.612631,0.0 -81.906395,37.610422,0.0 -81.909519,37.608788,0.0 -81.91253,37.607812,0.0 -81.915721,37.607462,0.0 -81.917358,37.606057,0.0 -81.916969,37.604904,0.0 -81.918605,37.600892,0.0 -81.919875,37.59915,0.0 -81.92397,37.595977,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Glasgow&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>31324</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390207</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5431324</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5431324</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Glasgow</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1206058</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>9670</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">31324</SimpleData>
<SimpleData name="PLACENS">02390207</SimpleData>
<SimpleData name="AFFGEOID">1600000US5431324</SimpleData>
<SimpleData name="GEOID">5431324</SimpleData>
<SimpleData name="NAME">Glasgow</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1206058</SimpleData>
<SimpleData name="AWATER">9670</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.427923,38.21627,0.0 -81.429587,38.215101,0.0 -81.424366,38.205937,0.0 -81.423496,38.205079,0.0 -81.422208,38.204444,0.0 -81.419395,38.203874,0.0 -81.415859,38.205826,0.0 -81.415388,38.209556,0.0 -81.417453,38.213927,0.0 -81.420041,38.217886,0.0 -81.424502,38.215538,0.0 -81.424694,38.215829,0.0 -81.425408,38.215721,0.0 -81.42692,38.217441,0.0 -81.427923,38.21627,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Glen Dale&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>31492</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390593</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5431492</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5431492</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Glen Dale</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2201017</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>906606</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">31492</SimpleData>
<SimpleData name="PLACENS">02390593</SimpleData>
<SimpleData name="AFFGEOID">1600000US5431492</SimpleData>
<SimpleData name="GEOID">5431492</SimpleData>
<SimpleData name="NAME">Glen Dale</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">2201017</SimpleData>
<SimpleData name="AWATER">906606</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.764479,39.95025,0.0 -80.764511,39.946602,0.0 -80.762285099182,39.9344225164372,0.0 -80.753097,39.93375,0.0 -80.75037,39.933477,0.0 -80.751187,39.936235,0.0 -80.752224,39.939338,0.0 -80.751285,39.942949,0.0 -80.750292,39.944523,0.0 -80.746606,39.947313,0.0 -80.747435,39.948143,0.0 -80.748857,39.948499,0.0 -80.747957,39.95056,0.0 -80.746833,39.951812,0.0 -80.747017,39.953106,0.0 -80.747447,39.954251,0.0 -80.747555,39.955757,0.0 -80.748938,39.955709,0.0 -80.749864,39.955822,0.0 -80.749802,39.956412,0.0 -80.75086,39.956678,0.0 -80.751375,39.956029,0.0 -80.753353,39.956954,0.0 -80.753682,39.957361,0.0 -80.753463,39.957756,0.0 -80.754111,39.958298,0.0 -80.7569948928596,39.9602889034687,0.0 -80.7569956407252,39.9602883919568,0.0 -80.758527,39.959241,0.0 -80.7594117938739,39.9581957824844,0.0 -80.763375,39.953514,0.0 -80.764479,39.95025,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Glen Ferris&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>31732</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586812</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5431732</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5431732</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Glen Ferris</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3564775</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>648646</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">31732</SimpleData>
<SimpleData name="PLACENS">02586812</SimpleData>
<SimpleData name="AFFGEOID">1600000US5431732</SimpleData>
<SimpleData name="GEOID">5431732</SimpleData>
<SimpleData name="NAME">Glen Ferris</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">3564775</SimpleData>
<SimpleData name="AWATER">648646</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.230153,38.153389,0.0 -81.231419,38.149622,0.0 -81.229583,38.146862,0.0 -81.228396,38.146027,0.0 -81.230588,38.145121,0.0 -81.219748,38.140695,0.0 -81.216975,38.137774,0.0 -81.215211,38.136621,0.0 -81.212704,38.138354,0.0 -81.210911,38.14012,0.0 -81.209259,38.144237,0.0 -81.209861,38.147501,0.0 -81.210999,38.149946,0.0 -81.211495,38.152668,0.0 -81.211425,38.155049,0.0 -81.210384,38.157437,0.0 -81.205829,38.160176,0.0 -81.205881,38.162312,0.0 -81.222065,38.165878,0.0 -81.223543,38.16452,0.0 -81.221582,38.165197,0.0 -81.223481,38.162541,0.0 -81.221041,38.162918,0.0 -81.222558,38.162338,0.0 -81.224116,38.160548,0.0 -81.224544,38.158699,0.0 -81.226342,38.157194,0.0 -81.229589,38.155423,0.0 -81.229059,38.154281,0.0 -81.230153,38.153389,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Glen Fork&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>31756</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586813</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5431756</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5431756</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Glen Fork</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>7952384</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>38322</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">31756</SimpleData>
<SimpleData name="PLACENS">02586813</SimpleData>
<SimpleData name="AFFGEOID">1600000US5431756</SimpleData>
<SimpleData name="GEOID">5431756</SimpleData>
<SimpleData name="NAME">Glen Fork</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">7952384</SimpleData>
<SimpleData name="AWATER">38322</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.555438,37.702483,0.0 -81.555928,37.700582,0.0 -81.554137,37.697766,0.0 -81.554011,37.69328,0.0 -81.551682,37.692166,0.0 -81.551166,37.691101,0.0 -81.551769,37.687535,0.0 -81.548378,37.684557,0.0 -81.54678,37.682273,0.0 -81.544686,37.682341,0.0 -81.539923,37.683662,0.0 -81.536708,37.686032,0.0 -81.534126,37.686792,0.0 -81.532576,37.687935,0.0 -81.53058,37.692867,0.0 -81.52842,37.691516,0.0 -81.527933,37.687097,0.0 -81.523641,37.686295,0.0 -81.522315,37.687027,0.0 -81.517722,37.687359,0.0 -81.517847,37.690229,0.0 -81.519698,37.698747,0.0 -81.522201,37.70619,0.0 -81.52161,37.709471,0.0 -81.523608,37.711214,0.0 -81.525853,37.714178,0.0 -81.526502,37.716178,0.0 -81.526259,37.71807,0.0 -81.531144,37.718173,0.0 -81.530116,37.714098,0.0 -81.530717,37.712315,0.0 -81.532787,37.710824,0.0 -81.538919,37.710279,0.0 -81.541009,37.708925,0.0 -81.542319,37.706578,0.0 -81.543587,37.706336,0.0 -81.545958,37.70667,0.0 -81.548562,37.707541,0.0 -81.553154,37.706252,0.0 -81.555438,37.702483,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Glen Jean&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>31876</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586814</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5431876</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5431876</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Glen Jean</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>585747</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">31876</SimpleData>
<SimpleData name="PLACENS">02586814</SimpleData>
<SimpleData name="AFFGEOID">1600000US5431876</SimpleData>
<SimpleData name="GEOID">5431876</SimpleData>
<SimpleData name="NAME">Glen Jean</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">585747</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.157793,37.926555,0.0 -81.158644,37.924373,0.0 -81.15639,37.923092,0.0 -81.153578,37.924762,0.0 -81.151641,37.923056,0.0 -81.147489,37.926086,0.0 -81.148452,37.929569,0.0 -81.150031,37.931375,0.0 -81.155002,37.92939,0.0 -81.157857,37.930251,0.0 -81.157793,37.926555,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Glen White&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>32068</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586815</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5432068</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5432068</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Glen White</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1311305</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">32068</SimpleData>
<SimpleData name="PLACENS">02586815</SimpleData>
<SimpleData name="AFFGEOID">1600000US5432068</SimpleData>
<SimpleData name="GEOID">5432068</SimpleData>
<SimpleData name="NAME">Glen White</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1311305</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.28784,37.73109,0.0 -81.28503,37.725768,0.0 -81.276857,37.723121,0.0 -81.273342,37.72875,0.0 -81.271443,37.732338,0.0 -81.273888,37.733258,0.0 -81.275872,37.735522,0.0 -81.278273,37.735681,0.0 -81.282362,37.734457,0.0 -81.283331,37.735676,0.0 -81.284622,37.735622,0.0 -81.284491,37.734438,0.0 -81.28784,37.73109,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Glenville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>32044</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390210</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5432044</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5432044</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Glenville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2581762</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>96686</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">32044</SimpleData>
<SimpleData name="PLACENS">02390210</SimpleData>
<SimpleData name="AFFGEOID">1600000US5432044</SimpleData>
<SimpleData name="GEOID">5432044</SimpleData>
<SimpleData name="NAME">Glenville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2581762</SimpleData>
<SimpleData name="AWATER">96686</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.853204,38.942599,0.0 -80.852931,38.941325,0.0 -80.84686,38.938992,0.0 -80.844627,38.937523,0.0 -80.846879,38.935059,0.0 -80.850702,38.93547,0.0 -80.849334,38.933758,0.0 -80.847175,38.932726,0.0 -80.842118,38.931628,0.0 -80.843807,38.929554,0.0 -80.845563,38.92955,0.0 -80.843296,38.928291,0.0 -80.839864,38.932288,0.0 -80.839274,38.931714,0.0 -80.834792,38.93051,0.0 -80.829633,38.931387,0.0 -80.830594,38.931676,0.0 -80.832241,38.93328,0.0 -80.827671,38.937799,0.0 -80.82325,38.940897,0.0 -80.821322,38.939591,0.0 -80.818988,38.93391,0.0 -80.818279,38.934148,0.0 -80.816246,38.935098,0.0 -80.816706,38.937803,0.0 -80.814836,38.944961,0.0 -80.82209,38.94281,0.0 -80.825761,38.944555,0.0 -80.827864,38.945118,0.0 -80.831369,38.941882,0.0 -80.833106,38.942199,0.0 -80.836411,38.941747,0.0 -80.837307,38.941019,0.0 -80.845374,38.94143,0.0 -80.849221,38.942002,0.0 -80.849312,38.943525,0.0 -80.851509,38.942592,0.0 -80.853204,38.942599,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Grafton&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>32716</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390595</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5432716</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5432716</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Grafton</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9504525</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>339000</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">32716</SimpleData>
<SimpleData name="PLACENS">02390595</SimpleData>
<SimpleData name="AFFGEOID">1600000US5432716</SimpleData>
<SimpleData name="GEOID">5432716</SimpleData>
<SimpleData name="NAME">Grafton</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">9504525</SimpleData>
<SimpleData name="AWATER">339000</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.042273,39.355859,0.0 -80.043755,39.353991,0.0 -80.041609,39.353007,0.0 -80.040537,39.351776,0.0 -80.0428,39.342501,0.0 -80.039608,39.33943,0.0 -80.039854,39.339077,0.0 -80.040501,39.338123,0.0 -80.037106,39.335737,0.0 -80.035938,39.332105,0.0 -80.040116,39.326266,0.0 -80.038627,39.325416,0.0 -80.037033,39.324553,0.0 -80.032144,39.323716,0.0 -80.03114,39.328543,0.0 -80.032289,39.330388,0.0 -80.025488,39.326372,0.0 -80.02132,39.322366,0.0 -80.020671,39.323235,0.0 -80.020123,39.325961,0.0 -80.019261,39.32988,0.0 -80.011204,39.336114,0.0 -80.009659,39.336131,0.0 -80.001201,39.324573,0.0 -79.999756,39.324719,0.0 -79.993461,39.328082,0.0 -79.996022,39.333025,0.0 -80.00028,39.330451,0.0 -80.007645,39.338454,0.0 -80.00807,39.338927,0.0 -80.005145,39.341003,0.0 -80.005079,39.342324,0.0 -80.00391,39.342901,0.0 -79.987818,39.340054,0.0 -79.985815,39.33968,0.0 -79.985324,39.341273,0.0 -79.984993,39.342479,0.0 -79.984231,39.345072,0.0 -79.983904,39.34624,0.0 -79.992958,39.35416,0.0 -79.992555,39.355507,0.0 -79.993945,39.358369,0.0 -79.996573,39.358394,0.0 -79.998242,39.354208,0.0 -80.001139,39.35427,0.0 -80.002988,39.354325,0.0 -80.005598,39.351987,0.0 -80.011687,39.349677,0.0 -80.01192,39.350976,0.0 -80.01276,39.351238,0.0 -80.013464,39.350236,0.0 -80.014079,39.349619,0.0 -80.016729,39.347853,0.0 -80.021806,39.345709,0.0 -80.030282,39.345995,0.0 -80.030273,39.347466,0.0 -80.033331,39.353922,0.0 -80.038368,39.354505,0.0 -80.042273,39.355859,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Grant Town&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>32908</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390214</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5432908</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5432908</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Grant Town</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1365063</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>39629</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">32908</SimpleData>
<SimpleData name="PLACENS">02390214</SimpleData>
<SimpleData name="AFFGEOID">1600000US5432908</SimpleData>
<SimpleData name="GEOID">5432908</SimpleData>
<SimpleData name="NAME">Grant Town</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1365063</SimpleData>
<SimpleData name="AWATER">39629</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.190496,39.561847,0.0 -80.190204,39.560973,0.0 -80.186682,39.560958,0.0 -80.186322,39.559356,0.0 -80.184263,39.557681,0.0 -80.182042,39.557443,0.0 -80.18429,39.555405,0.0 -80.183681,39.554495,0.0 -80.172459,39.553993,0.0 -80.167178,39.552208,0.0 -80.167034,39.552657,0.0 -80.166601,39.553937,0.0 -80.17395,39.557537,0.0 -80.171517,39.55979,0.0 -80.170433,39.561871,0.0 -80.166595,39.561886,0.0 -80.166579,39.564895,0.0 -80.17047,39.562545,0.0 -80.169772,39.564786,0.0 -80.176209,39.563768,0.0 -80.183932,39.560703,0.0 -80.184718,39.562799,0.0 -80.18987,39.563318,0.0 -80.190496,39.561847,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Grantsville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>32884</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390216</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5432884</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5432884</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Grantsville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1127018</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>69067</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">32884</SimpleData>
<SimpleData name="PLACENS">02390216</SimpleData>
<SimpleData name="AFFGEOID">1600000US5432884</SimpleData>
<SimpleData name="GEOID">5432884</SimpleData>
<SimpleData name="NAME">Grantsville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1127018</SimpleData>
<SimpleData name="AWATER">69067</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.098292,38.923863,0.0 -81.098395,38.913802,0.0 -81.091178,38.91268,0.0 -81.087295,38.925164,0.0 -81.09002,38.928243,0.0 -81.097876,38.925016,0.0 -81.098292,38.923863,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Granville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>32932</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390217</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5432932</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5432932</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Granville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3359907</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>1614</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">32932</SimpleData>
<SimpleData name="PLACENS">02390217</SimpleData>
<SimpleData name="AFFGEOID">1600000US5432932</SimpleData>
<SimpleData name="GEOID">5432932</SimpleData>
<SimpleData name="NAME">Granville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">3359907</SimpleData>
<SimpleData name="AWATER">1614</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.010269,39.655066,0.0 -80.007794,39.651217,0.0 -80.00696,39.649364,0.0 -80.006337,39.644947,0.0 -80.00568,39.643293,0.0 -80.00463,39.642157,0.0 -79.99591,39.634801,0.0 -79.995614,39.63455,0.0 -79.994306,39.63452,0.0 -79.993068,39.634585,0.0 -79.991017,39.636217,0.0 -79.99074,39.636959,0.0 -79.990868,39.637294,0.0 -79.990947,39.637793,0.0 -79.991359,39.638562,0.0 -79.991367,39.638869,0.0 -79.991168,39.639106,0.0 -79.990799,39.639414,0.0 -79.986218,39.640794,0.0 -79.985729,39.640398,0.0 -79.985194,39.640229,0.0 -79.983821,39.642832,0.0 -79.983861,39.64358,0.0 -79.984877,39.645101,0.0 -79.98816,39.647892,0.0 -79.991836,39.650123,0.0 -79.993624,39.651795,0.0 -79.994233,39.653109,0.0 -79.993778,39.658205,0.0 -79.999286,39.659311,0.0 -80.000328,39.657572,0.0 -80.002877,39.658059,0.0 -80.010269,39.655066,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Great Cacapon&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>33100</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586817</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5433100</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5433100</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Great Cacapon</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2220415</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">33100</SimpleData>
<SimpleData name="PLACENS">02586817</SimpleData>
<SimpleData name="AFFGEOID">1600000US5433100</SimpleData>
<SimpleData name="GEOID">5433100</SimpleData>
<SimpleData name="NAME">Great Cacapon</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2220415</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.295817,39.620108,0.0 -78.299815,39.617907,0.0 -78.294072,39.612893,0.0 -78.292868,39.613438,0.0 -78.291981,39.613657,0.0 -78.291101,39.613553,0.0 -78.286929,39.610807,0.0 -78.282227,39.605701,0.0 -78.279091,39.604015,0.0 -78.278183,39.603943,0.0 -78.276238,39.605337,0.0 -78.273929,39.608997,0.0 -78.273559,39.611401,0.0 -78.274644,39.612637,0.0 -78.276467,39.613466,0.0 -78.282725,39.61742,0.0 -78.283044,39.618074,0.0 -78.283086,39.618892,0.0 -78.2828638800231,39.6204578325635,0.0 -78.283039,39.62047,0.0 -78.2925802132592,39.6239410518192,0.0 -78.295179,39.621754,0.0 -78.295817,39.620108,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Green Bank&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>33124</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586818</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5433124</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5433124</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Green Bank</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>8547083</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">33124</SimpleData>
<SimpleData name="PLACENS">02586818</SimpleData>
<SimpleData name="AFFGEOID">1600000US5433124</SimpleData>
<SimpleData name="GEOID">5433124</SimpleData>
<SimpleData name="NAME">Green Bank</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">8547083</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.85783,38.424978,0.0 -79.857912,38.420173,0.0 -79.856002,38.418001,0.0 -79.85474,38.417979,0.0 -79.850965,38.416176,0.0 -79.850143,38.414824,0.0 -79.848864,38.413639,0.0 -79.845799,38.412928,0.0 -79.843733,38.413566,0.0 -79.841121,38.411886,0.0 -79.838867,38.412724,0.0 -79.836073,38.413035,0.0 -79.835384,38.414573,0.0 -79.830566,38.417423,0.0 -79.828123,38.417912,0.0 -79.826454,38.419396,0.0 -79.82487,38.421534,0.0 -79.823019,38.422205,0.0 -79.820616,38.421874,0.0 -79.818375,38.422847,0.0 -79.814151,38.423084,0.0 -79.81281,38.422016,0.0 -79.809005,38.420054,0.0 -79.808371,38.420393,0.0 -79.80764,38.423385,0.0 -79.808427,38.424263,0.0 -79.805295,38.424368,0.0 -79.803798,38.423721,0.0 -79.803772,38.425634,0.0 -79.807317,38.426348,0.0 -79.808055,38.427668,0.0 -79.813257,38.430318,0.0 -79.81463,38.431762,0.0 -79.815262,38.431817,0.0 -79.81434,38.432782,0.0 -79.813917,38.4334,0.0 -79.815932,38.433768,0.0 -79.822796,38.437061,0.0 -79.825215,38.438227,0.0 -79.828336,38.440646,0.0 -79.831711,38.441752,0.0 -79.833708,38.440885,0.0 -79.839833,38.440315,0.0 -79.840684,38.438138,0.0 -79.84294,38.437133,0.0 -79.845378,38.437504,0.0 -79.848037,38.434723,0.0 -79.84722,38.43416,0.0 -79.849349,38.43164,0.0 -79.852714,38.430285,0.0 -79.852419,38.427096,0.0 -79.854477,38.426127,0.0 -79.856584,38.425935,0.0 -79.85783,38.424978,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Green Spring&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>33436</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586819</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5433436</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5433436</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Green Spring</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5690186</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>2325</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">33436</SimpleData>
<SimpleData name="PLACENS">02586819</SimpleData>
<SimpleData name="AFFGEOID">1600000US5433436</SimpleData>
<SimpleData name="GEOID">5433436</SimpleData>
<SimpleData name="NAME">Green Spring</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">5690186</SimpleData>
<SimpleData name="AWATER">2325</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-78.64865,39.519344,0.0 -78.649503,39.51588,0.0 -78.648447,39.514974,0.0 -78.647286,39.512196,0.0 -78.648081,39.511351,0.0 -78.648267,39.508386,0.0 -78.644892,39.508283,0.0 -78.644919,39.508232,0.0 -78.643377,39.507736,0.0 -78.636419,39.513981,0.0 -78.632108,39.51623,0.0 -78.629148,39.512759,0.0 -78.622901,39.512759,0.0 -78.622904,39.520461,0.0 -78.617898,39.523524,0.0 -78.61597,39.523854,0.0 -78.614965,39.525277,0.0 -78.616497,39.526533,0.0 -78.614287,39.529153,0.0 -78.615043,39.529882,0.0 -78.61344,39.532182,0.0 -78.612264,39.535818,0.0 -78.6133456956481,39.5372074258675,0.0 -78.614526,39.537595,0.0 -78.623037,39.539512,0.0 -78.628566,39.53919,0.0 -78.6287365745166,39.5379183573956,0.0 -78.627863,39.536274,0.0 -78.632047,39.534772,0.0 -78.633756,39.53073,0.0 -78.635004,39.530297,0.0 -78.638204,39.526582,0.0 -78.6397,39.525644,0.0 -78.641205,39.523113,0.0 -78.64865,39.519344,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Greenview&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>33580</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586820</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5433580</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5433580</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Greenview</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2554625</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>83388</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">33580</SimpleData>
<SimpleData name="PLACENS">02586820</SimpleData>
<SimpleData name="AFFGEOID">1600000US5433580</SimpleData>
<SimpleData name="GEOID">5433580</SimpleData>
<SimpleData name="NAME">Greenview</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2554625</SimpleData>
<SimpleData name="AWATER">83388</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.828853,38.004104,0.0 -81.828539,37.999477,0.0 -81.827055,37.993607,0.0 -81.822927,37.986374,0.0 -81.823392,37.986039,0.0 -81.822315,37.985598,0.0 -81.822001,37.982987,0.0 -81.81848,37.981356,0.0 -81.818731,37.985306,0.0 -81.815666,37.988939,0.0 -81.815522,37.994497,0.0 -81.812347,37.994508,0.0 -81.810145,37.996893,0.0 -81.811061,38.000358,0.0 -81.81456,38.004958,0.0 -81.824092,38.005603,0.0 -81.825379,38.005659,0.0 -81.827158,38.004179,0.0 -81.828853,38.004104,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Gypsy&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>34180</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586821</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5434180</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5434180</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Gypsy</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2011683</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">34180</SimpleData>
<SimpleData name="PLACENS">02586821</SimpleData>
<SimpleData name="AFFGEOID">1600000US5434180</SimpleData>
<SimpleData name="GEOID">5434180</SimpleData>
<SimpleData name="NAME">Gypsy</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2011683</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.321351,39.372474,0.0 -80.319986,39.367333,0.0 -80.319163,39.366609,0.0 -80.314377,39.364336,0.0 -80.310028,39.361387,0.0 -80.304841,39.359696,0.0 -80.303751,39.358699,0.0 -80.303643,39.35757,0.0 -80.304714,39.355188,0.0 -80.302832,39.354833,0.0 -80.300972,39.354931,0.0 -80.299244,39.357448,0.0 -80.296622,39.362022,0.0 -80.294823,39.366741,0.0 -80.321351,39.372474,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hambleton&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>34492</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390225</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5434492</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5434492</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hambleton</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>313496</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>110243</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">34492</SimpleData>
<SimpleData name="PLACENS">02390225</SimpleData>
<SimpleData name="AFFGEOID">1600000US5434492</SimpleData>
<SimpleData name="GEOID">5434492</SimpleData>
<SimpleData name="NAME">Hambleton</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">313496</SimpleData>
<SimpleData name="AWATER">110243</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.650457,39.085102,0.0 -79.649591,39.081059,0.0 -79.648626,39.079732,0.0 -79.645625,39.079153,0.0 -79.641534,39.077737,0.0 -79.641187,39.078095,0.0 -79.640969,39.078352,0.0 -79.6396,39.079708,0.0 -79.639063,39.080593,0.0 -79.64761,39.08422,0.0 -79.648486,39.085776,0.0 -79.650457,39.085102,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hamlin&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>34516</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390227</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5434516</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5434516</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hamlin</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1546834</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>10946</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">34516</SimpleData>
<SimpleData name="PLACENS">02390227</SimpleData>
<SimpleData name="AFFGEOID">1600000US5434516</SimpleData>
<SimpleData name="GEOID">5434516</SimpleData>
<SimpleData name="NAME">Hamlin</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1546834</SimpleData>
<SimpleData name="AWATER">10946</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.127706,38.284854,0.0 -82.128252,38.281547,0.0 -82.125527,38.280802,0.0 -82.125588,38.27884,0.0 -82.125279,38.278794,0.0 -82.125285,38.278662,0.0 -82.119854,38.278269,0.0 -82.112187,38.279113,0.0 -82.11106,38.278512,0.0 -82.109523,38.278328,0.0 -82.106807,38.278109,0.0 -82.106608,38.274527,0.0 -82.105632,38.274019,0.0 -82.102872,38.273626,0.0 -82.098622,38.275061,0.0 -82.096665,38.274802,0.0 -82.094476,38.277485,0.0 -82.096916,38.278579,0.0 -82.09753,38.279372,0.0 -82.097573,38.28094,0.0 -82.097872,38.281875,0.0 -82.103932,38.282618,0.0 -82.102065,38.284209,0.0 -82.106448,38.285367,0.0 -82.104673,38.288099,0.0 -82.106759,38.286466,0.0 -82.107322,38.290184,0.0 -82.110555,38.287636,0.0 -82.107708,38.285436,0.0 -82.110936,38.285287,0.0 -82.112576,38.284262,0.0 -82.109204,38.282994,0.0 -82.106725,38.281928,0.0 -82.107253,38.280974,0.0 -82.107576,38.279715,0.0 -82.107986,38.279759,0.0 -82.108537,38.279189,0.0 -82.108638,38.278497,0.0 -82.10983,38.278595,0.0 -82.112386,38.279335,0.0 -82.120577,38.278529,0.0 -82.120603,38.281944,0.0 -82.121891,38.283519,0.0 -82.121935,38.284892,0.0 -82.127706,38.284854,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Handley&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>34756</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390230</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5434756</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5434756</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Handley</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2470578</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>46415</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">34756</SimpleData>
<SimpleData name="PLACENS">02390230</SimpleData>
<SimpleData name="AFFGEOID">1600000US5434756</SimpleData>
<SimpleData name="GEOID">5434756</SimpleData>
<SimpleData name="NAME">Handley</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">2470578</SimpleData>
<SimpleData name="AWATER">46415</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.38308,38.197083,0.0 -81.375322,38.187641,0.0 -81.374834,38.186434,0.0 -81.369521,38.18082,0.0 -81.358046,38.174417,0.0 -81.353693,38.183936,0.0 -81.356278,38.184847,0.0 -81.356535,38.185844,0.0 -81.361507,38.188402,0.0 -81.368706,38.190801,0.0 -81.372211,38.19323,0.0 -81.374835,38.195985,0.0 -81.374835,38.197151,0.0 -81.374835,38.197592,0.0 -81.375035,38.199032,0.0 -81.375278,38.198955,0.0 -81.38308,38.197083,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Harman&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>35092</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390231</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5435092</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5435092</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Harman</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>837409</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">35092</SimpleData>
<SimpleData name="PLACENS">02390231</SimpleData>
<SimpleData name="AFFGEOID">1600000US5435092</SimpleData>
<SimpleData name="GEOID">5435092</SimpleData>
<SimpleData name="NAME">Harman</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">837409</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.528451,38.920086,0.0 -79.530912,38.916224,0.0 -79.528161,38.914515,0.0 -79.518534,38.920526,0.0 -79.520266,38.926352,0.0 -79.526262,38.926511,0.0 -79.527759,38.922974,0.0 -79.528451,38.920086,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Harpers Ferry&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>35284</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390232</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5435284</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5435284</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Harpers Ferry</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1386068</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>229271</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">35284</SimpleData>
<SimpleData name="PLACENS">02390232</SimpleData>
<SimpleData name="AFFGEOID">1600000US5435284</SimpleData>
<SimpleData name="GEOID">5435284</SimpleData>
<SimpleData name="NAME">Harpers Ferry</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1386068</SimpleData>
<SimpleData name="AWATER">229271</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-77.7543794081977,39.3334320303192,0.0 -77.754615,39.330965,0.0 -77.754162,39.330177,0.0 -77.754198,39.328614,0.0 -77.750357,39.327914,0.0 -77.745683,39.326919,0.0 -77.744252,39.326449,0.0 -77.744427,39.320401,0.0 -77.744507,39.318813,0.0 -77.744547,39.318014,0.0 -77.742061,39.319169,0.0 -77.73365,39.319475,0.0 -77.7268557663563,39.3216425676536,0.0 -77.727379,39.321666,0.0 -77.7279887113405,39.322186539979,0.0 -77.7305332325466,39.3243589204598,0.0 -77.730914,39.324684,0.0 -77.735009,39.327015,0.0 -77.7506949100148,39.3322114294775,0.0 -77.7543794081977,39.3334320303192,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Harrisville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>35428</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390233</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5435428</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5435428</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Harrisville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4102174</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>26073</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">35428</SimpleData>
<SimpleData name="PLACENS">02390233</SimpleData>
<SimpleData name="AFFGEOID">1600000US5435428</SimpleData>
<SimpleData name="GEOID">5435428</SimpleData>
<SimpleData name="NAME">Harrisville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">4102174</SimpleData>
<SimpleData name="AWATER">26073</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.067376,39.206813,0.0 -81.066661,39.205127,0.0 -81.064501,39.206286,0.0 -81.064268,39.207219,0.0 -81.062721,39.206382,0.0 -81.062856,39.204791,0.0 -81.06109,39.204963,0.0 -81.060017,39.203531,0.0 -81.057945,39.203181,0.0 -81.057229,39.202902,0.0 -81.054228,39.203336,0.0 -81.05307,39.202624,0.0 -81.049399,39.202257,0.0 -81.049251,39.200983,0.0 -81.048743,39.200667,0.0 -81.043441,39.198961,0.0 -81.042575,39.198171,0.0 -81.041654,39.201005,0.0 -81.038499,39.207564,0.0 -81.037184,39.211291,0.0 -81.036124,39.210823,0.0 -81.032546,39.21482,0.0 -81.028944,39.214263,0.0 -81.027728,39.215468,0.0 -81.034404,39.218027,0.0 -81.035809,39.217462,0.0 -81.042919,39.21909,0.0 -81.043594,39.220363,0.0 -81.046625,39.22309,0.0 -81.049654,39.221975,0.0 -81.050134,39.221351,0.0 -81.048707,39.220566,0.0 -81.048781,39.218771,0.0 -81.049572,39.216158,0.0 -81.056862,39.214652,0.0 -81.061578,39.214408,0.0 -81.063737,39.213532,0.0 -81.06535,39.210053,0.0 -81.067376,39.206813,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hartford City&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>35500</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390234</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5435500</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5435500</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hartford City</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>3204546</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>3373</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">35500</SimpleData>
<SimpleData name="PLACENS">02390234</SimpleData>
<SimpleData name="AFFGEOID">1600000US5435500</SimpleData>
<SimpleData name="GEOID">5435500</SimpleData>
<SimpleData name="NAME">Hartford City</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">3204546</SimpleData>
<SimpleData name="AWATER">3373</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.001822,39.009337,0.0 -81.998953,39.008084,0.0 -81.999273,39.005937,0.0 -81.994402,39.00427,0.0 -81.992007,39.005169,0.0 -81.99213,38.999163,0.0 -81.99374,38.994933,0.0 -81.995026,38.991302,0.0 -81.996003,38.988777,0.0 -81.996906,38.986398,0.0 -81.99488,38.985326,0.0 -81.985738,38.980329,0.0 -81.984526,38.983418,0.0 -81.981748,38.989692,0.0 -81.980936,38.991572,0.0 -81.982472,38.992951,0.0 -81.983557,38.994763,0.0 -81.984933,39.000041,0.0 -81.988238,39.008001,0.0 -81.988745,39.008308,0.0 -81.988816,39.008277,0.0 -81.98861,39.008899,0.0 -81.990642,39.012652,0.0 -81.99413,39.017662,0.0 -82.001822,39.009337,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Harts&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>35596</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389906</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5435596</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5435596</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Harts</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>23775850</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>346781</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">35596</SimpleData>
<SimpleData name="PLACENS">02389906</SimpleData>
<SimpleData name="AFFGEOID">1600000US5435596</SimpleData>
<SimpleData name="GEOID">5435596</SimpleData>
<SimpleData name="NAME">Harts</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">23775850</SimpleData>
<SimpleData name="AWATER">346781</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.170923,38.010906,0.0 -82.169663,38.011125,0.0 -82.168271,38.009882,0.0 -82.165376,38.008719,0.0 -82.160411,38.011428,0.0 -82.157397,38.013814,0.0 -82.152918,38.013741,0.0 -82.150716,38.014741,0.0 -82.148022,38.015209,0.0 -82.145432,38.014558,0.0 -82.139702,38.015272,0.0 -82.136986,38.016375,0.0 -82.137486,38.017199,0.0 -82.134707,38.018812,0.0 -82.133386,38.02079,0.0 -82.129213,38.020605,0.0 -82.128157,38.021232,0.0 -82.124625,38.019878,0.0 -82.121371,38.017562,0.0 -82.120371,38.017379,0.0 -82.117452,38.012738,0.0 -82.114979,38.012508,0.0 -82.112452,38.011644,0.0 -82.110589,38.012053,0.0 -82.108379,38.015351,0.0 -82.108804,38.018096,0.0 -82.107697,38.019768,0.0 -82.107573,38.022307,0.0 -82.10658,38.023436,0.0 -82.100346,38.020271,0.0 -82.098364,38.020028,0.0 -82.095957,38.019877,0.0 -82.092897,38.023274,0.0 -82.091592,38.026715,0.0 -82.087073,38.027642,0.0 -82.089106,38.035212,0.0 -82.092832,38.036341,0.0 -82.092175,38.038531,0.0 -82.090345,38.039248,0.0 -82.08972,38.040947,0.0 -82.091348,38.042841,0.0 -82.094286,38.044464,0.0 -82.094565,38.046207,0.0 -82.097636,38.048246,0.0 -82.099876,38.047431,0.0 -82.103476,38.046833,0.0 -82.105021,38.044969,0.0 -82.108426,38.044642,0.0 -82.112471,38.04616,0.0 -82.115505,38.046591,0.0 -82.117238,38.045865,0.0 -82.11891,38.049203,0.0 -82.118433,38.050924,0.0 -82.122695,38.053759,0.0 -82.124879,38.054574,0.0 -82.125311,38.055557,0.0 -82.125404,38.058173,0.0 -82.125612,38.059699,0.0 -82.125347,38.060382,0.0 -82.124098,38.061192,0.0 -82.122987,38.06232,0.0 -82.122794,38.063384,0.0 -82.122788,38.06344,0.0 -82.122727,38.06384,0.0 -82.128444,38.064196,0.0 -82.136871,38.063425,0.0 -82.141623,38.063389,0.0 -82.145997,38.060929,0.0 -82.147532,38.059697,0.0 -82.14778,38.058391,0.0 -82.145744,38.055382,0.0 -82.144816,38.052426,0.0 -82.14146,38.046814,0.0 -82.142503,38.046829,0.0 -82.14317,38.048043,0.0 -82.146294,38.048223,0.0 -82.147451,38.046499,0.0 -82.152129,38.042403,0.0 -82.155899,38.040688,0.0 -82.159084,38.035957,0.0 -82.159486,38.032436,0.0 -82.161393,38.030478,0.0 -82.162073,38.027384,0.0 -82.165327,38.026975,0.0 -82.169905,38.023872,0.0 -82.168306,38.022361,0.0 -82.168606,38.020794,0.0 -82.167954,38.018681,0.0 -82.165136,38.017268,0.0 -82.16569,38.012356,0.0 -82.166713,38.01111,0.0 -82.169323,38.01179,0.0 -82.170923,38.010906,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hedgesville&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>36220</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390239</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5436220</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5436220</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hedgesville</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>340446</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">36220</SimpleData>
<SimpleData name="PLACENS">02390239</SimpleData>
<SimpleData name="AFFGEOID">1600000US5436220</SimpleData>
<SimpleData name="GEOID">5436220</SimpleData>
<SimpleData name="NAME">Hedgesville</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">340446</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-77.996843,39.553554,0.0 -77.999613,39.55288,0.0 -77.995709,39.551119,0.0 -77.99376,39.552329,0.0 -77.991832,39.550821,0.0 -77.991124,39.555105,0.0 -77.991818,39.555778,0.0 -77.991485,39.55637,0.0 -77.990887,39.55704,0.0 -77.991212,39.557314,0.0 -77.991436,39.557127,0.0 -77.992454,39.557712,0.0 -77.992974,39.55709,0.0 -77.995421,39.558325,0.0 -77.996839,39.556523,0.0 -77.996843,39.553554,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Helen&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>36292</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586823</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5436292</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5436292</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Helen</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>617172</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">36292</SimpleData>
<SimpleData name="PLACENS">02586823</SimpleData>
<SimpleData name="AFFGEOID">1600000US5436292</SimpleData>
<SimpleData name="GEOID">5436292</SimpleData>
<SimpleData name="NAME">Helen</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">617172</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.316099,37.63318,0.0 -81.31661,37.631813,0.0 -81.315639,37.631089,0.0 -81.313024,37.629314,0.0 -81.309474,37.64022,0.0 -81.310479,37.643482,0.0 -81.314631,37.642833,0.0 -81.315866,37.6421,0.0 -81.315812,37.63947,0.0 -81.31514,37.637453,0.0 -81.315486,37.636493,0.0 -81.314426,37.634894,0.0 -81.316099,37.63318,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Helvetia&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>36340</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586824</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5436340</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5436340</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Helvetia</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>4700273</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">36340</SimpleData>
<SimpleData name="PLACENS">02586824</SimpleData>
<SimpleData name="AFFGEOID">1600000US5436340</SimpleData>
<SimpleData name="GEOID">5436340</SimpleData>
<SimpleData name="NAME">Helvetia</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">4700273</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.211497,38.715503,0.0 -80.213839,38.712686,0.0 -80.210869,38.711829,0.0 -80.211228,38.706424,0.0 -80.213485,38.704026,0.0 -80.210015,38.694849,0.0 -80.20576,38.698452,0.0 -80.205702,38.699375,0.0 -80.201471,38.695056,0.0 -80.198483,38.694105,0.0 -80.192533,38.69585,0.0 -80.188715,38.700652,0.0 -80.187555,38.702933,0.0 -80.184211,38.7038,0.0 -80.1821,38.703452,0.0 -80.177467,38.700146,0.0 -80.180012,38.7048,0.0 -80.180448,38.708087,0.0 -80.181562,38.708945,0.0 -80.184724,38.708862,0.0 -80.187885,38.709801,0.0 -80.200672,38.71458,0.0 -80.199801,38.716102,0.0 -80.200321,38.718969,0.0 -80.204402,38.718999,0.0 -80.208999,38.71622,0.0 -80.211497,38.715503,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Henderson&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>36436</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390241</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5436436</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5436436</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Henderson</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1083666</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>121833</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">36436</SimpleData>
<SimpleData name="PLACENS">02390241</SimpleData>
<SimpleData name="AFFGEOID">1600000US5436436</SimpleData>
<SimpleData name="GEOID">5436436</SimpleData>
<SimpleData name="NAME">Henderson</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">1083666</SimpleData>
<SimpleData name="AWATER">121833</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.142677,38.837634,0.0 -82.141541,38.832364,0.0 -82.141751,38.830723,0.0 -82.141363,38.828996,0.0 -82.141644,38.828718,0.0 -82.142362,38.82821,0.0 -82.142138,38.827491,0.0 -82.141673,38.826464,0.0 -82.138292,38.82556,0.0 -82.129177,38.825123,0.0 -82.126685,38.827116,0.0 -82.132487,38.832469,0.0 -82.131915,38.833144,0.0 -82.13402,38.834815,0.0 -82.136361,38.836209,0.0 -82.138923,38.837072,0.0 -82.142677,38.837634,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hendricks&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>36460</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390242</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5436460</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5436460</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hendricks</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>885154</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>10022</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">36460</SimpleData>
<SimpleData name="PLACENS">02390242</SimpleData>
<SimpleData name="AFFGEOID">1600000US5436460</SimpleData>
<SimpleData name="GEOID">5436460</SimpleData>
<SimpleData name="NAME">Hendricks</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">885154</SimpleData>
<SimpleData name="AWATER">10022</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-79.6396,39.079708,0.0 -79.640969,39.078352,0.0 -79.63785,39.076835,0.0 -79.635453,39.075916,0.0 -79.63481,39.073516,0.0 -79.633637,39.072559,0.0 -79.626569,39.071622,0.0 -79.624315,39.072118,0.0 -79.619856,39.071884,0.0 -79.619812,39.074627,0.0 -79.624151,39.0763,0.0 -79.63613,39.079871,0.0 -79.636932,39.078934,0.0 -79.639063,39.080593,0.0 -79.6396,39.079708,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Henlawson&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>36484</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586825</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5436484</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5436484</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Henlawson</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2077818</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>71924</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">36484</SimpleData>
<SimpleData name="PLACENS">02586825</SimpleData>
<SimpleData name="AFFGEOID">1600000US5436484</SimpleData>
<SimpleData name="GEOID">5436484</SimpleData>
<SimpleData name="NAME">Henlawson</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2077818</SimpleData>
<SimpleData name="AWATER">71924</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.992078,37.901831,0.0 -81.992584,37.900158,0.0 -81.991854,37.895961,0.0 -81.990827,37.892342,0.0 -81.989079,37.892079,0.0 -81.986209,37.893799,0.0 -81.982806,37.894303,0.0 -81.978075,37.893841,0.0 -81.974459,37.896399,0.0 -81.973987,37.899095,0.0 -81.971833,37.901668,0.0 -81.970516,37.904532,0.0 -81.971939,37.906052,0.0 -81.979462,37.907591,0.0 -81.979686,37.907148,0.0 -81.981514,37.905844,0.0 -81.987861,37.903979,0.0 -81.992078,37.901831,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hepzibah&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>36628</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586826</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5436628</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5436628</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hepzibah</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>2389102</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">36628</SimpleData>
<SimpleData name="PLACENS">02586826</SimpleData>
<SimpleData name="AFFGEOID">1600000US5436628</SimpleData>
<SimpleData name="GEOID">5436628</SimpleData>
<SimpleData name="NAME">Hepzibah</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">2389102</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.346984,39.33202,0.0 -80.346179,39.329451,0.0 -80.344656,39.328595,0.0 -80.338209,39.325463,0.0 -80.334354,39.325057,0.0 -80.330409,39.322938,0.0 -80.3252,39.323998,0.0 -80.323663,39.325205,0.0 -80.323241,39.329277,0.0 -80.324193,39.332204,0.0 -80.325111,39.33393,0.0 -80.329309,39.335934,0.0 -80.335935,39.340338,0.0 -80.338715,39.337402,0.0 -80.344417,39.334184,0.0 -80.346984,39.33202,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hico&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>37036</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586827</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5437036</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5437036</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hico</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>12976793</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>24852</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">37036</SimpleData>
<SimpleData name="PLACENS">02586827</SimpleData>
<SimpleData name="AFFGEOID">1600000US5437036</SimpleData>
<SimpleData name="GEOID">5437036</SimpleData>
<SimpleData name="NAME">Hico</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">12976793</SimpleData>
<SimpleData name="AWATER">24852</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.027016,38.141619,0.0 -81.026981,38.134131,0.0 -81.023193,38.131733,0.0 -81.023348,38.129176,0.0 -81.024417,38.126847,0.0 -81.022614,38.125939,0.0 -81.021006,38.126209,0.0 -81.021999,38.125755,0.0 -81.021377,38.11562,0.0 -81.020815,38.113994,0.0 -81.021824,38.111492,0.0 -81.022666,38.110758,0.0 -81.023015,38.108103,0.0 -81.022433,38.105319,0.0 -81.02258,38.103705,0.0 -81.023824,38.101411,0.0 -81.025864,38.09795,0.0 -81.025358,38.095282,0.0 -81.023504,38.091943,0.0 -81.023775,38.090344,0.0 -81.026432,38.087319,0.0 -81.023382,38.085337,0.0 -81.020719,38.084873,0.0 -81.018752,38.085113,0.0 -81.017382,38.086897,0.0 -81.012694,38.09058,0.0 -81.012519,38.092919,0.0 -81.01142,38.093545,0.0 -81.008506,38.093735,0.0 -81.005668,38.09688,0.0 -81.006285,38.098854,0.0 -81.005429,38.100184,0.0 -81.001736,38.100977,0.0 -80.999873,38.102518,0.0 -80.997713,38.102536,0.0 -80.99208,38.101189,0.0 -80.987587,38.103582,0.0 -80.988775,38.109193,0.0 -80.99281,38.109543,0.0 -80.993166,38.111576,0.0 -80.994636,38.115424,0.0 -80.994519,38.116447,0.0 -80.997163,38.118678,0.0 -80.996648,38.121143,0.0 -80.997786,38.12295,0.0 -81.001048,38.126118,0.0 -81.007633,38.128019,0.0 -81.007403,38.129358,0.0 -81.004564,38.131147,0.0 -81.003768,38.134089,0.0 -81.00106,38.136577,0.0 -80.999191,38.139146,0.0 -81.002559,38.141813,0.0 -81.005354,38.143134,0.0 -81.016642,38.146984,0.0 -81.020088,38.144506,0.0 -81.021968,38.141807,0.0 -81.024925,38.141346,0.0 -81.027016,38.141619,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hillsboro&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>37372</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390248</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5437372</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5437372</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hillsboro</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>43</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>930046</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>0</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">37372</SimpleData>
<SimpleData name="PLACENS">02390248</SimpleData>
<SimpleData name="AFFGEOID">1600000US5437372</SimpleData>
<SimpleData name="GEOID">5437372</SimpleData>
<SimpleData name="NAME">Hillsboro</SimpleData>
<SimpleData name="LSAD">43</SimpleData>
<SimpleData name="ALAND">930046</SimpleData>
<SimpleData name="AWATER">0</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.221923,38.135319,0.0 -80.215315,38.129589,0.0 -80.207702,38.133842,0.0 -80.205383,38.135189,0.0 -80.211552,38.141158,0.0 -80.221923,38.135319,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hilltop&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>37444</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02586828</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5437444</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5437444</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hilltop</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>1688989</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>5920</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">37444</SimpleData>
<SimpleData name="PLACENS">02586828</SimpleData>
<SimpleData name="AFFGEOID">1600000US5437444</SimpleData>
<SimpleData name="GEOID">5437444</SimpleData>
<SimpleData name="NAME">Hilltop</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">1688989</SimpleData>
<SimpleData name="AWATER">5920</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-81.158886,37.942795,0.0 -81.157857,37.930251,0.0 -81.155002,37.92939,0.0 -81.150031,37.931375,0.0 -81.149711,37.937977,0.0 -81.147668,37.938009,0.0 -81.147674,37.938033,0.0 -81.145123,37.938774,0.0 -81.145734,37.940442,0.0 -81.145725,37.943448,0.0 -81.146724,37.944442,0.0 -81.147021,37.945519,0.0 -81.148447,37.948514,0.0 -81.150309,37.947702,0.0 -81.150035,37.94843,0.0 -81.153099,37.947449,0.0 -81.156354,37.944326,0.0 -81.158886,37.942795,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Hinton&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>37636</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02390600</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5437636</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5437636</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Hinton</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>25</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>5783394</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>2072904</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">37636</SimpleData>
<SimpleData name="PLACENS">02390600</SimpleData>
<SimpleData name="AFFGEOID">1600000US5437636</SimpleData>
<SimpleData name="GEOID">5437636</SimpleData>
<SimpleData name="NAME">Hinton</SimpleData>
<SimpleData name="LSAD">25</SimpleData>
<SimpleData name="ALAND">5783394</SimpleData>
<SimpleData name="AWATER">2072904</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-80.898846,37.664828,0.0 -80.898736,37.663063,0.0 -80.898005,37.660733,0.0 -80.896382,37.65855,0.0 -80.888087,37.650619,0.0 -80.887349,37.646234,0.0 -80.887558,37.643142,0.0 -80.89107,37.63862,0.0 -80.88729,37.638165,0.0 -80.882787,37.637622,0.0 -80.880989,37.640708,0.0 -80.880515,37.64146,0.0 -80.879087,37.643752,0.0 -80.874487,37.644266,0.0 -80.858556,37.647933,0.0 -80.858791,37.650751,0.0 -80.858823,37.651149,0.0 -80.861157,37.651672,0.0 -80.860902,37.652139,0.0 -80.861683,37.652357,0.0 -80.872,37.651704,0.0 -80.876837,37.650945,0.0 -80.880067,37.650997,0.0 -80.882355,37.651721,0.0 -80.881815,37.652663,0.0 -80.880281,37.655361,0.0 -80.882705,37.663655,0.0 -80.884349,37.669741,0.0 -80.882256,37.670923,0.0 -80.874825,37.675115,0.0 -80.87056,37.677829,0.0 -80.872582,37.686378,0.0 -80.874743,37.694155,0.0 -80.874997,37.694481,0.0 -80.877878,37.694505,0.0 -80.884755,37.701201,0.0 -80.886463,37.704052,0.0 -80.887427,37.708042,0.0 -80.888659,37.709071,0.0 -80.891138,37.708995,0.0 -80.88997,37.701512,0.0 -80.884194,37.697917,0.0 -80.880223,37.694926,0.0 -80.878406,37.692691,0.0 -80.877383,37.687648,0.0 -80.877729,37.685603,0.0 -80.879542,37.682665,0.0 -80.882316,37.680766,0.0 -80.887606,37.679203,0.0 -80.893113,37.6771,0.0 -80.893579,37.676585,0.0 -80.894693,37.672472,0.0 -80.895442,37.672835,0.0 -80.896051,37.669584,0.0 -80.898846,37.664828,0.0</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
<Placemark id="cb_2017_54_place_500k.kml">
<name>&lt;at&gt;&lt;openparen&gt;Holden&lt;closeparen&gt;</name>
<visibility>1</visibility>
<description><![CDATA[<center><table><tr><th colspan='2' align='center'><em>Attributes</em></th></tr><tr bgcolor="#E3E3F3">
<th>STATEFP</th>
<td>54</td>
</tr><tr bgcolor="">
<th>PLACEFP</th>
<td>37948</td>
</tr><tr bgcolor="#E3E3F3">
<th>PLACENS</th>
<td>02389940</td>
</tr><tr bgcolor="">
<th>AFFGEOID</th>
<td>1600000US5437948</td>
</tr><tr bgcolor="#E3E3F3">
<th>GEOID</th>
<td>5437948</td>
</tr><tr bgcolor="">
<th>NAME</th>
<td>Holden</td>
</tr><tr bgcolor="#E3E3F3">
<th>LSAD</th>
<td>57</td>
</tr><tr bgcolor="">
<th>ALAND</th>
<td>9671480</td>
</tr><tr bgcolor="#E3E3F3">
<th>AWATER</th>
<td>534</td>
</tr></table></center>]]></description>
<styleUrl>#KMLStyler</styleUrl>
<ExtendedData>
<SchemaData schemaUrl="#kml_schema_ft_cb_2017_54_place_500k">
<SimpleData name="STATEFP">54</SimpleData>
<SimpleData name="PLACEFP">37948</SimpleData>
<SimpleData name="PLACENS">02389940</SimpleData>
<SimpleData name="AFFGEOID">1600000US5437948</SimpleData>
<SimpleData name="GEOID">5437948</SimpleData>
<SimpleData name="NAME">Holden</SimpleData>
<SimpleData name="LSAD">57</SimpleData>
<SimpleData name="ALAND">9671480</SimpleData>
<SimpleData name="AWATER">534</SimpleData>
</SchemaData>
</ExtendedData>
<Polygon>
<extrude>0</extrude>
<tessellate>1</tessellate>
<altitudeMode>clampToGround</altitudeMode>
<outerBoundaryIs>
<LinearRing>
<coordinates>-82.104612,37.813322,0.0 -82.101967,37.813828,0.0 -82.100369,37.815252,0.0 -82.098194,37.815155,0.0 -82.097122,37.816633,0.0 -82.09597,37.816479,0.0 -82.094505,37.817622,0.0 -82.093569,37.816864,0.0 -82.093813,37.815349,0.0 -82.091868,37.813635,0.0 -82.084316,37.809494,0.0 -82.079065,37.806314,0.0 -82.078135,37.806869,0.0 -82.074442,37.806978,0.0 -82.070974,37.809239,0.0 -82.069417,37.81371,0.0 -82.068064,37.813375,0.0 -82.062949,37.81626,0.0 -82.062269,37.816956,0.0 -82.058215,37.823163,0.0 -82.056577,37.825073,0.0 -82.058468,37.825399,0.0 -82.058696,37.828627,0.0 -82.058379,37.831334,0.0 -82.05914,37.834493,0.0 -82.0606,37.836097,0.0 -82.064346,37.836799,0.0 -82.067266,37.838454,0.0 -82.069869,37.839055,0.0 -82.072852,37.839105,0.0 -82.076978,37.83725,0.0 -82.079581,37.83725,0.0 -82.082057,37.837952,0.0 -82.085294,37.835145,0.0 -82.08758,37.83
