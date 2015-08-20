(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'MediaCenterInfo', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Location',
            function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, MediaCenterInfo, AppConfig, Messaging, EVENTS, PATHS, Location) {
                var WidgetHome = this;
                WidgetHome.media = MediaCenterInfo;
                var currentBackgroundImage = WidgetHome.media.data.design.backgroundImage;
                AppConfig.setSettings(MediaCenterInfo.data);
                AppConfig.changeBackgroundTheme(currentBackgroundImage);
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
                                            url = url + id + "/";
                                        }
                                        break
                                    default :

                                        break
                                }
                                Location.go(url);
                                break;
                            case EVENTS.DESIGN_LAYOUT_CHANGE:
                                    WidgetHome.media.data.design.listLayout = event.message.listLayout;
                                    $scope.$digest();
                                break;
                            case EVENTS.DESIGN_BGIMAGE_CHANGE:
                                    WidgetHome.media.data.design.backgroundImage = event.message.backgroundImage;
                                    AppConfig.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);
                                    $scope.$apply();

                                break;
                        }
                    }
                };
                Buildfire.datastore.onUpdate(function (event) {
                    switch (event.tag) {
                        case COLLECTIONS.MediaContent:
                            if (event.data) {
                                /**
                                 * condition added to update the background image
                                 */
                                if (event.data.design && event.data.design.backgroundImage && currentBackgroundImage == event.data.design.backgroundImage) {
                                    // do something on same
                                }
                                else {
                                    currentBackgroundImage = event.data.design.backgroundImage;
                                    AppConfig.changeBackgroundTheme(currentBackgroundImage);
                                }
                            }
                            break;
                    }

                });

            }]);
})(window.angular, undefined);