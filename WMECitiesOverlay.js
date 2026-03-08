// ==UserScript==
// @name         WME Cities Overlay
// @namespace    https://greasyfork.org/en/users/166843-wazedev
// @version      2026.03.08.00
// @description  Adds a city overlay for selected states
// @author       WazeDev
// @match        https://www.waze.com/*/editor*
// @match        https://www.waze.com/editor*
// @match        https://beta.waze.com/*
// @exclude      https://www.waze.com/*user/*editor/*
// @require      https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://update.greasyfork.org/scripts/546306/1644332/WME%20Cities%20Overlay_DB.js
// @require      https://update.greasyfork.org/scripts/524747/1542062/GeoKMLer.js
// @license      GNU GPLv3
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      raw.githubusercontent.com
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// ==/UserScript==

/* ecmaVersion 2017 */
/* global $ */
/* global idbKeyval */
/* global turf */
/* global WazeWrap */
/* global I18n */
/* eslint curly: ["warn", "multi-or-nest"] */

(function () {
  'use strict';
  const debug = false;
  const scriptMetadata = GM_info.script;
  const scriptName = scriptMetadata.name;
  const repoOwner = scriptMetadata.author; // Change this to a different repo username when testing a forked branch!

  const _settingsStoreName = '_wme_cities';
  let _settings;

  let _kml; // Holds the raw input KML File data
  let _layer = null; // Holds the geoJSON converted features to map with the SDK
  const layerid = scriptName.replace(/[^a-z0-9_-]/gi, '_');
  const labelsLayerId = `${layerid}_labels`;

  // Default style constants (used only as defaults in loadSettings)
  const _defaultStrokeColor = '#E6E6E6';
  const _defaultFillColor = '#E6E6E6';
  const _defaultFillOpacity = 0.2;
  const _defaultStrokeOpacity = 0.6;
  const _defaultLabelColor = '#ffffff';
  const _defaultLabelOutlineColor = '#000000';
  const _defaultLabelFontSize = 12;
  const _defaultLabelOutlineWidth = 2;
  const _defaultHighlightColor = '#f7ad25';
  let currState = '';
  let currCity = [];
  let kmlCache = {};

  // Screen polygon cache — rebuilt only when the map extent changes
  let _cachedExtent = null;
  let _cachedScreenPolygon = null;
  let _cachedScreenArea = null;

  loadSettings();

  const _US_States = {
    Alabama: 'AL',
    Alaska: 'AK',
    Arizona: 'AZ',
    Arkansas: 'AR',
    California: 'CA',
    Colorado: 'CO',
    Connecticut: 'CT',
    'District of Columbia': 'DC',
    Delaware: 'DE',
    Florida: 'FL',
    Georgia: 'GA',
    Hawaii: 'HI',
    Idaho: 'ID',
    Illinois: 'IL',
    Indiana: 'IN',
    Iowa: 'IA',
    Kansas: 'KS',
    Kentucky: 'KY',
    Louisiana: 'LA',
    Maine: 'ME',
    Maryland: 'MD',
    Massachusetts: 'MA',
    Michigan: 'MI',
    Minnesota: 'MN',
    Mississippi: 'MS',
    Missouri: 'MO',
    Montana: 'MT',
    Nebraska: 'NE',
    Nevada: 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    Ohio: 'OH',
    Oklahoma: 'OK',
    Oregon: 'OR',
    Pennsylvania: 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    Tennessee: 'TN',
    Texas: 'TX',
    Utah: 'UT',
    Vermont: 'VT',
    Virginia: 'VA',
    Washington: 'WA',
    'West Virginia': 'WV',
    Wisconsin: 'WI',
    Wyoming: 'WY',
    getAbbreviation: function (state) {
      return this[state];
    },
    getStateFromAbbr: function (abbr) {
      return Object.entries(_US_States).filter((x) => {
        if (x[1] == abbr) return x;
      })[0][0];
    },
    getStatesArray: function () {
      return Object.keys(_US_States).filter((x) => {
        if (typeof _US_States[x] !== 'function') return x;
      });
    },
    getStateAbbrArray: function () {
      return Object.values(_US_States).filter((x) => {
        if (typeof x !== 'function') return x;
      });
    },
  };

  const _MX_States = {
    Aguascalientes: 'AGS',
    'Baja California': 'BC',
    'Baja California Sur': 'BCS',
    Campeche: 'CAM',
    'Coahuila de Zaragoza': 'COAH',
    Colima: 'COL',
    Chiapas: 'CHIS',
    Durango: 'DGO',
    'Ciudad de México': 'CDMX',
    Guanajuato: 'GTO',
    Guerrero: 'GRO',
    Hidalgo: 'HGO',
    Jalisco: 'JAL',
    'Estado de México': 'EM',
    'Michoacán de Ocampo': 'MICH',
    Morelos: 'MOR',
    Nayarit: 'NAY',
    'Nuevo León': 'NL',
    Oaxaca: 'OAX',
    Puebla: 'PUE',
    'Quintana Roo': 'QROO',
    Querétaro: 'QRO',
    'San Luis Potosí': 'SLP',
    Sinaloa: 'SIN',
    Sonora: 'SON',
    Tabasco: 'TAB',
    Tamaulipas: 'TAM',
    Tlaxcala: 'TLAX',
    'Veracruz Ignacio de la Llave': 'VER',
    Yucatán: 'YUC',
    Zacatecas: 'ZAC',
    getAbbreviation: function (state) {
      return this[state];
    },
    getStateFromAbbr: function (abbr) {
      return Object.entries(_MX_States).filter((x) => {
        if (x[1] == abbr) return x;
      })[0][0];
    },
    getStatesArray: function () {
      return Object.keys(_MX_States).filter((x) => {
        if (typeof _MX_States[x] !== 'function') return x;
      });
    },
    getStateAbbrArray: function () {
      return Object.values(_MX_States).filter((x) => {
        if (typeof x !== 'function') return x;
      });
    },
  };

  const _CA_States = {
    Alberta: 'AB',
    'British Columbia': 'BC',
    Manitoba: 'MB',
    'New Brunswick': 'NB',
    'Newfoundland and Labrador': 'NL',
    'Nova Scotia': 'NS',
    Nunavut: 'NT',
    'Northwest Territories': 'NU',
    Ontario: 'ON',
    'Prince Edward Island': 'PE',
    Quebec: 'QC',
    Saskatchewan: 'SK',
    Yukon: 'YT',
    getAbbreviation: function (state) {
      return this[state];
    },
    getStateFromAbbr: function (abbr) {
      return Object.entries(_CA_States).filter((x) => {
        if (x[1] == abbr) return x;
      })[0][0];
    },
    getStatesArray: function () {
      return Object.keys(_CA_States).filter((x) => {
        if (typeof _CA_States[x] !== 'function') return x;
      });
    },
    getStateAbbrArray: function () {
      return Object.values(_CA_States).filter((x) => {
        if (typeof x !== 'function') return x;
      });
    },
  };

  let wmeSDK; // Declare wmeSDK globally

  // Ensure SDK_INITIALIZED is available
  if (unsafeWindow.SDK_INITIALIZED) {
    unsafeWindow.SDK_INITIALIZED.then(bootstrap).catch((err) => {
      console.error(`${scriptName}: SDK initialization failed`, err);
    });
  } else {
    console.warn(`${scriptName}: SDK_INITIALIZED is undefined`);
  }

  /**
   * Acquires the WME SDK instance and waits for all three dependencies (WME, WazeWrap,
   * GeoKMLer) to become ready in parallel before calling `init()`.
   */
  function bootstrap() {
    wmeSDK = unsafeWindow.getWmeSdk({
      scriptId: scriptName.replaceAll(' ', ''),
      scriptName: scriptName,
    });

    // Use Promise.all to check readiness of all dependencies
    Promise.all([isWmeReady(), isWazeWrapReady(), isGeoKMLerReady()])
      .then(() => {
        console.log(`${scriptName}: All dependencies are ready.`);
        init();
        console.log(`${scriptName}: Initialized`);
      })
      .catch((error) => {
        console.error(`${scriptName}: Error during bootstrap -`, error);
      });
  }

  /**
   * Returns a Promise that resolves when the WME SDK and all required SDK sub-modules
   * (Sidebar, LayerSwitcher, Shortcuts, Events) are fully loaded and ready.
   *
   * @returns {Promise<void>}
   */
  function isWmeReady() {
    return new Promise((resolve, reject) => {
      if (wmeSDK && wmeSDK.State.isReady() && wmeSDK.Sidebar && wmeSDK.LayerSwitcher && wmeSDK.Shortcuts && wmeSDK.Events) {
        console.log(`${scriptName}: WME is already ready.`);
        resolve();
      } else {
        wmeSDK.Events.once({ eventName: 'wme-ready' })
          .then(() => {
            if (wmeSDK.Sidebar && wmeSDK.LayerSwitcher && wmeSDK.Shortcuts && wmeSDK.Events) {
              console.log(`${scriptName}: WME is fully ready now.`);
              resolve();
            } else {
              reject(`${scriptName}: Some SDK components are not loaded.`);
            }
          })
          .catch((error) => {
            console.error(`${scriptName}: Error while waiting for WME to be ready:`, error);
            reject(error);
          });
      }
    });
  }

  /**
   * Returns a Promise that resolves when the global `WazeWrap.Ready` flag is set.
   * Polls every 500 ms for up to 1000 attempts before rejecting on timeout.
   *
   * @returns {Promise<void>}
   */
  function isWazeWrapReady() {
    return new Promise((resolve, reject) => {
      const maxTries = 1000;
      const checkInterval = 500;

      (function check(tries = 0) {
        if (unsafeWindow.WazeWrap && unsafeWindow.WazeWrap.Ready) {
          console.log(`${scriptName}: WazeWrap is successfully loaded.`);
          resolve();
        } else if (tries < maxTries) {
          setTimeout(() => check(++tries), checkInterval);
        } else {
          reject(`${scriptName}: WazeWrap took too long to load.`);
        }
      })();
    });
  }

  /**
   * Returns a Promise that resolves when the globally injected `GeoKMLer` class is defined
   * and can be successfully instantiated.
   *
   * @returns {Promise<void>}
   */
  function isGeoKMLerReady() {
    return new Promise((resolve, reject) => {
      try {
        if (typeof GeoKMLer !== 'undefined') {
          const geoKMLer = new GeoKMLer();
          if (geoKMLer) {
            console.log(`${scriptName}: GeoKMLer is successfully loaded and ready.`);
            resolve();
          } else {
            reject(`${scriptName}: GeoKMLer instance could not be created.`);
          }
        } else {
          reject(`${scriptName}: GeoKMLer is not defined.`);
        }
      } catch (error) {
        console.error(`${scriptName}: Error during GeoKMLer readiness check:`, error);
        reject(error);
      }
    });
  }


  /**
   * Loads persisted settings from localStorage into `_settings`, merging any missing
   * keys with their default values so the settings object is always fully populated.
   */
  function loadSettings() {
    _settings = $.parseJSON(localStorage.getItem(_settingsStoreName));
    const defaults = {
      layerVisible: true,
      ShowCityLabels: true,
      FillPolygons: true,
      HighlightFocusedCity: true,
      AutoUpdateKMLs: true,
      strokeColor: _defaultStrokeColor,
      fillColor: _defaultFillColor,
      strokeOpacity: _defaultStrokeOpacity,
      fillOpacity: _defaultFillOpacity,
      labelColor: _defaultLabelColor,
      labelColorMatchStroke: false,
      labelOutlineColor: _defaultLabelOutlineColor,
      labelOutlineColorMatchStroke: false,
      labelFontSize: _defaultLabelFontSize,
      labelFontSizeRelative: true,
      labelOutlineWidth: _defaultLabelOutlineWidth,
      labelOutlineWidthRelative: true,
      highlightColor: _defaultHighlightColor,
    };
    if (!_settings) _settings = defaults;
    for (const prop in defaults) {
      if (!Object.prototype.hasOwnProperty.call(_settings, prop)) _settings[prop] = defaults[prop];
    }
  }

  /**
   * Persists the current `_settings` values to localStorage as a JSON string.
   */
  function saveSettings() {
    if (localStorage) {
      const settings = {
        layerVisible: _settings.layerVisible,
        ShowCityLabels: _settings.ShowCityLabels,
        FillPolygons: _settings.FillPolygons,
        HighlightFocusedCity: _settings.HighlightFocusedCity,
        AutoUpdateKMLs: _settings.AutoUpdateKMLs,
        strokeColor: _settings.strokeColor,
        fillColor: _settings.fillColor,
        strokeOpacity: _settings.strokeOpacity,
        fillOpacity: _settings.fillOpacity,
        labelColor: _settings.labelColor,
        labelColorMatchStroke: _settings.labelColorMatchStroke,
        labelOutlineColor: _settings.labelOutlineColor,
        labelOutlineColorMatchStroke: _settings.labelOutlineColorMatchStroke,
        labelFontSize: _settings.labelFontSize,
        labelFontSizeRelative: _settings.labelFontSizeRelative,
        labelOutlineWidth: _settings.labelOutlineWidth,
        labelOutlineWidthRelative: _settings.labelOutlineWidthRelative,
      };
      localStorage.setItem(_settingsStoreName, JSON.stringify(settings));
    }
  }

  /**
   * Recursively removes the third (elevation/Z) value from a GeoJSON coordinate array,
   * normalising all geometries to 2D [longitude, latitude] pairs.
   *
   * @param {Array} coordinates - A coordinate array at any nesting depth.
   * @returns {Array} The same structure with every leaf coordinate truncated to [x, y].
   */
  function stripElevation(coordinates) {
    if (Array.isArray(coordinates[0])) {
      // If coordinates are nested, recursively strip elevation
      return coordinates.map((coord) => stripElevation(coord));
    }
    // Remove third element from a single set of coordinates
    return coordinates.slice(0, 2);
  }

  /**
   * Converts a GeoJSON FeatureCollection into a flat array of simple-geometry Features.
   * Multi-geometry types (MultiPolygon, MultiLineString, MultiPoint) and GeometryCollections
   * are decomposed into individual Features via `turf.flattenEach`. Each feature's name
   * property is cleaned of KML artefact characters and copied to `properties.labelText`.
   * All coordinates are stripped to 2D using `stripElevation`.
   *
   * @param {Object} geoJson - A GeoJSON FeatureCollection.
   * @returns {Array<Object>} Flat array of GeoJSON Feature objects ready for layer use.
   * @throws {Error} If `geoJson` is not a valid FeatureCollection.
   */
  function flattenGeoJSON(geoJson) {
    if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
      throw new Error('Invalid GeoJSON input: expected a FeatureCollection.');
    }
    const result = [];
    turf.flattenEach(geoJson, (feature) => {
      if (feature.properties) {
        const nameKey = ['name', 'Name', 'NAME'].find((k) => feature.properties[k]);
        if (nameKey) {
          feature.properties[nameKey] = feature.properties[nameKey]
            .replace(/<at><openparen>/gi, '')
            .replace(/<closeparen>/gi, '');
          feature.properties.labelText = feature.properties[nameKey];
        }
      }
      result.push({
        type: 'Feature',
        geometry: {
          type: feature.geometry.type,
          coordinates: stripElevation(feature.geometry.coordinates),
        },
        properties: feature.properties,
      });
    });
    return result;
  }

  /**
   * Parses a KML string into a flat array of GeoJSON Features using the GeoKMLer library
   * followed by `flattenGeoJSON` to normalise and decompose the result.
   *
   * @param {string} strKML - Raw KML document string.
   * @returns {Array<Object>} Flat array of GeoJSON Feature objects.
   */
  function GetFeaturesFromKMLString(strKML) {
    const geoKMLer = new GeoKMLer();
    const kmlDoc = geoKMLer.read(strKML);
    const GeoJSONflat = flattenGeoJSON(geoKMLer.toGeoJSON(kmlDoc, false)); // false = don't need the added CRS info section
    return GeoJSONflat;
  }

  /**
   * Function: findCurrCity
   * ----------------------
   * Determines the current city based on the map's center point, identifying its feature
   * within GeoJSON layers, and handling DOM element retrieval for the current feature.
   *
   * Steps:
   * 1. Initialize the `cityData` object with default properties.
   * 2. Retrieve the current map center coordinates using `wmeSDK.Map`.
   * 3. Iterate over all features in the global `_layer` array to check if the map center is
   *    within any polygon feature using `isPointInPolygon`.
   *     - If a match is found, update `cityData` with the feature's details.
   * 4. Perform a debug-only operation to find the DOM element associated with the feature:
   *     - Retrieve using `wmeSDK.Map.getFeatureDomElement` if the `featureId` is valid.
   *     - Handle cases where the DOM element is not found or retrieval errors occur.
   * 5. Log the finalized `cityData` object for debugging purposes.
   *
   * Globals:
   * - `scriptName`: Used for logging errors and debug information.
   * - `_layer`: Array of GeoJSON features representing map polygons and properties.
   * - `debug`: Flag to enable additional logging for troubleshooting.
   * - `layerid`: Identifier for the map layer, needed for DOM element retrieval.
   *
   * Error Handling and Debugging:
   * - Includes additional logging and checks to address missing elements and potential errors.
   * - Detailed console warnings and errors facilitate debugging when `debug` mode is activated.
   *
   * Returns:
   * - `cityData`: An object containing the current city's name, associated feature ID, and optional DOM element.
   */
  function findCurrCity() {
    let cityData = {
      name: '',
      featureId: '',
      domElement: null, // Initialize as null for safety
    };

    // Get the current map center using wmeSDK
    const mapCenter = wmeSDK.Map.getMapCenter(); // Returns { lat: number, lon: number }
    const mapCenterPoint = [mapCenter.lon, mapCenter.lat];

    // Check if _layer is defined and not null before proceeding
    if (!_layer || !_layer.length) {
      if (debug) console.warn(`${scriptName}: _layer is null or undefined. Unable to find current city.`);
      return cityData;
    }

    for (let i = 0; i < _layer.length; i++) {
      const feature = _layer[i];
      const properties = feature.properties;
      const id = feature.id;

      // Check if the map center point is inside the feature's geometry (polygon)
      if (turf.booleanPointInPolygon(turf.point(mapCenterPoint), feature)) {
        cityData.name = properties.name;
        cityData.featureId = id;
        if (debug) {
          cityData.geojson = feature;
        }
        break;
      }
    }

    if (debug) {
      // Only attempt to get the DOM element if a valid featureId has been set
      if (cityData.featureId) {
        try {
          const currCityFeatureDomElement = wmeSDK.Map.getFeatureDomElement({
            featureId: cityData.featureId,
            layerName: layerid,
          });

          if (currCityFeatureDomElement !== null) {
            cityData.domElement = currCityFeatureDomElement;
          } else {
            console.warn(`${scriptName}: DOM element for feature ID ${cityData.featureId} not found.`);
          }
        } catch (error) {
          console.error(`${scriptName}: Error retrieving DOM element for feature ID ${cityData.featureId}:`, error);
        }
      }
    }

    if (debug) {
      console.log(`${scriptName}: Current Focused City Object is:`, cityData);
    }

    return cityData;
  }

  /**
   * Function: updateCitiesLayer
   * ---------------------------
   * Asynchronously updates the cities layer on the map based on the current state and zoom level,
   * ensuring proper display of city polygons and region names.
   *
   * Steps:
   * 1. Check the map's current zoom level and exit early if it's below 12, as detailed city view is unnecessary.
   * 2. Retrieve the top state from the map data model. If different from the current state (`currState`),
   *    invoke `updateCityPolygons` to refresh city polygon data.
   * 3. Identify the current city using `findCurrCity`. Ensure the city data is valid before proceeding.
   * 4. Update the display name of the district or region using `updateDistrictNameDisplay`.
   * 5. Redraw the map layer to reflect the updated city data.
   *
   * Error Handling:
   * - Try-catch block used to handle any runtime errors gracefully, logging details for debugging.
   * - Checks for valid `currCity` and `currCity.name` to prevent operations on missing data.
   *
   * Globals:
   * - `scriptName`: Used for logging errors and operation details.
   * - `currState`: Tracks the name of the state currently being processed.
   * - `layerid`: Identifier for the target layer where cities are displayed.
   * - `currCity`: Object to store the currently identified city, utilized in display logic.
   */
  async function updateCitiesLayer() {
    try {
      const zoom = wmeSDK.Map.getZoomLevel();
      if (zoom < 5) {
        return;
      }

      const topState = wmeSDK.DataModel.States.getTopState();
      if (!topState) {
        if (debug) console.log(`${scriptName}: topState is null. Skipping updateCityPolygons.`);
        return;
      }

      if (currState !== topState.name) {
        await updateCityPolygons(); // loads polygons + calls refreshLabels internally
      } else {
        refreshLabels(); // same state — recompute labels for new viewport
      }

      currCity = findCurrCity();

      if (!currCity || !currCity.name) {
        if (debug) console.log(`${scriptName}: No Current city Polygon found for this location....`);
        return;
      }

      updateDistrictNameDisplay();
      wmeSDK.Map.redrawLayer({ layerName: layerid });
    } catch (error) {
      console.error(`${scriptName}: Error in updateCitiesLayer -`, error);
    }
  }

  /**
   * Creates or refreshes the cyan city-name label injected into the WME
   * location-info bar. Removes any existing label first, then appends a new one
   * only when `_layer` has features and `currCity.name` is set.
   */
  function updateDistrictNameDisplay() {
    // Remove existing district name displays
    $('.wmecitiesoverlay-region').remove();

    // Verify if _layer has features and a current city is specified
    if (Array.isArray(_layer) && _layer.length > 0 && currCity.name != '') {
      let color = '#00ffff';

      // Create a new div element for displaying the current city
      var $div = $('<div>', {
        id: 'wmecitiesoverlay',
        class: 'wmecitiesoverlay-region',
        style: 'float:left; margin-left:10px;',
      }).css({
        color: color,
        cursor: 'pointer',
      });

      var $span = $('<span>').css({ display: 'inline-block' });
      $span.text(currCity.name).appendTo($div);

      // Append the new element after the location-info-region
      $('.location-info-region').after($div);
    }
  }

  /**
   * Clears all features from the polygon layer and re-adds the current `_layer` array,
   * ensuring the map reflects the latest loaded city boundaries.
   */
  function addPolygonsToLayer() {
    if (!_layer || !_layer.length) return;
    wmeSDK.Map.removeAllFeaturesFromLayer({ layerName: layerid });
    wmeSDK.Map.dangerouslyAddFeaturesToLayerWithoutValidation({
      features: _layer,
      layerName: layerid,
    });
  }

  /**
   * Rebuilds the label layer for the current viewport. Clears existing label features,
   * then for each city polygon that passes a fast bounding-box pre-filter, calls
   * `getLabelPoints` to compute intersection-based label positions and adds them to the
   * labels layer. Does nothing if labels are disabled or `_layer` is empty.
   */
  function refreshLabels() {
    wmeSDK.Map.removeAllFeaturesFromLayer({ layerName: labelsLayerId });
    if (!_settings.ShowCityLabels || !_layer || !_layer.length) return;

    const ext = wmeSDK.Map.getMapExtent(); // [minX, minY, maxX, maxY]
    const allLabels = [];

    _layer.forEach((feature) => {
      // Fast bbox pre-filter — skip turf.intersect for off-screen polygons
      const b = feature.properties._bbox;
      if (!b || b[0] > ext[2] || b[2] < ext[0] || b[1] > ext[3] || b[3] < ext[1]) return;

      const points = getLabelPoints(feature);
      if (points.length) allLabels.push(...points);
    });

    if (allLabels.length) {
      wmeSDK.Map.dangerouslyAddFeaturesToLayerWithoutValidation({
        features: allLabels,
        layerName: labelsLayerId,
      });
    }
  }

  /**
   * Computes label point Features for a single city polygon by intersecting it with
   * the current screen viewport. Each intersection fragment larger than 0.5% of the
   * screen area gets a label placed at its center-of-mass (or `pointOnFeature` as a
   * fallback when the centroid falls outside the polygon).
   *
   * @param {Object} feature - A GeoJSON Feature with a Polygon geometry.
   * @returns {Array<Object>} Array of GeoJSON Point Features (may be empty).
   */
  function getLabelPoints(feature) {
    const screenPolygon = getScreenPolygon();
    const intersection = turf.intersect(turf.featureCollection([screenPolygon, feature]));
    const polygons = [];
    if (intersection) {
      switch (intersection.geometry.type) {
        case 'Polygon':
          polygons.push(intersection);
          break;
        case 'MultiPolygon':
          intersection.geometry.coordinates.forEach((ring) => polygons.push(turf.polygon(ring)));
          break;
        default:
          break;
      }
    }

    const screenArea = getScreenArea();
    return polygons
      .filter((polygon) => {
        const polygonArea = turf.area(polygon);
        return polygonArea / screenArea > 0.005;
      })
      .map((polygon) => {
        let point = turf.centerOfMass(polygon);
        if (!turf.booleanPointInPolygon(point, polygon)) {
          point = turf.pointOnFeature(polygon);
        }
        point.properties = { type: 'label', labelText: feature.properties.labelText };
        point.id = 0;
        return point;
      });
  }

  /**
   * Lazily rebuilds the screen-polygon and screen-area caches whenever the map extent
   * changes. Called by `getScreenPolygon` and `getScreenArea` before returning their
   * cached values, so callers always receive an up-to-date result without performing
   * redundant recalculations on each label refresh.
   */
  function ensurePolygonCaches() {
    const ext = wmeSDK.Map.getMapExtent();
    if (
      _cachedExtent &&
      _cachedScreenPolygon &&
      _cachedScreenArea !== null &&
      _cachedExtent[0] === ext[0] &&
      _cachedExtent[1] === ext[1] &&
      _cachedExtent[2] === ext[2] &&
      _cachedExtent[3] === ext[3]
    ) {
      return;
    }
    _cachedExtent = ext;
    _cachedScreenPolygon = turf.polygon([
      [
        [ext[0], ext[3]],
        [ext[2], ext[3]],
        [ext[2], ext[1]],
        [ext[0], ext[1]],
        [ext[0], ext[3]],
      ],
    ]);
    _cachedScreenArea = turf.area(_cachedScreenPolygon);
  }

  /**
   * Returns the current viewport as a turf Polygon Feature, updating the cache first
   * if the map extent has changed since the last call.
   *
   * @returns {Object} A turf Polygon Feature representing the visible map extent.
   */
  function getScreenPolygon() {
    ensurePolygonCaches();
    return _cachedScreenPolygon;
  }

  /**
   * Returns the area of the current viewport in square metres, updating the cache first
   * if the map extent has changed since the last call.
   *
   * @returns {number} Viewport area in m².
   */
  function getScreenArea() {
    ensurePolygonCaches();
    return _cachedScreenArea;
  }

  /**
   * Performs a GET request via the Tampermonkey `GM_xmlhttpRequest` API, bypassing
   * browser CORS restrictions for cross-origin GitHub raw-content URLs.
   *
   * @param {string} url - The URL to fetch.
   * @returns {Promise<string>} Resolves with the response text, or rejects on HTTP 4xx/5xx
   *   or network error.
   */
  async function fetch(url) {
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
        },
      });
    });
  }

  /**
   * Function: updateAllMaps
   * -----------------------
   * Asynchronously updates KML data for all states in the current country, comparing
   * local storage against the latest content available in a GitHub repository.
   *
   * Steps:
   * 1. Get the top country from the map data model and retrieve its abbreviation.
   * 2. Fetch the keys for all states' city data stored locally.
   * 3. Determine the appropriate state abbreviation object based on the country's abbreviation.
   * 4. Retrieve the list of KML files from the GitHub repository, parsing the response.
   * 5. For each state in local storage, check if the KML file size differs from the server's version.
   *    If so, fetch the updated KML file, update local storage, and cache if necessary.
   * 6. Log the count and names of states updated in the user's interface.
   * 7. Finally, refresh city layers using `updateCitiesLayer`.
   *
   * Note:
   * - Utilizes persistent local storage (`idbKeyval`) and caching (`kmlCache`) to reduce unnecessary data loads.
   * - Updates DOM element `#WMECOupdateStatus` to reflect operation results, aiding user interaction and feedback.
   *
   * Globals:
   * - `scriptName`: The name used for logging and user feedback.
   * - `repoOwner`: Identifier for the GitHub repository owner, used for URL generation.
   * - `currState`: Tracks the current state being processed, updated during KML fetching.
   * - `_kml`: Stores KML data when a matching state is currently active.
   * - `layerid`: Identifier for the map layer where updates are applied.
   * - `_US_States` and `_MX_States`: Objects managing state abbreviation lookup.
   * - `kmlCache`: Object to locally cache loaded KML data for efficient retrieval.
   */
  async function updateAllMaps() {
    const topCountry = wmeSDK.DataModel.Countries.getTopCountry();
    let countryAbbr = topCountry.abbr;
    let keys = await idbKeyval.keys(`${countryAbbr}_states_cities`);
    let updatedCount = 0;
    let updatedStates = '';
    let countryAbbrObj;

    if (countryAbbr === 'US') countryAbbrObj = _US_States;
    else if (countryAbbr === 'MX') countryAbbrObj = _MX_States;
    else if (countryAbbr === 'CA') countryAbbrObj = _CA_States;

    let KMLinfoArr = await fetch(`https://api.github.com/repos/${repoOwner}/WME-Cities-Overlay/contents/KMLs/${countryAbbr}`);
    KMLinfoArr = $.parseJSON(KMLinfoArr);
    let state;
    for (let i = 0; i < keys.length; i++) {
      state = keys[i];

      for (let j = 0; j < KMLinfoArr.length; j++) {
        if (KMLinfoArr[j].name === `${state}_Cities.kml`) {
          //check the size in db against server - if different, update db
          let stateObj = await idbKeyval.get(`${countryAbbr}_states_cities`, state);

          if (stateObj.kmlsize !== KMLinfoArr[j].size) {
            let kml = await fetch(`https://raw.githubusercontent.com/${repoOwner}/WME-Cities-Overlay/master/KMLs/${countryAbbr}/${state}_Cities.kml`);

            if (state === countryAbbrObj.getAbbreviation(currState)) _kml = kml;

            await idbKeyval.set(`${countryAbbr}_states_cities`, {
              kml: kml,
              state: state,
              kmlsize: KMLinfoArr[j].size,
            });
            if (kmlCache[state] != null) kmlCache[state] = _kml;
            if (updatedStates != '') updatedStates += `, ${state}`;
            else updatedStates += state;
            updatedCount += 1;
          }
          break;
        }
      }
    }
    if (updatedCount > 0) $('#WMECOupdateStatus').text(`${updatedCount} state file${updatedCount > 1 ? 's' : ''} updated - ${updatedStates}`);
    else $('#WMECOupdateStatus').text('No updates available');

    updateCitiesLayer();
  }

  /**
   * Main initialisation routine. Registers the sidebar tab, creates the polygon and
   * label map layers with their style rules, wires up event handlers, adds the layer
   * switcher checkbox, and triggers the initial city polygon load if the layer is visible.
   */
  async function init() {
    initTab();
    //I18n.translations[I18n.locale].layers.name[layerid] = "Cities Overlay";
    const layerConfig = {
      styleRules: [
        {
          // City polygons — stroke/fill only, no label text
          predicate: (properties) => properties.type === 'city',
          style: {
            strokeDashstyle: 'solid',
            strokeColor: '${dynamicStrokeColor}',
            strokeOpacity: '${dynamicStrokeOpacity}',
            strokeWidth: '${dynamicStrokeWidth}',
            fillOpacity: '${dynamicFillOpacity}',
            fillColor: '${dynamicFillColor}',
            label: '',
          },
        },
      ],
      styleContext: {
        dynamicStrokeColor: (context) => {
          if (_settings.HighlightFocusedCity && context.feature.id === currCity.featureId) {
            return _settings.highlightColor;
          }
          return _settings.strokeColor;
        },
        dynamicFillColor: (context) => {
          if (_settings.HighlightFocusedCity && context.feature.id === currCity.featureId) {
            return _settings.highlightColor;
          }
          return _settings.fillColor;
        },
        dynamicStrokeWidth: (context) => {
          if (_settings.HighlightFocusedCity && context.feature.id === currCity.featureId) {
            return 6; // Highlight stroke width
          }
          return 2;
        },
        dynamicStrokeOpacity: () => _settings.strokeOpacity,
        dynamicFillOpacity: () => (_settings.FillPolygons ? _settings.fillOpacity : 0),
      },
    };

    wmeSDK.Map.addLayer({
      layerName: layerid,
      styleRules: layerConfig.styleRules,
      styleContext: layerConfig.styleContext,
      zIndexing: true,
    });

    // Labels layer — registered after polygon layer so it always renders on top
    wmeSDK.Map.addLayer({
      layerName: labelsLayerId,
      styleRules: [
        {
          predicate: (properties) => properties.type === 'label',
          style: {
            pointRadius: 0,
            label: '${getLabel}',
            fontSize: '${getFontSize}',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fontColor: '${getFontColor}',
            labelOutlineColor: '${getLabelOutlineColor}',
            labelOutlineWidth: '${getLabelOutlineWidth}',
            labelYOffset: '${getLabelYOffset}',
            labelAlign: 'cm',
          },
        },
      ],
      styleContext: {
        getLabel: ({ feature, zoomLevel }) => {
          if (zoomLevel < 12) return '';
          return feature?.properties?.labelText?.trim() ?? '';
        },
        getFontSize: ({ zoomLevel }) => {
          if (_settings.labelFontSizeRelative) return `${Math.round(20 + (zoomLevel - 12) * 2)}px`;
          return `${_settings.labelFontSize}px`;
        },
        getFontColor: () => (_settings.labelColorMatchStroke ? _settings.strokeColor : _settings.labelColor),
        getLabelOutlineColor: () => (_settings.labelOutlineColorMatchStroke ? _settings.strokeColor : _settings.labelOutlineColor),
        getLabelOutlineWidth: ({ zoomLevel }) => {
          if (_settings.labelOutlineWidthRelative) return Math.max(1, Math.round((zoomLevel + 2) / 8));
          return _settings.labelOutlineWidth;
        },
        getLabelYOffset: ({ zoomLevel }) => {
          if (zoomLevel < 15) return 0;
          if (zoomLevel < 18) return 5;
          return 10;
        },
      },
      zIndexing: true,
    });

    // Set visibility to true for the layer
    wmeSDK.Map.setLayerVisibility({ layerName: layerid, visibility: _settings.layerVisible });
    wmeSDK.Map.setLayerVisibility({ layerName: labelsLayerId, visibility: _settings.layerVisible });
    wmeSDK.LayerSwitcher.addLayerCheckbox({ name: 'Cities Overlay' });
    wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: 'Cities Overlay', isChecked: _settings.layerVisible });
    wmeSDK.Events.on({ eventName: 'wme-layer-checkbox-toggled', eventHandler: layerToggled });
    wmeSDK.Events.on({ eventName: 'wme-map-move-end', eventHandler: onMapMove });

    if (_settings.layerVisible) {
      await updateCityPolygons();
      currCity = findCurrCity();
      if (_settings.AutoUpdateKMLs) {
        updateAllMaps();
      }
    }
  } // END int() function

  /**
   * Builds and registers the script's sidebar panel. Injects scoped CSS, then constructs
   * the Display, Polygon Style, Label Style, and Database cards along with the Quick Presets
   * chip bar. Defines all inner UI-helper functions and wires their event listeners.
   */
  function initTab() {
    // Inject scoped styles
    if (!document.getElementById('wme-cities-styles')) {
      const style = document.createElement('style');
      style.id = 'wme-cities-styles';
      style.textContent = `
.wme-cities-panel { font-family: inherit; font-size: 12px; line-height: 1.4; color: var(--content_default); padding: 4px; box-sizing: border-box; }
.wme-cities-panel .co-header { background: linear-gradient(135deg, #0066cc, #0052a3); padding: 8px 10px; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; color: white; }
.wme-cities-panel .co-title { font-size: 13px; font-weight: 700; letter-spacing: 0.3px; }
.wme-cities-panel .co-version { font-size: 10px; opacity: 0.8; }
.wme-cities-panel .co-card { background: var(--background_default); border: 1px solid var(--hairline); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
.wme-cities-panel .co-card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--primary); margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--hairline); }
.wme-cities-panel .co-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.wme-cities-panel .co-row:last-child { margin-bottom: 0; }
.wme-cities-panel .co-label { font-size: 11px; font-weight: 500; color: var(--content_p1); flex: 1; }
.wme-cities-panel .co-toggle-wrap { position: relative; display: inline-block; width: 32px; height: 16px; cursor: pointer; flex-shrink: 0; }
.wme-cities-panel .co-toggle-wrap input { opacity: 0; width: 0; height: 0; position: absolute; }
.wme-cities-panel .co-toggle-slider { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--hairline); border-radius: 8px; transition: background 0.25s; }
.wme-cities-panel .co-toggle-slider::before { position: absolute; content: ''; height: 12px; width: 12px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: transform 0.25s; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.wme-cities-panel .co-toggle-wrap input:checked + .co-toggle-slider { background: var(--primary, #4a90e2); }
.wme-cities-panel .co-toggle-wrap input:checked + .co-toggle-slider::before { transform: translateX(16px); }
.wme-cities-panel .co-color-btn { width: 36px; height: 22px; padding: 0 2px; border: 1px solid var(--hairline); border-radius: 4px; cursor: pointer; flex-shrink: 0; }
.wme-cities-panel .co-slider-row { margin-bottom: 8px; }
.wme-cities-panel .co-slider-row:last-child { margin-bottom: 0; }
.wme-cities-panel .co-slider-label { display: flex; justify-content: space-between; font-size: 11px; color: var(--content_p1); margin-bottom: 3px; font-weight: 500; }
.wme-cities-panel .co-slider { width: 100%; height: 5px; -webkit-appearance: none; appearance: none; border-radius: 3px; outline: none; cursor: pointer; }
.wme-cities-panel .co-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: var(--primary, #4a90e2); cursor: pointer; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-top: -4.5px; }
.wme-cities-panel .co-slider::-moz-range-thumb { width: 14px; height: 14px; background: var(--primary, #4a90e2); cursor: pointer; border-radius: 50%; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.wme-cities-panel .co-slider-presets { display: flex; gap: 4px; margin-top: 5px; }
.wme-cities-panel .co-preset { padding: 2px 7px; font-size: 10px; font-weight: 600; border: 1px solid var(--hairline); border-radius: 10px; background: var(--background_default); color: var(--content_p1); cursor: pointer; transition: all 0.15s; }
.wme-cities-panel .co-preset:hover { background: var(--primary, #4a90e2); color: white; border-color: var(--primary, #4a90e2); }
.wme-cities-panel .co-btn { display: block; width: 100%; padding: 6px 10px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; background: var(--primary, #4a90e2); color: white !important; box-sizing: border-box; transition: opacity 0.2s; margin-top: 6px; }
.wme-cities-panel .co-btn:hover { opacity: 0.85; }
.wme-cities-panel .co-status { font-size: 10px; color: var(--content_p2); margin-top: 4px; min-height: 14px; }
.wme-cities-panel .co-quick-presets { background: var(--surface_variant, #f0f0f0); padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; }
.wme-cities-panel .co-presets-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--content_p2); margin-bottom: 8px; display: block; }
.wme-cities-panel .co-preset-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.wme-cities-panel .co-preset-chip { padding: 5px 10px; background: var(--background_default); border: 1px solid var(--hairline); border-radius: 14px; font-size: 11px; font-weight: 500; color: var(--content_p1); cursor: pointer; transition: all 150ms ease; white-space: nowrap; }
.wme-cities-panel .co-preset-chip:hover { background: var(--primary, #4a90e2); color: white; border-color: var(--primary, #4a90e2); }
.wme-cities-panel .co-toggle-text { font-size: 10px; color: var(--content_p2); white-space: nowrap; flex-shrink: 0; }
.wme-cities-panel .co-number-input { width: 52px; padding: 2px 5px; border: 1px solid var(--hairline); border-radius: 4px; font-size: 11px; background: var(--surface_default); color: var(--content_default); text-align: center; flex-shrink: 0; }
.wme-cities-panel .co-number-input:disabled { opacity: 0.4; cursor: not-allowed; }
      `;
      document.head.appendChild(style);
    }

    /**
     * Updates a range slider's fill gradient and its sibling percentage label to match
     * the slider's current value.
     *
     * @param {HTMLInputElement} slider - The range input element to update.
     */
    function updateSlider(slider) {
      const pct = Math.round(parseFloat(slider.value) * 100);
      slider.style.background = `linear-gradient(to right, #4a90e2 0%, #4a90e2 ${pct}%, #e1e4e8 ${pct}%, #e1e4e8 100%)`;
      const valueEl = slider.parentElement && slider.parentElement.querySelector('.co-slider-value');
      if (valueEl) valueEl.textContent = `${pct}%`;
    }

    /**
     * Creates a styled CSS toggle-switch control.
     *
     * @param {boolean} checked - Initial checked state.
     * @param {Function} onChange - Callback invoked with the new boolean value on change.
     * @returns {HTMLLabelElement} The toggle wrapper element.
     */
    function makeToggle(checked, onChange) {
      const wrap = document.createElement('label');
      wrap.className = 'co-toggle-wrap';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = checked;
      input.addEventListener('change', () => onChange(input.checked));
      const slider = document.createElement('span');
      slider.className = 'co-toggle-slider';
      wrap.appendChild(input);
      wrap.appendChild(slider);
      return wrap;
    }

    /**
     * Creates a two-column settings row containing a label on the left and an arbitrary
     * control element on the right.
     *
     * @param {string} labelText - Display text for the row label.
     * @param {HTMLElement} control - The input or toggle element to place on the right.
     * @returns {HTMLDivElement} The row div.
     */
    function makeRow(labelText, control) {
      const row = document.createElement('div');
      row.className = 'co-row';
      const label = document.createElement('span');
      label.className = 'co-label';
      label.textContent = labelText;
      row.appendChild(label);
      row.appendChild(control);
      return row;
    }

    /**
     * Creates a complete opacity slider row with a label, live percentage readout, a
     * range input, and a row of quick-select preset buttons.
     *
     * @param {string} labelText - Display label for the slider (e.g. "Stroke Opacity").
     * @param {string} settingKey - The `_settings` key updated when the slider changes.
     * @param {number} value - Initial slider value in the range [0, 1].
     * @returns {HTMLDivElement} The slider row wrapper element.
     */
    function makeSliderRow(labelText, settingKey, value) {
      const wrapper = document.createElement('div');
      wrapper.className = 'co-slider-row';

      const labelRow = document.createElement('div');
      labelRow.className = 'co-slider-label';
      const labelSpan = document.createElement('span');
      labelSpan.textContent = labelText;
      const valueSpan = document.createElement('span');
      valueSpan.className = 'co-slider-value';
      valueSpan.textContent = `${Math.round(value * 100)}%`;
      labelRow.appendChild(labelSpan);
      labelRow.appendChild(valueSpan);
      wrapper.appendChild(labelRow);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'co-slider';
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.05';
      slider.value = value;
      updateSlider(slider);

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        _settings[settingKey] = val;
        updateSlider(slider);
        saveSettings();
        wmeSDK.Map.redrawLayer({ layerName: layerid });
      });
      wrapper.appendChild(slider);

      const presets = document.createElement('div');
      presets.className = 'co-slider-presets';
      [0.05, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75].forEach((val) => {
        const btn = document.createElement('button');
        btn.className = 'co-preset';
        btn.textContent = `${val * 100}%`;
        btn.addEventListener('click', () => {
          slider.value = val;
          _settings[settingKey] = val;
          updateSlider(slider);
          saveSettings();
          wmeSDK.Map.redrawLayer({ layerName: layerid });
        });
        presets.appendChild(btn);
      });
      wrapper.appendChild(presets);

      return wrapper;
    }

    wmeSDK.Sidebar.registerScriptTab()
      .then(({ tabLabel, tabPane }) => {
        const powerBtnColor = _settings.layerVisible ? '#00bd00' : '#ccc';
        tabLabel.innerHTML = `<span id="cities-overlay-power-btn" class="fa fa-power-off" title="Toggle Cities Overlay" style="margin-right:5px;cursor:pointer;color:${powerBtnColor};font-size:13px;"></span><span title="${scriptName}">Cities</span>`;
        $('#cities-overlay-power-btn').on('click', function () {
          setLayerVisible(!_settings.layerVisible);
          return false;
        });
        tabPane.classList.add('wme-cities-panel');

        // Header
        const header = document.createElement('div');
        header.className = 'co-header';
        header.innerHTML = `<span class="co-title">Cities Overlay</span><span class="co-version">v${GM_info.script.version}</span>`;
        tabPane.appendChild(header);

        // Quick Presets — chips wired after all style card refs are built below
        const presetsDiv = document.createElement('div');
        presetsDiv.className = 'co-quick-presets';
        const presetsLabel = document.createElement('span');
        presetsLabel.className = 'co-presets-label';
        presetsLabel.textContent = 'Quick Presets';
        presetsDiv.appendChild(presetsLabel);
        const presetsChips = document.createElement('div');
        presetsChips.className = 'co-preset-chips';
        [
          { key: 'default', label: 'Default' },
          { key: 'high-contrast', label: 'High Contrast' },
          { key: 'minimal', label: 'Minimal' },
          { key: 'colorblind', label: 'Colorblind' },
          { key: 'night', label: 'Night Mode' },
        ].forEach(({ key, label }) => {
          const chip = document.createElement('div');
          chip.className = 'co-preset-chip';
          chip.dataset.preset = key;
          chip.textContent = label;
          presetsChips.appendChild(chip);
        });
        presetsDiv.appendChild(presetsChips);
        tabPane.appendChild(presetsDiv);

        // Display card
        const displayCard = document.createElement('div');
        displayCard.className = 'co-card';
        const displayTitle = document.createElement('div');
        displayTitle.className = 'co-card-title';
        displayTitle.textContent = 'Display';
        displayCard.appendChild(displayTitle);

        displayCard.appendChild(
          makeRow(
            'Fill Polygons',
            makeToggle(_settings.FillPolygons, (checked) => {
              _settings.FillPolygons = checked;
              saveSettings();
              wmeSDK.Map.redrawLayer({ layerName: layerid });
            }),
          ),
        );

        displayCard.appendChild(
          makeRow(
            'Show City Labels',
            makeToggle(_settings.ShowCityLabels, (checked) => {
              _settings.ShowCityLabels = checked;
              saveSettings();
              refreshLabels();
            }),
          ),
        );

        displayCard.appendChild(
          makeRow(
            'Highlight Focused City',
            makeToggle(_settings.HighlightFocusedCity, (checked) => {
              _settings.HighlightFocusedCity = checked;
              saveSettings();
              wmeSDK.Map.redrawLayer({ layerName: layerid });
            }),
          ),
        );

        tabPane.appendChild(displayCard);

        // Style card
        const styleCard = document.createElement('div');
        styleCard.className = 'co-card';
        const styleTitle = document.createElement('div');
        styleTitle.className = 'co-card-title';
        styleTitle.textContent = 'Polygon Style';
        styleCard.appendChild(styleTitle);

        const strokeColorInput = document.createElement('input');
        strokeColorInput.type = 'color';
        strokeColorInput.className = 'co-color-btn';
        strokeColorInput.value = _settings.strokeColor;
        strokeColorInput.addEventListener('input', () => {
          _settings.strokeColor = strokeColorInput.value;
          saveSettings();
          wmeSDK.Map.redrawLayer({ layerName: layerid });
          wmeSDK.Map.redrawLayer({ layerName: labelsLayerId });
          // Keep synced label color pickers in step with the new stroke color
          if (_settings.labelColorMatchStroke) labelColorInput.value = _settings.strokeColor;
          if (_settings.labelOutlineColorMatchStroke) outlineColorInput.value = _settings.strokeColor;
        });
        styleCard.appendChild(makeRow('Stroke Color', strokeColorInput));

        const fillColorInput = document.createElement('input');
        fillColorInput.type = 'color';
        fillColorInput.className = 'co-color-btn';
        fillColorInput.value = _settings.fillColor;
        fillColorInput.addEventListener('input', () => {
          _settings.fillColor = fillColorInput.value;
          saveSettings();
          wmeSDK.Map.redrawLayer({ layerName: layerid });
        });
        styleCard.appendChild(makeRow('Fill Color', fillColorInput));

        styleCard.appendChild(makeSliderRow('Stroke Opacity', 'strokeOpacity', _settings.strokeOpacity));
        styleCard.appendChild(makeSliderRow('Fill Opacity', 'fillOpacity', _settings.fillOpacity));

        tabPane.appendChild(styleCard);

        // Label Style card
        const labelCard = document.createElement('div');
        labelCard.className = 'co-card';
        const labelCardTitle = document.createElement('div');
        labelCardTitle.className = 'co-card-title';
        labelCardTitle.textContent = 'Label Style';
        labelCard.appendChild(labelCardTitle);

        /**
         * Creates a label-style color row with a colour picker and a sync toggle that, when
         * enabled, locks the colour to match the current stroke colour.
         *
         * @param {string} labelText - Display label for the row.
         * @param {string} colorSetting - The `_settings` key for the colour value.
         * @param {string} syncSetting - The `_settings` key for the sync-to-stroke boolean.
         * @returns {{ row: HTMLDivElement, colorInput: HTMLInputElement, syncToggle: HTMLLabelElement }}
         */
        function makeColorSyncRow(labelText, colorSetting, syncSetting) {
          const row = document.createElement('div');
          row.className = 'co-row';

          const lbl = document.createElement('span');
          lbl.className = 'co-label';
          lbl.textContent = labelText;

          const colorInput = document.createElement('input');
          colorInput.type = 'color';
          colorInput.className = 'co-color-btn';
          // Show stroke color in the picker when sync is already on
          colorInput.value = _settings[syncSetting] ? _settings.strokeColor : _settings[colorSetting];
          colorInput.disabled = _settings[syncSetting];

          const syncToggle = makeToggle(_settings[syncSetting], (checked) => {
            _settings[syncSetting] = checked;
            colorInput.disabled = checked;
            if (checked) colorInput.value = _settings.strokeColor; // reflect current stroke color
            saveSettings();
            wmeSDK.Map.redrawLayer({ layerName: labelsLayerId });
          });

          const syncLabel = document.createElement('span');
          syncLabel.className = 'co-toggle-text';
          syncLabel.textContent = 'Stroke';

          colorInput.addEventListener('input', () => {
            _settings[colorSetting] = colorInput.value;
            saveSettings();
            wmeSDK.Map.redrawLayer({ layerName: labelsLayerId });
          });

          row.appendChild(lbl);
          row.appendChild(colorInput);
          row.appendChild(syncToggle);
          row.appendChild(syncLabel);
          return { row, colorInput, syncToggle };
        }

        const { row: labelColorRow, colorInput: labelColorInput, syncToggle: labelColorSyncToggle } = makeColorSyncRow('Label Color', 'labelColor', 'labelColorMatchStroke');
        labelCard.appendChild(labelColorRow);
        const { row: outlineColorRow, colorInput: outlineColorInput, syncToggle: outlineColorSyncToggle } = makeColorSyncRow('Outline Color', 'labelOutlineColor', 'labelOutlineColorMatchStroke');
        labelCard.appendChild(outlineColorRow);

        /**
         * Creates a numeric input row with a constrained number field and an "auto" toggle
         * that, when enabled, disables the manual input and uses a zoom-relative formula
         * instead.
         *
         * @param {string} labelText - Display label for the row.
         * @param {string} numSetting - The `_settings` key for the numeric value.
         * @param {string} autoSetting - The `_settings` key for the auto/relative boolean.
         * @param {number} min - Minimum allowed value for the number input.
         * @param {number} max - Maximum allowed value for the number input.
         * @param {number} step - Step increment for the number input.
         * @param {string} autoText - Label text shown next to the auto toggle (e.g. "Auto").
         * @returns {{ row: HTMLDivElement, numInput: HTMLInputElement, autoToggle: HTMLLabelElement }}
         */
        function makeNumberAutoRow(labelText, numSetting, autoSetting, min, max, step, autoText) {
          const row = document.createElement('div');
          row.className = 'co-row';

          const lbl = document.createElement('span');
          lbl.className = 'co-label';
          lbl.textContent = labelText;

          const numInput = document.createElement('input');
          numInput.type = 'number';
          numInput.className = 'co-number-input';
          numInput.min = min;
          numInput.max = max;
          numInput.step = step;
          numInput.value = _settings[numSetting];
          numInput.disabled = _settings[autoSetting];

          const autoToggle = makeToggle(_settings[autoSetting], (checked) => {
            _settings[autoSetting] = checked;
            numInput.disabled = checked;
            saveSettings();
            wmeSDK.Map.redrawLayer({ layerName: labelsLayerId });
          });

          const autoLabel = document.createElement('span');
          autoLabel.className = 'co-toggle-text';
          autoLabel.textContent = autoText;

          numInput.addEventListener('change', () => {
            _settings[numSetting] = parseFloat(numInput.value);
            saveSettings();
            wmeSDK.Map.redrawLayer({ layerName: labelsLayerId });
          });

          row.appendChild(lbl);
          row.appendChild(numInput);
          row.appendChild(autoToggle);
          row.appendChild(autoLabel);
          return { row, numInput, autoToggle };
        }

        const { row: fontSizeRow, numInput: fontSizeNumInput, autoToggle: fontSizeAutoToggle } = makeNumberAutoRow('Font Size (px)', 'labelFontSize', 'labelFontSizeRelative', 6, 32, 1, 'Auto');
        labelCard.appendChild(fontSizeRow);
        const {
          row: outlineWidthRow,
          numInput: outlineWidthNumInput,
          autoToggle: outlineWidthAutoToggle,
        } = makeNumberAutoRow('Outline Width', 'labelOutlineWidth', 'labelOutlineWidthRelative', 1, 10, 1, 'Auto');
        labelCard.appendChild(outlineWidthRow);

        tabPane.appendChild(labelCard);

        // Quick Preset definitions — every key fully specified for consistent, predictable results
        const PRESETS = {
          // Factory defaults
          default: {
            strokeColor: _defaultStrokeColor,
            fillColor: _defaultFillColor,
            strokeOpacity: _defaultStrokeOpacity,
            fillOpacity: _defaultFillOpacity,
            labelColor: _defaultLabelColor,
            labelColorMatchStroke: false,
            labelOutlineColor: _defaultLabelOutlineColor,
            labelOutlineColorMatchStroke: false,
            labelFontSize: _defaultLabelFontSize,
            labelFontSizeRelative: true,
            labelOutlineWidth: _defaultLabelOutlineWidth,
            labelOutlineWidthRelative: true,
            highlightColor: _defaultHighlightColor,
          },
          // Matches USGB Counties — bright yellow, high opacity
          // Highlight is orange-red so it stands out against yellow polygons
          'high-contrast': {
            strokeColor: '#ffff00',
            fillColor: '#ffff00',
            strokeOpacity: 0.9,
            fillOpacity: 0.1,
            labelColor: '#ffff00',
            labelColorMatchStroke: true,
            labelOutlineColor: _defaultLabelOutlineColor,
            labelOutlineColorMatchStroke: false,
            labelFontSize: _defaultLabelFontSize,
            labelFontSizeRelative: true,
            labelOutlineWidth: _defaultLabelOutlineWidth,
            labelOutlineWidthRelative: true,
            highlightColor: '#FF4500',
          },
          // Matches USGB Counties — reduced opacity, muted gray
          minimal: {
            strokeColor: '#AAAAAA',
            fillColor: '#AAAAAA',
            strokeOpacity: 0.3,
            fillOpacity: 0.1,
            labelColor: _defaultLabelColor,
            labelColorMatchStroke: false,
            labelOutlineColor: _defaultLabelOutlineColor,
            labelOutlineColorMatchStroke: false,
            labelFontSize: _defaultLabelFontSize,
            labelFontSizeRelative: true,
            labelOutlineWidth: _defaultLabelOutlineWidth,
            labelOutlineWidthRelative: true,
            highlightColor: _defaultHighlightColor,
          },
          // Matches USGB Counties — IBM colorblind-safe amber
          // Highlight is pink (also IBM colorblind-safe, contrasts with amber)
          colorblind: {
            strokeColor: '#DE8F05',
            fillColor: '#DE8F05',
            strokeOpacity: _defaultStrokeOpacity,
            fillOpacity: 0.15,
            labelColor: '#DE8F05',
            labelColorMatchStroke: true,
            labelOutlineColor: _defaultLabelOutlineColor,
            labelOutlineColorMatchStroke: false,
            labelFontSize: _defaultLabelFontSize,
            labelFontSizeRelative: true,
            labelOutlineWidth: _defaultLabelOutlineWidth,
            labelOutlineWidthRelative: true,
            highlightColor: '#CC78BC',
          },
          // Matches USGB Counties — deep indigo, reduced opacity
          // White labels with black outline stay readable on dark maps
          night: {
            strokeColor: '#4B0082',
            fillColor: '#4B0082',
            strokeOpacity: 0.7,
            fillOpacity: 0.15,
            labelColor: '#4B0082',
            labelColorMatchStroke: true,
            labelOutlineColor: '#d1d1d1',
            labelOutlineColorMatchStroke: false,
            labelFontSize: _defaultLabelFontSize,
            labelFontSizeRelative: true,
            labelOutlineWidth: _defaultLabelOutlineWidth,
            labelOutlineWidthRelative: true,
            highlightColor: _defaultHighlightColor,
          },
        };

        /**
         * Applies a Quick Preset by merging it into `_settings`, persisting the result, and
         * updating every DOM control in the panel to reflect the new values. Both the polygon
         * and label layers are redrawn immediately.
         *
         * @param {Object} p - A fully-specified preset object containing all style keys.
         */
        function applyPreset(p) {
          Object.assign(_settings, p);
          saveSettings();
          // Polygon style
          strokeColorInput.value = _settings.strokeColor;
          fillColorInput.value = _settings.fillColor;
          const sliders = styleCard.querySelectorAll('.co-slider');
          sliders[0].value = _settings.strokeOpacity;
          sliders[1].value = _settings.fillOpacity;
          sliders.forEach((s) => updateSlider(s));
          // Label color
          labelColorInput.value = _settings.labelColorMatchStroke ? _settings.strokeColor : _settings.labelColor;
          labelColorInput.disabled = _settings.labelColorMatchStroke;
          labelColorSyncToggle.querySelector('input').checked = _settings.labelColorMatchStroke;
          // Outline color
          outlineColorInput.value = _settings.labelOutlineColorMatchStroke ? _settings.strokeColor : _settings.labelOutlineColor;
          outlineColorInput.disabled = _settings.labelOutlineColorMatchStroke;
          outlineColorSyncToggle.querySelector('input').checked = _settings.labelOutlineColorMatchStroke;
          // Font size
          fontSizeNumInput.value = _settings.labelFontSize;
          fontSizeNumInput.disabled = _settings.labelFontSizeRelative;
          fontSizeAutoToggle.querySelector('input').checked = _settings.labelFontSizeRelative;
          // Outline width
          outlineWidthNumInput.value = _settings.labelOutlineWidth;
          outlineWidthNumInput.disabled = _settings.labelOutlineWidthRelative;
          outlineWidthAutoToggle.querySelector('input').checked = _settings.labelOutlineWidthRelative;
          // Redraw both layers
          wmeSDK.Map.redrawLayer({ layerName: layerid });
          wmeSDK.Map.redrawLayer({ layerName: labelsLayerId });
        }

        presetsDiv.querySelectorAll('.co-preset-chip').forEach((chip) => {
          chip.addEventListener('click', () => {
            const preset = PRESETS[chip.dataset.preset];
            if (preset) applyPreset(preset);
          });
        });

        // Database card
        const dbCard = document.createElement('div');
        dbCard.className = 'co-card';
        const dbTitle = document.createElement('div');
        dbTitle.className = 'co-card-title';
        dbTitle.textContent = 'Database';
        dbCard.appendChild(dbTitle);

        dbCard.appendChild(
          makeRow(
            'Auto-update on load',
            makeToggle(_settings.AutoUpdateKMLs, (checked) => {
              _settings.AutoUpdateKMLs = checked;
              saveSettings();
            }),
          ),
        );

        const updateBtn = document.createElement('button');
        updateBtn.className = 'co-btn';
        updateBtn.textContent = 'Refresh / Update Database';
        updateBtn.addEventListener('click', updateAllMaps);
        dbCard.appendChild(updateBtn);

        const statusDiv = document.createElement('div');
        statusDiv.id = 'WMECOupdateStatus';
        statusDiv.className = 'co-status';
        dbCard.appendChild(statusDiv);

        tabPane.appendChild(dbCard);
      })
      .catch((error) => {
        console.error(`${scriptName}: Error registering the script tab:`, error);
      });
  }

  /**
   * Handles the `wme-map-move-end` event. Triggers a city layer refresh whenever the
   * layer is currently visible.
   */
  function onMapMove() {
    if (_settings.layerVisible) {
      updateCitiesLayer();
    }
  }

  /**
   * Sets the layer visibility to `value`, syncing the map layers, the layer-switcher
   * checkbox, and the sidebar power button color. Triggers a city refresh on show,
   * or removes the district name label on hide. Persists the new visibility state.
   */
  function setLayerVisible(value) {
    _settings.layerVisible = value;

    wmeSDK.Map.setLayerVisibility({ layerName: layerid, visibility: value });
    wmeSDK.Map.setLayerVisibility({ layerName: labelsLayerId, visibility: value });
    wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: 'Cities Overlay', isChecked: value });
    $('span#cities-overlay-power-btn').css({ color: value ? '#00bd00' : '#ccc' });

    if (value) {
      updateCitiesLayer();
    } else {
      $('.wmecitiesoverlay-region').remove();
    }
    saveSettings();
  }

  /**
   * Handles the `wme-layer-checkbox-toggled` event fired by the WME layer switcher.
   * Delegates to setLayerVisible using the checkbox's authoritative checked state.
   */
  function layerToggled(args) {
    setLayerVisible(args.checked);
  }

  /**
   * Function: updateCityPolygons
   * ----------------------------
   * Asynchronously loads and updates city polygons for the top state on the map,
   * utilizing local storage and caching strategies to optimize data retrieval.
   *
   * Steps:
   * 1. Retrieve the current top state and check if it differs from `currState`.
   *    If so, proceed to load new city polygon data.
   * 2. Clear existing features from the map layer to prepare for new data.
   * 3. Determine the state abbreviation based on the country's abbreviation.
   * 4. Check local storage for cached KML data; if absent, fetch from a remote
   *    GitHub repository and cache it locally.
   * 5. Use the KML data to update the map layer's polygons with `updatePolygons`.
   * 6. Log the loading time and redraw the map layer to reflect updates.
   *
   * Note:
   * - Utilizes caching (`kmlCache`) and persistent storage (`idbKeyval`) for data
   *   efficiency across function executions.
   * - Displays console logs and timers to assist with monitoring load times and debugging.
   *
   * Globals:
   * - `scriptName`: Name used for logging.
   * - `_kml`: KML data used for polygon updates.
   * - `currState`: Tracks the currently processed state name.
   * - `layerid`: Identifier for the target map layer.
   * - `repoOwner`: GitHub repository owner used for remote KML extraction.
   * - `debug`: Flag to enable detailed logging for troubleshooting.
   * - `_US_States` and `_MX_States`: Modules for state abbreviation lookup.
   * - `kmlCache`: Object to store loaded KML data for future use.
   */
  async function updateCityPolygons() {
    const topState = wmeSDK.DataModel.States.getTopState();

    if (!topState) {
      if (debug) console.warn(`${scriptName}: topState is null. Exiting update.`);
      return;
    }

    if (currState !== topState.name) {
      const topCountry = wmeSDK.DataModel.Countries.getTopCountry();

      if (!topCountry) {
        if (debug) console.warn(`${scriptName}: topCountry is null. Exiting update.`);
        return;
      }

      // Start loading indicator
      console.log(`${scriptName}: Loading City Polygons for ${topState.name}`);
      console.time(`${scriptName}: Loaded City Polygons for ${topState.name} in`);

      // Clear all features from layer before loading new data
      wmeSDK.Map.removeAllFeaturesFromLayer({ layerName: layerid });
      currState = topState.name;

      let countryAbbr = topCountry.abbr;
      let stateAbbr;

      if (countryAbbr === 'US') stateAbbr = _US_States.getAbbreviation(currState);
      else if (countryAbbr === 'MX') stateAbbr = _MX_States.getAbbreviation(currState);
      else if (countryAbbr === 'CA') stateAbbr = _CA_States.getAbbreviation(currState);

      if (typeof stateAbbr !== 'undefined') {
        if (typeof kmlCache[stateAbbr] === 'undefined') {
          // Try to retrieve state info from local storage
          var request = await idbKeyval.get(`${countryAbbr}_states_cities`, stateAbbr);

          if (!request) {
            // Fetch from GitHub if not found locally
            let kmlURL = `https://raw.githubusercontent.com/${repoOwner}/WME-Cities-Overlay/master/KMLs/${countryAbbr}/${stateAbbr}_Cities.kml`;

            if (debug) console.log(`${scriptName}: KML URL`, kmlURL);

            let kml = await fetch(kmlURL);
            _kml = kml;
            updatePolygons();

            await idbKeyval.set(`${countryAbbr}_states_cities`, {
              kml: kml,
              state: stateAbbr,
              kmlsize: 0,
            });

            kmlCache[stateAbbr] = _kml; // Cache KML data locally
          } else {
            _kml = request.kml;
            kmlCache[stateAbbr] = _kml; // Cache locally if already fetched
            updatePolygons();
          }
        } else {
          _kml = kmlCache[stateAbbr];
          updatePolygons();
        }
      }

      // End loading indicator
      console.timeEnd(`${scriptName}: Loaded City Polygons for ${topState.name} in`);
    }
  }

  /**
   * Function: updatePolygons
   * -------------------------
   * This function updates the map layer with GeoJSON features derived from a KML string,
   * replacing existing features and handling potential errors during feature addition.
   *
   * Steps:
   * 1. Convert the KML string into GeoJSON features and store them in the `_layer` variable.
   * 2. Remove all current features from the specified layer using `wmeSDK.Map`.
   * 3. Map these features with unique IDs based on their index to prepare them for loading.
   * 4. Attempt to add each feature to the target layer while tracking successes and errors.
   * 5. Populate the global `_layer` variable with successfully loaded features.
   * 6. Log the number of successfully added and skipped features and display loaded layers.
   *
   * Error Handling:
   * - Catch and log errors occurring during the feature removal and addition process.
   * - Differentiate between `InvalidStateError` for missing layers and `ValidationError`
   *   for issues with feature data, providing specific details for troubleshooting.
   *
   * Globals:
   * - `scriptName`: Name used for logging.
   * - `_kml`: The KML string serving as the data source.
   * - `_layer`: Global state to track currently loaded features.
   * - `layerid`: Identifier for the target layer.
   * - `debug`: Flag to enable detailed logging for troubleshooting.
   */
  function updatePolygons() {
    // Retrieve GeoJSON features from the KML string; conversion handled inside GetFeaturesFromKMLString
    const rawFeatures = GetFeaturesFromKMLString(_kml);

    // Build polygon features with stable IDs, type marker, and pre-computed bbox
    _layer = rawFeatures.map((f, index) => ({
      type: f.type,
      id: `${layerid}_${index}`,
      geometry: f.geometry,
      properties: { ...f.properties, type: 'city', _bbox: turf.bbox(f) },
    }));

    if (debug) console.log(`${scriptName}: Current State is ${currState}`);
    console.log(`${scriptName}: ${_layer.length} Towns loaded`);
    if (debug) console.log(`${scriptName}: Layers Loaded are:`, _layer);

    // Add all polygon features once; labels are handled separately
    addPolygonsToLayer();
    refreshLabels();
  }
})();
