'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var L = require('leaflet');

angular.module(directives.name).directive('leafletMap', /*@ngInject*/ function ($q, DistrictResource, OutpatientVisitResource,
  $timeout, $rootScope, debounce, $http, mapUrl, mapLatitude, mapLongitude) {

  return {
    restrict: 'E',
    scope: {
      options: '=?',
      queryString: '=',
      filters: '='
    },
    link: function postLink(scope, element) {

      var baseMapURL = mapUrl;
      // if they ever shut down the HTTPs version, here's the HTTP url:
      //var baseMapURL = 'http://ttiles0{s}.mqcdn.com/tiles/1.0.0/vy/map/{z}/{x}/{y}.png';

      function getColor(d) {
        return d > 100 ? '#800026' :
          d > 75 ? '#BD0026' :
            d > 50 ? '#E31A1C' :
              d > 20 ? '#FC4E2A' :
                d > 10 ? '#FD8D3C' :
                  d > 5 ? '#FEB24C' :
                    d > 0 ? '#FED976' :
                      '#C0C0C0';
      }

      var getOverlayStyle = function (count) {
        var style = {
          weight: 1,
          opacity: 1,
          color: 'white',
          dashArray: '1',
          fillOpacity: 0.7,
          fillColor: '#C0C0C0'
        };



        if (arguments.length !== 0) {
          // TODO dynamic quartiles, maybe using d3's palette?
          style.fillColor = getColor(count);
        }

        return style;
      };



      var baseLayer = L.tileLayer(baseMapURL, {
        attribution: '&#169; OpenMapTiles &#169; OpenStreetMap contributors'
      });

      // don't wait for data to build map and fetch base layer tiles
      var map = L.map(element.children()[0], {
        center: new L.LatLng(mapLatitude,mapLongitude),
        zoom: 6
      });

      var info = L.control();

      info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();

        return this._div;
      };

      baseLayer.addTo(map);

      // method that we will use to update the control based on feature properties passed
      info.update = function (props) {
        this._div.innerHTML = '<h4>Total Case Count by Region</h4>' + (props ?
          '<b>' + props.oeName + '</b><br />' + (props.oeCount !== undefined ? props.oeCount : 0) + ''
          : 'Hover over a region');
      };

      info.addTo(map);

      var legend = L.control({ position: 'bottomright' });

      legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
          grades = [1, 5, 10, 20, 50, 75, 100],
          labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
          div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
        }

        return div;
      };

      legend.addTo(map);

      //separating out the polygon request
      var getLayerPolys = function () {
        var deferred = $q.defer();

        // TODO don't assume district, let caller specify what geometries to use
        DistrictResource.get({
          size: 9999
        }, function (response) {
          var layers = {}; // map of District name -> layer

          var polygons = response.results.reduce(function (previous, current) {
            var geometry = current._source.geometry;
            var layer;
            
            if (geometry) {
              if (geometry.type === 'polygon') {
                var coordinates = geometry.coordinates[0].map(function (lonlat) {
                  // GeoJSON uses LonLat instead of LatLon
                  return L.latLng(lonlat[1], lonlat[0]);
                });
                layer = L.polygon(coordinates, getOverlayStyle());
                layer.oeName = current._source.name;
              }
              else if (geometry.type === 'multipolygon') {
                var coordinates = []

                for (var i in geometry.coordinates) {
                  var newCoords = geometry.coordinates[i].map(function (lonlatarray) {
                    var subArray = lonlatarray.map(function (lonlat) {
                      return L.latLng(lonlat[1], lonlat[0]);
                    });
                    return subArray;
                  });
                  coordinates.push(newCoords);
                }

                layer = L.polygon(coordinates, getOverlayStyle());
                layer.oeName = current._source.name;
              }

              // inspired by http://leafletjs.com/examples/choropleth.html
              layer.on('click', function (e) {
                // TODO this leaves the map with a lot of 0 count districts that should be unshaded
                //map.fitBounds(e.target.getBounds());
                var filter = {
                  filterID: 'medicalFacility',
                  value: layer.oeName
                };
                $rootScope.$emit('filterChange', filter, true, true);

              });
              layer.on('mouseover', function (e) {
                var layer = e.target;

                layer.setStyle({
                  weight: 5,
                  color: '#666',
                  dashArray: '',
                  fillOpacity: 0.7
                });

                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                  layer.bringToFront();
                }

                info.update(layer);
              });
              layer.on('mouseout', function (e) {
                var layer = e.target;

                layer.setStyle({
                  weight: 1,
                  dashArray: '1',
                  color: 'white',
                  fillOpacity: 0.7
                });
                if (!L.Browser.ie && !L.Browser.opera) {
                  layer.bringToBack();
                }
                info.update();
              });

              layers[current._source.name] = layer;

              previous.push(layer);
            }

            return previous;
          }, []);

          var overlay = L.featureGroup(polygons);
          overlay.addTo(map);

          deferred.resolve(layers);
        }, function (response) {
          deferred.reject(response);
        });

        return deferred.promise;
      };

      var polys = getLayerPolys();

      scope.$watch('queryString', function (queryString) {
        OutpatientVisitResource.search({
          q: queryString,
          aggregations: {
            district: {
              terms: {
                field: 'medicalFacility.region.raw',
                size: 0 // don't cap number of buckets
              }
            }
          }
        }, function (response) {
          polys.then(function (districts) {
            // reset styles
            angular.forEach(districts, function (district) {
              district.setStyle(getOverlayStyle(0));
            });
            // re-apply styles for query results
            response.aggregations.district.buckets.forEach(function (bucket) {
              /*jshint camelcase:false */
              var district = districts[bucket.key];
              if (district) { // not all districts have geometries
                district.setStyle(getOverlayStyle(bucket.doc_count));
                district.oeCount = bucket.doc_count;
              }
            });
          });
        });
      });

      scope.$watch('options.width', function () {
        map.invalidateSize();
      });

      scope.$watch('options.height', debounce(function () {
        element.find('.map').css({
          height: scope.options.height + 6
        });
        map.invalidateSize();
      }, 50));
    }
  };
});