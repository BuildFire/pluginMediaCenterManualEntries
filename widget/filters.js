(function (angular, buildfire, location) {
    "use strict";
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidgetFilters', [])
        .filter('resizeImage', [function () {
            return function (url, width, height, type) {
                return buildfire.imageLib.local.resizeImage(url, {
                    width: width,
                    height: height
                });
            };
        }])
        .filter('cropImage', [function () {
            return function (url, width, height, noDefault) {
                if(noDefault)
                {
                    if(!url)
                    return '';
                }
                return buildfire.imageLib.local.cropImage(url, {
                    width: width,
                    height: height
                });
            };
        }])
        .filter('safeHtml', ['$sce', function ($sce) {
            return function (html) {
                if (html) {
                    var $html = $('<div />', {html: html});
                    $html.find('iframe').each(function (index, element) {
                        var src = element.src;
                        console.log('element is: ', src, src.indexOf('http'));
                        src = src && src.indexOf('file://') != -1 ? src.replace('file://', 'http://') : src;
                        element.src = src && src.indexOf('http') != -1 ? src : 'http:' + src;
                    });
                    return $sce.trustAsHtml($html.html());
                } else {
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

               // num = num - 3;
                x = num.toString() + x.substring(1);
                return x;
            };
        })
        .filter("isYoutubeVimeoLink", function () {
            return function (x) {
                if (x)
                    return (x.indexOf('youtu.be') >= 0 || x.indexOf('youtube.com') >= 0 || x.indexOf('vimeo.com') >= 0 || x.indexOf('drive.google.com') >= 0);
                else
                    return false;
            };
        })
        .filter('secondsToDateTime', [function() {
            return function(seconds) {
                if(!seconds)
                    return "--:--";
                let date=new Date(1970, 0, 1);
                date.setSeconds(seconds);
                let hoursT = Number(date.getHours())<10?'0' + date.getHours() : date.getHours();
                let minutesT = Number(date.getMinutes())<10?'0' + date.getMinutes() : date.getMinutes();
                let secondsT = Number(date.getSeconds())<10?'0' + date.getSeconds() : date.getSeconds();
                if(Number(hoursT)==0)
                    return minutesT + ":" + secondsT;
                else
                    return hoursT + ":" + minutesT + ":" + secondsT;
            };
        }]);
})(window.angular, window.buildfire, window.location);