(function (angular, buildfire) {
    'use strict';
    if (!buildfire) {
        throw ("buildfire not found");
    }
    angular
        .module('mediaCenterModals', ['mediaCenterControlFilters', 'ui.bootstrap'])
        .factory('Modals', ['$modal', '$q', function ($modal, $q) {
            return {
                removePopupModal: function (info) {
                    var removePopupDeferred = $q.defer();
                    var removePopupModal = $modal
                        .open({
                            templateUrl: 'templates/modals/rm-item-modal.html',
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
        .controller('RemovePopupCtrl', ['$scope', '$modalInstance', 'Info', '$timeout', function ($scope, $modalInstance, Info, $timeout) {
            var RemovePopup = this;
            $timeout(function () {
                console.log('Modal Top Changed');
                var top = Info.event.pageY - 50;
                $('.modal-dialog.modal-sm').offset({top: top, left: 0});
            }, 700);
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
