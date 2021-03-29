(function (angular, buildfire) {
    'use strict';
    angular
        .module('mediaCenterStrings',
        [
            'ngAnimate',
            'ngRoute'
        ])
        .config(['$routeProvider', function ($routeProvider) {
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'Strings',
                    controller: 'StringsCtrl',
                })
                .otherwise('/');
        }]);
})(window.angular, window.buildfire);
