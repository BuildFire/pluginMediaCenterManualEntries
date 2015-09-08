(function (angular, buildfire) {
    'use strict';
    if (!buildfire) {
        throw ("buildfire not found");
    }
    angular
        .module('mediaCenterModals', ['mediaCenterControlFilters', 'ui.bootstrap'])
        .factory('Modals', ['$modal', '$q', function ($modal, $q) {
            return {
                carouselImageModal: function (link) {
                    var carDeferred = $q.defer();
                    var carouselImageModal = $modal
                        .open({
                            templateUrl: 'templates/modals/carousel-image-modal.html',
                            controller: 'CarouselImageCtrl',
                            controllerAs: 'CarouselImage',
                            size: 'sm',
                            resolve: {
                                Link: function () {
                                    return link;
                                }
                            }
                        });
                    carouselImageModal.result.then(function (imageInfo) {
                        carDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        carDeferred.reject(err);
                    });
                    return carDeferred.promise;
                },
                removePopupModal: function (info) {
                    var removePopupDeferred = $q.defer();
                    var removePopupModal = $modal
                        .open({
                            templateUrl: 'templates/modals/rm-image-link-modal.html',
                            controller: 'RemovePopupCtrl',
                            controllerAs: 'RemovePopup',
                            size: 'sm',
                            resolve: {
                                Info: function () {
                                    return info;
                                }
                            }
                        });
                    removePopupModal.result.then(function (imageInfo) {
                        removePopupDeferred.resolve(imageInfo);
                    }, function (err) {
                        //do something on cancel
                        removePopupDeferred.reject(err);
                    });
                    return removePopupDeferred.promise;
                }
            };
        }])
        .controller('CarouselImageCtrl', ['$scope', '$modalInstance', 'Link', function ($scope, $modalInstance, Link) {
            var CarouselImage = this;
            CarouselImage.link = Link || {
                imageUrl: "",
                title: "",
                url: "",
                action: "linkToApp",//linkToWeb
                openIn: "_system", // "_blank" or "_system",
                actionName: "Link to App Content"
            };
            CarouselImage.ok = function () {
                var link = CarouselImage.link;
                if (!link.imageUrl) {
                    return;
                }
                switch (link.action) {
                    case "linkToWeb":
                        link.action = 'linkToWeb';
                        link.actionName = 'Link to App Web';
                        break;
                    default :
                        link.action = 'linkToApp';
                        link.actionName = 'Link to App Content';
                        break;
                }
                $modalInstance.close(link);
            };
            CarouselImage.cancel = function () {
                $modalInstance.dismiss('canceled');
            };
            CarouselImage.selectImage = function () {
                buildfire.imageLib.showDialog({showIcons: false, multiSelection: false}, function (error, result) {
                    if (error) {
                        console.error(error);
                    } else {
                        CarouselImage.link.imageUrl = result.selectedFiles && result.selectedFiles[0] || "";
                        $scope.$digest();
                    }
                });
            };
            CarouselImage.removeImage = function () {
                CarouselImage.link.imageUrl = '';
            };

        }])
        .controller('RemovePopupCtrl', ['$scope', '$modalInstance', 'Info', function ($scope, $modalInstance, Info) {
            var RemovePopup = this;
            RemovePopup.info = {};
            if (Info) {
                RemovePopup.info = Info;
            }
            RemovePopup.ok = function () {
                $modalInstance.close('yes');
            };
            RemovePopup.cancel = function () {
                $modalInstance.dismiss('no');
            };
        }]);
})(window.angular, window.buildfire);
