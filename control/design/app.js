'use strict';

(function (angular, buildfire) {
    //created peoplePluginContent module
    angular
        .module('mediaCenterContent', ['ngAnimate', 'ngRoute', 'ui.bootstrap', 'ui.sortable', 'ngClipboard', 'infinite-scroll', "bngCsv"])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        //ngClipboard to provide copytoclipboard feature
        .controller('HomeCtrl', function ($scope) {
            var Home = this;
            Home.firstName = "John";
            Home.lastName = "Doe";
        });
})(window.angular, window.buildfire);
