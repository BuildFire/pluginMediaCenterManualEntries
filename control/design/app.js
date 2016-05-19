(function (angular, buildfire) {
    'use strict';
    //created mediaCenterContent module
    angular
        .module('mediaCenterDesign',
        [
            'mediaCenterEnums',
            'mediaCenterDesignServices',
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
                        MediaCenterInfo: ['$q', 'DB', 'COLLECTIONS', 'Orders', function ($q, DB, COLLECTIONS, Orders) {
                            var deferred = $q.defer();
                            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
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
