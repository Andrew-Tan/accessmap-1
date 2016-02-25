// Leaflet (upon which mapbox.js is based) forces a global window.L
// variable, leading to all kinds of problems for modular development.
// As a result, none of the modules on npm work due to clobbering L.

import requestSidewalksUpdate from './layers/sidewalks';
import requestStopsUpdate from './layers/busdata';
import requestCurbsUpdate from './layers/curbramps';
import $ from 'jquery';
import 'leaflet.locatecontrol';
import '!style!css!leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import L from 'mapbox.js';
import 'mapbox.js/theme/images/icons-ffffff@2x.png';
import '!style!css!mapbox.js/theme/style.css';
// Permits disabled until data.seattle.gov data source is restored
// import { requestPermitsUpdate } from './layers/permits';


function App(api_url) {
  'use strict';
  let api = api_url.replace(/\/?$/, '/') + 'v1';
  let mapinfo = $.ajax({
      url: api + '/mapinfo',
      dataType: 'json'
  });

  mapinfo.done(function(mapdata) {
    let FEATUREZOOM = 17;
    L.mapbox.accessToken = mapdata.token;
    let map = L.mapbox.map('map', 'mapbox.streets', {
      zoomControl: false,
      attribution: 'Map data &copy',
      maxZoom: 18
    });

    let elevationTiles = L.mapbox.tileLayer(mapdata.tiles);
    elevationTiles.addTo(map);

    let stops = L.featureGroup({minZoom: 8});
    let elevationlayer = L.featureGroup({minZoom: 8});
    let curbs = L.featureGroup({minZoom: 8});
    let userData = L.featureGroup({minZoom: 8});
    let elevators = L.featureGroup({minZoom: 8});
//    let permits = L.featureGroup({minZoom: 8});

    //Create filter checkboxes for the overlays
    let overlayMaps = {
      "Bus Stops": stops,
      "Curb Ramps": curbs,
      "User Reported Data":userData,
      "Elevators":elevators,
      "Elevation Change": elevationlayer
//      "Sidewalk Closure Permits": permits
    };

    // Read in data to increase speed later on (generate a promise)

    let updateLayers = function() {
      requestStopsUpdate(stops, map);
      requestSidewalksUpdate(elevationlayer, map, api);
      requestCurbsUpdate(curbs, map, api);
//      requestPermitsUpdate(permits, map, api);
    };

    map.on('load', function(e) {
      updateLayers();
      map.setView([47.609700, -122.324638], FEATUREZOOM);
    });

    map.on('moveend', function(e) {
      if (map.getZoom() >= FEATUREZOOM) {
        updateLayers();
      }
    });

    map.on('zoomend', function() {
      if (map.getZoom() < FEATUREZOOM) {
        map.removeLayer(stops);
        map.removeLayer(elevationlayer);
        map.removeLayer(curbs);
//        map.removeLayer(permits);
        elevationTiles.addTo(map);
      } else {
        stops.addTo(map);
        elevationlayer.addTo(map);
        curbs.addTo(map);
//        permits.addTo(map);
        map.removeLayer(elevationTiles);
      }
    });

    map.on('contextmenu', function(e) {
      let popup = confirm("Do you want to report a new obstacle?");
      if (popup === true) {
          window.location.href = 'report?lat=' + e.latlng.lat + '&lon=' + e.latlng.lng;
      }
    });

    map.setView([47.652810, -122.308690], FEATUREZOOM);

    // Add geocoder
    map.addControl(L.mapbox.geocoderControl('mapbox.places'));
    // Add zoom buttons
    new L.Control.Zoom().addTo(map);

    L.control.layers(null, overlayMaps).addTo(map);
  });
}

export default App;