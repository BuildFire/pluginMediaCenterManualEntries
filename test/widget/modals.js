describe('mediaCenterWidgetModals: Services', function () {
    var $modal, $q;
    beforeEach(module('mediaCenterWidgetModals'));
    beforeEach(module('mediaCenterWidgetFilters'));
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
        it('Modals.moreInfoModal should exists', function () {
            expect(Modals.moreInfoModal).toBeDefined();
        });
    });

    xdescribe('Modals: MoreInfoModalCtrl Controller', function () {
        var scope, modalInstance, Info, spy,MoreInfoModal,Buildfire;
        beforeEach(inject(function ($controller, _$rootScope_,_Buildfire_) {
                scope = _$rootScope_.$new();
                Buildfire=_Buildfire_;
                modalInstance = {                    // Create a mock object using spies
                    close: jasmine.createSpy('modalInstance.close'),
                    dismiss: jasmine.createSpy('modalInstance.dismiss'),
                    result: {
                        then: jasmine.createSpy('modalInstance.result.then')
                    }
                };
                Info = {};
                MoreInfoModal = $controller('MoreInfoModalCtrl', {
                    $scope: scope,
                    $modalInstance: modalInstance,//_$modal_.op,
                    Info: Info,
                    Buildfire:Buildfire
                });
            })
        );
        it('MoreInfoModal should exists', function () {
            expect(MoreInfoModal).toBeDefined();
        });
       /* it('MoreInfoModal.ok should exists', function () {
            expect(MoreInfoModal.ok).toBeDefined();
        });
        it('MoreInfoModal.cancel should exists', function () {
            expect(MoreInfoModal.cancel).toBeDefined();
        });
        it('RemovePopup.ok should close modalInstance', function () {
            MoreInfoModal.ok();
            expect(modalInstance.close).toHaveBeenCalledWith('yes');
        });
        it('MoreInfoModal.ok should dismiss modalInstance', function () {
            MoreInfoModal.cancel();
            expect(modalInstance.dismiss).toHaveBeenCalledWith('no');
        });*/
    });
});
