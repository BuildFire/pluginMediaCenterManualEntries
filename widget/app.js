'use strict';

(function (angular, buildfire) {
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidget', ['ngAnimate', 'ngRoute', 'ui.bootstrap', 'infinite-scroll'])
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
                .when('/media/:layout/:id', {
                    templateUrl: function (params) {
                        return 'templates/layouts/' + params.layout + '.html';
                    },
                    controllerAs: 'WidgetMedia',
                    controller: 'WidgetMediaCtrl'
                })
                .when('/media/:layout', {
                    templateUrl: function (params) {
                        return 'templates/layouts/' + params.layout + '.html';
                    },
                    controllerAs: 'WidgetMedia',
                    controller: 'WidgetMediaCtrl'
                })
                .when('/:layout', {
                    templateUrl: function (params) {
                        return 'templates/layouts/' + params.layout + '.html';
                    },
                    controllerAs: 'WidgetHome',
                    controller: 'WidgetHomeCtrl'
                })
                .otherwise('/list-1');
        }])
        .run(function ($rootScope, $location) {
            
        });

})(window.angular, window.buildfire);
