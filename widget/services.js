'use strict';

(function (angular, buildfire) {
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidget')
        .provider('Buildfire', [function () {
            this.$get = function () {
                return buildfire;
            }
        }])
})(window.angular, window.buildfire);