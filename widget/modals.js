(function (angular) {
    'use strict';
    angular
        .module('mediaCenterWidgetModals', ['mediaCenterWidgetFilters', 'ui.bootstrap'])
        .factory('Modals', ['$modal', '$q', function ($modal, $q) {
            return {
                removeTrackModal: function () {
                    var removePopupDeferred = $q.defer();
                    var removePopupModal = $modal
                        .open({
                            templateUrl: 'templates/modals/remove-track-modal.html',
                            controller: 'RemoveTrackModalPopupCtrl',
                            controllerAs: 'RemoveTrackPopup',
                            size: 'sm'
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
        .controller('RemoveTrackModalPopupCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {
            console.log('RemoveTrackModalPopupCtrl Controller called-----');
            var RemoveTrackPopup = this;

            var modalArrayOfStrings=[
                {key:"rtModalTitle",text:"Confirm"},
                {key:"rtModalText",text:"Are you sure you want to remove this track from the playlist?"},
                {key:"rtModalCancel",text:"Cancel"},
                {key:"rtModalRemove",text:"Remove"}
            ];

            RemoveTrackPopup.modalString={};
            modalArrayOfStrings.forEach(function(el){
                RemoveTrackPopup.modalString[el.key] = strings.get("removeTrackModal."+el.key)?strings.get("removeTrackModal."+el.key):el.text;
            });
            
            RemoveTrackPopup.ok = function () {
                $modalInstance.close({info: 'Remove'});
            };
            RemoveTrackPopup.cancel = function () {
                $modalInstance.dismiss({error: 'Reject'});
            };
        }])
})(window.angular);

