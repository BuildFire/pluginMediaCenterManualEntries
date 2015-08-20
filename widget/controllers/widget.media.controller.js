(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'AppConfig', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', function ($scope, $window, AppConfig, Messaging, Buildfire, COLLECTIONS, media) {
            console.log(">>>>>>>>>><<<<<<<<<<<<<<<<<<<")
            var WidgetMedia = this;
            WidgetMedia.media = {
                data: AppConfig.getSettings()
            };
            WidgetMedia.item=media;
            var currentItemLayout = WidgetMedia.media.data.itemLayout;
            Messaging.onReceivedMessage(function (event) {
                if (event) {
                    switch (event.name) {
                        case EVENTS.ROUTE_CHANGE:
                            var path = event.message.path,
                                id = event.message.id;
                            var url = "#/";
                            switch (path) {
                                case PATHS.MEDIA:
                                    url = url + "media";
                                    if (id) {
                                        url = url + "/" + id;
                                    }
                                    break
                                default :

                                    break
                            }
                            console.log(url)
                            Location.go("#/media");
                            break;
                        case EVENTS.DESIGN_CHANGE:
                            if ('backgroundImage' in event.message) {
                                WidgetMedia.media.data.design.backgroundImage = event.message.backgroundImage;
                                AppConfig.changeBackgroundTheme(WidgetMedia.media.data.design.backgroundImage);
                            }
                            else {
                                WidgetMedia.media.data.design.itemLayout = event.message.itemLayout;
                            }
                            $scope.$apply();
                            break;
                    }
                }
            });
            Buildfire.datastore.onUpdate(function (event) {
                switch (event.tag) {
                    case COLLECTIONS.MediaCenter:
                        if (event.data) {
                            if (event.data.design && event.data.design.itemLayout != currentItemLayout) {
                                currentItemLayout = event.data.design.itemLayout;
                                WidgetMedia.media.data.design.itemLayout = event.data.design.itemLayout;
                                AppConfig.setSettings(event);
                                $scope.$digest();
                            }
                        }
                        break;
                }
            });
        }]);
})(window.angular, window);