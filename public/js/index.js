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
      EMAIL: 'gogistics@gogistics-tw.com'
    });

    window.indexApp.config(function(){
      console.log('start to config');
    });

    window.indexApp.run(function(){
      console.log('start to run');
    });

    window.indexApp.factory('leafletMap', function(){
      var mapboxTiles = L.tileLayer('https://{s}.tiles.mapbox.com/v3/examples.map-zr0njcqy/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
      });
      return L.map('map').addLayer(mapboxTiles);
    });

    window.indexApp.service('dataProvider', function($http, APP_VALUES){
      this.geoQuery = function(arg_url, arg_headers, arg_data){
        //
      }
    });

    window.indexApp.controller('indexCtrl', ['$scope', 'leafletMap', 'dataProvider', function($scope, leafletMap, dataProvider){
      var ctrl = this;
      ctrlinit = function(){
        leafletMap.setView([-122.391106, 37.615419], 14);
      }
      console.log('index ctrl is ready');
    }]);
  }
})(jQuery);
