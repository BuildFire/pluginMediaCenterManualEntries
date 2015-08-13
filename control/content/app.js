'use strict';

(function (angular, buildfire) {
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent', ['ngAnimate', 'ngRoute', 'ui.bootstrap', 'ui.sortable', 'ngClipboard', 'infinite-scroll', "bngCsv"])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        //ngClipboard to provide copytoclipboard feature
        .config(['$routeProvider', 'ngClipProvider', function ($routeProvider, ngClipProvider) {
            ngClipProvider.setPath("//cdnjs.cloudflare.com/ajax/libs/zeroclipboard/2.1.6/ZeroClipboard.swf");
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'ContentHome',
                    controller: 'ContentHomeCtrl'
                })
                .when('/media', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'ContentMedia',
                    controller: 'ContentMediaCtrl'
                })
                .when('/media/:itemId', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'ContentMedia',
                    controller: 'ContentMediaCtrl'
                })
                .otherwise('/');
        }])
})(window.angular, window.buildfire);
