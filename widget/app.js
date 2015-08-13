'use strict';

(function (angular, buildfire) {
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidget', ['ngAnimate', 'ngRoute', 'ui.bootstrap', 'ui.sortable', 'ngClipboard', 'infinite-scroll', "bngCsv"])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        //ngClipboard to provide copytoclipboard feature
        .config(['$routeProvider', function ($routeProvider) {

            /**
             * Disable the pull down refresh
             */
            //buildfire.datastore.disableRefresh();

            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'WidgetHome',
                    controller: 'WidgetHomeCtrl'
                })
                .when('/media/:id', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'WidgetMedia',
                    controller: 'WidgetMediaCtrl'
                })
                .otherwise('/');
        }])
        .run(function ($rootScope, $location) {
            /* Buildfire.messaging.onReceivedMessage = function(message){
             $location.path('/people/'+ message.id);
             };*/
        });

})(window.angular, window.buildfire);
