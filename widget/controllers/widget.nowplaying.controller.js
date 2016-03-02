(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', '$routeParams', 'media', 'Buildfire', 'Modals', 'COLLECTIONS', '$rootScope', '$timeout','Location',
            function ($scope, $routeParams, media, Buildfire, Modals, COLLECTIONS, $rootScope, $timeout,Location) {
                $rootScope.blackBackground = true;
                $rootScope.showFeed = false;
                var NowPlaying = this;
                NowPlaying.swiped=[];
                NowPlaying.currentTrack = new Track(media.data);
                NowPlaying.item = media;
                NowPlaying.playing = false;
                NowPlaying.paused = false;
                NowPlaying.showVolume = false;
                NowPlaying.track = media.data.audioUrl;
                /**
                 * slider to show the slider on now-playing page.
                 * @type {*|jQuery|HTMLElement}
                 */
                NowPlaying.changeTime = function (time) {
                    audioPlayer.setTime(time);
                };

                /**
                 * audioPlayer is Buildfire.services.media.audioPlayer.
                 */
                var audioPlayer = Buildfire.services.media.audioPlayer;
                audioPlayer.settings.get(function (err, setting) {
                    NowPlaying.settings=setting;
                    NowPlaying.volume = setting.volume;
                });

                NowPlaying.changeVolume = function (volume) {
                    audioPlayer.settings.get(function (err, setting) {
                        console.log(setting);
                        if (setting) {
                            setting.volume = volume;
                            audioPlayer.settings.set(setting);
                        }
                        else {
                            audioPlayer.settings.set({volume: volume});
                        }
                    });

                };

                /**
                 * audioPlayer.onEvent callback calls when audioPlayer event fires.
                 */
                audioPlayer.onEvent(function (e) {
                    switch (e.event) {
                        case 'timeUpdate':
                            NowPlaying.currentTime = e.data.currentTime;
                            NowPlaying.duration = e.data.duration;
                            break;
                        case 'audioEnded':
                            NowPlaying.playing = false;
                            NowPlaying.paused = false;
                            break;
                        case 'pause':
                            NowPlaying.playing = false;
                            break;
                        case 'next':
                            NowPlaying.currentTrack = e.data.track;
                            NowPlaying.playing = true;
                            break;
                        case 'removeFromPlaylist':
                            Modals.removeTrackModal();
                            NowPlaying.playList = e.data && e.data.newPlaylist && e.data.newPlaylist.tracks;
                            break;

                    }
                    $scope.$digest();
                });

                /**
                 * Player related method and variables
                 */
                NowPlaying.playTrack = function () {
                    NowPlaying.playing = true;
                    if (NowPlaying.paused) {
                        audioPlayer.play();
                    } else {
                        audioPlayer.play(NowPlaying.currentTrack);
                    }
                };
                NowPlaying.playlistPlay = function (track) {
                    NowPlaying.playing = true;
                    if (track) {
                        audioPlayer.play({url: track.url});
                        track.playing = true;
                    }
                    $scope.$digest();
                };
                NowPlaying.pauseTrack = function () {
                    NowPlaying.playing = false;
                    NowPlaying.paused = true;
                    audioPlayer.pause();
                    $scope.$digest();
                };
                NowPlaying.playlistPause = function (track) {
                    track.playing = false;
                    NowPlaying.playing = false;
                    NowPlaying.paused = true;
                    audioPlayer.pause();
                    $scope.$digest();
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
                            audioPlayer.settings.set({volume: volume});
                        }
                    });

                };
                NowPlaying.loopPlaylist = function () {
                    if (NowPlaying.settings) {
                        NowPlaying.settings.loopPlaylist = NowPlaying.settings.loopPlaylist ? false : true;
                    }
                    audioPlayer.settings.set(NowPlaying.settings);
                };
                NowPlaying.addToPlaylist = function (track) {
                    if (track)
                        audioPlayer.addToPlaylist(track);
                };
                NowPlaying.removeFromPlaylist = function (track) {
                    if (NowPlaying.playList) {
                        NowPlaying.playList.filter(function (val, index) {
                            if (val.url == track.url)
                                audioPlayer.removeFromPlaylist(index);
                            return index;

                        });
                    }
                };
                NowPlaying.removeTrackFromPlayList = function (index) {
                        audioPlayer.removeFromPlaylist(index);

                };
                NowPlaying.getFromPlaylist = function () {
                    audioPlayer.getPlaylist(function (err, data) {
                        if (data && data.tracks) {
                            NowPlaying.playList = data.tracks;
                            $scope.$digest();
                        }
                    });
                    NowPlaying.openMoreInfo = false;
                    NowPlaying.openPlaylist = true;
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
                    NowPlaying.openPlaylist = false;
                };
                NowPlaying.closeMoreInfoOverlay = function () {
                    NowPlaying.openMoreInfo = false;
                };

                NowPlaying.addEvents = function (e, i, toggle) {
                    toggle ? NowPlaying.swiped[i] = true : NowPlaying.swiped[i] = false;
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
                 * @constructor
                 */
                function AudioSettings(settings) {
                    this.autoPlayNext = settings.autoPlayNext; // once a track is finished playing go to the next track in the play list and play it
                    this.loopPlaylist = settings.loopPlaylist; // once the end of the playlist has been reached start over again
                    this.autoJumpToLastPosition = settings.autoJumpToLastPosition; //If a track has [lastPosition] use it to start playing the audio from there
                    this.shufflePlaylist = settings.shufflePlaylist;// shuffle the playlist
                }


                Buildfire.datastore.onUpdate(function (event) {
                    switch (event.tag) {
                        case COLLECTIONS.MediaContent:
                            if (event.data) {

                                NowPlaying.item = event;
                                $scope.$digest();
                            }
                            break;
                        case COLLECTIONS.MediaCenter:
                            if (event.data) {
                                $rootScope.design = event.data.design;
                            }
                            break;
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
                    $rootScope.blackBackground = false;
                    onRefresh.clear();
                    Buildfire.datastore.onRefresh(function(){
                        Location.goToHome();
                    });
                });
            }
        ])
    ;
})(window.angular);
