(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", "DB", 'PATHS', '$rootScope','Location',
            function ($scope, $window, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce, DB, PATHS, $rootScope,Location) {

                var WidgetMedia = this;
                WidgetMedia.API = null;
                WidgetMedia.mediaType = null;
                WidgetMedia.showVideo = false;
                WidgetMedia.showSource = false;
                WidgetMedia.loadingVideo = false;
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);

                WidgetMedia.onPlayerReady = function ($API) {
                    WidgetMedia.API = $API;
                    WidgetMedia.loadingVideo = true;              
                    if(WidgetMedia.media.data.design.skipMediaPage&&WidgetMedia.item.data.videoUrl && !$rootScope.deepLinkNavigate)
                        WidgetMedia.toggleShowVideo();
                    };

                WidgetMedia.videoPlayerConfig = {
                    autoHide: false,
                    preload: "none",
                    sources: undefined,
                    tracks: undefined,
                    theme: {
                        url: "./assets/css/videogular.css"
                    }
                };
                WidgetMedia.changeVideoSrc = function () {
                    if (WidgetMedia.item.data.videoUrl){
                        var myType;
                        var videoUrlToSend=WidgetMedia.item.data.videoUrl;
                        if(videoUrlToSend.includes("www.dropbox")||videoUrlToSend.includes("dl.dropbox.com")){
                            videoUrlToSend=videoUrlToSend.replace("www.dropbox","dl.dropboxusercontent").split("?dl=")[0];
                            videoUrlToSend=videoUrlToSend.replace("dl.dropbox.com","dl.dropboxusercontent.com");
                            myType=videoUrlToSend.split('.').pop();
                        }else if(videoUrlToSend.includes("drive.google.com")){
                            //var urlArray=videoUrlToSend.replace("/view","").replace("/preview","").split("/");
                            //var urlId=urlArray[urlArray.length-1].split("?")[0];
                            //videoUrlToSend="https://drive.google.com/uc?id="+urlId;
                            videoUrlToSend=WidgetMedia.item.data.videoUrl.replace("/view","/preview").split("?")[0];
                            WidgetMedia.item.data.videoUrl=videoUrlToSend;
                            //var frame=document.getElementsByTagName("iframe")[0];
                            //frame.setAttribute("src",WidgetMedia.item.data.videoUrl);
                            myType="mp4";
                        }
                        else{
                            myType=videoUrlToSend.split('.').pop();
                        }
                        WidgetMedia.videoPlayerConfig.sources = [{
                            src: $sce.trustAsResourceUrl(videoUrlToSend),
                            type: 'video/' + myType //"video/mp4"
                        }];
                    }
                };
                MediaCenter.get().then(function (data) {
                    WidgetMedia.media = {
                        data: data.data
                    };
                    $rootScope.backgroundImage = WidgetMedia.media && WidgetMedia.media.data && WidgetMedia.media.data.design && WidgetMedia.media.data.design.backgroundImage;
                }, function (err) {
                    WidgetMedia.media = {
                        data: {}
                    };
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
                    WidgetMedia.mediaType = media.data.audioUrl ? 'AUDIO' : (media.data.videoUrl ?  'VIDEO' : null);
                    WidgetMedia.item.srcUrl = media.data.srcUrl ? media.data.srcUrl 
                    : (media.data.audioUrl ? media.data.audioUrl : media.data.videoUrl);
                    bookmarks.sync($scope);
                    WidgetMedia.changeVideoSrc();
                    WidgetMedia.iframeSrcUrl = $sce.trustAsUrl(WidgetMedia.item.data.srcUrl);
                    if($rootScope.deepLinkNavigate && $rootScope.seekTime) {
                        if(WidgetMedia.mediaType == 'VIDEO') {
                            var retry = setInterval(function () {
                                if (!WidgetMedia.API || !WidgetMedia.API.isReady || WidgetMedia.API.totalTime === 0) {
                                    return;
                                } else {
                                    clearInterval(retry);
                                    WidgetMedia.API.seekTime($rootScope.seekTime);
                                    WidgetMedia.toggleShowVideo();
                                    $rootScope.deepLinkNavigate = null;
                                    $rootScope.seekTime = null;
                                    setTimeout(function () {
                                            WidgetMedia.API.play();
                                    }, 500);
                                }
                            }, 500);
                        } 
                    }
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
                            var old=WidgetMedia.media.data.design.itemLayout;
                            WidgetMedia.media = event;
                            $rootScope.backgroundImage = WidgetMedia.media.data.design.backgroundImage;
                            $rootScope.allowShare = WidgetMedia.media.data.content.allowShare;
                            $rootScope.allowSource = WidgetMedia.media.data.content.allowSource;
                            WidgetMedia.media.data.design.itemLayout = event.data.design.itemLayout;
                            if(old == WidgetMedia.media.data.design.itemLayout)WidgetMedia.ApplayUpdates();
                            $scope.$apply();
                            if(old != WidgetMedia.media.data.design.itemLayout)
                            $scope.$$postDigest(function () {
                                WidgetMedia.ApplayUpdates();
                              })
                            break;
                    }
                });
                WidgetMedia.playAudio = function () {
                    Location.go('#/nowplaying/' + WidgetMedia.item.id, true);
                }
                WidgetMedia.ApplayUpdates = function () {
                    if(WidgetMedia.media.data.design.skipMediaPage&&!WidgetMedia.item.data.videoUrl&&WidgetMedia.item.data.audioUrl)
                    {
                        if(WidgetMedia.showVideo){
                            WidgetMedia.showVideo=false;
                            WidgetMedia.API.pause();
                        }
                        Location.go('#/nowplaying/' + WidgetMedia.item.id, true);
                    }
                    else if(WidgetMedia.media.data.design.skipMediaPage&&WidgetMedia.item.data.videoUrl){
                        WidgetMedia.showVideo=true;
                        WidgetMedia.API.play();
                    }else{
                        WidgetMedia.showVideo=false;
                        WidgetMedia.API.pause();
                    }
                };

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

                buildfire.auth.onLogin(function () {
                    bookmarks.sync($scope);
                });

                buildfire.auth.onLogout(function () {
                    bookmarks.sync($scope);
                });

                WidgetMedia.bookmark = function ($event) {
                    $event.stopImmediatePropagation();
                    var isBookmarked = WidgetMedia.item.data.bookmarked ? true : false;
                    if (isBookmarked) {
                        bookmarks.delete($scope, WidgetMedia.item);
                    } else {
                        bookmarks.add($scope, WidgetMedia.item);
                    }
                };

                WidgetMedia.share = function ($event) {
                    $event.stopImmediatePropagation();

                    var link = {};
                    link.title = WidgetMedia.item.data.title;
                    link.type = "website";
                    link.description = WidgetMedia.item.data.summary ? WidgetMedia.item.data.summary : null;                    
                    link.data = {
                        "mediaId": WidgetMedia.item.id
                    };
                    
                    buildfire.deeplink.generateUrl(link, function (err, result) {
                        if (err) {
                            console.error(err)
                        } else {
                            buildfire.device.share({
                                subject: link.title,
                                text: link.description,
                                image: link.imageUrl,
                                link: result.url
                            }, function(err, result) {});

                        }
                    });
                };

                WidgetMedia.addNote = function () {
                    var options = {
                        itemId: WidgetMedia.item.id,
                        title: WidgetMedia.item.data.title,
                        imageUrl: WidgetMedia.item.data.topImage
                    };
                    if (WidgetMedia.mediaType === 'VIDEO' && WidgetMedia.API) {
                        options.timeIndex = WidgetMedia.API.currentTime / 1000;
                    }

                    var callback = function (err, data) {
                        if (err) throw err;
                        console.log(data);
                    };

                    buildfire.notes.openDialog(options, callback);
                };

                WidgetMedia.openLink = function (link) {
                    Buildfire.navigation.openWindow(link, '_system');
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