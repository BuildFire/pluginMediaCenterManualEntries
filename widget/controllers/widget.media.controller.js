(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", "DB", 'PATHS', '$rootScope','Location',
            function ($scope, $window, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce, DB, PATHS, $rootScope,Location) {

                var WidgetMedia = this;
                WidgetMedia.API = null;
                WidgetMedia.showVideo = false;
                WidgetMedia.showSource = false;
                WidgetMedia.loadingVideo = false;
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                WidgetMedia.onPlayerReady = function ($API) {
                    WidgetMedia.API = $API;
                    WidgetMedia.loadingVideo = true;
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
                }, function (err) {
                    WidgetMedia.media = {
                        data: {}
                    };
                    console.error('Get Error---', err);
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
                                        break;
                                    default :

                                        break
                                }
                                Location.go(url);
                                break;
                        }
                    }
                });
                WidgetMedia.onUpdateFn = Buildfire.datastore.onUpdate(function (event) {
                    switch (event.tag) {
                        case COLLECTIONS.MediaContent:
                            if (event.data) {
                                WidgetMedia.item = event;
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
                    var link = WidgetMedia.item.data.srcUrl;
                    if (!/^(?:f|ht)tps?\:\/\//.test(link)) {
                        link = "http://" + link;
                    }
                    Buildfire.navigation.openWindow(link, '_system');
                    /* WidgetMedia.showSource = !WidgetMedia.showSource;
                     if (WidgetMedia.showSource) {
                     $timeout(function () {
                     angular.element('#sourceIframe').attr('src', WidgetMedia.item.data.srcUrl);
                     }, 1000);
                     }*/
                };

                WidgetMedia.openLinks = function (actionItems) {
                    if (actionItems && actionItems.length) {
                        var options = {};
                        var callback = function (error, result) {
                            if (error) {
                                console.error('Error:', error);
                            }
                        };
                        Buildfire.actionItems.list(actionItems, options, callback);
                    }
                };

                WidgetMedia.executeAction = function (actionItem) {
                    Buildfire.actionItems.execute(actionItem);
                };

                WidgetMedia.videoLoaded = function () {
                    WidgetMedia.loadingVideo = false;
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

                /**
                 * Implementation of pull down to refresh
                 */
                var onRefresh=Buildfire.datastore.onRefresh(function(){
                });

                /**
                 * Unbind the onRefresh
                 */
                $scope.$on('$destroy', function () {
                    onRefresh.clear();
                    Buildfire.datastore.onRefresh(function(){
                        Location.goToHome();
                    });
                });

                $rootScope.$on('deviceLocked', function () {
                    // pause videogular video (if any)
                    if(WidgetMedia.API)
                    WidgetMedia.API.pause();

                    // pause Youtube video (no need to check if there is any yt video playing)
                    callPlayer('ytPlayer', 'pauseVideo');

                    // pause Vimeo video (no need to check if there is any vimeo video playing)
                    callVimeoPlayer('ytPlayer');
                });

            }]);
})(window.angular, window);