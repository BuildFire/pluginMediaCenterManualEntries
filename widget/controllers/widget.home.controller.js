(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'MediaCenterInfo', function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, MediaCenterInfo) {
            var WidgetHome = this;
            WidgetHome.media = MediaCenterInfo;
            console.log(MediaCenterInfo);
            var currentBackgroundImage = WidgetHome.media.data.design.backgroundImage;
            if (WidgetHome.media.data && currentBackgroundImage) {
                $rootScope.currentBackgroundImage = {
                    "background-image": "url(" + Buildfire.imageLib.resizeImage(currentBackgroundImage, {
                        width: 342,
                        height: 770
                    }) + ")"
                };
            }
        }]);
})(window.angular, undefined);