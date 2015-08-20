(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'MediaCenterInfo', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Location',
            function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, MediaCenterInfo, AppConfig, Messaging, EVENTS, PATHS, Location) {
                var WidgetHome = this;
                WidgetHome.media = MediaCenterInfo;
                AppConfig.setSettings(MediaCenterInfo.data);
                AppConfig.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);
                Messaging.onReceivedMessage = function (event) {
                    if (event) {
                        switch (event.name) {
                            case EVENTS.ROUTE_CHANGE:
                                var path = event.message.path,
                                    id = event.message.id;
                                var url = "#/";
                                switch (path) {
                                    case PATHS.MEDIA:
                                        url = url + "media/";
                                        if (id) {
                                            url = url  + id+ "/";
                                        }
                                        break
                                    default :

                                        break
                                }
                                Location.go(url);
                        }
                    }
                };

            }]);
})(window.angular, undefined);