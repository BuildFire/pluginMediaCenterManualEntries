(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', '$routeParams', 'media', 'Buildfire', 'Modals', 'COLLECTIONS','$rootScope',
            function ($scope, $routeParams, media, Buildfire, Modals, COLLECTIONS,$rootScope) {
            $rootScope.blackBackground = true;
            $rootScope.showFeed = false;
            var NowPlaying = this;
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
            NowPlaying.openPlaylistPopup = function () {
                Modals.playlistModal(NowPlaying.item).then(function (result) {
                    console.log('Result----', result);
                }, function (err) {
                    console.error('Error===========', err);
                });
            };
            NowPlaying.openSettingsPopup = function () {
                Modals.audioSettingsModal(NowPlaying.item).then(function (result) {
                    console.log('Result----', result);
                }, function (err) {
                    console.error('Error===========', err);
                });
            };
            NowPlaying.openMoreInfoPopup = function () {
                Modals.moreInfoModal(NowPlaying.item).then(function (result) {
                    console.log('Result----', result);
                }, function (err) {
                    console.error('Error===========', err);
                });
            };
            /**
             * audioPlayer is Buildfire.services.media.audioPlayer.
             */
            var audioPlayer = Buildfire.services.media.audioPlayer;
            audioPlayer.settings.get(function (err, setting) {
                NowPlaying.volume = setting.volume;
                console.log(setting)
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
            NowPlaying.shuffle = function () {
                audioPlayer.getPlaylist(function (err, setting) {
                    console.log('err--------', err, setting);
                });
                audioPlayer.settings.get(function (err, setting) {
                    if (setting) {
                        setting.shufflePlaylist = true;
                        audioPlayer.settings.set(setting);
                    }
                    else {
                        audioPlayer.settings.set({shufflePlaylist: true});
                    }
                });

            };
            NowPlaying.repeatTrack = function () {
                audioPlayer.settings.get(function (setting) {
                    if (setting) {
                        setting.loopPlaylist = true;
                        audioPlayer.settings.set(setting);
                    }
                    else {
                        audioPlayer.settings.set({loopPlaylist: true});
                    }
                });

            };
            /**
             * audioPlayer.onEvent callback calls when audioPlayer event fires.
             */
            audioPlayer.onEvent(function (e) {
                console.log(e);
                if (e.event == "timeUpdate") {
                    NowPlaying.currentTime = e.data.currentTime;
                    NowPlaying.duration = e.data.duration;
                    $scope.$apply();
                }
                else if (e.event == "audioEnded") {
                    NowPlaying.playing = false;
                    $scope.$apply();
                }
                else if (e.event == "pause") {
                    NowPlaying.playing = false;
                    $scope.$apply();
                }
            });
            /**
             * NowPlaying.playAudio() plays audioPlayer service.
             */
            NowPlaying.playAudio = function () {
                NowPlaying.playing = true;
                if (NowPlaying.paused) {
                    audioPlayer.play();
                }
                else if (NowPlaying.track) {
                    audioPlayer.play({url: NowPlaying.track});
                }
            };
            NowPlaying.pause = function () {
                NowPlaying.playing = false;
                NowPlaying.paused = true;
                audioPlayer.pause();
            };
            NowPlaying.forward = function () {
                if (NowPlaying.currentTime + 5 >= NowPlaying.duration)
                    audioPlayer.setTime(NowPlaying.duration);
                else
                    audioPlayer.setTime(NowPlaying.currentTime + 5);
            };

            NowPlaying.backward = function () {
                if (NowPlaying.currentTime - 5 > 0)
                    audioPlayer.setTime(NowPlaying.currentTime - 5);
                else
                    audioPlayer.setTime(0);
            };

            NowPlaying.remove = function () {
                console.log('remove method called');
            };

            NowPlaying.add = function (title, url, img, artist) {
                console.log('added-----------called');
                Modals.confirmationModal().then(function (data) {
                    var track = new Track(title, url, img, artist);
                    audioPlayer.addToPlaylist(track);
                }, function (err) {
                    // Do somrthing on cancel
                });

            };

            function Track(title, url, image, artist) {
                this.title = title;
                this.url = url;
                this.image = image;
                this.artist = artist;
                this.startAt = 0; // where to begin playing
                this.lastPosition = 0; // last played to
            }


            Buildfire.datastore.onUpdate(function (event) {
                console.log('Events-----------', event);
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

            $scope.$on('$destroy', function() {
                $rootScope.blackBackground = false;
                NowPlaying.pause();
            });
        }
        ])
    ;
})(window.angular, undefined);
