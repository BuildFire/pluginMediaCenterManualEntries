/**
 * Created by lakshay on 17/8/15.
 */
'use strict';

(function (angular, window) {
    angular
        .module('mediaCenterDesign')
        .controller('DesignHomeCtrl', ['$scope', 'COLLECTIONS', 'DB', 'MediaCenterInfo', '$timeout', function ($scope, COLLECTIONS, DB, MediaCenterInfo, $timeout) {

            var DesignHome = this;

            /* populate VM with resolve */
            DesignHome.mediaInfo = MediaCenterInfo;

            var lastSaved = angular.copy(DesignHome.mediaInfo);

            DesignHome.layouts = {
                listLayouts: [{
                    name: "list-layout-1"
                }, {
                    name: "list-layout-2"
                }],
                itemLayouts: [{
                    name: "item-layout-1"
                }, {
                    name: "item-layout-2"
                }, {
                    name: "item-layout-3"
                }, {
                    name: "item-layout-4"
                }]
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


        }])
})(window.angular, window);
