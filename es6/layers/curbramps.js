export function requestCurbsUpdate(layerGroup, map, api_url) {
  function drawCurbs(data) {
    layerGroup.clearLayers();
    var bounds = map.getBounds();

    function make_circle(feature, latlon) {
      let coords = feature.geometry.coordinates;
      return L.circleMarker(latlon, {
        'radius': 3,
        'color': '#0000FF'
      });
    }

    for (let i = 0; i < data.features.length; i++) {
      var feature = data.features[i];
      var coord = feature.geometry.coordinates;
      var latlng = [coord[1], coord[0]];
      if (bounds.contains(latlng)) {
        let point = L.geoJson(feature, {pointToLayer: make_circle});

        //Display info when user clicks on the curb marker
        var popup = L.popup().setContent("<b>Curb Ramp</b>");
        point.bindPopup(popup);

        layerGroup.addLayer(point);
      }
    }
  }

let bounds = map.getBounds().toBBoxString();
// Request data
$.ajax({
  type: 'GET',
  url: api_url + '/v1/curbramps.geojson',
  data: {
    bbox: bounds
  },
  dataType: 'json',
  success: function(data) {
    drawCurbs(data);
  }
});
}
