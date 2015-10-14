(function (angular, buildfire) {
    'use strict';
    //created mediaCenterContent module
    angular
        .module('mediaCenterDesign',
        [
            'mediaCenterEnums',
            'mediaCenterDesignServices',
            'mediaCenterDesignFilters',
            'ngAnimate',
            'ngRoute'
        ])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        //ngClipboard to provide copytoclipboard feature
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'DesignHome',
                    controller: 'DesignHomeCtrl',
                    resolve: {
                        MediaCenterInfo: ['$q', 'DB', 'COLLECTIONS', 'Orders', 'Location', function ($q, DB, COLLECTIONS, Orders, Location) {
                            var deferred = $q.defer();
                            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                         /*   var _bootstrap = function () {
                                MediaCenter.save({
                                    content: {
                                        images: [],
                                        descriptionHTML: '',
                                        description: '',
                                        sortBy: Orders.ordersMap.Newest,
                                        rankOfLastItem: ''
                                    },
                                    design: {
                                        listLayout: "list-1",
                                        itemLayout: "item-1",
                                        backgroundImage: ""
                                    }
                                }).then(function success() {
                                    Location.go("/");
                                }, function fail() {
                                    _bootstrap();
                                });
                            };*/
                            MediaCenter.get().then(function success(result) {
                                    if (result && result.data && result.data.content && result.data.design) {
                                        deferred.resolve(result);
                                    }
                                    else {
                                        deferred.resolve(null);
                                    }
                                },
                                function fail() {
                                    deferred.resolve(null);
                                }
                            );
                            return deferred.promise;
                        }]
                    }
                })
                .otherwise('/');
        }]);
})(window.angular, window.buildfire);
