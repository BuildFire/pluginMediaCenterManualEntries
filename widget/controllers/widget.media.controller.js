(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'AppConfig', 'Messaging', function ($scope, $window, AppConfig, Messaging) {
            console.log(">>>>>>>>>><<<<<<<<<<<<<<<<<<<")
            var WidgetMedia = this;
            WidgetMedia.media = {
                data: AppConfig.getSettings()
            };
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
        }]);
})(window.angular, window);