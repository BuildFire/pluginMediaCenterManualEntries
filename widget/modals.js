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
        .controller('MoreInfoModalCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            var MoreInfoModal = this;
            console.log('Info------------',Info);
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
        }])
        .controller('AudioSettingsModalCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            var SettingsModal = this;
            SettingsModal.info = {};
            if (Info) {
                SettingsModal.info = Info;
            }
            SettingsModal.ok = function () {
                $modalInstance.close('yes');
            };
            SettingsModal.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }])
        .controller('PlaylistModalCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            var PlaylistModal = this;
            PlaylistModal.info = {};
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
