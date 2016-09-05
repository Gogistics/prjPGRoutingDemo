/**/
(function($){
  angular.element(document).ready(function(){
    // bootstrap App
    angular.bootstrap(document.body, ['indexApp']);
  });

  // init App
  initApp();

  function initApp(){

    // set module
    window.indexApp = window.indexApp || angular.module('indexApp', [], function($locationProvider, $interpolateProvider){
      $locationProvider.html5Mode(true);
      $interpolateProvider.startSymbol('[[');
      $interpolateProvider.endSymbol(']]');
    });

    // global values
    window.indexApp.value('APP_VALUES', {
      EMAIL: 'gogistics@gogistics-tw.com',
      GEO_LOCATION: null
    });

    window.indexApp.config(function(){
      console.log('start to config');
    });

    window.indexApp.run(['APP_VALUES', function(APP_VALUES){
      console.log('start to run');
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(setGeoLocation);
      }else{
        alert('Your Browser Does not support Geolocation');
      }
      function setGeoLocation(position){
        APP_VALUES.GEO_LOCATION = {};
        APP_VALUES.GEO_LOCATION['lat'] = position.coords.latitude;
        APP_VALUES.GEO_LOCATION['lng'] = position.coords.longitude;
      }
    }]);

    window.indexApp.factory('leafletMap', function(){
      var leafletMapTiles = new L.TileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
      return new L.Map('map', {center: [40.7233, -73.9901], zoom: 14}).addLayer(leafletMapTiles);
    });

    window.indexApp.service('dataProvider', function($http, APP_VALUES){
      this.geoQuery = function(arg_url, arg_headers, arg_data){
        return $http({
           url: arg_url,
           method: 'POST',
           data: arg_data,
           headers: arg_headers
        });
      };
      this.getData = function(arg_url, arg_headers, arg_data){
        return $http({
           url: arg_url,
           method: 'GET',
           data: arg_data,
           headers: arg_headers
        });
      };
    });

    window.indexApp.controller('indexCtrl', ['$scope', '$window', 'APP_VALUES', 'leafletMap', 'dataProvider', function($scope, $window, APP_VALUES, leafletMap, dataProvider){
      var ctrl = this;
      ctrl.sourceLatLng = {lat: null, lng: null};
      ctrl.targetLatLng = {lat: null, lng: null};

      ctrl.init = function(){
        ctrl.svg = d3.select(leafletMap.getPanes().overlayPane).append('svg');
        ctrl.g = ctrl.svg.append('g').attr('class', 'leaflet-zoom-hide');
      };

      ctrl.submitGeoQuery = function(){
        // get data
        var customHeaders = { 'current_cookie': $window.document.cookie,
                              'Content-Type': 'application/json'},
            dataSet = { source_lat: ctrl.sourceLatLng.lat,
                        source_lng: ctrl.sourceLatLng.lng,
                        target_lat: ctrl.targetLatLng.lat,
                        target_lng: ctrl.targetLatLng.lng};

        // getData() for testing; geoQuery() for query
        dataProvider.getData('/public/data/points.geojson', customHeaders, dataSet)
                    .success(function(data, status, headers, config){
                      console.log(data);
                      if(!!data) ctrl.renderMapRoute(data);
                    })
                    .error(function(data, status, headers, config){
                      console.log('Something went wrong!')
                    });

        // 
        dataProvider.geoQuery('/query-shortest-path', customHeaders, dataSet)
                    .success(function(data, status, headers, config){
                      console.log(data);
                      // if(!!data.request_status) ctrl.renderMapRoute(data.geoJson);
                    })
                    .error(function(data, status, headers, config){
                      console.log('Something went wrong!')
                    });
      }
      ctrl.submitGeoQuery();

      ctrl.renderMapRoute = function(arg_collection){
        var arg_data = arg_collection.features;
        // render map
        var transform = d3.geo.transform({point: projectPoint}),
            d3path = d3.geo.path().projection(transform);

        var toLine = d3.svg
                      .line()
                      .interpolate('linear')
                      .x(function(d){
                        return applyLatLngToLayer(d).x;
                      })
                      .y(function(d){
                        return applyLatLngToLayer(d).y;
                      });

        var ptFeatures = ctrl.g
                            .selectAll('circle')
                            .data(arg_data)
                            .enter()
                            .append('circle')
                            .attr('r', 3)
                            .attr('class', 'waypoints');

        var linePath = ctrl.g
                          .selectAll('.lineConnect')
                          .data([arg_data])
                          .enter()
                          .append('path')
                          .attr('class', 'lineConnect');

        var marker = ctrl.g
                        .append('circle')
                        .attr('r', 10)
                        .attr('id', 'marker')
                        .attr('class', 'travelMarker');

        var originAndDestination = [arg_data[0], arg_data[arg_data.length - 1]];

        var begend = ctrl.g
                        .selectAll('.drinks')
                        .data(originAndDestination)
                        .enter()
                        .append('circle', '.drinks')
                        .attr('r', 5)
                        .style('fill', 'red')
                        .style('opacity', '.9');

        var text = ctrl.g
                      .selectAll('text')
                      .data(originAndDestination)
                      .enter()
                      .append('text')
                      .text(function(d){
                        return d.properties.name;
                      })
                      .attr('class', 'locnames')
                      .attr('y', function(d){
                        return -10;
                      });

       leafletMap.on('viewreset', reset);
        reset();
        transition();

        function reset(){
          var bounds = d3path.bounds(arg_collection),
          topLeft = bounds[0],
          bottomRight = bounds[1];

          text.attr('transform', function(d){
            return 'translate(' + applyLatLngToLayer(d).x + ',' + applyLatLngToLayer(d).y + ')';
          });

          begend.attr('transform', function(d){
            return 'translate(' + applyLatLngToLayer(d).x + ',' + applyLatLngToLayer(d).y + ')';
          });

          ptFeatures.attr('transform', function(d){
            return 'translate(' + applyLatLngToLayer(d).x + ',' + applyLatLngToLayer(d).y + ')';
          });

          marker.attr('transform', function(){
            var y = arg_data[0].geometry.coordinates[1],
                x = arg_data[0].geometry.coordinates[0],
                latLng = leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
            return 'translate(' + latLng.x + ',' + latLng.y + ')';
          });

          ctrl.svg
              .attr('width', bottomRight[0] - topLeft[0] + 120)
              .attr('height', bottomRight[1] - topLeft[1] + 120)
              .style('left', topLeft[0] - 50 + 'px')
              .style('top', topLeft[1] - 50 + 'px');

          linePath.attr('d', toLine);
          ctrl.g.attr('transform', 'translate(' + (-topLeft[0] + 50) + ',' + (-topLeft[1] + 50) + ')' );
        }

        function transition(){
          linePath.transition()
                  .duration(7500)
                  .attrTween('stroke-dasharray', tweenDash)
                  .each('end', function(d){
                    console.log(d);
                    d3.select(this).call(transition);
                  });
        }

        function tweenDash(){
          return function(t){
            var l = linePath.node().getTotalLength();
            interpolate = d3.interpolateString('0,' + l, l + ',' + l);
            var marker = d3.select('marker');
            var p = linePath.node().getPointAtLength(t * l);
            marker.attr('transform', 'translate(' + p.x + ',' + p.y + ')');
            // console.log(interpolate(t));
            return interpolate(t);
          }
        }

        function projectPoint(x, y){
          var point = leafletMap.latLngToLayerPoint(new L.LatLng(y,x));
          this.stream.point(point.x, point.y);
        }

        function applyLatLngToLayer(d){
          var y = d.geometry.coordinates[1];
          var x = d.geometry.coordinates[0];
          return leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
        }
      }

      console.log('index ctrl is ready');
    }]);
  }
})(jQuery);
