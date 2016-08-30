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
      var leafletMapTiles = new L.TileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
      return new L.Map('map', {center: [37.615419, -122.391106], zoom: 12}).addLayer(leafletMapTiles);
    });

    window.indexApp.service('dataProvider', function($http, APP_VALUES){
      this.geoQuery = function(arg_url, arg_headers, arg_data){
        //
      }
    });

    window.indexApp.controller('indexCtrl', ['$scope', 'leafletMap', 'dataProvider', function($scope, leafletMap, dataProvider){
      var ctrl = this;
      ctrlinit = function(){
        leafletMap.on("viewreset", reset);
      }
      console.log('index ctrl is ready');
    }]);
  }
})(jQuery);
