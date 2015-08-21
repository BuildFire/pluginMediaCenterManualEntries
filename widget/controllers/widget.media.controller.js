(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'AppConfig', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', function ($scope, $window, AppConfig, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout) {
            var WidgetMedia = this;
            WidgetMedia.media = {
                data: AppConfig.getSettings()
            };
            WidgetMedia.item ={
                data:{}
            };
            if(media)
                WidgetMedia.item = media;
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
                        case EVENTS.DESIGN_LAYOUT_CHANGE:
                            WidgetMedia.media.data.design.listLayout = event.message.listLayout;
                            WidgetMedia.media.data.design.itemLayout = event.message.itemLayout;
                            AppConfig.setSettings(WidgetMedia.media);
                            $scope.$digest();
                            break;
                        case EVENTS.DESIGN_BGIMAGE_CHANGE:
                            WidgetMedia.media.data.design.backgroundImage = event.message.backgroundImage;
                            AppConfig.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);
                            $scope.$apply();

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
                }
            });

            //var initializing = true;
            $scope.$watch(function () {
                return WidgetMedia.item.data;
            }, function(){
//alert(WidgetMedia.item.data.videoUrl);
                if (WidgetMedia.item.data.videoUrl)  {
                    LoadVideo();
                }

            }, true);

            var myPlayer, videoArea,videlem;
            function LoadVideo() {
                // alert(1);
                videoArea = $("#videoArea");
                videoArea.html('');
                videlem = document.createElement("video");
                videlem.setAttribute('class', "video-js vjs-default-skin");
                videlem.setAttribute("id", "vid");
                videlem.setAttribute("controls", "");
                videlem.setAttribute("height", "264");
                videlem.setAttribute("width", "315");
                var sourceMP4 = document.createElement("source");
                sourceMP4.type = "video/mp4";
                sourceMP4.src = WidgetMedia.item.data.videoUrl;
                videlem.appendChild(sourceMP4);
                $("#videoArea").append(videlem);
                setTimeout(function () {
                    videojs("vid", {}, function () {
                        myPlayer = this;
                        myPlayer.play();
                    });
                },2000);


            }
            $scope.$on(
                "$destroy",
                function handleDestroyEvent() {
                    videoArea.html('');
                }
            );
        }]);
})(window.angular, window);