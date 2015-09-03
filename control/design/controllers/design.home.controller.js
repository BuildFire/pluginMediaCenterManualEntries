(function (angular, window) {
    'use strict';
    angular
        .module('mediaCenterDesign')
        .controller('DesignHomeCtrl', ['$scope', 'COLLECTIONS', 'DB', 'MediaCenterInfo', '$timeout', 'Buildfire', 'EVENTS', 'Messaging', function ($scope, COLLECTIONS, DB, MediaCenterInfo, $timeout, Buildfire, EVENTS, Messaging) {
            var DesignHome = this;
            /* populate VM with resolve */
            DesignHome.mediaInfo = MediaCenterInfo;

            DesignHome._lastSaved = angular.copy(DesignHome.mediaInfo);

            /*Buildfire DB Service*/

            DesignHome._mediaCenter = new DB(COLLECTIONS.MediaCenter);
            var MediaCenter = DesignHome._mediaCenter;

            DesignHome.layouts = {
                listLayouts: [{name: "list-1"}, {name: "list-2"}, {name: "list-3"}, {name: "list-4"}],
                itemLayouts: [{name: "item-1"}, {name: "item-2"}]
            };
            DesignHome.changeLayout = function (layoutName, type) {
                if (layoutName && DesignHome.mediaInfo.data.design) {
                    DesignHome.mediaInfo.data.design[type + "Layout"] = layoutName;
                }
            };

            var callback = function (error, result) {
                if (error) {
                    console.error('Error:', error);
                } else {
                    DesignHome.mediaInfo.data.design.backgroundImage = result.selectedFiles && result.selectedFiles[0] || null;
                    $scope.$digest();
                }
            };

            DesignHome._callback = callback;

            var options = {showIcons: false, multiSelection: false};
            DesignHome.addBackgroundImage = function () {
                Buildfire.imageLib.showDialog(options, callback);
            };
            DesignHome.removeBackgroundImage = function () {
                DesignHome.mediaInfo.data.design.backgroundImage = null;
            };

            $scope.$watch(function () {
                return DesignHome.mediaInfo;
            }, function () {
                    MediaCenter.update(DesignHome.mediaInfo.id, DesignHome.mediaInfo.data).then(function () {
                        /* sync lastSaved to latest value */
                        DesignHome._lastSaved = angular.copy(DesignHome.mediaInfo);
                        ///on Control when a user drills to a section reflect the same on the widget
                    }, function () {
                        /* revert to previous value in case of error*/
                        DesignHome.mediaInfo = angular.copy(DesignHome._lastSaved);
                    });

            }, true);
            /*Background image area ends*/
        }]);
})(window.angular, window);
