'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var L = require('leaflet');

angular.module(directives.name).directive('leafletMap', /*@ngInject*/ function ($q, DistrictResource, OutpatientVisitResource,
                                                                  $timeout, $rootScope, debounce) {

  return {
    restrict: 'E',
    scope: {
      options: '=?',
      queryString: '=',
      filters: '=',
      data: '='
    },
    link: function postLink (scope, element) {

      var baseMapURL = 'https://otile{s}-s.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png';
      // if they ever shut down the HTTPs version, here's the HTTP url:
      //var baseMapURL = 'http://ttiles0{s}.mqcdn.com/tiles/1.0.0/vy/map/{z}/{x}/{y}.png';

      var getOverlayStyle = function (count) {
        var style = {
          weight: 1,
          opacity: 1,
          color: 'white',
          dashArray: '1',
          fillOpacity: 0.7,
          fillColor: '#FFEDA0'
        };
        if (arguments.length !== 0) {
          // TODO dynamic quartiles, maybe using d3's palette?
          style.fillColor = count > 100 ? '#800026' :
                   count > 75 ? '#BD0026' :
                   count > 50 ? '#E31A1C' :
                   count > 20 ? '#FC4E2A' :
                   count > 10 ? '#FD8D3C' :
                   count > 5 ? '#FEB24C' :
                   count > 2 ? '#FED976' :
                   '#FFEDA0';
        }

        return style;
      };

      var baseLayer = L.tileLayer(baseMapURL, {
        subdomains: '1234',
        attribution: 'Map data &copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> | ' +
          'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="https://developer.mapquest.com/content/osm/mq_logo.png">'
      });

      // don't wait for data to build map and fetch base layer tiles
      var map = L.map(element.children()[0], {
        center: new L.LatLng(41.4289788, -96.8634425),
        zoom: 7,
        layers: [baseLayer]
      });
      L.control.scale().addTo(map);

      //separating out the polygon request
      var getLayerPolys = function () {
        var deferred = $q.defer();

        // could also use $http's promise, but I can never figure out ngResource's API
        DistrictResource.get({
          size: 9999
        }, function (response) {
          var layers = {}; // map of District name -> layer

          var polygons = response.results.reduce(function (previous, current) {
            var geometry = current._source.geometry;
            if (geometry) {
              var coordinates = geometry.coordinates[0].map(function (lonlat) {
                // GeoJSON uses LonLat instead of LatLon
                return L.latLng(lonlat[1], lonlat[0]);
              });
              var layer = L.polygon(coordinates, getOverlayStyle());
              layer.oeName = current._source.name;

              // inspired by http://leafletjs.com/examples/choropleth.html
              layer.on('click', function (e) {
                // TODO this leaves the map with a lot of 0 count districts that should be unshaded
                map.fitBounds(e.target.getBounds());
                var filter = {
                  filterId: 'districts',
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

                if (!L.Browser.ie && !L.Browser.opera) {
                  layer.bringToFront();
                }
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
                field: 'medicalFacility.district.raw',
                size: 0 // don't cap number of buckets
              }
            }
          }
        }, function (response) {
          polys.then(function (districts) {
            // reset styles
            angular.forEach(districts, function(district) {
              district.setStyle(getOverlayStyle(0));
            });
            // re-apply styles for query results
            response.aggregations.district.buckets.forEach(function (bucket) {
              /*jshint camelcase:false */
              var district = districts[bucket.key];
              if (district) { // not all districts have geometries
                district.setStyle(getOverlayStyle(bucket.doc_count));
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
