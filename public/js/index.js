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
      return new L.Map('map', {center: [37.77166, -122.44889], zoom: 14}).addLayer(leafletMapTiles);
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
      ctrl.sourceLatLng = {lat: 37.783631, lng: -122.439514, selected: true};
      ctrl.targetLatLng = {lat: 37.734909, lng: -122.466637, selected: false};

      leafletMap.on('click', function(e){
        if(ctrl.sourceLatLng.selected){
          ctrl.sourceLatLng.lat = e.latlng.lat.toFixed(5);
          ctrl.sourceLatLng.lng = e.latlng.lng.toFixed(5);
          ctrl.sourceLatLng.selected = !ctrl.sourceLatLng.selected;
          ctrl.targetLatLng.selected = !ctrl.targetLatLng.selected;
          angular.element('#sourceLatLng').val(ctrl.sourceLatLng.lat + ',' + ctrl.sourceLatLng.lng);
        }else if(ctrl.targetLatLng.selected){
          ctrl.targetLatLng.lat = e.latlng.lat.toFixed(5);
          ctrl.targetLatLng.lng = e.latlng.lng.toFixed(5);
          ctrl.sourceLatLng.selected = !ctrl.sourceLatLng.selected;
          ctrl.targetLatLng.selected = !ctrl.targetLatLng.selected;
          angular.element('#targetLatLng').val(ctrl.targetLatLng.lat + ',' + ctrl.targetLatLng.lng);
        }
      });
      // init D3 for leafletMap
      ctrl.init = function(){
        ctrl.svg = d3.select(leafletMap.getPanes().overlayPane).append('svg');
        ctrl.g = ctrl.svg.append('g').attr('class', 'leaflet-zoom-hide');
        ctrl.assetLayerGroup = new L.LayerGroup();
      };

      ctrl.resetD3Svg = function(){
        var d3Svg = d3.select('svg');
        if (!!d3Svg){
          d3Svg.remove();
          ctrl.init();
        }
      }

      ctrl.submitGeoQuery = function(){
        // get data
        var customHeaders = { 'current_cookie': $window.document.cookie,
                              'Content-Type': 'application/json'},
            dataSet = { source_lat: ctrl.sourceLatLng.lat,
                        source_lng: ctrl.sourceLatLng.lng,
                        target_lat: ctrl.targetLatLng.lat,
                        target_lng: ctrl.targetLatLng.lng};

        // query short path
        dataProvider.geoQuery('/query-shortest-path', customHeaders, dataSet)
                    .success(function(data, status, headers, config){
                      console.log(data);
                      if(!!data && data.length > 0){
                        var newData = { "type": "FeatureCollection",
                                        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
                                        "features": []}, maxLat, maxLng, minLat, minLng, count = 0;

                        for(var ith = 0, max_ith = data.length; ith < max_ith; ith++){
                          var geom = JSON.parse(data[ith]['geom']),
                              lineData = geom['coordinates'][0];
                          for(var jth = 0, max_jth = lineData.length; jth < max_jth; jth++){
                            // set data
                            if (!maxLat || lineData[jth][1] > maxLat) maxLat = lineData[jth][1];
                            if (!maxLng || lineData[jth][0] > maxLng) maxLng = lineData[jth][0];
                            if (!minLat || lineData[jth][1] < minLat) minLat = lineData[jth][1];
                            if (!minLng || lineData[jth][0] < minLng) minLng = lineData[jth][0];

                            newData['features'].push({type: 'Feature',
                                                      properties: { latitude: lineData[jth][1],
                                                                    longitude: lineData[jth][0],
                                                                    time: (count + 1),
                                                                    id: 'route',
                                                                    name: data[ith]['name'] },
                                                      geometry: { type: 'Point',
                                                                  coordinates: [lineData[jth][0], lineData[jth][1]]}});
                            ++count;
                          }
                        }
                        ctrl.renderMapRoute(newData, {maxLat: maxLat, maxLng: maxLng, minLat: minLat, minLng: minLng});
                      }
                    })
                    .error(function(data, status, headers, config){
                      console.log('Something went wrong!')
                    });
      }

      ctrl.renderMapRoute = function(arg_collection, arg_max_min_lat_lng){
        ctrl.resetD3Svg();

        leafletMap.setView({lat: ( (Number(arg_max_min_lat_lng.maxLat) + Number(arg_max_min_lat_lng.minLat)) / 2).toFixed(5),
                            lng: ( (Number(arg_max_min_lat_lng.maxLng) + Number(arg_max_min_lat_lng.minLng)) / 2).toFixed(5) }, 13);
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
                    console.log('Your route is ready, enjoy!');
                    // d3.select(this).call(transition);
                  });
        }

        function tweenDash(){
          return function(t){
            var l = linePath.node().getTotalLength();
            interpolate = d3.interpolateString('0,' + l, l + ',' + l);
            var marker = d3.select('#marker');
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
    }]);
  }
})(jQuery);
