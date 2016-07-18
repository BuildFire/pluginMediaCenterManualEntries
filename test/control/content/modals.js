xdescribe('mediaCenterModals: Services', function () {
    var $modal, $q;
    beforeEach(module('mediaCenterModals'));
    beforeEach(inject(function ($injector) {
        $modal = $injector.get('$modal');
        $q = $injector.get('$q');
    }));

    describe('Modals service', function () {
        var Modals;
        beforeEach(inject(
            function (_Modals_) {
                Modals = _Modals_;
            }));
        it('Modals should exists', function () {
            expect(Modals).toBeDefined();
        });
        it('Modals.removePopupModal should exists', function () {
            expect(Modals.removePopupModal).toBeDefined();
        });
    });

    describe('Modals: RemovePopupCtrl Controller', function () {
        var scope, $modalInstance, Info, spy,RemovePopup;
        beforeEach(inject(function ($controller, _$rootScope_, _$modal_) {
                scope = _$rootScope_.$new();
                modalInstance = {                    // Create a mock object using spies
                    close: jasmine.createSpy('modalInstance.close'),
                    dismiss: jasmine.createSpy('modalInstance.dismiss'),
                    result: {
                        then: jasmine.createSpy('modalInstance.result.then')
                    }
                };
                Info = {};
                RemovePopup = $controller('RemovePopupCtrl', {
                    $scope: scope,
                    $modalInstance: modalInstance,//_$modal_.op,
                    Info: Info
                });
            })
        );
        it('RemovePopup should exists', function () {
            expect(RemovePopup).toBeDefined();
        });
        it('RemovePopup.cancel should exists', function () {
            expect(RemovePopup.cancel).toBeDefined();
        });
        it('CarouselImage.ok should exists', function () {
            expect(RemovePopup.ok).toBeDefined();
        });
        it('RemovePopup.cancel should exists', function () {
            expect(RemovePopup.cancel).toBeDefined();
        });
        it('RemovePopup.ok should close modalInstance', function () {
            RemovePopup.ok();
            expect(modalInstance.close).toHaveBeenCalledWith('yes');
        });
        it('RemovePopup.ok should dismiss modalInstance', function () {
            RemovePopup.cancel();
            expect(modalInstance.dismiss).toHaveBeenCalledWith('no');
        });
    });
});
