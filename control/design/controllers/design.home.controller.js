/**
 * Created by lakshay on 17/8/15.
 */
'use strict';

(function (angular, window) {
    angular
        .module('mediaCenterDesign')
        .controller('DesignHomeCtrl', ['$scope', 'COLLECTIONS', 'DB', 'MediaCenterInfo', '$timeout', 'Buildfire', function ($scope, COLLECTIONS, DB, MediaCenterInfo, $timeout, Buildfire) {

            var DesignHome = this;

            /* populate VM with resolve */
            DesignHome.mediaInfo = MediaCenterInfo;

            var lastSaved = angular.copy(DesignHome.mediaInfo);

            DesignHome.layouts = {
                listLayouts: [{ name: "list-1" }, { name: "list-2" }, { name: "list-3" }, {  name: "list-4"  }],
                itemLayouts: [ { name: "item-1" }, { name: "item-2" }]
            };

            DesignHome.changeLayout = function (layoutName, type) {
                if (layoutName && DesignHome.mediaInfo.data.design) {
                    DesignHome.mediaInfo.data.design[type + "Layout"] = layoutName;
                }
            };

            /*Buildfire DB Service*/
            var MediaContent = new DB(COLLECTIONS.MediaContent);

            /* initializing flag to prevent firing watcher on page load*/
            var initializing = true;
            $scope.$watch(function () {
                return DesignHome.mediaInfo;
            }, function () {

                /* if first time dont call*/
                if (initializing) {
                    $timeout(function () {
                        initializing = false;
                    });
                } else {

                    MediaContent.update(DesignHome.mediaInfo.id, DesignHome.mediaInfo.data).then(function () {

                        /* sync lastSaved to latest value */
                        lastSaved = angular.copy(DesignHome.mediaInfo);

                    }, function () {
                        /* revert to previous value in case of error*/
                        DesignHome.mediaInfo = angular.copy(lastSaved);
                    });
                }


            }, true);


            /*Background image area begins*/
            var options = {showIcons: false, multiSelection: false};

            DesignHome.addBackgroundImage = function () {
                Buildfire.imageLib.showDialog(options, callback);
            };
            DesignHome.removeBackgroundImage = function () {
                DesignHome.mediaInfo.data.design.backgroundImage = null;
            };

            var callback = function (error, result) {
                if (error) {
                    console.error('Error:', error);
                } else {
                    console.log(result.selectedFiles[0]);
                    DesignHome.mediaInfo.data.design.backgroundImage = result.selectedFiles && result.selectedFiles[0] || null;
                    $scope.$digest();

                }
            };
            /*Background image area ends*/

        }])
})(window.angular, window);
