(function (angular, window) {
    'use strict';
    angular
        .module('mediaCenterDesign')
        .controller('DesignHomeCtrl', ['$scope', 'COLLECTIONS', 'DB', 'MediaCenterInfo', '$timeout', 'Buildfire', 'EVENTS', 'Messaging', 'Orders', function ($scope, COLLECTIONS, DB, MediaCenterInfo, $timeout, Buildfire, EVENTS, Messaging, Orders) {
            var DesignHome = this;
            var background = new Buildfire.components.images.thumbnail("#background");
            var _infoData = {
                data: {
                    content: {
                        images: [],
                        descriptionHTML: '',
                        description: '',
                        sortBy: Orders.ordersMap.Newest,
                        rankOfLastItem: 0
                    },
                    design: {
                        listLayout: "list-1",
                        itemLayout: "item-1",
                        backgroundImage: "",
                        skipMediaPage: false
                    }
                }
            };

            if (!MediaCenterInfo) {
                MediaCenterInfo = _infoData;
            }

            DesignHome._lastSaved = angular.copy(MediaCenterInfo);
            /* populate VM with resolve */
            DesignHome.mediaInfo = MediaCenterInfo;
            if (DesignHome.mediaInfo.data && DesignHome.mediaInfo.data.design && DesignHome.mediaInfo.data.design.backgroundImage) {
                background.loadbackground(DesignHome.mediaInfo.data.design.backgroundImage);
            }
            if(!DesignHome.mediaInfo.data.design.skipMediaPage)
                DesignHome.mediaInfo.data.design.skipMediaPage=false;
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

            background.onChange = function (url) {
                DesignHome.mediaInfo.data.design.backgroundImage = url;
                if (!$scope.$$phase && !$scope.$root.$$phase) {
                    $scope.$apply();
                }
            };

            background.onDelete = function (url) {
                DesignHome.mediaInfo.data.design.backgroundImage = "";
                if (!$scope.$$phase && !$scope.$root.$$phase) {
                    $scope.$apply();
                }
            };

            function isUnchanged(info) {
                return angular.equals(info, DesignHome.mediaInfo);
            }

            $scope.$watch(function () {
                return DesignHome.mediaInfo;
            }, function () {

                if (isUnchanged(DesignHome._lastSaved))
                    return;
                if (!DesignHome.mediaInfo.id) {
                    MediaCenter.save(DesignHome.mediaInfo.data).then(function (data) {
                        MediaCenter.get().then(function (getData) {
                            /* sync lastSaved to latest value */
                            DesignHome._lastSaved = angular.copy(DesignHome.mediaInfo);
                            DesignHome._lastSaved.id = getData.id;
                            DesignHome.mediaInfo.id = getData.id;
                            console.log('load edit to medianInfo/', DesignHome.mediaInfo);
                        }, function (err) {
                            console.error(err);
                        });

                    }, function (err) {
                        /* revert to previous value in case of error*/
                        DesignHome.mediaInfo = angular.copy(DesignHome._lastSaved);
                    });
                }
                else {
                    MediaCenter.update(DesignHome.mediaInfo.id, DesignHome.mediaInfo.data).then(function () {
                        /* sync lastSaved to latest value */
                        DesignHome._lastSaved = angular.copy(DesignHome.mediaInfo);
                        ///on Control when a user drills to a section reflect the same on the widget
                    }, function () {
                        /* revert to previous value in case of error*/
                        DesignHome.mediaInfo = angular.copy(DesignHome._lastSaved);
                    });
                }
            }, true);
            /*Background image area ends*/
        }]);
})(window.angular, window);
