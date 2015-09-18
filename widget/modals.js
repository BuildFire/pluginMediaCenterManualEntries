(function (angular, buildfire) {
    'use strict';
    if (!buildfire) {
        throw ("buildfire not found");
    }
    angular
        .module('mediaCenterWidgetModals', ['mediaCenterWidgetFilters', 'ui.bootstrap'])
        .factory('Modals', ['$modal', '$q', function ($modal, $q) {
            return {
                moreInfoModal: function (info) {
                    var moreDeferred = $q.defer();
                    var moreInfoModal = $modal
                        .open({
                            templateUrl: 'templates/modals/more-info.html',
                            controller: 'MoreInfoModalCtrl',
                            controllerAs: 'MoreInfoModal',
                            //size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    moreInfoModal.result.then(function (imageInfo) {
                        moreDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        moreDeferred.reject(err);
                    });
                    return moreDeferred.promise;
                },
                audioSettingsModal: function (info) {
                    var settingsDeferred = $q.defer();
                    var audioSettingsModal = $modal
                        .open({
                            templateUrl: 'templates/modals/audio-setting.html',
                            controller: 'AudioSettingsModalCtrl',
                            controllerAs: 'SettingsModal',
                            //size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    audioSettingsModal.result.then(function (imageInfo) {
                        settingsDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        settingsDeferred.reject(err);
                    });
                    return settingsDeferred.promise;
                },
                playlistModal: function (info) {
                    var playlistDeferred = $q.defer();
                    var playlistModal = $modal
                        .open({
                            templateUrl: 'templates/modals/playlist.html',
                            controller: 'PlaylistModalCtrl',
                            controllerAs: 'PlaylistModal',
                            // size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    playlistModal.result.then(function (imageInfo) {
                        playlistDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        playlistDeferred.reject(err);
                    });
                    return playlistDeferred.promise;
                }
            };
        }])
        .controller('MoreInfoModalCtrl', ['$scope', '$modalInstance', 'Info', 'Buildfire', function ($scope, $modalInstance, Info, Buildfire) {
            var MoreInfoModal = this;
            var audioPlayer = Buildfire.services.media.audioPlayer;
            console.log('Info------------', Info);
            MoreInfoModal.info = {};
            if (Info) {
                MoreInfoModal.info = Info;
            }
            MoreInfoModal.ok = function () {
                $modalInstance.close('yes');
            };
            MoreInfoModal.cancel = function () {
                $modalInstance.dismiss('no');
            };

            MoreInfoModal.add = function (title, url, img, artist) {
                console.log('added-----------called');
                var track = new Track(title, url, img, artist);
                audioPlayer.addToPlaylist(track);
            };
            function Track(title, url, image, artist) {
                this.title = title;
                this.url = url;
                this.image = image;
                this.artist = artist;
                this.startAt = 0; // where to begin playing
                this.lastPosition = 0; // last played to
            }
        }])
        .controller('AudioSettingsModalCtrl', ['$scope', '$modalInstance', 'Info', 'Buildfire', function ($scope, $modalInstance, Info, Buildfire) {
            var SettingsModal = this;
            var audioPlayer = Buildfire.services.media.audioPlayer;
            SettingsModal.info = {};
            if (Info) {
                SettingsModal.info = Info;
            }
            SettingsModal.ok = function () {
                $modalInstance.close('yes');
            };
            SettingsModal.saveSettings = function () {
                console.log('saveSettings method called----');
                audioPlayer.settings.set(SettingsModal.settings);
            };
            SettingsModal.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }])
        .controller('PlaylistModalCtrl', ['$scope', '$modalInstance', 'Info', 'Buildfire', function ($scope, $modalInstance, Info, Buildfire) {
            var PlaylistModal = this;
            PlaylistModal.info = {};
            var audioPlayer = Buildfire.services.media.audioPlayer;
            audioPlayer.getPlaylist(function (err, playlist) {
                console.log('err----', err, 'playList-------', playlist);
                if (playlist) {
                    $scope.playlistTracks = playlist.tracks;
                    $scope.currentIndex = playlist.lastIndex;
                    $scope.$apply();
                }
                else
                    console.error(err);

            });
            if (Info) {
                PlaylistModal.info = Info;
            }
            PlaylistModal.ok = function () {
                $modalInstance.close('yes');
            };
            PlaylistModal.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }]);
})(window.angular, window.buildfire);
