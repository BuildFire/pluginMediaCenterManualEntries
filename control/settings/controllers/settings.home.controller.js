(function (angular, window) {
    'use strict';
    angular
        .module('mediaCenterDesign')
        .controller('SettingsCtrl', ['$scope', 'COLLECTIONS', 'DB', 'MediaCenterInfo', '$timeout', 'Buildfire', 'EVENTS', 'Messaging', 'Orders', function ($scope, COLLECTIONS, DB, MediaCenterInfo, $timeout, Buildfire, EVENTS, Messaging, Orders) {
            var Settings = this;
            Settings.data = {};
            $scope.inputs = {};
            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
            MediaCenter.get().then(function (getData) {
                Settings.data = getData.data;
                if (typeof (Settings.data.content.allowShare) == 'undefined')
                    Settings.data.content.allowShare = true;
                if (typeof (Settings.data.content.allowSource) == 'undefined')
                    Settings.data.content.allowSource = true;
                if (typeof (Settings.data.content.transferAudioContentToPlayList) == 'undefined')
                    Settings.data.content.transferAudioContentToPlayList = false;
                if (typeof (Settings.data.content.forceAutoPlay) == 'undefined')
                    Settings.data.content.forceAutoPlay = false;
                if (typeof (Settings.data.design.skipMediaPage) == 'undefined')
                    Settings.data.design.skipMediaPage = false;
                if (typeof (Settings.data.content.autoPlay) == 'undefined')
                    Settings.data.content.autoPlay = false;
                if (typeof (Settings.data.content.autoPlayDelay) == 'undefined')
                    Settings.data.content.autoPlayDelay = { label: "Off", value: 0 };
                if (typeof (Settings.data.content.globalPlaylist) == 'undefined')
                    Settings.data.content.globalPlaylist = false;
                if (typeof (Settings.data.content.globalPlaylistPluginName) == 'undefined') {
                    Settings.data.content.globalPlaylistPluginName = '';
                    $scope.inputs.pluginInstanceName = ''
                } else $scope.inputs.pluginInstanceName = Settings.data.content.globalPlaylistPluginName;
            }, function (err) {
                console.error(err);
            });

            Settings.setSettings = function () {
                MediaCenter.save(Settings.data).then(function (result) {});
            }

            Settings.setForceAutoPlay = function(value){
                if(value!=Settings.data.content.forceAutoPlay){
                    if (value === true && Settings.data.content.autoPlay) {
                        Settings.data.content.autoPlay = false;
                    }
                    Settings.data.content.forceAutoPlay=value;
                    Settings.data.content.transferAudioContentToPlayList=Settings.data.content.forceAutoPlay;
                    MediaCenter.save(Settings.data).then(function (result) {});
                }
            }

            Settings.changeSkipPage = function (value) {
                if (value!=Settings.data.design.skipMediaPage){
                    Settings.data.design.skipMediaPage=value;
                    MediaCenter.save(Settings.data).then(function (result) {});
                }
            };

            Settings.setAllowSource = function(value){
                if(value!=Settings.data.content.allowSource){
                    Settings.data.content.allowSource=value;
                    MediaCenter.save(Settings.data).then(function (result) {});
                }
            }

            Settings.setAllowShare = function(value){
                if(value!=Settings.data.content.allowShare){
                    Settings.data.content.allowShare=value;
                    MediaCenter.save(Settings.data).then(function (result) {});
                }
            }

            Settings.setAutoPlay = function (value) {
                if (value != Settings.data.content.autoPlay) {
                    if (value === true && Settings.data.content.forceAutoPlay) {
                        Settings.data.content.forceAutoPlay = false;
                        Settings.data.content.transferAudioContentToPlayList = Settings.data.content.forceAutoPlay;
                    }
                    if (value === true) Settings.data.design.skipMediaPage = true;
                    Settings.data.content.autoPlay = value;
                    MediaCenter.save(Settings.data).then(function (result) { });
                }
            };

            Settings.setGlobalPlaylist = function (value) {
                if (value != Settings.data.content.globalPlaylist) {
                    Settings.data.content.globalPlaylist = value;
                    MediaCenter.save(Settings.data).then(function (result) { });
                }
            };


            let delay;
            Settings.setGlobalPlaylistPluginName = function () {
                if (delay) clearTimeout(delay);

                delay = setTimeout(() => {
                    if ($scope.inputs.pluginInstanceName != Settings.data.content.globalPlaylistPluginName) {
                        Settings.data.content.globalPlaylistPluginName = $scope.inputs.pluginInstanceName;
                        MediaCenter.save(Settings.data).then(function (result) { });
                    }
                }, 700);
            };
            
            Settings.setAutoPlayDelay = function (option) {
                if (option.value != Settings.data.content.autoPlayDelay.value) {
                    Settings.data.content.autoPlayDelay = option;
                    MediaCenter.save(Settings.data).then(function (result) { });
                }
            };

            Settings.autoPlayDelayOptions = [
                { label: "Off", value: 0 },
                { label: "1s", value: 1 },
                { label: "2s", value: 2 },
                { label: "3s", value: 3 },
                { label: "5s", value: 5 },
            ];

            // $scope.$watch(function () {
            //     return Settings.data.content.allowShare && Settings.data.content.allowSource;
            // }, function () {
            //     console.log("SSSSSSSSSSSSSSS", Settings.data.content)
            // });

            /*Background image area ends*/
        }]);
})(window.angular, window);
