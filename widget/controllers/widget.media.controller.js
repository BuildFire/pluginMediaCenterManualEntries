(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', 'Messaging', 'Buildfire', 'COLLECTIONS', 'media', 'EVENTS', '$timeout', "$sce", "DB", 'AppDB', 'PATHS', '$rootScope', 'Location', 'OFSTORAGE', 'openedMediaHandler', 'DropboxLinksManager', 'VideoJSController', '$location',
            function ($scope, $window, Messaging, Buildfire, COLLECTIONS, media, EVENTS, $timeout, $sce, DB, AppDB, PATHS, $rootScope, Location, OFSTORAGE, openedMediaHandler, DropboxLinksManager, VideoJSController, $location) {
                var WidgetMedia = this;
                $rootScope.online = $window.navigator.onLine;
                WidgetMedia.online = $window.navigator.onLine;
                WidgetMedia.mediaType = null;
                WidgetMedia.showSource = false;
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

                WidgetMedia.openMediaComments = function (commentIds = []) {
                    buildfire.spinner.show();

                    const commentOptions = {
                        itemId: WidgetMedia.item.id,
                        translations: {
                          you: getString('comments.you'),
                          someone: getString('comments.someone'),
                          report: getString('comments.report'),
                          delete: getString('comments.delete'),
                          readMore: getString('comments.readMore'),
                          readLess: getString('comments.readLess'),
                          commentsHeader: getString('comments.commentsHeader'),
                          emptyStateTitle: getString('comments.emptyStateTitle'),
                          emptyStateMessage: getString('comments.emptyStateMessage'),
                          addCommentPlaceholder: getString('comments.addCommentPlaceholder'),
                          commentReported: getString('comments.commentReported'),
                          commentDeleted: '',
                          commentAdded: '',
                        }
                    };

                    if (commentIds && commentIds.length) {
                        commentOptions.filter = { commentIds };
                    }

                    buildfire.components.comments.open(commentOptions, (error) => {
                        buildfire.spinner.hide();
                        if (error) {
                            buildfire.dialog.toast({
                                message: getLanguageValue('comments.openCommentError'),
                                type: 'danger'
                            });
                            console.error(error);
                        }

                        if (commentIds && commentIds.length) {
                            buildfire.services.reportAbuse.triggerWidgetReadyForAdminResponse();

                            buildfire.services.reportAbuse.onAdminResponse((event) => {
                                if (event.action === "markSafe") { // keep the comment
                                    buildfire.services.reportAbuse.triggerOnAdminResponseHandled({ reportId: event.report.id });
                                    buildfire.components.comments.close()
                                } else if (event.action === "markAbuse") { // delete the comment
                                    buildfire.components.comments.deleteComment({
                                        itemId: WidgetMedia.item.id,
                                        commentId: commentIds[0]
                                    }, (error) => {
                                        if (error) {
                                            console.error(error);
                                        } else {
                                            buildfire.services.reportAbuse.triggerOnAdminResponseHandled({ reportId: event.report.id });
                                            buildfire.components.comments.close()
                                        }
                                    });
                                }
                            });
                        }
                    });
                    buildfire.components.comments.onAdd = () => {
                        const commentsContainer = document.getElementById('comments');
                        if (commentsContainer) {
                            getCommentsCount().then(count => {
                                commentsContainer.querySelector('.count-container').innerHTML = count.toLocaleString('en-US');
                            }).catch((err) => {
                                console.error(err);
                            });
                        }
                    }
                    buildfire.components.comments.onDelete = () => {
                        const commentsContainer = document.getElementById('comments');
                        if (commentsContainer) {
                            getCommentsCount().then(count => {
                                commentsContainer.querySelector('.count-container').innerHTML = count.toLocaleString('en-US');
                            }).catch((err) => {
                                console.error(err);
                            });
                        }
                    }
                };

                WidgetMedia.allowUserComment = () => {
                    let allowToComment = false;

                    if ($rootScope.comments && $rootScope.comments.value) {
                        if ($rootScope.comments.value === 'none') allowToComment = false;
                        else if ($rootScope.comments.value === 'all') allowToComment = true;
                        else if ($rootScope.comments.value === 'tags') {
                            const appId = buildfire.getContext().appId;
                            const userTags = $rootScope.user.tags[appId];
                            const commentTags = $rootScope.comments.tags;

                            for (let i=0; i<commentTags.length; i++) {
                                if (userTags.some(_tag => _tag.tagName === commentTags[i].tagName)) {
                                    allowToComment = true;
                                    break;
                                }
                            }
                            return allowToComment;
                        }
                    }
                    return allowToComment;
                };

                const getCommentsCount = () => {
                    return new Promise((resolve, reject) => {
                        buildfire.components.comments.getSummaries({
                            itemIds: [WidgetMedia.item.id]
                        },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                let count = 0;
                                if (result && result[0] && result[0].count) count = result[0].count;
                                resolve(count);
                            }
                        })
                    });
                }

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

                WidgetMedia.changeVideoSrc = function () {
                    if (WidgetMedia.item.data.videoUrl) {
                        let videoType;
                        let videoUrlToSend = $scope.downloadedVideoUrl ? $scope.downloadedVideoUrl : WidgetMedia.item.data.videoUrl;
                        videoUrlToSend = DropboxLinksManager.convertDropbox(videoUrlToSend);

                        if (videoUrlToSend.includes("www.youtube") && videoUrlToSend.includes("/channel") && videoUrlToSend.includes("/live")) {
                            let liveId = videoUrlToSend.split("channel/")[1].split("/live")[0];
                            videoUrlToSend = "https://www.youtube.com/embed/live_stream?channel=" + liveId;
                        }

                        if (videoUrlToSend.includes("youtube.com") || videoUrlToSend.includes("youtu.be")) {
                            videoType = "video/youtube";
                        } else if (videoUrlToSend.includes("vimeo.com")) {
                            videoType = "video/vimeo";
                        } else {
                            videoType = "video/mp4";
                        }

                        WidgetMedia.videoType = videoType;
                    }
                };

                function getFavoriteIcon() {
                    if (WidgetMedia.item && WidgetMedia.item.data && WidgetMedia.item.data.bookmarked) {
                        return {id: 'favorite', iconName: 'star'};
                    }
                    return {id: 'favorite', iconName: 'star_outline'};
                }
                function getPlaylistIcon() {
                    if ($rootScope.isInGlobalPlaylist(WidgetMedia.item.id)) {
                        return {id: 'playlist', iconName: 'playlist_remove'};
                    }
                    return {id: 'playlist', iconName: 'playlist_add'};
                }

                function getIconText(iconId) {
                    if (iconId === 'note') return getString("itemDrawer.addNote")
                    if (iconId === 'downloadVideo') {
                        if (WidgetMedia.item.data.hasDownloadedVideo) return getString("itemDrawer.removeDownloadedVideo");
                        return getString("itemDrawer.downloadVideo");
                    }
                    if (iconId === 'downloadAudio') {
                        if (WidgetMedia.item.data.hasDownloadedAudio) return getString("itemDrawer.removeDownloadedAudio");
                        return getString("homeDrawer.downloadAudio");
                    }

                    if (iconId === 'share') return getString("itemDrawer.share");
                    if (iconId === 'sourceLink') return getString("itemDrawer.mediaSource");
                    if (iconId === 'openActionLinks') return getString("itemDrawer.openLinks");

                    if (iconId === 'favorite') {
                        if (WidgetMedia.item.data.bookmarked) return getString("itemDrawer.removeFromFavorites");
                        return getString("itemDrawer.favorite");
                    }

                    if (iconId === 'playlist') {
                        if ($rootScope.isInGlobalPlaylist(WidgetMedia.item.id)) return getString("itemDrawer.removeFromPlaylist");
                        return getString("itemDrawer.addToPlaylist");
                    }
                }

                WidgetMedia.initMediaActionIcons = () => {
                    let icons = [
                        {id: 'views', iconName: 'visibility'},
                        {id: 'comments', iconName: 'chat_bubble_outline'},
                        {id: 'share', iconName: 'share'},
                        { ...getFavoriteIcon() }, // favorite icon
                        {id: 'note', iconName: 'note_add'},
                        {id: 'downloadVideo', iconName: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">\n<g clip-path="url(#clip0_1664_11661)">\n<path d="M3 5H21V10H23V5C23 3.9 22.1 3 21 3H3C1.9 3 1 3.9 1 5V17C1 18.1 1.9 19 3 19H12V17H3V5Z" fill="#46BFE6"/>\n<path d="M15 11L9 7V15L15 11Z" fill="#46BFE6"/>\n<path d="M24 18.4167L22.59 17.1242L20 19.4892L20 12L18 12L18 19.4892L15.41 17.1242L14 18.4167L19 23L24 18.4167Z" fill="#46BFE6"/>\n</g>\n<defs>\n<clipPath id="clip0_1664_11661">\n<rect width="24" height="24" fill="white"/>\n</clipPath>\n</defs>\n</svg>'},
                        {id: 'downloadAudio', iconName: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">\n<g clip-path="url(#clip0_1664_11652)">\n<path d="M8 3L8.01 13.55C7.41 13.21 6.73 13 6.01 13C3.79 13 2 14.79 2 17C2 19.21 3.79 21 6.01 21C8.23 21 10 19.21 10 17V7H14V3H8Z" fill="#46BFE6"/>\n<path d="M22 16L20.59 14.59L18 17.17L18 9L16 9L16 17.17L13.41 14.59L12 16L17 21L22 16Z" fill="#46BFE6"/>\n</g>\n<defs>\n<clipPath id="clip0_1664_11652">\n<rect width="24" height="24" fill="white"/>\n</clipPath>\n</defs>\n</svg>'},
                        {id: 'sourceLink', iconName: '<i class="glyphicon share glyphicon-link" role="button" aria-label="Audio Item source button"></i>'},
                        {id: 'openActionLinks', iconName: 'flowchart'},
                        { ...getPlaylistIcon() }, // playlist icon
                    ];

                    if (!WidgetMedia.media.data.content.showViewCount) {
                        icons = icons.filter(_icon => _icon.id !== 'views');
                    }
                    if (!WidgetMedia.allowUserComment()) {
                        icons = icons.filter(_icon => _icon.id !== 'comments');
                    }
                    if (!WidgetMedia.media.data.content.allowShare) {
                        icons = icons.filter(_icon => _icon.id !== 'share');
                    }
                    if (!WidgetMedia.media.data.content.allowAddingNotes) {
                        icons = icons.filter(_icon => _icon.id !== 'note');
                    }
                    if (!WidgetMedia.item.data.links || !WidgetMedia.item.data.links.length || !$rootScope.online) {
                        icons = icons.filter(_icon => _icon.id !== 'openActionLinks');
                    }
                    if (!WidgetMedia.media.data.content.allowOfflineDownload) {
                        icons = icons.filter(_icon => _icon.id !== 'downloadVideo' && _icon.id !== 'downloadAudio');
                    } else {
                        if (!WidgetMedia.item.data || !WidgetMedia.item.data.audioUrl || WidgetMedia.item.data.audioUrl === '') icons = icons.filter(_icon => _icon.id !== 'downloadAudio');
                        if (!WidgetMedia.item.data || !WidgetMedia.item.data.videoUrl || WidgetMedia.item.data.videoUrl === '') icons = icons.filter(_icon => _icon.id !== 'downloadVideo');
                    }
                    if (!WidgetMedia.media.data.content.allowSource || !WidgetMedia.item.data || (!WidgetMedia.item.data.srcUrl && !WidgetMedia.item.data.videoUrl && !WidgetMedia.item.data.audioUrl)) {
                        icons = icons.filter(_icon => _icon.id !== 'sourceLink');
                    }
                    if (!WidgetMedia.media.data.content.globalPlaylist || !$rootScope.online || !WidgetMedia.item.data.audioUrl || !WidgetMedia.item.data.videoUrl) {
                        icons = icons.filter(_icon => _icon.id !== 'playlist');
                    }

                    const mediaActionIconsContainer = document.getElementById('mediaActionIcons');
                    if (!mediaActionIconsContainer) return;
                    mediaActionIconsContainer.innerHTML = '';

                    let maxIconsCount = 5;
                    if (WidgetMedia.media.data && WidgetMedia.media.data.design && WidgetMedia.media.data.design.itemLayout === "item-2") {
                        maxIconsCount = 4;
                    }

                    const visibleIcons = icons.slice(0, maxIconsCount);
                    const hiddenIcons = icons.slice(maxIconsCount);

                    visibleIcons.forEach((icon, index) => {
                        if (index === maxIconsCount-1 && hiddenIcons.length > 0) {
                            const moreIcon = document.createElement('div');
                            moreIcon.classList.add('flex');
                            moreIcon.classList.add('flex-align-center');
                            moreIcon.classList.add('flex-justify-end');
                            moreIcon.innerHTML = '<i class="material-icons-outlined">more_horiz</i>';
                            moreIcon.onclick = () => {
                                const drawerItems = [icon].concat(hiddenIcons).map(i => ({id: i.id, text: getIconText(i.id)}));
                                buildfire.components.drawer.open({listItems: drawerItems}, (err, result) => {
                                    if (err) console.error(err);
                                    if (result) handleIconAction(result.id);
                                    buildfire.components.drawer.closeDrawer();
                                });
                            };
                            mediaActionIconsContainer.appendChild(moreIcon);
                        } else {
                            const iconEl = document.createElement('div');
                            iconEl.id = icon.id;
                            iconEl.classList.add('flex');
                            iconEl.classList.add('flex-align-center');
                            iconEl.classList.add('cursor-pointer');
                            if (index > 0 && icon.id !== 'views' && icon.id !== 'comments') {
                                let newClass = 'flex-justify-center';
                                if (index === (visibleIcons.length - 1)) newClass = 'flex-justify-end';
                                iconEl.classList.add(newClass);
                            }
                            iconEl.innerHTML = icon.iconName.includes('<') ? icon.iconName : `<i class="material-icons-outlined">${icon.iconName}</i>`;
                            iconEl.onclick = () => handleIconAction(icon.id);
                            if (icon.id === 'comments') {
                                iconEl.querySelector('.material-icons-outlined').classList.add('flip-horizontal')
                                iconEl.innerHTML += '<span class="margin-left-five count-container">0</span>';
                                getCommentsCount().then(count => {
                                    iconEl.querySelector('.count-container').innerHTML = count.toLocaleString('en-US');
                                }).catch((err) => {
                                    console.error(err);
                                });
                            } else if (icon.id === 'views') {
                                iconEl.innerHTML += '<span class="margin-left-five count-container">0</span>';
                                buildfire.publicData.search(allCheckViewFilter, COLLECTIONS.MediaCount, function (err, res) {
                                    if (err) console.error(err);

                                    if (res && WidgetMedia) {
                                        WidgetMedia.count = res.totalRecord;
                                        if (!$scope.$$phase) $scope.$apply();
                                        iconEl.querySelector('.count-container').innerHTML = WidgetMedia.count.toLocaleString('en-US');
                                    }
                                })
                            }
                            mediaActionIconsContainer.appendChild(iconEl);
                        }
                    });

                    const handleIconAction = (actionId) => {
                        switch(actionId) {
                            case 'views': break;
                            case 'comments': WidgetMedia.openMediaComments(); break;
                            case 'share': WidgetMedia.share(); break;
                            case 'favorite': WidgetMedia.bookmark(); break;
                            case 'note': WidgetMedia.addNote(); break;
                            case 'downloadVideo':
                                if (WidgetMedia.item.data.hasDownloadedVideo) $rootScope.removeDownload(WidgetMedia.item, "video");
                                else $rootScope.download(WidgetMedia.item, "video");
                                break;
                            case 'downloadAudio':
                                if (WidgetMedia.item.data.hasDownloadedAudio) $rootScope.removeDownload(WidgetMedia.item, "audio");
                                else $rootScope.download(WidgetMedia.item, "audio");
                                break;
                            case 'sourceLink': WidgetMedia.openLink(WidgetMedia.item); break;
                            case 'openActionLinks': WidgetMedia.openLinks(WidgetMedia.item.data.links); break;
                            case 'playlist': $rootScope.toggleGlobalPlaylistItem(WidgetMedia.item); break;
                        }
                    };

                };

                if ($rootScope.online) {
                    MediaCenter.get().then(function (data) {
                        WidgetMedia.media = {
                            data: data.data
                        };
                        $rootScope.backgroundImage = WidgetMedia.media && WidgetMedia.media.data && WidgetMedia.media.data.design && WidgetMedia.media.data.design.backgroundImage;

                        const params = $location.search();
                        if (params.commentId) {
                            WidgetMedia.openMediaComments([params.commentId]);
                        }

                        WidgetMedia.initMediaActionIcons();
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


                WidgetMedia.toggleShowVideo = function (showVideo) {
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
                    WidgetMedia.showVideo = showVideo;
                    if (!$scope.$$phase) {
                        $scope.$apply();
                        $scope.$digest();
                    }
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

                WidgetMedia.isDownloading = function (item) {
                    return $rootScope.currentlyDownloading.indexOf(item.id) > -1;
                };


                WidgetMedia.addNote = function () {
                    var options = {
                        itemId: WidgetMedia.item.id,
                        title: WidgetMedia.item.data.title,
                        imageUrl: WidgetMedia.item.data.topImage
                    };
                    if (WidgetMedia.mediaType === 'VIDEO') {
                        options.timeIndex = VideoJSController.currentTime;
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

                WidgetMedia.onVideoPlay = () => {
                    openedMediaHandler.add(WidgetMedia.item, 'Video', $rootScope.user?.userId);
                    if (!$rootScope.online) {
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
                                            array1: [{
                                                string1: "mediaCount-" + WidgetMedia.item.id + "-" + $rootScope.user._id + "-Video-true",
                                            }]
                                        },
                                    },
                                }
                                if (!$rootScope.indexingUpdateDoneV2) {
                                    data._buildfire.index.text = WidgetMedia.item.id + "-" + $rootScope.user._id + "-Video-true";
                                }
                                buildfire.publicData.insert(data, COLLECTIONS.MediaCount, false, function (err, res) {
                                    WidgetMedia.isCounted = true;
                                    sendAnalytics(WidgetMedia);
                                })
                            }
                        })
                    } else if (!WidgetMedia.isCounted) {
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
                }

                WidgetMedia.initVideoPlayer = () => {
                    const videoContainer = document.getElementById('videoContainer');
                    if (!WidgetMedia.item.data.videoUrl || !videoContainer) return;
                    WidgetMedia.loadingVideo = true;
                    WidgetMedia.toggleShowVideo(($rootScope.skipMediaPage || $rootScope.autoPlay) && WidgetMedia.item.data.videoUrl);
                    Buildfire.services.media.audioPlayer.pause();

                    const videoOptions = {
                        item: {
                            ...WidgetMedia.item.data,
                            title: WidgetMedia.item.data.title.replaceAll('"', '&quot;'),
                            id: WidgetMedia.item.id
                        },
                        videoType: WidgetMedia.videoType,
                        startAt: $rootScope.seekTime
                    }
                    VideoJSController.init(videoOptions);

                    VideoJSController.onVideoReady(() => {
                        WidgetMedia.loadingVideo = false;
                        if (!$scope.$$phase) {
                            $scope.$apply();
                            $scope.$digest();
                        }
                    });
                    VideoJSController.onPlayerReady(() => {
                        VideoJSController.onVideoPlayed(WidgetMedia.onVideoPlay);
                        VideoJSController.onVideoPaused(WidgetMedia.onVideoPlay);
                        VideoJSController.onVideoEnded(() => {
                            if ($rootScope.autoPlay) {
                                $rootScope.playNextItem();
                            }
                        });
                    })
                };

                //Sync with Control section
                Messaging.onReceivedMessage = (event) => {
                    if (event.message && event.message.path == 'MEDIA') {
                        Location.go('#/media/' + event.message.id, true);
                    } else if (event.name === EVENTS.ITEMS_CHANGE) {
                        WidgetMedia.item = event.message.itemUpdatedData;
                        $rootScope.currentEditingItem = event.message.itemUpdatedData;
                        WidgetMedia.changeVideoSrc();
                        if (VideoJSController.currentSource !== DropboxLinksManager.convertDropbox(WidgetMedia.item.data.videoUrl)) {
                            WidgetMedia.initVideoPlayer();
                        }
                    } else if (event.name === EVENTS.ROUTE_CHANGE) {
                        Location.goToHome();
                    } else if (event.name === EVENTS.DESIGN_LAYOUT_CHANGE) {
                        WidgetMedia.media.data.design = event.message.design
                    } else if (event.name === EVENTS.SETTINGS_CHANGE) {
                        WidgetMedia.media.data.content = event.message.itemUpdatedData;
                    }

                    if ($rootScope.skipMediaPage) {
                        if (WidgetMedia.item.data.videoUrl) {
                            WidgetMedia.toggleShowVideo(true);
                            if (VideoJSController.currentSource !== DropboxLinksManager.convertDropbox(WidgetMedia.item.data.videoUrl)) {
                                WidgetMedia.initVideoPlayer();
                            }
                        } else {
                            WidgetMedia.toggleShowVideo(false);
                            VideoJSController.pause();

                            const params = $location.search();
                            if (!WidgetMedia.item.data.videoUrl && WidgetMedia.item.data.audioUrl && !params.commentId) {
                                WidgetMedia.playAudio();
                            }
                        }
                    }
                    WidgetMedia.initMediaActionIcons();
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
                    const params = $location.search();
                    if (!params.commentId) {
                        WidgetMedia.playAudio();
                    }
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
                $scope.$watch(function () {
                    return WidgetMedia.item.data.bookmarked;
                }, function () {
                    const favoriteIcon = document.getElementById('favorite');
                    if (favoriteIcon) {
                        const favoriteOptions = getFavoriteIcon();
                        favoriteIcon.querySelector('.material-icons-outlined').innerHTML = favoriteOptions.iconName;
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
                    VideoJSController.pause();
                });

            }]);
})(window.angular, window);
