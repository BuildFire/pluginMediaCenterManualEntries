(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', '$routeParams', 'media', 'Buildfire', 'Modals', 'COLLECTIONS', '$rootScope', '$timeout', 'Location', 'EVENTS', 'PATHS', 'DB',
            function ($scope, $routeParams, media, Buildfire, Modals, COLLECTIONS, $rootScope, $timeout, Location, EVENTS, PATHS, DB) {
                $rootScope.blackBackground = true;
                $rootScope.showFeed = false;
                var NowPlaying = this;
                NowPlaying.currentTime = 0;
                NowPlaying.swiped = [];
                NowPlaying.forceAutoPlay=$rootScope.forceAutoPlay;
                NowPlaying.transferPlaylist=$rootScope.transferAudioContentToPlayList;
                if (media.data.audioUrl.includes("www.dropbox") || media.data.audioUrl.includes("dl.dropbox.com")) {
                    media.data.audioUrl = media.data.audioUrl.replace("www.dropbox", "dl.dropbox").split("?dl=")[0];
                }
                NowPlaying.currentTrack = new Track(media.data);
                NowPlaying.currentTrack.backgroundImage = media.data.image ? media.data.image : media.data.topImage;

                NowPlaying.currentTrack.image = media.data.topImage;;
                NowPlaying.currentTrack.title = media.data.title;
                if ($rootScope.seekTime) NowPlaying.currentTrack.startAt = $rootScope.seekTime;

                $rootScope.deepLinkNavigate = null;
                $rootScope.seekTime = null;

                NowPlaying.item = media;
                NowPlaying.playing = false;
                NowPlaying.paused = false;
                NowPlaying.showVolume = false;
                NowPlaying.track = media.data.audioUrl;
                NowPlaying.isItLast = false;
                bookmarks.sync($scope);

                /**
                 * slider to show the slider on now-playing page.
                 * @type {*|jQuery|HTMLElement}
                 */

                /**
                 * audioPlayer is Buildfire.services.media.audioPlayer.
                 */
                var audioPlayer = Buildfire.services.media.audioPlayer;
                audioPlayer.settings.get(function (err, setting) {
                    NowPlaying.settings = setting;
                    NowPlaying.volume = setting.volume;
                    NowPlaying.forceAutoPlayer();
                    audioPlayer.settings.set(NowPlaying.settings); 
                    setTimeout(() => {
                        NowPlaying.playTrack();
                    }, 300);
                });

                NowPlaying.forceAutoPlayer = function (){
                    if((!NowPlaying.settings.autoPlayNext||!NowPlaying.settings.autoJumpToLastPosition)&&NowPlaying.forceAutoPlay){
                        NowPlaying.settings.autoPlayNext=true;
                        NowPlaying.settings.autoJumpToLastPosition=true;
                    }
                    audioPlayer.getPlaylist(function(err,userPlayList){
                        var result= $rootScope.myItems;
                        var filteredPlaylist=userPlayList.tracks.filter(el=>{return el.plugin && el.plugin == buildfire.context.instanceId;});
                        var playlistSongs=filteredPlaylist.map(el=>{return el.url;}).join('');
                        var playlistTitles=filteredPlaylist.map(el=>{return el.title;}).join('');

                        var pluginSongs=result.filter(el=>el.data.audioUrl&&el.data.audioUrl.length>0);
                        var pluginListSongs=pluginSongs.map(el=>{return el.data.audioUrl;}).join('');
                        var pluginListTitles=pluginSongs.map(el=>{return el.data.title;}).join('');
                        if(NowPlaying.transferPlaylist){
                            if(playlistSongs!=pluginListSongs||playlistTitles!=pluginListTitles){
                                for(var i=(filteredPlaylist.length-1);i>=0;i--){
                                    var index=NowPlaying.findTrackIndex(userPlayList,filteredPlaylist[i]);
                                    if(index!=-1)
                                        audioPlayer.removeFromPlaylist(index);
                                }
                                pluginSongs=pluginSongs.map(el=>{
                                        let obj=(!el.data)?el:el.data;
                                        return {title:obj.title,url:obj.audioUrl,image:obj.topImage,
                                        album:obj.title,startAt:0,lastPosition:0,backgroundImage:obj.image,
                                        plugin:buildfire.context.instanceId, myId:el.id
                                    };
                                    });
                                NowPlaying.playList=[];
                                for(var i=0;i<pluginSongs.length;i++){
                                    audioPlayer.addToPlaylist(pluginSongs[i]);
                                    NowPlaying.playList.push(pluginSongs[i]);
                                }
                                buildfire.dialog.alert({
                                    title: "Info page",
                                    message: `Audio files will be automatically added to the end of your playlist.`,
                                    isMessageHTML: true
                                }, (err, data) => {
                                    if(err) console.error(err);
                                });
                                //NowPlaying.playlistPlay(pluginSongs[0], 0);
                            }
                        }else{
                            for(var i=(filteredPlaylist.length-1);i>=0;i--){
                                var index=NowPlaying.findTrackIndex(userPlayList,filteredPlaylist[i]);
                                if(index!=-1)
                                    audioPlayer.removeFromPlaylist(index);
                            } 
                        }
                    });
                }

                NowPlaying.findTrackIndex = function(officialList,element){
                    return officialList.tracks.map(el=>{return (el.myId)?el.myId:"none";}).indexOf(element.myId);
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
                    link.description = NowPlaying.item.data.summary ? NowPlaying.item.data.summary : null;
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
                            }, function (err, result) {});

                        }
                    });
                };

                /**
                 * audioPlayer.onEvent callback calls when audioPlayer event fires.
                 */
                //var first = true;
                var ready=false;
                var setOder=false;
                audioPlayer.onEvent(function (e) {
                    switch (e.event) {
                        case 'play':
                            audioPlayer.getPlaylist(function(err,data){
                                if(e.data.track.lastPosition && e.data.track.lastPosition>0)
                                    audioPlayer.setTime(e.data.track.lastPosition);
                                
                                NowPlaying.playing = true;
                                NowPlaying.paused = false;

                                var filteredPlaylist=data.tracks.filter(el=>{return el.plugin && el.plugin == buildfire.context.instanceId;});
                                var index=NowPlaying.findTrackIndex({tracks:filteredPlaylist},{myId:(e.data.track.myId)?e.data.track.myId:"none"});

                                NowPlaying.isItLast=(index==(filteredPlaylist.length-1));
                                if(index==(filteredPlaylist.length-1)&&NowPlaying.forceAutoPlay){
                                    audioPlayer.settings.set({autoPlayNext:false});
                                }
                                else if(NowPlaying.settings.autoPlayNext){
                                    audioPlayer.settings.set({autoPlayNext:false});
                                    var myInterval=setInterval(function(){ 
                                        if(ready){
                                            audioPlayer.settings.set({autoPlayNext:true});
                                            setOder=true;
                                            clearInterval(myInterval);
                                        }
                                    }, 100);
                                }
                            });
                            break;
                        case 'timeUpdate':
                            ready = e.data.duration > 0;
                            if(ready&&e.data.currentTime>=e.data.duration&&NowPlaying.settings.autoPlayNext){
                                audioPlayer.pause();
                                audioPlayer.setTime(0.1);
                                if(!NowPlaying.isItLast||!NowPlaying.forceAutoPlay||NowPlaying.settings.loopPlaylist)
                                    var myInterval=setInterval(() => {
                                        if(setOder){
                                            setOder=false;
                                            NowPlaying.playing=true;
                                            audioPlayer.play();
                                            clearInterval(myInterval);
                                        }
                                    }, 100); 
                            }
/*                             if (ready && first && NowPlaying.currentTrack.startAt) {
                                NowPlaying.changeTime(NowPlaying.currentTrack.startAt);
                                first = false;
                            } */
                            NowPlaying.currentTime = e.data.currentTime;
                            NowPlaying.duration = e.data.duration;
                            break;
                        case 'audioEnded':
                            if(!NowPlaying.settings.autoPlayNext) {
                                NowPlaying.playing = false;
                                NowPlaying.paused = false;
                            }
                            break;
                        case 'pause':
                            NowPlaying.playing = false;
                            break;
                        case 'next':
                            if (e && e.data && e.data.track) {
                                NowPlaying.currentTrack = e.data.track;
                                NowPlaying.playing = true;
                            }
                            break;
                        case 'removeFromPlaylist':
                            NowPlaying.playList = e.data && e.data.newPlaylist && e.data.newPlaylist.tracks;
                            break;

                    }
                    if (!$scope.$$phase) {
                        $scope.$digest();
                    }
                });

                /**
                 * Player related method and variables
                 */
                NowPlaying.playTrack = function () {
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
                    if(NowPlaying.transferPlaylist && NowPlaying.forceAutoPlay)
                        audioPlayer.getPlaylist(function(err,data){
                            var index=NowPlaying.findTrackIndex(data,{myId:NowPlaying.item.id});
                            if(index!=-1)
                                NowPlaying.callPlayFunction(index);
                        });
                    else  NowPlaying.callPlayFunction(-1);
                };

                NowPlaying.callPlayFunction = function(index){
                    if (NowPlaying.paused) {
                        audioPlayer.play();
                    } else {
                        setTimeout(() => {
                            try {
                                if(index!=-1){
                                    audioPlayer.play(index);
                                }
                                else audioPlayer.play(NowPlaying.currentTrack);
                            }
                            catch (err) {
                            }
                        }, 500);

                    }
                }


                NowPlaying.playlistPlay = function (track) {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.isPlayingCurrentTrack = true;
                        audioPlayer.settings.set(NowPlaying.settings);
                    }
                    NowPlaying.playing = true;
                    if (track) {
                        audioPlayer.play({ url: track.url });
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
                NowPlaying.shufflePlaylist = function () {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.shufflePlaylist = NowPlaying.settings.shufflePlaylist ? false : true;
                    }
                    audioPlayer.settings.set(NowPlaying.settings);
                };
                NowPlaying.changeVolume = function (volume) {
                    //audioPlayer.setVolume(volume);
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
                        NowPlaying.settings.loopPlaylist = NowPlaying.settings.loopPlaylist ? false : true;
                        NowPlaying.settings.autoPlayNext = !NowPlaying.settings.autoPlayNext;
                    }
                    audioPlayer.settings.set(NowPlaying.settings);
                };
                NowPlaying.addToPlaylist = function (track) {
                    if (track) {
                        buildfire.components.toast.showToastMessage({text: "Added to playlist"}, console.log);
                        audioPlayer.addToPlaylist(track);
                    }
                };
                NowPlaying.removeFromPlaylist = function (track, index) {
                    Modals.removeTrackModal().then(function (data) {
                        console.log('Data-------------------in success of remove track popup-0-', data);
                        buildfire.components.toast.showToastMessage({text: "Removed from playlist"}, console.log);
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
                        console.log('Data-------------------in success of remove track popup-1-', data);
                        audioPlayer.removeFromPlaylist(index);
                        buildfire.components.toast.showToastMessage({text: "Removed from playlist"}, console.log);
                    },
                        function (err) {
                            // Do something on error
                        });

                };
                NowPlaying.getFromPlaylist = function () {
                    audioPlayer.getPlaylist(function (err, data) {
                        if (data && data.tracks) {
                            NowPlaying.playList = data.tracks;
                            if (!$scope.$$phase) {
                                $scope.$digest();
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
                    if(!settings.autoPlayNext&&NowPlaying.forceAutoPlay){
                        settings.autoJumpToLastPosition=true;
                        settings.autoPlayNext=true;
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

                /**
                 * Track Smaple
                 * @param title
                 * @param url
                 * @param image
                 * @param album
                 * @param artist
                 * @constructor
                 */

                function Track(track) {
                    this.title = track.audioTitle;
                    this.url = track.audioUrl;
                    this.image = track.image;
                    this.album = track.title;
                    this.artist = track.artists;
                    this.startAt = 0; // where to begin playing
                    this.lastPosition = 0; // last played to
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


                Buildfire.datastore.onUpdate(function (event) {
                    switch (event.tag) {
                        case COLLECTIONS.MediaContent:
                            if (event.data) {

                                NowPlaying.item = event;
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
                                $rootScope.allowSource = event.data.content.allowSource;
                                $rootScope.transferAudioContentToPlayList = event.data.content.transferAudioContentToPlayList;
                                $rootScope.forceAutoPlay = event.data.content.forceAutoPlay;
                                NowPlaying.forceAutoPlay= event.data.content.transferAudioContentToPlayList;
                                NowPlaying.transferPlaylist=event.data.content.forceAutoPlay;
                                if (!$scope.$$phase) {
                                    $scope.$digest();
                                }
                            }
                            break;
                    }
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
                            NowPlaying.playlistPlay(track, index);
                        }
                    }
                    else if (NowPlaying.paused) {
                        if (track.url == NowPlaying.currentTrack.url) {
                            NowPlaying.settings.isPlayingCurrentTrack = true;
                            NowPlaying.playing = true;
                            track.playing = true;
                            audioPlayer.play();
                        }
                        else {
                            NowPlaying.playlistPlay(track, index);
                        }
                    }
                    else {
                        NowPlaying.playlistPlay(track, index);
                    }
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

                /**
                 * Auto play the track
                 */
/*                 $timeout(function () {
                    if (NowPlaying.settings)
                         NowPlaying.playTrack();  
                }, 0);  */
            }
        ]);
})(window.angular);
