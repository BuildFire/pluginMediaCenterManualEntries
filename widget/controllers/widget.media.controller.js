(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'AppConfig', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", function ($scope, $window, AppConfig, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce) {
            var WidgetMedia = this;
            WidgetMedia.API = null;
            WidgetMedia.onPlayerReady = function ($API) {
                WidgetMedia.API = $API;
            };
            WidgetMedia.config = {
                autoHide: false,
                preload: "none",
                sources: undefined,
                tracks: undefined,
                theme: {
                    url: "assets/css/videogular.css"
                }
            };
            WidgetMedia.changeVideoSrc = function () {
                if (WidgetMedia.item.data.videoUrl)
                    WidgetMedia.config.sources = [{
                        src: $sce.trustAsResourceUrl(WidgetMedia.item.data.videoUrl),
                        type: 'video/' + WidgetMedia.item.data.videoUrl.split('.').pop() //"video/mp4"
                    }];
            };
            WidgetMedia.media = {
                data: AppConfig.getSettings()
            };

            WidgetMedia.sourceChanged = function ($source) {
                WidgetMedia.API.stop();
            };
            WidgetMedia.item = {
                data: {}
            };
            if (media) {
                WidgetMedia.item = media;
                WidgetMedia.changeVideoSrc();
            }
            AppConfig.changeBackgroundTheme(WidgetMedia.media.data.design.backgroundImage);
            var currentItemLayout = WidgetMedia.media.data.design.itemLayout;
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
                            Location.go("#/media");
                            break;
                    }
                }
            });
            Buildfire.datastore.onUpdate(function (event) {
                switch (event.tag) {
                    case COLLECTIONS.MediaContent:
                        if (event.data) {

                            WidgetMedia.item = event;
                            $scope.$digest();
                        }
                        break;
                    case COLLECTIONS.MediaCenter:
                        WidgetMedia.media.data.design.itemLayout = event.data.design.itemLayout;

                        break;
                }
            });
            var initializing = true;
            $scope.$watch(function () {
                return WidgetMedia.item.data.videoUrl;
            }, function () {
                if (initializing) {
                    $timeout(function () {
                        initializing = false;
                    });
                } else {
                    WidgetMedia.changeVideoSrc();
                }
            });
        }]);
})(window.angular, window);