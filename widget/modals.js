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
                },
                confirmationModal: function () {
                    var confmDeferred = $q.defer();
                    var confmModal = $modal.open({
                        templateUrl: 'templates/modals/confirmation.html',
                        controller: 'ConfmModalCtrl',
                        controllerAs: 'ConfmModal'
                    });
                    confmModal.result.then(function (imageInfo) {
                        confmDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        confmDeferred.reject(err);
                    });
                    return confmDeferred.promise;
                },
                removeTrackModal: function () {
                    var removePopupDeferred = $q.defer();
                    var removePopupModal =$modal
                        .open({
                            templateUrl: 'templates/modals/remove-track-modal.html',
                            controller: 'RemoveTrackModalPopupCtrl',
                            controllerAs: 'RemoveTrackPopup',
                            size: 'sm'
                        });

                    removePopupModal.result.then(function (imageInfo) {
                        removePopupDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        removePopupDeferred.reject(err);
                    });
                    return removePopupDeferred.promise;
                }
            };
        }])
        .controller('MoreInfoModalCtrl', ['$scope', '$modalInstance', 'Info', 'Buildfire', function ($scope, $modalInstance, Info, Buildfire) {
            var MoreInfoModal = this;
            var audioPlayer = Buildfire.services.media.audioPlayer;
            audioPlayer.getPlaylist(function (err, playlist) {
                console.log('err----', err, 'playList-------', playlist);
                if (playlist) {
                    MoreInfoModal.playlistTracks = playlist.tracks;
                    MoreInfoModal.currentIndex = playlist.lastIndex;
                    $scope.$apply();
                }
                else
                    console.error(err);
            });
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
                var index = audioPlayer.addToPlaylist(track);
                console.log(index);
            };
            MoreInfoModal.remove = function (index) {
                console.log('remove method called');
                audioPlayer.removeFromPlaylist(index);
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
        .controller('ConfmModalCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
            var ConfmModal = this;
            ConfmModal.ok = function () {
                $modalInstance.close('yes');
            };
            ConfmModal.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }])
        .controller('RemoveTrackModalPopupCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
            console.log('RemoveTrackModalPopupCtrl Controller called-----');
            var RemoveTrackPopup = this;
            RemoveTrackPopup.ok = function () {
                $modalInstance.close({info:'Remove'});
            };
            RemoveTrackPopup.cancel = function () {
                $modalInstance.dismiss({error:'Reject'});
            };
        }])
    ;
    /*.controller('AudioSettingsModalCtrl', ['$scope', '$modalInstance', 'Info', 'Buildfire', function ($scope, $modalInstance, Info, Buildfire) {
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
     }]);*/
})(window.angular, window.buildfire);
