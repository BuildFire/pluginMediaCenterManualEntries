'use strict';

(function (angular, window) {
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', 'MediaCenterInfo', function ($scope, MediaCenterInfo) {
            var ContentHome = this;
            ContentHome.info = MediaCenterInfo;
            /*
             *
             {
             imageUrl: "",
             title: "build fire",
             url: "https://www.facebook.com/buildfireapps",
             action: "linkToWeb",
             openIn: "_blank" or "_system",
             actionName: "Link to Web Content"
             }
             * */

            ContentHome.rmCarouselImage = function () {

            }
            ContentHome.addCarouselImage = function () {

            }
            ContentHome.carouselOptions = {
                handle: '> .cursor-grab'
            };
        }])
})(window.angular, window);
