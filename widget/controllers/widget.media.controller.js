(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", "DB", 'AppDB', 'PATHS', '$rootScope','Location',
            function ($scope, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce, DB, AppDB, PATHS, $rootScope,Location) {

                var WidgetMedia = this;
                WidgetMedia.API = null;
                WidgetMedia.mediaType = null;
                WidgetMedia.showSource = false;
                WidgetMedia.loadingVideo = false;
                WidgetMedia.showVideo = false;

                WidgetMedia.fullScreen = false;
                WidgetMedia.oldVideoStyle={position:"",width:"",height:"",marginTop:""};
                WidgetMedia.oldiFrameStyle={height:""};
                WidgetMedia.oldBackgroundStyle={height:"",color:""};

                var Android = /(android)/i.test(navigator.userAgent);
                if(!buildfire.isWeb() && Android ) {
                    document.onfullscreenchange = function ( event ) {
                        if((document.fullscreenElement && (document.fullscreenElement.id=="ytPlayer"||document.fullscreenElement instanceof HTMLVideoElement))){
                            document.exitFullscreen();
                            WidgetMedia.handeFullScreen();
                        }
                    };
                }

                let MediaCenter = new DB(COLLECTIONS.MediaCenter),
                    GlobalPlaylist = new AppDB();

                WidgetMedia.handeFullScreen = function(){
                        WidgetMedia.fullScreen=!WidgetMedia.fullScreen;
                        $rootScope.fullScreen=WidgetMedia.fullScreen;
                        var video=document.getElementById("myVideo");
                        var backgroundImage=document.getElementById("backgroundImage");
                        if(WidgetMedia.fullScreen){
                                buildfire.appearance.fullScreenMode.enable(null, (err) => {
                                    WidgetMedia.oldVideoStyle.position=video.style.position;
                                    WidgetMedia.oldVideoStyle.width=video.style.width;
                                    WidgetMedia.oldVideoStyle.height=video.style.height;
                                    WidgetMedia.oldVideoStyle.marginTop=video.style.marginTop;
                                    WidgetMedia.oldBackgroundStyle.height=backgroundImage.style.height;
                                    WidgetMedia.oldBackgroundStyle.color=backgroundImage.style.backgroundColor;
                                    video.style.webkitTransform = 'rotate(90deg)'; 
                                    video.style.mozTransform = 'rotate(90deg)'; 
                                    video.style.msTransform = 'rotate(90deg)'; 
                                    video.style.oTransform = 'rotate(90deg)'; 
                                    video.style.transform = "rotate(90deg)";
                                    video.style.transformOrigin = "bottom left";
                                    video.style.position = "absolute"; 
                                    video.style.width = "calc(100vw*16/9)";
                                    video.style.height = "100vw";
                                    video.style.marginTop = "calc(-100vw + calc(100vh - calc(100vw * 16 / 9)) / 2)";
                                    backgroundImage.style.height ="100vh";
                                    backgroundImage.style.backgroundColor="black";
                                    if(video.getElementsByTagName('iframe') && video.getElementsByTagName('iframe')[0]){
                                        WidgetMedia.oldiFrameStyle.height=video.getElementsByTagName('iframe')[0].style.height;
                                        video.getElementsByTagName('iframe')[0].style.height="100vw";
                                    }
                            });
                            } else {
                                    buildfire.appearance.fullScreenMode.disable(null, (err) => {
                                    backgroundImage.style.height=WidgetMedia.oldBackgroundStyle.height;
                                    backgroundImage.style.backgroundColor=WidgetMedia.oldBackgroundStyle.color;
                                    video.style.webkitTransform = 'rotate(0deg)'; 
                                    video.style.mozTransform = 'rotate(0deg)'; 
                                    video.style.msTransform = 'rotate(0deg)'; 
                                    video.style.oTransform = 'rotate(0deg)'; 
                                    video.style.transform = "rotate(0deg)";
                                    video.style.position=WidgetMedia.oldVideoStyle.position;
                                    video.style.width=WidgetMedia.oldVideoStyle.width;
                                    video.style.height=WidgetMedia.oldVideoStyle.height;
                                    video.style.marginTop=WidgetMedia.oldVideoStyle.marginTop;
                                    if(video.getElementsByTagName('iframe') && video.getElementsByTagName('iframe')[0]){
                                        video.getElementsByTagName('iframe')[0].style.height=WidgetMedia.oldiFrameStyle.height;
                                    }
                                });
                            }
                }

                WidgetMedia.onPlayerReady = function ($API) {
                    WidgetMedia.API = $API;
                    WidgetMedia.loadingVideo = true;     
                    
                    if ($rootScope.autoPlay && WidgetMedia.item.data.videoUrl && !$rootScope.deepLinkNavigate) {
                        WidgetMedia.toggleShowVideo();
                    } else if($rootScope.skipMediaPage && WidgetMedia.item.data.videoUrl && !$rootScope.deepLinkNavigate) {
                        WidgetMedia.toggleShowVideo();
                    } 
                };

                WidgetMedia.onVideoError = (err) => console.error(err);

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
                        } else {
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
                    if (!media.data.videoUrl && !media.data.audioUrl) return $rootScope.playNextItem();

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
                                // Update item in globalPlaylist
                                if($rootScope.globalPlaylist && $rootScope.isInGlobalPlaylist(event.id)) {
                                    GlobalPlaylist.insertAndUpdate(event).then(() => {
                                        $rootScope.globalPlaylistItems.playlist[event.id] = event.data;
                                    });
                                }
                            }
                            break;
                        case COLLECTIONS.MediaCenter:
                            var old = WidgetMedia.media.data.design.itemLayout;
                            WidgetMedia.media = event;
                            $rootScope.backgroundImage = WidgetMedia.media.data.design.backgroundImage;
                            $rootScope.allowShare = WidgetMedia.media.data.content.allowShare;
                            $rootScope.allowSource = WidgetMedia.media.data.content.allowSource;
                            $rootScope.transferAudioContentToPlayList = WidgetMedia.media.data.content.transferAudioContentToPlayList;
                            $rootScope.forceAutoPlay = WidgetMedia.media.data.content.forceAutoPlay;
                            $rootScope.skipMediaPage = WidgetMedia.media.data.design.skipMediaPage;
                            
                            $rootScope.autoPlay = WidgetMedia.media.data.content.autoPlay;
                            $rootScope.autoPlayDelay = WidgetMedia.media.data.content.autoPlayDelay;
                            $rootScope.globalPlaylist = WidgetMedia.media.data.content.globalPlaylist;
                            $rootScope.globalPlaylistLimit = WidgetMedia.media.data.content.globalPlaylistLimit;

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

                Buildfire.appData.onUpdate(event => {
                    // Tag name for global playlist
                    const tagName = 'MediaContent' + ($rootScope.user && $rootScope.user._id ? $rootScope.user._id : Buildfire.context.deviceId ? Buildfire.context.deviceId : '');

                    if (event) {
                        if (event.tag === "GlobalPlayListSettings") {
                            if (event.data && typeof event.data.globalPlayListLimit !== 'undefined') {
                                $rootScope.globalPlayListLimit = event.data.globalPlayListLimit;
                            }
                        } else if (event.tag === tagName) {
                            if (event.data.playlist && event.data.playlist[WidgetMedia.item.id]) {
                                $rootScope.globalPlaylistItems.playlist[WidgetMedia.item.id] = event.data.playlist[WidgetMedia.item.id];
                            }
                        }
                    }
                });

                WidgetMedia.playAudio = function () {
                    Location.go('#/nowplaying/' + WidgetMedia.item.id, true);
                }

                WidgetMedia.ApplayUpdates = function () {
                    if ($rootScope.skipMediaPage && !WidgetMedia.item.data.videoUrl && WidgetMedia.item.data.audioUrl) {
                        if (WidgetMedia.showVideo) {
                            WidgetMedia.showVideo = false;
                            WidgetMedia.API.pause();
                        }
                        WidgetMedia.playAudio();
                    }  else if ($rootScope.autoPlay && !WidgetMedia.item.data.videoUrl && WidgetMedia.item.data.audioUrl) {
                        if (WidgetMedia.showVideo) {
                            WidgetMedia.showVideo = false;
                            WidgetMedia.API.pause();
                        }
                        WidgetMedia.playAudio()
                    }
                    else if ($rootScope.autoPlay && WidgetMedia.item.data.videoUrl) {
                        WidgetMedia.showVideo = true;
                        WidgetMedia.API.play();
                    }
                    else if ($rootScope.skipMediaPage && WidgetMedia.item.data.videoUrl) {
                        WidgetMedia.showVideo = true;
                        WidgetMedia.API.play();
                    } else {
                        WidgetMedia.showVideo = false;
                        WidgetMedia.API.pause();
                    }
                };

                WidgetMedia.goToNextItem = () => {
                    $rootScope.playNextItem();
                }

                // let interval;
                WidgetMedia.toggleShowVideo = function () {
                    WidgetMedia.showVideo = !WidgetMedia.showVideo;
                    
                    // Make sure the video is ready before playing it
                    // interval = setInterval(() => {
                    //     let video = document.querySelector("video");
                    //     if (video && video.readyState === 4) {
                    //         if (!$rootScope.autoPlay && WidgetMedia.showVideo) {
                    //             WidgetMedia.API.play();
                    //         } else {
                    //             WidgetMedia.API.pause();
                    //         }
                    //         if (interval) clearInterval(interval);
                    //     }
                    // }, 100);

                    // // Make sure the interval doesn't run forever
                    // setTimeout(() => {if (interval) clearInterval(interval)} , 15000);
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

                buildfire.auth.onLogin(function (user) {
                    bookmarks.sync($scope);
                    $rootScope.user = user;
                    $rootScope.refreshItems();
                });

                buildfire.auth.onLogout(function () {
                    bookmarks.sync($scope);
                    $rootScope.user = null;
                    $rootScope.refreshItems();
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
                    if (WidgetMedia && WidgetMedia.clearCountdown) {
                        WidgetMedia.clearCountdown();
                    }
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
                    if (WidgetMedia && WidgetMedia.clearCountdown) {
                        WidgetMedia.clearCountdown();
                    }
                    WidgetMedia= null;
                    Buildfire.datastore.onRefresh(function(){
                        Location.goToHome();
                    });
                });

                $rootScope.$watch('goingBackFullScreen', function () {
                    if($rootScope.goingBackFullScreen){
                        $rootScope.fullScreen=false;
                        WidgetMedia.handeFullScreen();
                    }
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