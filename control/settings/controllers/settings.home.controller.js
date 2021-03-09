(function (angular, window) {
    'use strict';
    angular
        .module('mediaCenterDesign')
        .controller('SettingsCtrl', ['$scope', 'COLLECTIONS', 'DB', 'MediaCenterInfo', '$timeout', 'Buildfire', 'EVENTS', 'Messaging', 'Orders', function ($scope, COLLECTIONS, DB, MediaCenterInfo, $timeout, Buildfire, EVENTS, Messaging, Orders) {
            var Settings = this;
            Settings.data = {};
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
            }, function (err) {
                console.error(err);
            });

            Settings.setSettings = function () {
                MediaCenter.save(Settings.data).then(function (result) {});
            }

            Settings.setAutoPlay = function(value){
                if(value!=Settings.data.content.forceAutoPlay){
                    Settings.data.content.forceAutoPlay=value;
                    Settings.data.content.transferAudioContentToPlayList=Settings.data.content.forceAutoPlay;
                    MediaCenter.save(Settings.data).then(function (result) {});
                }
            }

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
            // $scope.$watch(function () {
            //     return Settings.data.content.allowShare && Settings.data.content.allowSource;
            // }, function () {
            //     console.log("SSSSSSSSSSSSSSS", Settings.data.content)
            // });

            /*Background image area ends*/
        }]);
})(window.angular, window);
