'use strict';

(function (angular, buildfire) {
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidget', [
            'mediaCenterEnums',
            'mediaCenterServices',
            'mediaCenterFilters',
            'ngAnimate',
            'ngRoute',
            'ui.bootstrap',
            'infinite-scroll'
        ])
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
                    controller: 'WidgetHomeCtrl',
                    resolve: {
                        MediaCenterInfo: ['$q', 'DB', 'COLLECTIONS', 'Orders', 'Location', function ($q, DB, COLLECTIONS, Orders, Location) {
                            var deferred = $q.defer();
                            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                            var _bootstrap = function () {
                                MediaCenter.save({
                                    content: {
                                        images: [],
                                        descriptionHTML: '',
                                        description: '',
                                        sortBy: Orders.ordersMap.Newest,
                                        rankOfLastItem: 0
                                    },
                                    design: {
                                        listLayout: "list-1",
                                        itemLayout: "item-1",
                                        backgroundImage: ""
                                    }
                                }).then(function success() {
                                    Location.goToHome();
                                }, function fail(error) {
                                    throw (error);
                                })
                            }
                            MediaCenter.get().then(function success(result) {
                                    if (result && result.data) {
                                        deferred.resolve(result);
                                    }
                                    else {
                                        //error in bootstrapping
                                        _bootstrap(); //bootstrap again  _bootstrap();
                                    }
                                },
                                function fail(err) {
                                    throw (error);
                                }
                            );
                            return deferred.promise;
                        }]
                    }
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
