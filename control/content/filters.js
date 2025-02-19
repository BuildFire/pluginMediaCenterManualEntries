(function (angular, buildfire, location) {
    "use strict";
    //created mediaCenterWidget module
    angular
        .module('mediaCenterControlFilters', [])
        .filter('resizeImage', [function () {
            return function (url, width, height) {
                let options = {};
                if (typeof width !== 'undefined') options.width = width;
                if (typeof height !== 'undefined') options.height = height;

                return buildfire.imageLib.resizeImage(url, options);
            };
        }])
        .filter('cropImage', [function () {
            return function (url, width, height) {
                let options = {};
                if (typeof width !== 'undefined') options.width = width;
                if (typeof height !== 'undefined') options.height = height;

                return buildfire.imageLib.cropImage(url, options);
            };
        }])
        .filter('safeHtml', ['$sce', function ($sce) {
            return function (html) {
                if (html) {
                    return $sce.trustAsHtml(html);
                }
                else {
                    return "";
                }
            };
        }])
        ;
})(window.angular, window.buildfire, window.location);
