'use strict';

(function (angular, window) {
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', 'MediaCenterInfo', 'Modals', 'DB', 'COLLECTIONS','Orders', function ($scope, MediaCenterInfo, Modals, DB, COLLECTIONS,Orders) {
            var MediaCenter = new DB(COLLECTIONS.MediaCenter);
            var ContentHome = this;
            ContentHome.orders=Orders.ordersMap;
            ContentHome.info = MediaCenterInfo;
            updateMasterInfo(ContentHome.info);
            var tmrDelayForMedia=null;
            ContentHome.bodyWYSIWYGOptions = {
                plugins: 'advlist autolink link image lists charmap print preview',
                skin: 'lightgray',
                trusted: true,
                theme: 'modern'
            };

            ContentHome.rmCarouselImage = function () {

            }
            ContentHome.addCarouselImage = function (index) {
                var link = null;
                if (typeof index != 'undefined') {
                    link = ContentHome.info.data.content.images[index];
                }
                Modals.carouselImageModal(link).then(function (link) {
                    if (link) {
                        if (typeof index != 'undefined') {
                            ContentHome.info.data.content.images[index] = link;
                        }
                        else {
                            if (!ContentHome.info.data.content.images)
                                ContentHome.info.data.content.images = [];
                            ContentHome.info.data.content.images.push(JSON.parse(angular.toJson(link)));
                        }
                    } else {
                        console.info('Unable to load data.')
                    }
                }, function (err) {
                    //do something on cancel
                });
            }
            ContentHome.carouselOptions = {
                handle: '> .cursor-grab'
            };
            function updateMasterInfo(info) {
                ContentHome.masterInfo = angular.copy(info);
            }

            function resetInfo() {
                ContentHome.info = angular.copy(ContentHome.masterInfo);
            }

            function isUnchanged(info) {
                return angular.equals(info, ContentHome.masterInfo);
            }

            function updateData() {
                MediaCenter.update(ContentHome.info.id,ContentHome.info.data).then(function (data) {
                    updateMasterInfo(data);
                }, function (err) {
                    resetInfo();
                    console.error('Error-------', err);
                });
            }

            function saveDataWithDelay(info) {
                console.log('Save Data With Delay method called-----------',ContentHome.info);
                if (tmrDelayForMedia) {
                    clearTimeout(tmrDelayForMedia);
                }
                if (!isUnchanged(ContentHome.info)) {
                    tmrDelayForMedia = setTimeout(function () {
                        updateData();
                    }, 1000);
                }
            }

            $scope.$watch(function () {
                return ContentHome.info;
            }, saveDataWithDelay, true);
        }])
})(window.angular, window);
