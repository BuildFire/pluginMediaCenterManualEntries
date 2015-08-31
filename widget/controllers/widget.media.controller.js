(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'AppConfig', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", function ($scope, $window, AppConfig, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce) {
            var WidgetMedia = this;

            WidgetMedia.config = {
                preload: "none",
                sources: [
                    {
                        src: $sce.trustAsResourceUrl("http://static.videogular.com/assets/videos/videogular.mp4"),
                        type: "video/mp4"
                    },
                    {
                        src: $sce.trustAsResourceUrl("http://static.videogular.com/assets/videos/videogular.webm"),
                        type: "video/webm"
                    },
                    {
                        src: $sce.trustAsResourceUrl("http://static.videogular.com/assets/videos/videogular.ogg"),
                        type: "video/ogg"
                    }
                ],
                tracks: [
                    {
                        src: "http://www.videogular.com/assets/subs/pale-blue-dot.vtt",
                        kind: "subtitles",
                        srclang: "en",
                        label: "English",
                        default: ""
                    }
                ],
                theme: {
                    url: "http://www.videogular.com/styles/themes/default/latest/videogular.css"
                }
            };

            WidgetMedia.changeVideoSrc = function () {
                if(WidgetMedia.item.data.videoUrl)
                    WidgetMedia.config.sources = [{
                        src: $sce.trustAsResourceUrl(WidgetMedia.item.data.videoUrl),
                        type:  'video/' + WidgetMedia.item.data.videoUrl.split('.').pop() //"video/mp4"
                    }];
            };


            WidgetMedia.media = {
                data: AppConfig.getSettings()
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
                        /*     case EVENTS.DESIGN_LAYOUT_CHANGE:
                         WidgetMedia.media.data.design.listLayout = event.message.listLayout;
                         WidgetMedia.media.data.design.itemLayout = event.message.itemLayout;
                         AppConfig.setSettings(WidgetMedia.media);
                         $scope.$digest();
                         break;
                         case EVENTS.DESIGN_BGIMAGE_CHANGE:
                         WidgetMedia.media.data.design.backgroundImage = event.message.backgroundImage;
                         AppConfig.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);
                         $scope.$apply();

                         break;*/
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