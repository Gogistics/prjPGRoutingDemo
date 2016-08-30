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
      return new L.Map('map', {center: [37.615419, -122.391106], zoom: 12}).addLayer(leafletMapTiles);
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
    });

    window.indexApp.controller('indexCtrl', ['$scope', 'APP_VALUES', 'leafletMap', 'dataProvider', function($scope, APP_VALUES, leafletMap, dataProvider){
      var ctrl = this;
      ctrl.init = function(){
        if(APP_VALUES.GEO_LOCATION) leafletMap.setView(new L.LatLng(APP_VALUES.GEO_LOCATION.lat, APP_VALUES.GEO_LOCATION.lng), 15);
        ctrl.svg = d3.select(leafletMap.getPanes().overlayPane).append('svg');
        ctrl.g = ctrl.svg.append('g').attr('class', 'leaflet-zoom-hide');
      };

      ctrl.submitGeoQuery = function(){
        // incomplete
      }
      console.log('index ctrl is ready');
    }]);
  }
})(jQuery);
