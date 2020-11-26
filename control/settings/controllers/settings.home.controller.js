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
            }, function (err) {
                console.error(err);
            });

            Settings.setSettings = function () {
                MediaCenter.save(Settings.data).then(function (result) {});
            }
            // $scope.$watch(function () {
            //     return Settings.data.content.allowShare && Settings.data.content.allowSource;
            // }, function () {
            //     console.log("SSSSSSSSSSSSSSS", Settings.data.content)
            // });

            /*Background image area ends*/
        }]);
})(window.angular, window);
