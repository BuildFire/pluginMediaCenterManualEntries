(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', 'media', 'Buildfire', 'Modals', 'COLLECTIONS', '$rootScope', 'Location', 'EVENTS', 'PATHS', 'DB', 'AppDB', 'openedMediaItems', 'MediaMetaDataDB',
            function ($scope, media, Buildfire, Modals, COLLECTIONS, $rootScope, Location, EVENTS, PATHS, DB, AppDB, openedMediaItems, MediaMetaDataDB) {
                $rootScope.blackBackground = true;
                $rootScope.showFeed = false;
                var audioPlayer = Buildfire.services.media.audioPlayer;
                var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
                var NowPlaying = this;
                NowPlaying.swiped = [];
                NowPlaying.forceAutoPlay = $rootScope.forceAutoPlay;
                NowPlaying.autoJumpToLastPosition = $rootScope.autoJumpToLastPosition;
                NowPlaying.transferPlaylist = $rootScope.transferAudioContentToPlayList;
                media.data.audioUrl = convertDropbox(media.data.audioUrl);
                media.data.topImage = convertDropbox(media.data.topImage);
                media.data.image = convertDropbox(media.data.image);

                NowPlaying.currentTime = 0;

                $rootScope.deepLinkNavigate = null;
                $rootScope.seekTime = null;
                NowPlaying.isOnline = window.navigator.onLine;

                NowPlaying.item = media;
                NowPlaying.playing = false;
                NowPlaying.paused = false;
                NowPlaying.showVolume = false;
                NowPlaying.track = media.data.audioUrl;
                NowPlaying.isItLast = false;
                NowPlaying.keepPosition = 0;
                NowPlaying.finished = false;
                NowPlaying.isAudioPlayerPlayingAnotherSong = true;
                bookmarks.sync($scope);

                const MediaMetaData = new MediaMetaDataDB(COLLECTIONS.MediaMetaData);

                if(!NowPlaying.isOnline) initAudio(0);
                Buildfire.auth.getCurrentUser((err, user) => {
                    var userCheckViewFilter = {};
                    if (user) {
                        $rootScope.user = user
                        var userCheckViewFilter = {
                            filter: getIndexedFilter(media.id, $rootScope.user._id)
                        };
                    } else if (Buildfire.context.deviceId) {
                        var userCheckViewFilter = {
                            filter: getIndexedFilter(media.id, Buildfire.context.deviceId)
                        };
                    } else {
                        initAudio(0)
                    }
                    if (user || Buildfire.context.deviceId) {
                        buildfire.publicData.search(userCheckViewFilter, COLLECTIONS.MediaCount, function (err, res) {
                            if (res.length > 0) {
                                NowPlaying.isAudioPlayed = true;
                                if (res[0].data.lastPosition) {
                                    initAudio(res[0].data.lastPosition)
                                } else {
                                    initAudio(0)
                                }
                            } else {
                                NowPlaying.isAudioPlayed = false;
                                initAudio(0)
                            }
                        })
                    }
                });

                var playListArrayOfStrings = [
                    { key: "addedPlaylist", text: "Added to playlist" },
                    { key: "removedFromPlaylist", text: "Removed from playlist" },
                    { key: "goToPlaylist", text: "Go to Playlist" },
                    { key: "addToPlaylist", text: "Add to Playlist" },
                    { key: "removeFromPlaylist", text: "Remove from Playlist" },
                    { key: "cancelPlaylist", text: "Cancel" },
                    { key: "removePlayListButton", text: "Remove" },
                    { key: "emptyPlaylist", text: "Playlist Is Empty Text" },
                    { key: "donePlaylist", text: "Done" }
                ];

                var settingsArrayOfStrings = [
                    { key: "automaticallyPlayNextTrack", text: "Automatically play next track" },
                    { key: "loopPlaylist", text: "Loop playlist" },
                    { key: "autoJumpToLastPositon", text: "Auto Jump To LastPosition" },
                    { key: "shufflePlaylist", text: "Shuffle Playlist" },
                    { key: "settingsDone", text: "Done" }
                ];

                NowPlaying.playListStrings = {};
                NowPlaying.settingsStrings = {};
                playListArrayOfStrings.forEach(function (el) {
                    NowPlaying.playListStrings[el.key] = getString("playlist." + el.key) ? getString("playlist." + el.key) : el.text;
                });

                settingsArrayOfStrings.forEach(function (el) {
                    NowPlaying.settingsStrings[el.key] = getString("settings." + el.key) ? getString("settings." + el.key) : el.text;
                });

                /**
                 * slider to show the slider on now-playing page.
                 * @type {*|jQuery|HTMLElement}
                 */

                function convertDropbox(obj) {
                    if (obj.includes("www.dropbox") || obj.includes("dl.dropbox.com")) {
                        obj = obj.replace("www.dropbox", "dl.dropbox").replace("dl.dropbox.com", "dl.dropboxusercontent.com").split("?dl=")[0];
                    }
                    return obj;
                }
                NowPlaying.isCounted = false;


                /**
                 * audioPlayer is Buildfire.services.media.audioPlayer.
                 */

                NowPlaying.forceAutoPlayer = function () {
                    NowPlaying.currentTime = 0;
                    if ((!NowPlaying.settings.autoPlayNext || !NowPlaying.settings.autoJumpToLastPosition) && NowPlaying.forceAutoPlay && !NowPlaying.isItLast) {
                        NowPlaying.settings.autoPlayNext = true;
                        NowPlaying.settings.autoJumpToLastPosition = true;
                    }
                    audioPlayer.getPlaylist(function (err, userPlayList) {
                        var result = $rootScope.myItems;
                        var filteredPlaylist = userPlayList.tracks.filter(el => { return el.plugin && el.plugin == buildfire.context.instanceId; });
                        var playlistSongs = filteredPlaylist.map(el => { return el.url; }).join('');
                        var playlistTitles = filteredPlaylist.map(el => { return el.title; }).join('');
                        var playlistBackground = filteredPlaylist.map(el => {
                            if (el.backgroundImage) {
                                return el.backgroundImage;
                            } else { return "none"; }
                        }).join('');
                        var playlistTopImage = filteredPlaylist.map(el => {
                            if (el.image) {
                                return el.image;
                            } else { return "none"; }
                        }).join('');

                        var pluginSongs = result.filter(el => el.data.audioUrl && el.data.audioUrl.length > 0);
                        var pluginListSongs = pluginSongs.map(el => { 
                            el.data.audioUrl = convertDropbox(el.data.audioUrl); 
                            el.data.topImage = convertDropbox(el.data.topImage); 
                            el.data.image = convertDropbox(el.data.image); 
                            return el.data.audioUrl; 
                        }).join('');
                        var pluginListTitles = pluginSongs.map(el => { return el.data.title; }).join('');

                        var pluginListBackground = pluginSongs.map(el => {
                            if (el.data.image) {
                                return el.data.image;
                            } else { return "none"; }
                        }).join('');
                        var pluginListTopImage = pluginSongs.map(el => {
                            if (el.data.topImage) {
                                return el.data.topImage;
                            } else { return "none"; }
                        }).join('');
                        if (NowPlaying.transferPlaylist) {
                            if (playlistSongs != pluginListSongs || playlistTitles != pluginListTitles
                                || playlistBackground != pluginListBackground || playlistTopImage != pluginListTopImage) {
                                for (var i = (filteredPlaylist.length - 1); i >= 0; i--) {
                                    var index = NowPlaying.findTrackIndex(userPlayList, filteredPlaylist[i]);
                                    if (index != -1)
                                        audioPlayer.removeFromPlaylist(index);
                                }
                                pluginSongs = pluginSongs.map(el => {
                                    let obj = (!el.data) ? el : el.data;
                                    return {
                                        title: obj.title, url: obj.audioUrl, image: obj.topImage,
                                        album: obj.title, startAt: 0, lastPosition: 0, backgroundImage: obj.image,
                                        plugin: buildfire.context.instanceId, myId: el.id
                                    };
                                });
                                NowPlaying.playList = [];
                                for (var i = 0; i < pluginSongs.length; i++) {
                                    audioPlayer.addToPlaylist(pluginSongs[i]);
                                    NowPlaying.playList.push(pluginSongs[i]);
                                }
                            }
                        } else {
                            for (var i = (filteredPlaylist.length - 1); i >= 0; i--) {
                                var index = NowPlaying.findTrackIndex(userPlayList, filteredPlaylist[i]);
                                if (index != -1)
                                    audioPlayer.removeFromPlaylist(index);
                            }
                        }
                    });
                }

                NowPlaying.findTrackIndex = function (officialList, element) {
                    return officialList.tracks.map(el => { return (el.myId) ? el.myId : "none"; }).indexOf(element.myId);
                }

                NowPlaying.changeVolume = function (volume) {
                    audioPlayer.settings.get(function (err, setting) {
                        if (setting) {
                            setting.volume = volume;
                            audioPlayer.settings.set(setting);
                        }
                        else {
                            audioPlayer.settings.set({ volume: volume });
                        }
                    });
                };

                NowPlaying.bookmark = function ($event) {
                    $event.stopImmediatePropagation();
                    var isBookmarked = NowPlaying.item.data.bookmarked ? true : false;
                    if (isBookmarked) {
                        bookmarks.delete($scope, NowPlaying.item);
                    } else {
                        bookmarks.add($scope, NowPlaying.item);
                    }
                };

                NowPlaying.addNote = function () {
                    var options = {
                        itemId: NowPlaying.item.id,
                        title: NowPlaying.item.data.title,
                        imageUrl: NowPlaying.item.data.topImage
                    };

                    options.timeIndex = NowPlaying.currentTime;

                    var callback = function (err, data) {
                        if (err) throw err;
                        console.log(data);
                    };
                    buildfire.notes.openDialog(options, callback);
                };

                NowPlaying.share = function ($event) {
                    $event.stopImmediatePropagation();

                    var link = {};
                    link.title = NowPlaying.item.data.title;
                    link.type = "website";
                    link.description = NowPlaying.item.data.summary ? NowPlaying.item.data.summary : '';
                    link.data = {
                        "mediaId": NowPlaying.item.id
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

                /**
                 * audioPlayer.onEvent callback calls when audioPlayer event fires.
                 */
                //var first = true;
                var ready = false, setOder = false, first = false, open = true;
                if($rootScope.activePlayerEvents){
                    // Prevent the repetition of events by clearing all previous occurrences, as repeated events tend to occur when the user plays multiple audio files.
                    $rootScope.activePlayerEvents.clear();
                }
                $rootScope.activePlayerEvents = audioPlayer.onEvent(function (e) {
                    switch (e.event) {
                        case 'play':
                            NowPlaying.currentTrack = e.data.track;
                            NowPlaying.playing = true;
                            NowPlaying.paused = false;
                            audioPlayer.getPlaylist(function (err, data) {
                                first = false;
                                NowPlaying.keepPosition = e.data.track.lastPosition;

                                var filteredPlaylist = data.tracks.filter(el => { return el.plugin && el.plugin == buildfire.context.instanceId; });
                                var index = NowPlaying.findTrackIndex({ tracks: filteredPlaylist }, { myId: (e.data.track.myId) ? e.data.track.myId : "none" });

                                NowPlaying.isItLast = (index == (filteredPlaylist.length - 1));
                                if (index >= (filteredPlaylist.length - 1) && NowPlaying.forceAutoPlay && !NowPlaying.settings.loopPlaylist) {
                                    NowPlaying.settings.autoPlayNext = false;
                                }
                                if (NowPlaying.forceAutoPlay) {
                                    audioPlayer.settings.set({ autoPlayNext: false });
                                    var myInterval = setInterval(function () {
                                        if (ready) {
                                            if (!NowPlaying.isItLast) {
                                                NowPlaying.settings.autoPlayNext = true;
                                                audioPlayer.settings.set({ autoPlayNext: true });
                                            }

                                            setOder = true;
                                            clearInterval(myInterval);
                                        }
                                    }, 100);
                                }

                            });
                            break;
                        case 'timeUpdate':
                            ready = e.data.duration && e.data.duration != null && e.data.duration > 0;
                            if (NowPlaying.forceAutoPlay)
                                if (ready && e.data.currentTime >= e.data.duration && !first) {
                                    first = true;
                                    audioPlayer.pause();
                                    audioPlayer.setTime(0.1);
                                    if (NowPlaying.forceAutoPlay)
                                        setTimeout(() => {
                                            var myInterval = setInterval(() => {
                                                if (setOder) {
                                                    setOder = false;
                                                    NowPlaying.playing = true;
                                                    audioPlayer.play();
                                                    clearInterval(myInterval);
                                                    first = false;
                                                }
                                            }, 100);
                                        }, 500);
                                } else if (ready && (NowPlaying.settings.autoPlayNext || NowPlaying.forceAutoPlay)) {
                                    first = true;
                                    if (ready && open && NowPlaying.keepPosition > 0 && iOS) {
                                        NowPlaying.changeTime(NowPlaying.keepPosition);
                                        open = false;
                                    }
                                }
                            NowPlaying.currentTime = e.data.currentTime;
                            NowPlaying.duration = e.data.duration;
                            break;
                        case 'audioEnded':
                            ready = false;
                            updateAudioLastPosition(media.id, 0.1)
                            if(typeof $rootScope.audioFromPlayList === 'number'){
                                NowPlaying.playlistPause(NowPlaying.playList[$rootScope.audioFromPlayList]);
                                return false;
                            }
                            if ($rootScope.autoPlay) {
                                $rootScope.playNextItem();
                            } else {
                                if (NowPlaying.isItLast && NowPlaying.settings.loopPlaylist) {
                                    audioPlayer.getCurrentTrack((track) => {
                                        if (NowPlaying.playList && NowPlaying.playList.length > 0) {
                                            NowPlaying.playList.forEach(element => {
                                                element.playing = false
                                            });
                                            let currentTrack = NowPlaying.playList.find(x => x.title == track.title && x.url == track.url && x.album == track.album && x.image == track.image && x.backgroundImage == track.backgroundImage)
                                            if (currentTrack) {
                                                currentTrack.playing = true
                                            }
                                        }
                                    });

                                    setTimeout(() => {
                                        audioPlayer.setTime(0.1);
                                        NowPlaying.finished = false;
                                        audioPlayer.pause();
                                        setTimeout(() => {
                                            audioPlayer.play();
                                            NowPlaying.paused = false;
                                            NowPlaying.playing = true;
                                        }, 50);
                                    }, 50);
                                }
                                else {
                                    isAudioEnded = true;
                                    if (!NowPlaying.settings.autoPlayNext) {
                                        NowPlaying.playing = false;
                                        NowPlaying.paused = false;
                                    }
                                    if (NowPlaying.forceAutoPlay && NowPlaying.isItLast && !NowPlaying.settings.loopPlaylist) {
                                        NowPlaying.playing = false;
                                        NowPlaying.paused = true;
                                        NowPlaying.finished = true;
                                    }
                                    else NowPlaying.finished = false;
                                }
                            }
                            break;
                        case 'pause':
                            NowPlaying.playing = false;
                            break;
                        case 'next':
                            if(typeof $rootScope.audioFromPlayList === 'number'){
                                $rootScope.audioFromPlayList = e.data.index;
                                NowPlaying.playList[$rootScope.audioFromPlayList].playing = true;
                                if(!NowPlaying.settings.autoJumpToLastPosition){
                                    audioPlayer.setTime(0);
                                }
                                return false;
                            }
                            break;
                        case 'previous':
                            if(typeof $rootScope.audioFromPlayList === 'number' && NowPlaying.settings.autoPlayNext){
                                $rootScope.audioFromPlayList = e.data.index;
                                NowPlaying.playList[$rootScope.audioFromPlayList].playing = true;
                                audioPlayer.setTime(0);
                                return false;
                            }
                            $rootScope.playPrevItem();
                            break;
                        case 'removeFromPlaylist':
                            NowPlaying.playList = e.data && e.data.newPlaylist && e.data.newPlaylist.tracks;
                            break;

                    }
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                });
                function initAudio(lastPosition) {
                    isAudioEnded = false;
                    NowPlaying.currentTime = lastPosition;
                    NowPlaying.currentTrack = new Track(media.data, lastPosition);
                    NowPlaying.currentTrack.backgroundImage = media.data.image ? media.data.image : media.data.topImage;

                    NowPlaying.currentTrack.image = media.data.topImage;
                    NowPlaying.currentTrack.title = media.data.title;
                    if ($rootScope.seekTime) NowPlaying.currentTrack.startAt = $rootScope.seekTime;

                    NowPlaying.currentTrack.backgroundImage = NowPlaying.currentTrack.backgroundImage ? NowPlaying.currentTrack.backgroundImage : './assets/images/now-playing.png';
                    NowPlaying.currentTrack.backgroundImage = CSS.escape(NowPlaying.currentTrack.backgroundImage);
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                    audioPlayer.settings.get(function (err, setting) {
                        setting.autoJumpToLastPosition = NowPlaying.autoJumpToLastPosition;
                        if (!setting.autoJumpToLastPosition) {
                            NowPlaying.currentTrack.startAt = 0;
                        }
                        NowPlaying.currentTime = 0;
                        NowPlaying.settings = setting;
                        NowPlaying.volume = setting.volume;
                        NowPlaying.forceAutoPlayer();
                        audioPlayer.settings.set(NowPlaying.settings);
                        setTimeout(() => {
                            if ($rootScope.autoPlay) {
                                NowPlaying.playTrack();
                            }
                        }, 0);
                    });
                    audioPlayer.getCurrentTrack((track) => {
                        if (track && track.title == NowPlaying.currentTrack.title && track.url == NowPlaying.currentTrack.url) {
                            NowPlaying.isAudioPlayerPlayingAnotherSong = false;
                        } else if (!track) {
                            NowPlaying.isAudioPlayerPlayingAnotherSong = false;
                        }
                    });


                }

                function updateAudioLastPosition(mediaId, trackLastPosition) {
                    let searchFilter = null;
                    if ($rootScope && $rootScope.user) {
                        searchFilter = getIndexedFilter(mediaId, $rootScope.user._id);
                    } else if (Buildfire.context.deviceId) {
                        searchFilter = getIndexedFilter(mediaId, Buildfire.context.deviceId);
                    }
                    if(searchFilter){
                        buildfire.publicData.searchAndUpdate(
                            searchFilter,
                            { $set: { lastPosition: trackLastPosition } },
                            COLLECTIONS.MediaCount,
                            (err, result) => {
                                if (err) return console.error(err);
                            }
                        );
                    }
                }

                function sendAnalytics(NowPlaying) {
                    Analytics.trackAction(`${NowPlaying.item.id}_audioPlayCount`);
                    Analytics.trackAction("allAudios_count");
                    Analytics.trackAction("allMediaTypes_count");
                }

                function sendContinuesAnalytics(NowPlaying) {
                    Analytics.trackAction(`${NowPlaying.item.id}_continuesAudioPlayCount`);
                    Analytics.trackAction("allAudios_continuesCount");
                    Analytics.trackAction("allMediaTypes_continuesCount");
                }

                function getIndexedFilter(mediaId, userId) {
                    let filter = {};

                    if($rootScope.indexingUpdateDoneV2){
                        filter = {
                            "_buildfire.index.array1.string1": "mediaCount-" + mediaId + "-" + userId + "-AUDIO-true" 
                        };
                    }else{
                        filter = {
                            "_buildfire.index.text": mediaId + "-" + userId + "-AUDIO-true" 
                        };
                    }

                    return filter;
                }
                var isAudioEnded = false;
                /**
                 * Player related method and variables
                 */
                NowPlaying.playTrack = function () {
                    if(!NowPlaying.isOnline && (!NowPlaying.item.data.hasDownloadedAudio || !$rootScope.allowOfflineDownload)){
                        buildfire.dialog.show(
                            {
                                title: "Audio not available offline",
                                message:
                                    "The Audio you are trying to play has not been downloaded.",
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
                    if (NowPlaying.currentTrack.isAudioPlayed === false) {
                        NowPlaying.currentTrack.isAudioPlayed = true;
                        sendContinuesAnalytics(NowPlaying);
                        if (!NowPlaying.isCounted && !NowPlaying.isAudioPlayed) {
                            NowPlaying.isAudioPlayed = true;
                            let data = {
                                mediaId: NowPlaying.item.id,
                                mediaType: "AUDIO",
                                isActive: true,
                                lastPosition: 0,
                                _buildfire: {
                                    index: {
                                        string1: NowPlaying.item.id + "-true",
                                        array1:[]
                                    },
                                },
                            }
                            if ($rootScope && $rootScope.user) {
                                data.userId = $rootScope.user._id
                                data._buildfire.index.array1[0] = {string1: "mediaCount-" + NowPlaying.item.id + "-" + $rootScope.user._id + "-AUDIO-true"}
                                if(!$rootScope.indexingUpdateDoneV2){
                                    data._buildfire.index.text = NowPlaying.item.id + "-" + $rootScope.user._id + "-AUDIO-true"
                                }
                            } else if (Buildfire.context.deviceId) {
                                data.userId = Buildfire.context.deviceId
                                data._buildfire.index.array1[0] = {string1: "mediaCount-" + NowPlaying.item.id + "-" + Buildfire.context.deviceId + "-AUDIO-true"}
                                if(!$rootScope.indexingUpdateDoneV2){
                                    data._buildfire.index.text = NowPlaying.item.id + "-" + Buildfire.context.deviceId + "-AUDIO-true"
                                }
                            }
                            
                            if ($rootScope.user || Buildfire.context.deviceId) {
                                buildfire.publicData.insert(data, COLLECTIONS.MediaCount, false, function (err, res) {
                                    NowPlaying.isCounted = true;
                                    sendAnalytics(NowPlaying);
                                })
                                openedMediaHandler.add(NowPlaying.item, 'Audio', openedMediaItems, MediaMetaData);
                            } else {
                                let lastTimeWatched = localStorage.getItem(`${NowPlaying.item.id}_audioPlayCount`);
                                if (!lastTimeWatched) {
                                    localStorage.setItem(`${NowPlaying.item.id}_audioPlayCount`, new Date().getTime());
                                    sendAnalytics(NowPlaying);
                                }
                                openedMediaHandler.add(NowPlaying.item, 'Audio', openedMediaItems, null);
                            }
                        }
                    }


                    if (NowPlaying.settings) {
                        NowPlaying.settings.isPlayingCurrentTrack = true;
                        audioPlayer.settings.set(NowPlaying.settings);
                    }
                    else {
                        audioPlayer.settings.get(function (err, setting) {
                            NowPlaying.settings = setting;
                            NowPlaying.settings.isPlayingCurrentTrack = true;
                            audioPlayer.settings.set(NowPlaying.settings);
                        });
                    }
                    NowPlaying.playing = true;
                    if (NowPlaying.transferPlaylist && NowPlaying.forceAutoPlay)
                        audioPlayer.getPlaylist(function (err, data) {
                            var index = NowPlaying.findTrackIndex(data, { myId: NowPlaying.item.id });
                            if (!NowPlaying.forceAutoPlay) {
                                index = data.tracks.find(
                                    (el) => el.url === NowPlaying.item.audioUrl
                                );
                            }
                            NowPlaying.callPlayFunction(index);
                        });
                    else NowPlaying.callPlayFunction(-1);
                };

                NowPlaying.callPlayFunction = function (index) {
                    buildfire.services.media.audioPlayer.getCurrentTrack((track) => {
                        if (track) {
                            updateAudioLastPosition(media.id, track.lastPosition)
                        }
                    });
                    if (NowPlaying.paused) {
                        audioPlayer.play();
                        if (NowPlaying.finished)
                            setTimeout(() => {
                                NowPlaying.finished = false;
                                audioPlayer.pause();
                                setTimeout(() => {
                                    audioPlayer.play();
                                    NowPlaying.paused = false;
                                    NowPlaying.playing = true;
                                }, 50);
                            }, 50);
                    } else {
                        setTimeout(() => {
                            try {
                                if (index != -1) {
                                    audioPlayer.play(index);
                                }
                                else {
                                    $rootScope.audioFromPlayList = null;
                                    if (isAudioEnded) {
                                        NowPlaying.currentTrack.lastPosition = 0
                                    }
                                    NowPlaying.currentTrack.url = validateURL(NowPlaying.currentTrack.url);
                                    audioPlayer.play(NowPlaying.currentTrack);
                                    audioPlayer.pause();
                                    setTimeout(() => {
                                        audioPlayer.play();
                                        NowPlaying.paused = false;
                                        NowPlaying.playing = true;
                                    }, 50);
                                }
                                NowPlaying.isAudioPlayerPlayingAnotherSong = false;
                            }
                            catch (err) {
                            }
                        }, 500);

                    }
                }


                NowPlaying.playlistPlay = function (track, index) {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.isPlayingCurrentTrack = true;
                        audioPlayer.settings.set(NowPlaying.settings);
                    }
                    NowPlaying.playing = true;
                    if (typeof index==='number') {
                        NowPlaying.isAudioPlayerPlayingAnotherSong = false;
                        audioPlayer.pause();
                        audioPlayer.play(index);
                        track.playing = true;
                    }
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                };
                NowPlaying.pauseTrack = function () {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.isPlayingCurrentTrack = false;
                        audioPlayer.settings.set(NowPlaying.settings);
                    }
                    NowPlaying.currentTrack.lastPosition = NowPlaying.currentTime;
                    updateAudioLastPosition(media.id, NowPlaying.currentTime)
                    NowPlaying.playing = false;
                    NowPlaying.paused = true;
                    audioPlayer.pause();
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                };
                NowPlaying.playlistPause = function (track) {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.isPlayingCurrentTrack = false;
                        audioPlayer.settings.set(NowPlaying.settings);
                    }
                    track.playing = false;
                    NowPlaying.playing = false;
                    NowPlaying.paused = true;
                    audioPlayer.pause();
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                };
                NowPlaying.forward = function () {
                    if (NowPlaying.currentTime + 5 >= NowPlaying.currentTrack.duration)
                        audioPlayer.setTime(NowPlaying.currentTrack.duration);
                    else
                        audioPlayer.setTime(NowPlaying.currentTime + 5);
                };

                NowPlaying.backward = function () {
                    if (NowPlaying.currentTime - 5 > 0)
                        audioPlayer.setTime(NowPlaying.currentTime - 5);
                    else
                        audioPlayer.setTime(0);
                };

                NowPlaying.next = function () {
                    if(typeof $rootScope.audioFromPlayList === 'number'){
                        audioPlayer.next();
                    }else{
                        $rootScope.playNextItem(true);
                    }
                };

                NowPlaying.prev = function () {
                    if(typeof $rootScope.audioFromPlayList === 'number'){
                        audioPlayer.previous();
                    }else{
                        $rootScope.playPrevItem();
                    }
                };

                NowPlaying.shufflePlaylist = function () {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.shufflePlaylist = NowPlaying.settings.shufflePlaylist ? false : true;
                    }
                    audioPlayer.settings.set(NowPlaying.settings);
                };
                NowPlaying.changeVolume = function (volume) {
                    audioPlayer.settings.get(function (err, setting) {
                        if (setting) {
                            setting.volume = volume;
                            audioPlayer.settings.set(setting);
                        }
                        else {
                            audioPlayer.settings.set({ volume: volume });
                        }
                    });

                };
                NowPlaying.loopPlaylist = function () {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.loopPlaylist = NowPlaying.settings
                            .loopPlaylist
                            ? false
                            : true;
                        if (NowPlaying.settings.loopPlaylist)
                            NowPlaying.settings.autoPlayNext = true;
                    }
                    audioPlayer.settings.set(NowPlaying.settings);
                };
                NowPlaying.addToPlaylist = function (track) {
                    if (track) {
                        buildfire.dialog.toast({
                            message: NowPlaying.playListStrings.addedPlaylist
                        });
                        audioPlayer.addToPlaylist(track);
                    }
                };
                NowPlaying.removeFromPlaylist = function (track, index) {
                    Modals.removeTrackModal().then(function (data) {
                        buildfire.dialog.toast({
                            message: NowPlaying.playListStrings.removedFromPlaylist
                        });
                        if (NowPlaying.playList) {
                            NowPlaying.playList.filter(function (val, index) {
                                if (val.url == track.url) {
                                    audioPlayer.removeFromPlaylist(index);
                                }
                                return index;

                            });
                        }
                    },
                        function (err) {
                            // Do something on error
                        });

                };
                NowPlaying.removeTrackFromPlayList = function (index) {
                    Modals.removeTrackModal().then(function (data) {
                        audioPlayer.removeFromPlaylist(index);
                        buildfire.dialog.toast({
                            message: NowPlaying.playListStrings.removedFromPlaylist
                        });
                    },
                        function (err) {
                            console.error(err);
                        });

                };
                NowPlaying.getFromPlaylist = function () {
                    audioPlayer.getPlaylist(function (err, data) {
                        if (data && data.tracks) {
                            NowPlaying.playList = data.tracks;
                            if (!$scope.$$phase) {
                                $scope.$digest();
                                if(typeof $rootScope.audioFromPlayList === 'number' ){
                                    NowPlaying.playList[$rootScope.audioFromPlayList].playing = true;
                                }
                            }
                        }
                    });
                    NowPlaying.openMoreInfo = false;
                    $rootScope.playlist = true;
                };
                NowPlaying.changeTime = function (time) {
                    audioPlayer.setTime(time);
                };
                NowPlaying.getSettings = function () {
                    NowPlaying.openSettings = true;
                    audioPlayer.settings.get(function (err, data) {
                        if (data) {
                            NowPlaying.settings = data;
                            if (!$scope.$$phase) {
                                $scope.$digest();
                            }
                        }
                    });
                };
                NowPlaying.setSettings = function (settings) {
                    if (!settings.autoPlayNext && NowPlaying.forceAutoPlay && !NowPlaying.isItLast) {
                        settings.autoJumpToLastPosition = true;
                        settings.autoPlayNext = true;
                    }
                    var newSettings = new AudioSettings(settings);
                    audioPlayer.settings.set(newSettings);
                };
                NowPlaying.addEvents = function (e, i, toggle) {
                    toggle ? NowPlaying.swiped[i] = true : NowPlaying.swiped[i] = false;
                };
                NowPlaying.openMoreInfoOverlay = function () {
                    NowPlaying.openMoreInfo = true;
                };
                NowPlaying.closeSettingsOverlay = function () {
                    NowPlaying.openSettings = false;
                };
                NowPlaying.closePlayListOverlay = function () {
                    $rootScope.playlist = false;
                };
                NowPlaying.closeMoreInfoOverlay = function () {
                    NowPlaying.openMoreInfo = false;
                };

                NowPlaying.addEvents = function (e, i, toggle, track) {
                    toggle ? track.swiped = true : track.swiped = false;
                };

                // this method to make the audio url replaying multi times 
                function validateURL(url) {
                    if (url.includes('?')) return (url + '&' + Math.floor(Math.random() * 1000))
                    return (url + '?' + Math.floor(Math.random() * 1000))
                }

                /**
                 * Track Smaple
                 * @param title
                 * @param url
                 * @param image
                 * @param album
                 * @param artist
                 * @constructor
                 */

                function Track(track, lastPosition) {
                    this.lastPosition = lastPosition
                    this.title = track.audioTitle;
                    this.url = track.audioUrl;
                    this.image = track.image;
                    this.album = track.title;
                    this.artist = track.artists;
                    this.startAt = 0; // where to begin playing
                    this.isAudioPlayed = track.isAudioPlayed ? track.isAudioPlayed : false;
                }

                /**
                 * AudioSettings sample
                 * @param autoPlayNext
                 * @param loop
                 * @param autoJumpToLastPosition
                 * @param shufflePlaylist
                 * @param isPlayingCurrentTrack
                 * @constructor
                 */
                function AudioSettings(settings) {
                    this.autoPlayNext = settings.autoPlayNext; // once a track is finished playing go to the next track in the play list and play it
                    this.loopPlaylist = settings.loopPlaylist; // once the end of the playlist has been reached start over again
                    this.autoJumpToLastPosition = settings.autoJumpToLastPosition; //If a track has [lastPosition] use it to start playing the audio from there
                    this.shufflePlaylist = settings.shufflePlaylist;// shuffle the playlist
                    this.isPlayingCurrentTrack = settings.isPlayingCurrentTrack;// tells whether current track is playing or not
                }

                var GlobalPlaylist = new AppDB();

                Buildfire.datastore.onUpdate(function (event) {
                    switch (event.tag) {
                        case COLLECTIONS.MediaContent:
                            if (event.data) {
                                NowPlaying.item = event;
                                // Update item in globalPlaylist
                                if ($rootScope.isInGlobalPlaylist(event.id)) {
                                    if (event.data) {
                                        GlobalPlaylist.insertAndUpdate(event).then(() => {
                                            $rootScope.globalPlaylistItems.playlist[event.id] = event.data;
                                        });
                                    } else {
                                        // If there is no data, it means the the item has been deleted
                                        GlobalPlaylist.delete(event.id).then(() => {
                                            delete $rootScope.globalPlaylistItems.playlist[event.id];
                                        });
                                    }
                                }
                                if (!$scope.$$phase) {
                                    $scope.$digest();
                                }
                            }
                            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                            MediaCenter.get().then(function success(result) {
                                if (result.data.design.skipMediaPage && event.data.videoUrl) {
                                    audioPlayer.pause();
                                    Location.go('#/media/' + event.id, true);
                                }
                            });
                            break;
                        case COLLECTIONS.MediaCenter:
                            if (event.data) {
                                $rootScope.design = event.data.design;
                                $rootScope.allowShare = event.data.content.allowShare;
                                $rootScope.allowAddingNotes = event.data.content.allowAddingNotes;
                                $rootScope.allowSource = event.data.content.allowSource;
                                $rootScope.transferAudioContentToPlayList = event.data.content.transferAudioContentToPlayList;
                                $rootScope.forceAutoPlay = event.data.content.forceAutoPlay;
                                NowPlaying.forceAutoPlay = event.data.content.transferAudioContentToPlayList;
                                NowPlaying.transferPlaylist = event.data.content.forceAutoPlay;
                                $rootScope.skipMediaPage = event.data.design.skipMediaPage;

                                $rootScope.autoPlay = event.data.content.autoPlay;
                                $rootScope.autoPlayDelay = event.data.content.autoPlayDelay;
                                $rootScope.globalPlaylist = event.data.content.globalPlaylist;
                                $rootScope.globalPlaylistPlugin = event.data.content.globalPlaylistPlugin;
                                $rootScope.showGlobalPlaylistNavButton = event.data.content.showGlobalPlaylistNavButton;
                                $rootScope.showGlobalAddAllToPlaylistButton = event.data.content.showGlobalAddAllToPlaylistButton;
                                $rootScope.allowOfflineDownload = event.data.content.allowOfflineDownload;
                                $rootScope.autoJumpToLastPosition = event.data.content.startWithAutoJumpByDefault;
                                NowPlaying.autoJumpToLastPosition = $rootScope.autoJumpToLastPosition;
                                NowPlaying.settings.autoJumpToLastPosition = $rootScope.autoJumpToLastPosition;
                                NowPlaying.setSettings(NowPlaying.settings)
                                // Update Data in media contoller
                                $rootScope.refreshItems();
                                if (!$scope.$$phase) {
                                    $scope.$digest();
                                }
                            }
                            break;
                    }
                });

                Buildfire.publicData.onUpdate(event => {
                    if (event.data && event.tag == COLLECTIONS.MediaCount) {
                        $rootScope.refreshItems();
                    }
                });

                Buildfire.appData.onUpdate(event => {
                    // Tag name for global playlist
                    const globalPlaylistTag = 'MediaContent' + ($rootScope.user && $rootScope.user._id ? $rootScope.user._id : Buildfire.context.deviceId ? Buildfire.context.deviceId : 'globalPlaylist');
                    if (event) {
                        if (event.tag === "GlobalPlayListSettings") {
                            if (event.data) {
                                $rootScope.globalPlaylistLimit = event.data.globalPlaylistLimit;
                            }
                        } else if (event.tag === globalPlaylistTag) {
                            if (event.data.playlist && event.data.playlist) {
                                $rootScope.globalPlaylistItems.playlist = event.data.playlist;
                            }
                        }
                    }
                });

                buildfire.auth.onLogin(function (user) {
                    buildfire.spinner.show();
                    bookmarks.sync($scope);
                    $rootScope.user = user;
                    $rootScope.refreshItems();
                });

                buildfire.auth.onLogout(function () {
                    buildfire.spinner.show();
                    bookmarks.sync($scope);
                    $rootScope.user = null;
                    $rootScope.refreshItems();
                });

                /**
                 * track play pause from playlist
                 */

                NowPlaying.playlistPlayPause = function (track, index) {
                    if (NowPlaying.playing) {
                        if (track.playing) {
                            NowPlaying.playlistPause(track);
                        }
                        else {
                            if (NowPlaying.playList && NowPlaying.playList.length > 0) {
                                NowPlaying.playList.forEach(element => {
                                    element.playing = false
                                });
                            }
                            NowPlaying.playlistPlay(track, index);
                        }
                    }
                    else if (NowPlaying.paused) {
                        NowPlaying.playList.forEach(element => {
                            element.playing = false
                        });
                        if (track.url == NowPlaying.currentTrack.url) {
                            NowPlaying.settings.isPlayingCurrentTrack = true;
                            NowPlaying.playing = true;
                            track.playing = true;
                            if($rootScope.audioFromPlayList == index){
                                audioPlayer.play();
                            }else{
                                audioPlayer.play(index);
                            }
                        }
                        else {
                            NowPlaying.playlistPlay(track, index);
                        }
                    }
                    else {
                        NowPlaying.playlistPlay(track, index);
                    }
                    $rootScope.audioFromPlayList = index;
                };

                /**
                 * Implementation of pull down to refresh
                 */
                var onRefresh = Buildfire.datastore.onRefresh(function () {
                });

                if (NowPlaying.item.data.audioUrl)
                    buildfire.messaging.sendMessageToControl({
                        name: EVENTS.ROUTE_CHANGE,
                        message: {
                            path: PATHS.MEDIA,
                            id: NowPlaying.item.id || null
                        }
                    });
                /**
                 * Unbind the onRefresh
                 */
                $scope.$on('$destroy', function () {
                    $rootScope.blackBackground = false;
                    onRefresh.clear();
                    Buildfire.datastore.onRefresh(function () {
                        Location.goToHome();
                    });
                });
            }
        ]);
})(window.angular);
