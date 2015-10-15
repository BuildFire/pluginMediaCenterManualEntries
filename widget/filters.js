(function (angular, buildfire, location) {
    "use strict";
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidgetFilters', [])
        .filter('resizeImage', [function () {
            return function (url, width, height, type) {
                return buildfire.imageLib.resizeImage(url, {
                    width: width,
                    height: height
                });
            };
        }])
        .filter('cropImage', [function () {
            return function (url, width, height, type) {
                return buildfire.imageLib.cropImage(url, {
                    width: width,
                    height: height
                });
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
        .filter("jsDate", function () {
            return function (x) {
                return new Date(x);
            };
        })
        .filter("timeCorrect", function () {
            return function (x) {
                if (!x)
                    return '';
                var num = Number(x.charAt(0));

                if (isNaN(num))
                    return '';

                num = num - 3;
                x = num.toString() + x.substring(1);
                return x;
            };
        })
        .filter("isYoutubeVimeoLink", function () {
            return function (x) {
                if (x)
                    return (x.indexOf('youtube.com') >= 0 || x.indexOf('vimeo.com') >= 0);
                else
                    return false;
            };
        })
        .filter('secondsToDateTime', [function() {
            return function(seconds) {
                return new Date(1970, 0, 1).setSeconds(seconds);
            };
        }]);
})(window.angular, window.buildfire, window.location);