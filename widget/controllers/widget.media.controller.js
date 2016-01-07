(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", "DB", 'PATHS', '$rootScope',
            function ($scope, $window, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce, DB, PATHS, $rootScope) {

                var WidgetMedia = this;
                WidgetMedia.API = null;
                WidgetMedia.showVideo = false;
                WidgetMedia.showSource = false;
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                WidgetMedia.onPlayerReady = function ($API) {
                    WidgetMedia.API = $API;
                };

                WidgetMedia.videoPlayerConfig = {
                    autoHide: false,
                    preload: "none",
                    sources: undefined,
                    tracks: undefined,
                    theme: {
                        url: "http://www.videogular.com/styles/themes/default/latest/videogular.css"
                    }
                };
                WidgetMedia.changeVideoSrc = function () {
                    if (WidgetMedia.item.data.videoUrl)
                        WidgetMedia.videoPlayerConfig.sources = [{
                            src: $sce.trustAsResourceUrl(WidgetMedia.item.data.videoUrl),
                            type: 'video/' + WidgetMedia.item.data.videoUrl.split('.').pop() //"video/mp4"
                        }];
                };
                MediaCenter.get().then(function (data) {
                    WidgetMedia.media = {
                        data: data.data
                    };
                    $rootScope.backgroundImage = WidgetMedia.media.data.design.backgroundImage;
                    console.log('Get Info---', data, 'data---');
                }, function (err) {
                    WidgetMedia.media = {
                        data: {}
                    };
                    console.log('Get Error---', err);
                });


                WidgetMedia.sourceChanged = function ($source) {
                    WidgetMedia.API.stop();
                };

                WidgetMedia.item = {
                    data: {
                        audioUrl: "",
                        body: "",
                        bodyHTML: "",
                        deepLinkUrl: "",
                        image: "",
                        links: [],
                        srcUrl: "",
                        summary: "",
                        title: "",
                        topImage: "",
                        videoUrl: ""
                    }
                };
                if (media) {
                    WidgetMedia.item = media;
                    console.log('initial', WidgetMedia.item);
                    WidgetMedia.changeVideoSrc();
                    WidgetMedia.iframeSrcUrl = $sce.trustAsUrl(WidgetMedia.item.data.srcUrl);
                }
                else {
                    WidgetMedia.iframeSrcUrl = '';
                }

                /*declare the device width heights*/
                $rootScope.deviceHeight = WidgetMedia.deviceHeight = window.innerHeight;
                $rootScope.deviceWidth = WidgetMedia.deviceWidth = window.innerWidth;

                /*initialize the device width heights*/
                var initDeviceSize = function (callback) {
                    WidgetMedia.deviceHeight = window.innerHeight;
                    WidgetMedia.deviceWidth = window.innerWidth;
                    if (callback) {
                        if (WidgetMedia.deviceWidth == 0 || WidgetMedia.deviceHeight == 0) {
                            setTimeout(function () {
                                initDeviceSize(callback);
                            }, 500);
                        } else {
                            callback();
                            if (!$scope.$$phase && !$scope.$root.$$phase) {
                                $scope.$apply();
                            }
                        }
                    }
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
                                Location.go(url);
                                break;
                        }
                    }
                });
                WidgetMedia.onUpdateFn = Buildfire.datastore.onUpdate(function (event) {
                    console.log('update called');
                    switch (event.tag) {
                        case COLLECTIONS.MediaContent:
                            if (event.data) {
                                WidgetMedia.item = event;
                                console.log('change', WidgetMedia.item);
                                $scope.$digest();
                            }
                            break;
                        case COLLECTIONS.MediaCenter:
                            WidgetMedia.media = event;
                            WidgetMedia.media.data.design.itemLayout = event.data.design.itemLayout;
                            $rootScope.backgroundImage = WidgetMedia.media.data.design.backgroundImage;
                            $scope.$apply();
                            break;
                    }
                });

                WidgetMedia.toggleShowVideo = function () {
                    WidgetMedia.showVideo = !WidgetMedia.showVideo;
                    if (WidgetMedia.showVideo)
                        WidgetMedia.API.play();
                    else
                        WidgetMedia.API.pause();
                };

                WidgetMedia.showSourceIframe = function () {
                    Buildfire.navigation.openWindow(WidgetMedia.item.data.srcUrl, '_system');
                };

                WidgetMedia.executeAction = function (actionItem) {
                    Buildfire.actionItems.execute(actionItem);
                };

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
                $scope.$on("$destroy", function () {
                    WidgetMedia.onUpdateFn.clear();
                });

                //Sync with Control section
                Messaging.sendMessageToControl({
                    name: EVENTS.ROUTE_CHANGE,
                    message: {
                        path: PATHS.MEDIA,
                        id: WidgetMedia.item.id || null
                    }
                });

            }]);
})(window.angular, window);