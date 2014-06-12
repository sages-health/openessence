'use strict';

var angular = require('angular');
var d3 = require('d3');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('leafletMap', function (gettextCatalog, outpatientAggregation, visualization, OutpatientVisit, Geometry) {

  return {
    restrict: 'E',
    scope: {
      options: '=?',
      queryString: '=',
      filters: '=',
      data: '='
    },
    link: function postLink (scope, element) {

      //var baseMapURL = 'http://otile4.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png'
      var baseMapURL = 'http://ttiles0{s}.mqcdn.com/tiles/1.0.0/vy/map/{z}/{x}/{y}.png';

      //country styling
      scope.countryStyle = function (feature) {
        return {
          fillColor: '#eeeeee',
          weight: 1,
          opacity: 1,
          color: 'white',
          dashArray: '1',
          fillOpacity: 0.7
        };
      };

      scope.getCountColor = function (feature) {
        if (scope.data) {
          var d = scope.data.filter(function (v) {
            if (v.colName === feature.properties.nameoe.toLowerCase()) {
              return true;
            }
          });
          if (d.length > 0) {
            d = d[0].value;

            return d > 100 ? '#800026' :
                   d > 75 ? '#BD0026' :
                   d > 50 ? '#E31A1C' :
                   d > 20 ? '#FC4E2A' :
                   d > 10 ? '#FD8D3C' :
                   d > 5 ? '#FEB24C' :
                   d > 2 ? '#FED976' :
                   '#FFEDA0';
          }
          return '#FFEDA0';
        }
        return '#FFEDA0';
      };

      scope.highlightFeature = function (e) {
        var layer = e.target;

        scope.layer.setStyle({
          weight: 5,
          color: '#666',
          dashArray: '',
          fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera) {
          scope.layer.bringToFront();
        }
      };

      scope.resetHighlight = function (e) {
        var layer = e.target;

        scope.layer.setStyle({
          weight: 1,
          dashArray: '1',
          color: 'white',
          fillOpacity: 0.7
        });
        if (!L.Browser.ie && !L.Browser.opera) {
          scope.layer.bringToBack();
        }
      };

      scope.zoomToFeature = function (e) {
        scope.map.fitBounds(e.target.getBounds());
      };

      scope.onEachFeature = function (feature, layer) {
        layer.on({
          mouseover: scope.highlightFeature,
          mouseout: scope.resetHighlight,
          click: scope.zoomToFeature
        });
      };

      scope.districtStyle = function (feature) {
        return {
          fillColor: scope.getCountColor(feature),
          weight: 1,
          opacity: 1,
          color: 'white',
          dashArray: '1',
          fillOpacity: 0.7
        };
      };

      scope.updateData = function () {
        if (scope.layer) {
          //forces style refresh
          scope.layer.setStyle(scope.districtStyle);
        }
        if (scope.layerControl) {
          scope.layerControl._update();
        }
        // scope.map.fitBounds(scope.layer.getBounds());
      };

      //separating out the polygon request
      scope.getLayerPolys = function () {
        Geometry.search({
        }, function (data) {
          var json = data.results[0]._source;
          //map.removeLayer(layer); //?
          var layer = L.geoJson(json, {
            style: scope.districtStyle,
            onEachFeature: scope.onEachFeature
          });//.addTo(scope.map);


          var base = L.tileLayer(baseMapURL, {
            subdomains: '1234',
            attribution: '&copy;&nbsp;Mapquest'
          });

          scope.layer = layer;
          scope.map = new L.map('leafletMap', {
            center: new L.LatLng(37.7289788,-84.2634425),
            zoom: 7,
            layers: [base,layer]
          });
          L.control.scale().addTo(scope.map);
          scope.layerControl = L.control.layers({},{"Base":base, "Data":layer}).addTo(scope.map);
          // scope.map.fitBounds(layer.getBounds());
        });
      };

      scope.getLayerPolys();

      var reload = function () {
        if (scope.map) {

          scope.updateData();
          scope.map._onResize();
          scope.map.invalidateSize(false);
        }
      };

      scope.$watchCollection('[data, queryString]', function () {
        reload();
      });
    }
  };
});
