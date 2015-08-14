'use strict';

(function (angular, buildfire) {
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent')
        .provider('Buildfire', [function () {
            this.$get = function () {
                return buildfire;
            }
        }])
})(window.angular, window.buildfire);