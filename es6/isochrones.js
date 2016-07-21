// Leaflet (upon which mapbox.js is based) forces a global window.L
// variable, leading to all kinds of problems for modular development.
// As a result, none of the modules on npm work due to clobbering L.

import mapboxgl from 'mapbox-gl';
import '!style!css!mapbox-gl/dist/mapbox-gl.css';
import Geocoder from 'mapbox-gl-geocoder';
import '!style!css!mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import * as chroma from 'chroma-js';
import $ from 'jquery';
import debounce from 'debounce';
import * as isolines from 'turf-isolines';
import * as buffer from 'turf-buffer';


function App(mapbox_token) {
  // AccessMap uses a versioned API - which one are we using?
  const api = '/api/v2';

  const start = [-122.333170, 47.606707];

  // -- Styling --
  // Sidewalk color scale
  let colorScale = chroma.scale(['#3E60BD', '#FD4C51'])
                    .correctLightness();

  // Line widths
  const lineWidth = 2;
  const shadowScale = 1.3;

  // Map initialization
  mapboxgl.accessToken = mapbox_token;

  let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    center: start,
    zoom: 15
  });

  let origin = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: start
      }
    }]
  }

  map.on('load', function() {
    let isochroneData = {
      type: 'FeatureCollection',
      features: []
    };

    map.addSource('isochrones', {
      type: 'geojson',
      data: isochroneData
    });
    map.addLayer({
      id: 'isochrones',
      type: 'fill',
      source: 'isochrones',
      paint: {
        'fill-opacity': 0.7,
        'fill-color': {
          property: 'cost',
          stops: [
            [0, '#0f0'],
            [5000, '#ff0'],
            [10000, '#f00']
          ]
        }
      }
    });

    // Place a marker at the current location
    map.addSource('origin', {
      type: 'geojson',
      data: origin
    });
    map.addLayer({
      id: 'origin-outline',
      type: 'circle',
      source: 'origin',
      paint: {
        'circle-radius': 12,
        'circle-color': '#fff'
      }
    });
    map.addLayer({
      id: 'origin',
      type: 'circle',
      source: 'origin',
      paint: {
        'circle-radius': 10,
        'circle-color': '#39f'
      }
    });

    function drawIsochrone(point) {
      // Draw isochrone data (in an appealing way) given a GeoJSON input point
      let lat = point.features[0].geometry.coordinates[1];
      let lon = point.features[0].geometry.coordinates[0];
      $.get('/api/v2/travelcost.json?lat=' + lat + '&lon=' + lon)
        .done(function(data) {
          let breaks = [0, 2000, 4000, 6000, 8000];
          console.log(data);
          let lines = isolines.default(data, 'cost', 50, breaks);
          console.log(lines);
          let buffered = buffer.default(lines, 1, 'meters');
          console.log(buffered);
          for (let i = 0; i < lines.features.length; i++) {
            let cost = lines.features[i].properties.cost;
            buffered.features[i].properties.cost = cost;
          }
          // let tinned = turf.tin(data, 'cost');
          // for (let i = 0; i < tinned.features.length; i++) {
          //   let p = tinned.features[i].properties;
          //   let z = (p.a + p.b + p.c) / 3;
          //   console.log(z);
          //   tinned.features[i].properties.z = z;
          // }
          map.getSource('isochrones').setData(buffered);
        });
    }

    // Do an initial drawing of the isochrone
    drawIsochrone(origin);

    // Make the origin point draggable (surprising amount of code!)
    let isCursorOverPoint = false;
    let isDragging = false;
    let canvas = map.getCanvasContainer();
    // Routing mouse move behavior
    function onMouseMove(e) {
      let features = map.queryRenderedFeatures(e.point, {
        layers: ['origin-outline']
      });
      if (features.length) {
        canvas.style.cursor = 'move';
        isCursorOverPoint = true;
        map.dragPan.disable();
      } else {
        canvas.style.cursor = '';
        isCursorOverPoint = false;
        map.dragPan.enable();
      }
    }
    map.on('mousemove', debounce(onMouseMove, 200));
    map.on('mousedown', function(e) {
      if (!isCursorOverPoint) return;

      isDragging = true;
      canvas.style.cursor = 'grab';

      map.on('mousemove', function(e) {
        if (!isDragging) return;

        let coords = e.lngLat;
        canvas.style.cursor = 'grabbing';

        origin.features[0].geometry.coordinates = [coords.lng, coords.lat];
        map.getSource('origin').setData(origin);
      });
      map.on('mouseup', function(e) {
        if (!isDragging) return;

        // Recalculate the isochrones
        drawIsochrone(origin);

        canvas.style.cursor = '';
        isDragging = false;
      });
    });

  });

  // Map controls
  map.addControl(new Geocoder());
  map.addControl(new mapboxgl.Navigation({position: 'top-left'}));
}

module.exports = App;