'use strict';

(function (angular, window) {
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', 'MediaCenterInfo', 'Modals', function ($scope, MediaCenterInfo, Modals) {
            var ContentHome = this;
            ContentHome.info = MediaCenterInfo;
            ContentHome.bodyWYSIWYGOptions={
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
        }])
})(window.angular, window);
