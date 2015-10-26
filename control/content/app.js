(function (angular, buildfire) {
    "use strict";
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent',
        [
            'mediaCenterEnums',
            'mediaCenterContentServices',
            'mediaCenterControlFilters',
            'mediaCenterModals',
            'ngAnimate',
            'ngRoute',
            'ui.bootstrap',
            'ui.sortable',
            'ngClipboard',
            'infinite-scroll',
            'bngCsv',
            'ui.tinymce'

        ])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        //ngClipboard to provide copytoclipboard feature
        .config(['$routeProvider', 'ngClipProvider', '$httpProvider', function ($routeProvider, ngClipProvider, $httpProvider) {
            ngClipProvider.setPath("//cdnjs.cloudflare.com/ajax/libs/zeroclipboard/2.1.6/ZeroClipboard.swf");
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'ContentHome',
                    controller: 'ContentHomeCtrl',
                    resolve: {
                        MediaCenterInfo: ['$q', 'DB', 'COLLECTIONS', 'Orders', 'Location', function ($q, DB, COLLECTIONS, Orders, Location) {
                            var deferred = $q.defer();
                            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                            MediaCenter.get().then(function success(result) {
                                    if (result && result.id && result.data) {
                                        deferred.resolve(result);
                                    }
                                    else {
                                        deferred.resolve(null);
                                    }
                                },
                                function fail(err) {
                                    deferred.resolve(null);
                                }
                            );
                            return deferred.promise;
                        }]
                    }
                })
                .when('/media', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'ContentMedia',
                    controller: 'ContentMediaCtrl',
                    resolve: {
                        media: function () {
                            return null;
                        }
                    }
                })
                .when('/media/:itemId', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'ContentMedia',
                    controller: 'ContentMediaCtrl',
                    resolve: {
                        media: ['$q', 'DB', 'COLLECTIONS', 'Orders', 'Location', '$route', function ($q, DB, COLLECTIONS, Orders, Location, $route) {
                            var deferred = $q.defer();
                            var MediaContent = new DB(COLLECTIONS.MediaContent);
                            if ($route.current.params.itemId) {
                                MediaContent.getById($route.current.params.itemId).then(function success(result) {
                                        if (result && result.data) {
                                            deferred.resolve(result);
                                        }
                                        else {
                                            Location.goToHome();
                                        }
                                    },
                                    function fail() {
                                        Location.goToHome();
                                    }
                                );
                            }
                            else {
                                Location.goToHome();
                            }
                            return deferred.promise;
                        }]
                    }
                })
                .otherwise('/');
            var interceptor = ['$q', function ($q) {
                var counter = 0;

                return {

                    request: function (config) {
                        buildfire.spinner.show();
                        //NProgress.start();

                        counter++;
                        return config;
                    },
                    response: function (response) {
                        counter--;
                        if (counter === 0) {

                            buildfire.spinner.hide();
                        }
                        return response;
                    },
                    responseError: function (rejection) {
                        counter--;
                        if (counter === 0) {

                            buildfire.spinner.hide();
                        }

                        return $q.reject(rejection);
                    }
                };
            }];

            $httpProvider.interceptors.push(interceptor);

        }])
        .run(['Location', 'Messaging', 'EVENTS', 'PATHS', function (Location, Messaging, EVENTS, PATHS) {
            // Handler to receive message from widget
            Messaging.onReceivedMessage = function (event) {
                if (event) {
                    switch (event.name) {
                        case EVENTS.ROUTE_CHANGE:
                            var path = event.message.path,
                                id = event.message.id;
                            var url = "#/";
                            switch (path) {
                                case PATHS.MEDIA:
                                    url = url + "media";
                                    if (id) {
                                        url = url + "/" + id;
                                    }
                                    break;
                                case PATHS.HOME:
                                    url = url + "home";
                                    break;
                                default :
                                    break
                            }
                            Location.go(url);
                            break;
                    }
                }
            };
        }]);
})
(window.angular, window.buildfire);
