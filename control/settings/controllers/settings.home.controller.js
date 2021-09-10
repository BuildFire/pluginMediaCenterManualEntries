(function (angular, window) {
    'use strict';
    angular
        .module('mediaCenterDesign')
        .controller('SettingsCtrl', ['$scope', 'COLLECTIONS','PLAYLISTINSTANCES', 'DB', function ($scope, COLLECTIONS,PLAYLISTINSTANCES, DB) {
            var Settings = this;
            Settings.data = {};
            $scope.inputs = {};
            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
            
            MediaCenter.get().then((getData) => {
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
                if (typeof (Settings.data.content.showGlobalPlaylistNavButton) == 'undefined')
                    Settings.data.content.showGlobalPlaylistNavButton = false;
                if (typeof (Settings.data.content.globalPlaylistPlugin) == 'undefined') {
                    Settings.data.content.globalPlaylistPlugin = false;
                }
            }, (err) => {
                console.error(err);
            });

            Settings.setSettings = () => {
                MediaCenter.save(Settings.data).then(() => {});
            }

            Settings.setForceAutoPlay = (e) => {
                let value = e.target.checked;
                if(value!=Settings.data.content.forceAutoPlay){
                    if (value === true && Settings.data.content.autoPlay) {
                        Settings.data.content.autoPlay = false;
                    }
                    Settings.data.content.forceAutoPlay = value;
                    Settings.data.content.transferAudioContentToPlayList = Settings.data.content.forceAutoPlay;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            }

            Settings.changeSkipPage = (e) => {
                let value = e.target.checked;
                if (value!=Settings.data.design.skipMediaPage){
                    if (value === false) {
                        Settings.data.content.autoPlay = false;
                    }
                    Settings.data.design.skipMediaPage = value;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            };

            Settings.setAllowSource = (e) => {
                let value = e.target.checked;
                if(value!=Settings.data.content.allowSource){
                    Settings.data.content.allowSource=value;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            }

            Settings.setAllowShare = (e) => {
                let value = e.target.checked;
                if(value!=Settings.data.content.allowShare){
                    Settings.data.content.allowShare=value;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            }

            Settings.setAutoPlay = (e) => {
                let value = e.target.checked;
                if (value != Settings.data.content.autoPlay) {
                    if (value === true && Settings.data.content.forceAutoPlay) {
                        Settings.data.content.forceAutoPlay = false;
                        Settings.data.content.transferAudioContentToPlayList = Settings.data.content.forceAutoPlay;
                    }
                    if (value === true) Settings.data.design.skipMediaPage = true;
                    Settings.data.content.autoPlay = value;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            };

            Settings.setAutoPlayDelay = (option) => {
                if (option.value != Settings.data.content.autoPlayDelay.value) {
                    Settings.data.content.autoPlayDelay = option;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            };

            Settings.setGlobalPlaylist = (e) => {
                let value = e.target.checked;
                if (value != Settings.data.content.globalPlaylist) {
                    Settings.data.content.globalPlaylist = value;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            };

            Settings.setGlobalPlaylistNavButton = (e) => {
                let value = e.target.checked;
                if (value != Settings.data.content.showGlobalPlaylistNavButton) {
                    Settings.data.content.showGlobalPlaylistNavButton = value;
                    MediaCenter.save(Settings.data).then(() => {});
                }
            };

            Settings.setGlobalPlaylistPlugin = (pluginInstance) => {
                Settings.data.content.globalPlaylistPlugin = pluginInstance;
                MediaCenter.save(Settings.data).then(() => {});
            };

            Settings.autoPlayDelayOptions = [
                { label: "Off", value: 0 },
                { label: "1s", value: 1 },
                { label: "2s", value: 2 },
                { label: "3s", value: 3 },
                { label: "5s", value: 5 },
            ];

            Settings.showPluginsDialog = () => {
                // MCM Playlist plugin unique Id
                buildfire.pluginInstance.showDialog({}, (err, instances) => {
                    if (err) {
                        return buildfire.dialog.toast({
                            message: "Error occured",
                            type: "danger",
                        });
                    }
                    if (instances && instances.length > 0) {
                        if (instances[0].pluginTypeId === PLAYLISTINSTANCES.DEV || instances[0].pluginTypeId === PLAYLISTINSTANCES.QA || instances[0].pluginTypeId === PLAYLISTINSTANCES.PROD ) {
                            Settings.setGlobalPlaylistPlugin(instances[0]);
                        } else {
                            buildfire.dialog.toast({
                                message: "Please select the correct paylist plugin",
                                type: "warning",
                            });
                        }
                    }
                });
            }
        }]);
})(window.angular, window);
