(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", "DB", 'AppDB', 'PATHS', '$rootScope', 'Location', 'OFSTORAGE', 'openedMediaHandler', 'DropboxLinksManager',
            function ($scope, $window, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce, DB, AppDB, PATHS, $rootScope, Location, OFSTORAGE, openedMediaHandler, DropboxLinksManager) {
                var WidgetMedia = this;
                WidgetMedia.API = null;
                $rootScope.online = $window.navigator.onLine;
                WidgetMedia.online = $window.navigator.onLine;
                WidgetMedia.mediaType = null;
                WidgetMedia.showSource = false;
                WidgetMedia.loadingVideo = false;
                WidgetMedia.error = "";
                WidgetMedia.showVideo = false;
                WidgetMedia.emptyBG = '../../../styles/media/holder-16x9.png';
                WidgetMedia.isWeb = Buildfire.getContext().device.platform == 'web';
                WidgetMedia.loadingData = false;

                WidgetMedia.fullScreen = false;
                WidgetMedia.oldVideoStyle = { position: "", width: "", height: "", marginTop: "" };
                WidgetMedia.oldiFrameStyle = { height: "" };
                WidgetMedia.oldBackgroundStyle = { height: "", color: "" };
                var Android = /(android)/i.test(navigator.userAgent);
                if (!buildfire.isWeb() && Android) {
                    document.onfullscreenchange = function (event) {
                        if ((document.fullscreenElement && document.fullscreenElement.id && (document.fullscreenElement.id == "videogularElement" || document.fullscreenElement instanceof HTMLVideoElement))) {
                            document.exitFullscreen();
                            WidgetMedia.handeFullScreen();
                        }
                    };
                }
                var allCheckViewFilter = {
                    filter: {
                        "_buildfire.index.string1": media.id+"-true"
                    },
                    skip: 0,
                    limit: 1,
                    recordCount: true
                };

                buildfire.publicData.search(allCheckViewFilter, COLLECTIONS.MediaCount, function (err, res) {
                    if (err) console.error(err);
                    
                    if (res && res.totalRecord && WidgetMedia) {
                        WidgetMedia.count = res.totalRecord;
                        if (!$scope.$$phase) $scope.$apply();
                    }
                })

                let MediaCenter = new DB(COLLECTIONS.MediaCenter),
                    GlobalPlaylist = new AppDB(),
                    CachedMediaCenter = new OFSTORAGE({
                        path: "/data/mediaCenterManual",
                        fileName: "cachedMediaCenter"
                    }),
                    DownloadedMedia = new OFSTORAGE({
                        path: "/data/mediaCenterManual",
                        fileName: "downloadedMedia"
                    });

                WidgetMedia.handeFullScreen = function () {
                    WidgetMedia.fullScreen = !WidgetMedia.fullScreen;
                    $rootScope.fullScreen = WidgetMedia.fullScreen;
                    var video = document.getElementById("myVideo");
                    var backgroundImage = document.getElementById("backgroundImage");
                    if (WidgetMedia.fullScreen) {
                        buildfire.appearance.fullScreenMode.enable(null, (err) => {
                            WidgetMedia.oldVideoStyle.position = video.style.position;
                            WidgetMedia.oldVideoStyle.width = video.style.width;
                            WidgetMedia.oldVideoStyle.height = video.style.height;
                            WidgetMedia.oldVideoStyle.marginTop = video.style.marginTop;
                            WidgetMedia.oldBackgroundStyle.height = backgroundImage.style.height;
                            WidgetMedia.oldBackgroundStyle.color = backgroundImage.style.backgroundColor;
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
                            backgroundImage.style.height = "100vh";
                            backgroundImage.style.backgroundColor = "black";
                            if (video.getElementsByTagName('iframe') && video.getElementsByTagName('iframe')[0]) {
                                WidgetMedia.oldiFrameStyle.height = video.getElementsByTagName('iframe')[0].style.height;
                                video.getElementsByTagName('iframe')[0].style.height = "100vw";
                            }
                        });
                    } else {
                        buildfire.appearance.fullScreenMode.disable(null, (err) => {
                            backgroundImage.style.height = WidgetMedia.oldBackgroundStyle.height;
                            backgroundImage.style.backgroundColor = WidgetMedia.oldBackgroundStyle.color;
                            video.style.webkitTransform = 'rotate(0deg)';
                            video.style.mozTransform = 'rotate(0deg)';
                            video.style.msTransform = 'rotate(0deg)';
                            video.style.oTransform = 'rotate(0deg)';
                            video.style.transform = "rotate(0deg)";
                            video.style.position = WidgetMedia.oldVideoStyle.position;
                            video.style.width = WidgetMedia.oldVideoStyle.width;
                            video.style.height = WidgetMedia.oldVideoStyle.height;
                            video.style.marginTop = WidgetMedia.oldVideoStyle.marginTop;
                            if (video.getElementsByTagName('iframe') && video.getElementsByTagName('iframe')[0]) {
                                video.getElementsByTagName('iframe')[0].style.height = WidgetMedia.oldiFrameStyle.height;
                            }
                        });
                    }
                    $scope.$apply();
                }

                WidgetMedia.showDrawer = function () {
                    let listItems = [];
                    if (WidgetMedia.media.data.content.allowAddingNotes !== false && $rootScope.online) {
                        listItems.push({ id: "addNote", text: getString("itemDrawer.addNote") });
                    }
                    if (WidgetMedia.media.data.content.allowOfflineDownload) {
                        if (WidgetMedia.item.data.videoUrl && $rootScope.online) {
                            if (WidgetMedia.item.data.hasDownloadedVideo) {
                                listItems.push({ id: "removeDownloadedVideo", text: getString("itemDrawer.removeDownloadedVideo") });
                            }

                            else {
                                if ($rootScope.currentlyDownloading.indexOf(WidgetMedia.item.id) < 0)
                                    listItems.push({ id: "downloadVideo", text: getString("itemDrawer.downloadVideo") });
                            }
                        }
                        if (WidgetMedia.item.data.audioUrl) {
                            if (WidgetMedia.item.data.hasDownloadedAudio) {
                                listItems.push({ id: "removeDownloadedAudio", text: getString("homeDrawer.removeDownloadedAudio") });
                            }
                            else {
                                if ($rootScope.currentlyDownloading.indexOf(WidgetMedia.item.id) < 0)
                                    listItems.push({ id: "downloadAudio", text: getString("homeDrawer.downloadAudio") });
                            }
                        }
                    }

                    if (WidgetMedia.media.data.content.allowShare && $rootScope.online) {
                        listItems.push({ id: "share", text: getString("itemDrawer.share") });
                    }

                    if (WidgetMedia.item.data.links.length && $rootScope.online) {
                        listItems.push({ id: "openLinks", text: getString("itemDrawer.openLinks") });
                    }

                    if (WidgetMedia.media.data.content.globalPlaylist && $rootScope.online && WidgetMedia.item.data.audioUrl) {
                        if ($rootScope.isInGlobalPlaylist(WidgetMedia.item.id)) {
                            listItems.push({ id: "removeFromPlaylist", text: getString("itemDrawer.removeFromPlaylist") });
                        }
                        else {
                            listItems.push({ id: "addToPlaylist", text: getString("itemDrawer.addToPlaylist") });
                        }
                    }

                    if ($rootScope.online) {
                        if (WidgetMedia.item.data.bookmarked) {
                            listItems.push({ id: "removeFromFavorites", text: getString("itemDrawer.removeFromFavorites") });
                        }
                        else {
                            listItems.push({ id: "favorite", text: getString("itemDrawer.favorite") });
                        }
                    }

                    buildfire.components.drawer.open(
                        {
                            isHTML: false,
                            listItems: listItems
                        },
                        (err, result) => {
                            if (err) return console.error(err);
                            buildfire.components.drawer.closeDrawer();
                            if (result) {
                                if (result.id == "downloadVideo") {
                                    $rootScope.download(WidgetMedia.item, "video");
                                }

                                if (result.id == "removeDownloadedVideo") {
                                    $rootScope.removeDownload(WidgetMedia.item, "video");
                                }

                                if (result.id == "downloadAudio") {
                                    $rootScope.download(WidgetMedia.item, "audio");
                                }

                                if (result.id == "removeDownloadedAudio") {
                                    $rootScope.removeDownload(WidgetMedia.item, "audio");
                                }

                                if (result.id == "share") {
                                    WidgetMedia.share(WidgetMedia.item);
                                }

                                if (result.id == "openLinks") {
                                    WidgetMedia.openLinks(WidgetMedia.item.data.links);
                                }

                                if (result.id == "addToPlaylist") {
                                    $rootScope.toggleGlobalPlaylistItem(WidgetMedia.item);
                                }

                                if (result.id == "removeFromPlaylist") {
                                    $rootScope.toggleGlobalPlaylistItem(WidgetMedia.item);
                                }

                                if (result.id == "addNote") {
                                    WidgetMedia.addNote(WidgetMedia.item);
                                }

                                if (result.id == "removeFromFavorites") {
                                    WidgetMedia.bookmark(WidgetMedia.item);
                                }

                                if (result.id == "favorite") {
                                    WidgetMedia.bookmark(WidgetMedia.item);
                                }
                            }
                        }
                    );
                };

                WidgetMedia.onPlayerReady = function ($API) {
                    WidgetMedia.API = $API;
                    WidgetMedia.loadingVideo = true;
                    WidgetMedia.fixIOSAutoPlay();
                    if ($rootScope.autoPlay) {
                        // Make sure the audio is turned off
                        Buildfire.services.media.audioPlayer.pause();
                    }

                    if ($rootScope.autoPlay && WidgetMedia.item.data.videoUrl && !$rootScope.deepLinkNavigate) {
                        WidgetMedia.toggleShowVideo();
                    } else if ($rootScope.skipMediaPage && WidgetMedia.item.data.videoUrl && !$rootScope.deepLinkNavigate) {
                        WidgetMedia.toggleShowVideo();
                    }
                };

                WidgetMedia.fixIOSAutoPlay = function () { //Ticket https://buildfire.atlassian.net/browse/CS-598
                    var video = angular.element('video');
                    if ($rootScope.autoPlay)
                        video.attr('autoplay', 'autoplay');//Solution https://stackoverflow.com/questions/24057565/video-autoplay-for-ios-not-working-in-app/24063028#24063028
                    else
                        video.removeAttr('autoplay');
                }

                $scope.onVideoStateChange = function (state) {
                    if (state === 'play') { // The video started playing
                        openedMediaHandler.add(WidgetMedia.item, 'Video', $rootScope.user?.userId);
                        if(!$rootScope.online){
                            $rootScope.markItemAsOpened(WidgetMedia.item.id)
                        }
                        if (!WidgetMedia.isCounted && $rootScope.user) {
                            var userCheckViewFilter = {
                                filter: getIndexedFilter(WidgetMedia.item.id, $rootScope.user._id, 'Video')
                            };
                            buildfire.publicData.search(userCheckViewFilter, COLLECTIONS.MediaCount, function (err, res) {
                                if (res.length > 0) {
                                    WidgetMedia.isCounted = true;
                                } else {
                                    let data = {
                                        mediaId: WidgetMedia.item.id,
                                        mediaType: "VIDEO",
                                        userId: $rootScope.user._id,
                                        isActive: true,
                                        _buildfire: {
                                            index: {
                                                string1: WidgetMedia.item.id + "-true",
                                                array1:[{
                                                    string1: "mediaCount-" + WidgetMedia.item.id + "-" + $rootScope.user._id + "-Video-true",
                                                }]
                                            },
                                        },
                                    }
                                    if(!$rootScope.indexingUpdateDoneV2){
                                        data._buildfire.index.text = WidgetMedia.item.id + "-" + $rootScope.user._id + "-Video-true";
                                    }
                                    buildfire.publicData.insert(data, COLLECTIONS.MediaCount, false, function (err, res) {
                                        WidgetMedia.isCounted = true;
                                        sendAnalytics(WidgetMedia);
                                    })
                                }
                            })
                        } else if(!WidgetMedia.isCounted){
                            let lastTimeWatched = localStorage.getItem(`${WidgetMedia.item.id}_videoPlayCount`);
                            if (!lastTimeWatched) {
                                localStorage.setItem(`${WidgetMedia.item.id}_videoPlayCount`, new Date().getTime());
                                sendAnalytics(WidgetMedia);
                            }
                        }
                        if (!WidgetMedia.isContinuesCounted) {
                            sendContinuesAnalytics(WidgetMedia);
                            WidgetMedia.isContinuesCounted = true;
                        }

                        // Make sure the audio is turned off
                        Buildfire.services.media.audioPlayer.pause();
                        $scope.videoPlayed = true;
                    }
                };

                const sendAnalytics = (WidgetMedia) => {
                    Analytics.trackAction(`${WidgetMedia.item.id}_videoPlayCount`);
                    Analytics.trackAction("allVideos_count");
                    Analytics.trackAction("allMediaTypes_count");
                }

                const sendContinuesAnalytics = (WidgetMedia) => {
                    Analytics.trackAction(`${WidgetMedia.item.id}_continuesVideoPlayCount`);
                    Analytics.trackAction("allVideos_continuesCount");
                    Analytics.trackAction("allMediaTypes_continuesCount");
                }

                const getIndexedFilter = (mediaId, userId, mediaType) => {
                    let filter = {};

                    if($rootScope.indexingUpdateDoneV2 === true){
                        filter = {
                            "_buildfire.index.array1.string1": "mediaCount-" + mediaId + "-" + userId + "-" + mediaType + "-true"
                        };
                    }else{
                        filter = {
                            "_buildfire.index.text": mediaId + "-" + userId + "-" + mediaType + "-true"
                        };
                    }

                    return filter;
                }
                // To overcome an issue with google showing it's play button on their videos
                $scope.videoAlreadyPlayed = () => {
                    if (WidgetMedia.item && WidgetMedia.item.data && WidgetMedia.item.data.videoUrl) {
                        return (WidgetMedia.item.data.videoUrl.indexOf('youtu.be') >= 0 || media.data.videoUrl.indexOf('youtube.com') >= 0) && !$scope.videoPlayed;
                    } else return false;
                }

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
                    if (WidgetMedia.item.data.videoUrl) {
                        var myType;
                        var videoUrlToSend = $scope.downloadedVideoUrl ? $scope.downloadedVideoUrl : WidgetMedia.item.data.videoUrl;
                        if (videoUrlToSend.includes("www.dropbox") || videoUrlToSend.includes("dl.dropbox.com")) {
                            videoUrlToSend = videoUrlToSend.replace("www.dropbox", "dl.dropboxusercontent");
                            videoUrlToSend = videoUrlToSend.replace("dl.dropbox.com", "dl.dropboxusercontent.com");
                            myType = videoUrlToSend.split('.').pop();
                        } else if (videoUrlToSend.includes("www.youtube") && videoUrlToSend.includes("/channel") && videoUrlToSend.includes("/live")) {
                            var liveId = videoUrlToSend.split("channel/")[1].split("/live")[0];
                            videoUrlToSend = "https://www.youtube.com/embed/live_stream?channel=" + liveId;
                            myType = videoUrlToSend.split('.').pop();
                        } else {
                            myType = videoUrlToSend.split('.').pop();
                        }
						myType = myType.split("?")[0];

                        $scope.videoPlayed = false;

						WidgetMedia.videoPlayerConfig.sources = [{
                            src: $rootScope.online ? $sce.trustAsUrl(videoUrlToSend) : videoUrlToSend,
                            type: 'video/' + myType //"video/mp4"
                        }];
                    }
                };

                if ($rootScope.online) {
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
                }

                else {
                    var _infoData = {
                        data: {
                            content: {
                                images: [],
                                descriptionHTML: '<p>&nbsp;<br></p>',
                                description: '',
                                sortBy: 'Newest',
                                rankOfLastItem: 0,
                                allowShare: true,
                                allowAddingNotes: true,
                                allowSource: true,
                                allowOfflineDownload: false,
                                forceAutoPlay: false,
                                autoPlay: false,
                                autoPlayDelay: { label: "Off", value: 0 },
                                globalPlaylist: false,
                                dateIndexed: true,
                                dateCreatedIndexed: true,
                                showViewCount: false,
                                indicatePlayedItems: false,
                            },
                            design: {
                                listLayout: "list-1",
                                itemLayout: "item-1",
                                backgroundImage: "",
                                skipMediaPage: false
                            }
                        }
                    };

                    CachedMediaCenter.get((err, res) => {
                        if (err) WidgetMedia.media = _infoData;
                        else {
                            WidgetMedia.media = res
                        }
                        $rootScope.backgroundImage = WidgetMedia.media && WidgetMedia.media.data && WidgetMedia.media.data.design && WidgetMedia.media.data.design.backgroundImage;
                        setTimeout(() => {
                            if (!$scope.$$phase) $scope.$apply();
                        }, 0);
                    });

                }

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
                    if (!media.data.videoUrl && !media.data.audioUrl && $rootScope.autoPlay) {
                        buildfire.dialog.toast({
                            message: getString("playlist.autoplayOff"),
                            type: "danger",
                            actionButton: {
                                text: getString("playlist.playNext"),
                                action: () => {
                                    setTimeout($rootScope.playNextItem, 500);
                                }
                            }
                        });
                    }
                    //Check if item has newly downloaded media
                    WidgetMedia.loadingData = true;

                    media.data.topImage = DropboxLinksManager.convertDropbox(media.data.topImage);
                    media.data.image = DropboxLinksManager.convertDropbox(media.data.image);
                    WidgetMedia.item = media;
                    WidgetMedia.mediaType = media.data.audioUrl ? 'AUDIO' : (media.data.videoUrl ? 'VIDEO' : null);
                    if(!WidgetMedia.mediaType){
                        openedMediaHandler.add(WidgetMedia.item, 'Article', $rootScope.user?.userId);
                        if(!$rootScope.online){
                            $rootScope.markItemAsOpened(WidgetMedia.item.id)
                        }
                    }
                    Buildfire.auth.getCurrentUser((err, user) => {
                        if(WidgetMedia.mediaType == null) {
                            sendArticleContinuesAnalytics(WidgetMedia);
                        }
                        if (user) {
                            $rootScope.user = user;
                            let userCheckViewFilter = {
                                filter: getIndexedFilter(WidgetMedia.item.id, user._id, "Article")
                            };
                            buildfire.publicData.search(userCheckViewFilter, COLLECTIONS.MediaCount, function (err, res) {
                                if (!WidgetMedia) return
                                if (res && res.length > 0) {
                                    WidgetMedia.isCounted = true;
                                } else if (WidgetMedia.mediaType == null) {
                                    let data = {
                                        mediaId: WidgetMedia.item.id,
                                        mediaType: "Article",
                                        userId: $rootScope.user._id,
                                        isActive: true,
                                        _buildfire: {
                                            index: {
                                                string1: WidgetMedia.item.id + "-true",
                                                array1:[{
                                                    string1: "mediaCount-" + WidgetMedia.item.id + "-" + $rootScope.user._id + "-Article-true",
                                                }]
                                            },
                                        },
                                    }
                                    if(!$rootScope.indexingUpdateDoneV2){
                                        data._buildfire.index.text= WidgetMedia.item.id + "-" + $rootScope.user._id + "-Article-true";
                                    }
                                    buildfire.publicData.insert(data, COLLECTIONS.MediaCount, false, function (err, res) {
                                        if (!WidgetMedia) return;
                                        WidgetMedia.isCounted = true;
                                        sendArticleAnalytics(WidgetMedia);
                                    })
                                }

                            })
                        } else {
                            if (WidgetMedia.mediaType == null) {
                                let lastTimeWatched = localStorage.getItem(`${WidgetMedia.item.id}_articleOpenCount`);
                                if (!lastTimeWatched) {
                                    localStorage.setItem(`${WidgetMedia.item.id}_articleOpenCount`, new Date().getTime());
                                    sendArticleAnalytics(WidgetMedia);
                                }
                            }
                        }
                    })

                    const sendArticleAnalytics = WidgetMedia => {
                        Analytics.trackAction(`${WidgetMedia.item.id}_articleOpenCount`);
                        Analytics.trackAction("allArticles_count");
                        Analytics.trackAction("allMediaTypes_count");
                    }

                    const sendArticleContinuesAnalytics = WidgetMedia => {
                        Analytics.trackAction(`${WidgetMedia.item.id}_continuesArticleOpenCount`);
                        Analytics.trackAction("allArticles_continuesCount");
                        Analytics.trackAction("allMediaTypes_continuesCount");
                    }

                    bookmarks.sync($scope);
                    WidgetMedia.changeVideoSrc();

                    WidgetMedia.iframeSrcUrl = $sce.trustAsUrl(WidgetMedia.item.data.srcUrl);
                    if ($rootScope.deepLinkNavigate && $rootScope.seekTime) {
                        if (WidgetMedia.mediaType == 'VIDEO') {
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
                            if (!$scope.$$phase) {
                                $scope.$apply();
                            }
                        }
                    }
                };

                Buildfire.publicData.onUpdate(event => {
                    if (event.data && event.tag == COLLECTIONS.MediaCount) {
                        WidgetMedia.count = WidgetMedia.count ? WidgetMedia.count + 1 : 1;
                        if ($scope && !$scope.$$phase) $scope.$apply();
                        $rootScope.refreshItems();

                    }
                });

                WidgetMedia.playAudio = function () {
                    let mediaId = WidgetMedia.item.id;
                    if (!mediaId) return;
                    Location.go('#/nowplaying/' + mediaId, true);
                }

                WidgetMedia.ApplayUpdates = function () {
                    if (($rootScope.autoPlay || $rootScope.skipMediaPage) && WidgetMedia.item.data.videoUrl) {
                        WidgetMedia.toggleShowVideo(true);
                    } else {
                        WidgetMedia.showVideo = false;
                        if(WidgetMedia.API) WidgetMedia.API.pause();

                        if (($rootScope.skipMediaPage || $rootScope.autoPlay) && !WidgetMedia.item.data.videoUrl && WidgetMedia.item.data.audioUrl) {
                            WidgetMedia.playAudio();
                        }
                    }
                };

                WidgetMedia.goToNextItem = () => {
                    $rootScope.playNextItem();
                }

                WidgetMedia.toggleShowVideo = function (forceShow) {
                    if ((!$rootScope.online && !$rootScope.allowOfflineDownload) || ((!$rootScope.online && $rootScope.allowOfflineDownload && !WidgetMedia.item.data.hasDownloadedVideo))) {
                        buildfire.dialog.show(
                            {
                                title: "Video not available offline",
                                message:
                                    "The video you are trying to view has not been downloaded.",
                                isMessageHTML: true,
                                actionButtons: [
                                    {
                                        text: "Ok",
                                        type: "primary",
                                        action: () => {
                                        },
                                    },
                                ],
                            },
                            (err, actionButton) => {
                            }
                        );
                        return;
                    }
                    WidgetMedia.showVideo = forceShow ? true : !WidgetMedia.showVideo;
                    if (!$scope.$$phase) {
                        $scope.$apply();
                        $scope.$digest();
                    }
                };

                WidgetMedia.showSourceIframe = function () {
                    var link = WidgetMedia.item.data.srcUrl;
                    if (!/^(?:f|ht)tps?\:\/\//.test(link)) {
                        link = "http://" + link;
                    }
                    Buildfire.navigation.openWindow(link, '_system');
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
                    if (!buildfire.isWeb() && Android) {//set next video to fullscreen mode
                        if ($rootScope.fullScreen && !WidgetMedia.fullScreen) {
                            WidgetMedia.handeFullScreen();
                        }
                    }
                    WidgetMedia.loadingVideo = false;
                };

                WidgetMedia.bookmark = function () {
                    var isBookmarked = WidgetMedia.item.data.bookmarked ? true : false;
                    if (isBookmarked) {
                        bookmarks.delete($scope, WidgetMedia.item);
                    } else {
                        bookmarks.add($scope, WidgetMedia.item);
                    }
                };

                WidgetMedia.share = function () {
                    var link = {};
                    link.title = WidgetMedia.item.data.title;
                    link.type = "website";
                    link.description = WidgetMedia.item.data.summary ? WidgetMedia.item.data.summary : '';
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
                            }, function (err, result) { });

                        }
                    });
                };

                WidgetMedia.getVideoDownloadURL = function () {
                    if (WidgetMedia.item.data.videoUrl) {
                        var myType;
                        var source;
                        var videoUrlToSend = WidgetMedia.item.data.videoUrl;
                        if (videoUrlToSend.includes("www.dropbox") || videoUrlToSend.includes("dl.dropbox.com")) {
                            videoUrlToSend = videoUrlToSend.replace("www.dropbox", "dl.dropboxusercontent");
                            videoUrlToSend = videoUrlToSend.replace("dl.dropbox.com", "dl.dropboxusercontent.com");
                            myType = videoUrlToSend.split('.').pop();
                            source = "dropbox";
                        } else {
                            source = videoUrlToSend.includes("youtube.com") ? "youtube" : videoUrlToSend.includes("vimeo") ? "vimeo" : "other";
                            myType = videoUrlToSend.split('.').pop();
                        }
						myType = myType.split("?")[0];
                        return {
                            uri: videoUrlToSend,
                            type: myType,
                            source: source
                        }
                    }
                }

                WidgetMedia.getAudioDownloadURL = function () {
                    if (WidgetMedia.item.data.audioUrl) {
                        var myType;
                        var audioUrlToSend = WidgetMedia.item.data.audioUrl;
                        myType = audioUrlToSend.split('.').pop();
						myType = myType.split("?")[0];
                        return {
                            uri: audioUrlToSend,
                            type: myType,
                        }
                    }
                }

                WidgetMedia.isDownloading = function (item) {
                    return $rootScope.currentlyDownloading.indexOf(item.id) > -1;
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

                WidgetMedia.openLink = function (item) {
                    let link = item.data.srcUrl;
                    if (!link && item.data.audioUrl) {
                        link = item.data.audioUrl;
                    } else if (!link && item.data.videoUrl) {
                        link = item.data.videoUrl;
                    }
                    Buildfire.navigation.openWindow(link, '_system');
                };

                //Sync with Control section
                Messaging.onReceivedMessage = (event) => {
                    if (event.message && event.message.path == 'MEDIA') {
                        Location.go('#/media/' + event.message.id, true);
                    } else if (event.name === EVENTS.ITEMS_CHANGE) {
                        WidgetMedia.item = event.message.itemUpdatedData;
                        WidgetMedia.changeVideoSrc();
                    } else if (event.name === EVENTS.ROUTE_CHANGE) {
                        Location.goToHome();
                    } else if (event.name === EVENTS.DESIGN_LAYOUT_CHANGE) {
                        WidgetMedia.media.data.design = event.message.design
                    }

                    if ($rootScope.autoPlay || $rootScope.skipMediaPage) {
                        setTimeout(() => {
                            WidgetMedia.ApplayUpdates();
                        }, 50);
                    }
                    if (!$scope.$$phase) {
                        $scope.$apply();
                        $scope.$digest();
                    }
                };
                if (WidgetMedia.item.id !== 'mockId') {
                    Messaging.sendMessageToControl({
                        name: EVENTS.ROUTE_CHANGE,
                        message: {
                            path: PATHS.MEDIA,
                            id: WidgetMedia.item.id || null
                        }
                    });
                }
                if (media.data.audioUrl && $rootScope.skipMediaPage && WidgetMedia) {
                    WidgetMedia.playAudio();
                }

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

                $scope.$watch('downloadedVideoUrl', function (newValue, oldValue) {
                    if (newValue) {
                        if (oldValue != newValue) {
                            WidgetMedia.changeVideoSrc();
                        }
                    }
                });
                $scope.$on("$destroy", function () {
                    if (WidgetMedia && WidgetMedia.clearCountdown) {
                        WidgetMedia.clearCountdown();
                    }
                });

                $rootScope.$watch('goingBackFullScreen', function () {
                    if ($rootScope.goingBackFullScreen) {
                        $rootScope.fullScreen = false;
                        WidgetMedia.handeFullScreen();
                    }
                });

                $rootScope.$on('deviceLocked', function () {
                    // pause videogular video (if any)
                    if (WidgetMedia.API)
                        WidgetMedia.API.pause();

                    // pause Youtube video (no need to check if there is any yt video playing)
                    callPlayer('ytPlayer', 'pauseVideo');

                    // pause Vimeo video (no need to check if there is any vimeo video playing)
                    callVimeoPlayer('ytPlayer');
                });

            }]);
})(window.angular, window);
