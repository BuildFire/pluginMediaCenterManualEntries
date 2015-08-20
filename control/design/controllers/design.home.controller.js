/**
 * Created by lakshay on 17/8/15.
 */
'use strict';

(function (angular, window) {
    angular
        .module('mediaCenterDesign')
        .controller('DesignHomeCtrl', ['$scope', 'COLLECTIONS', 'DB', 'MediaCenterInfo', '$timeout', 'Buildfire', 'EVENTS','Messaging', function ($scope, COLLECTIONS, DB, MediaCenterInfo, $timeout, Buildfire, EVENTS,Messaging) {

            var DesignHome = this;

            /* populate VM with resolve */
            DesignHome.mediaInfo = MediaCenterInfo;

            var lastSaved = angular.copy(DesignHome.mediaInfo);

            /*Buildfire DB Service*/
            var MediaCenter = new DB(COLLECTIONS.MediaCenter);

            DesignHome.layouts = {
                listLayouts: [{name: "list-1"}, {name: "list-2"}, {name: "list-3"}, {name: "list-4"}],
                itemLayouts: [{name: "item-1"}, {name: "item-2"}]
            };

            DesignHome.changeLayout = function (layoutName, type) {
                if (layoutName && DesignHome.mediaInfo.data.design) {
                    DesignHome.mediaInfo.data.design[type + "Layout"] = layoutName;
                }
            };


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

                    MediaCenter.update(DesignHome.mediaInfo.id, DesignHome.mediaInfo.data).then(function () {

                        /* sync lastSaved to latest value */
                        lastSaved = angular.copy(DesignHome.mediaInfo);
                        ///on Control when a user drills to a section reflect the same on the widget
                        Messaging.sendMessageToWidget({
                            name: EVENTS.DESIGN_LAYOUT_CHANGE,
                            message: {
                                listLayout: DesignHome.mediaInfo.data.design.listLayout,
                                itemLayout: DesignHome.mediaInfo.data.design.itemLayout
                            }
                        });


                    }, function () {
                        /* revert to previous value in case of error*/
                        DesignHome.mediaInfo = angular.copy(lastSaved);
                    });
                }


            }, true);


            /*Background image area begins*/

            /*This function invokes Message to Widget*/
            function InvokeBGImageChangeMessaging(){
                Messaging.sendMessageToWidget({
                    name: EVENTS.DESIGN_BGIMAGE_CHANGE,
                    message: {
                        backgroundImage: DesignHome.mediaInfo.data.design.backgroundImage
                    }
                });
            }

            var callback = function (error, result) {
                if (error) {
                    console.error('Error:', error);
                } else {
                    console.log(result.selectedFiles[0]);
                    DesignHome.mediaInfo.data.design.backgroundImage = result.selectedFiles && result.selectedFiles[0] || null;
                    InvokeBGImageChangeMessaging();
                    $scope.$digest();

                }
            };

            var options = {showIcons: false, multiSelection: false};

            DesignHome.addBackgroundImage = function () {
                Buildfire.imageLib.showDialog(options, callback);
            };
            DesignHome.removeBackgroundImage = function () {
                DesignHome.mediaInfo.data.design.backgroundImage = null;
                InvokeBGImageChangeMessaging();
            };

            /*Background image area ends*/

        }])
})(window.angular, window);
