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
                        var layout = params.layout || "item-1";
                        return 'templates/layouts/' + layout + '.html';
                    },
                    controllerAs: 'WidgetMedia',
                    controller: 'WidgetMediaCtrl'
                })
                .when('/media/:layout', {
                    templateUrl: function (params) {
                        var layout = params.layout || "item-1";
                        return 'templates/layouts/' + layout + '.html';
                    },
                    controllerAs: 'WidgetMedia',
                    controller: 'WidgetMediaCtrl'
                })
                .when('/:layout?', {
                    templateUrl: function (params) {
                        var layout = params.layout || "list-1";
                        return 'templates/layouts/' + layout + '.html';
                    },
                    controllerAs: 'WidgetHome',
                    controller: 'WidgetHomeCtrl'
                })
                .otherwise('/');
        }])
        .run(function ($rootScope, $location, EVENTS, PATHS) {
            buildfire.messaging.onReceivedMessage = function (event) {
                if (event) {
                    switch (event.name) {
                        case EVENTS.ROUTE_CHANGE:
                            var path = event.message.path,
                                layout = event.message.layout,
                                id = event.message.id;
                            var url = "/";
                            switch (path) {
                                case PATHS.MEDIA:
                                    url = url + "/media";
                                    url = url + "/" + layout;
                                    if (id) {
                                        url = url + "/" + id;
                                    }
                                    break
                                default :
                                    url = url + "/" + layout;
                                    if (id) {
                                        url = url + "/" + id;
                                    }
                                    break
                            }
                            $location.path(url);
                    }
                }
            };
        });
})(window.angular, window.buildfire);
