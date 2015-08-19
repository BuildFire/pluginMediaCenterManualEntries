(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'MediaCenterInfo', 'Design', function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, MediaCenterInfo, Design) {
            var WidgetHome = this;
            WidgetHome.media = MediaCenterInfo;
            Design.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);

        }]);
})(window.angular, undefined);