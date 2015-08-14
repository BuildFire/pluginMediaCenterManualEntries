'use strict';

(function (angular, buildfire) {
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent')
        .filter('getImageUrl', function () {
            return function (url, width, height, type) {
                if (type == 'resize')
                    return buildfire.imageLib.resizeImage(url, {
                        width: width,
                        height: height
                    });
                else
                    return buildfire.imageLib.cropImage(url, {
                        width: width,
                        height: height
                    });
            }
        });
})(window.angular, window.buildfire);