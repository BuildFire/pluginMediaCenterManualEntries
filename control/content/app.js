'use strict';

(function (angular, buildfire) {
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent',
        [
            'mediaCenterEnums',
            'mediaCenterServices',
            'mediaCenterFilters',
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
        .config(['$routeProvider', 'ngClipProvider', function ($routeProvider, ngClipProvider) {
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
                                }, function fail() {
                                    _bootstrap();
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
                                    Location.goToHome();
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
                            else{
                                Location.goToHome();
                            }
                            return deferred.promise;
                        }]
                    }
                })
                .otherwise('/');
        }])
        .
        run(function ($rootScope, $location) {
            /* Buildfire.messaging.onReceivedMessage = function(message){
             $location.path('/people/'+ message.id);
             };*/
        })

})
(window.angular, window.buildfire);
