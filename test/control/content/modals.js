describe('mediaCenterModals: Services', function () {
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
            expect(Modals.carouselImageModal).toBeDefined();
        });
        it('Modals.removePopupModal should exists', function () {
            expect(Modals.carouselImageModal).toBeDefined();
        });
    });

    describe('Modals: CarouselImageCtrl Controllers', function () {
        var scope, $modalInstance, CarouselImage, modalInstance, spy;
        beforeEach(inject(function ($controller, _$rootScope_, _$modal_) {
                scope = _$rootScope_.$new();
                modalInstance = {                    // Create a mock object using spies
                    close: jasmine.createSpy('modalInstance.close'),
                    dismiss: jasmine.createSpy('modalInstance.dismiss'),
                    result: {
                        then: jasmine.createSpy('modalInstance.result.then')
                    }
                };
                //$modalInstance = modalInstance;
                CarouselImage = $controller('CarouselImageCtrl', {
                    $scope: scope,
                    $modalInstance: modalInstance,//_$modal_.op,
                    Link: {
                        imageUrl: "",
                        title: "",
                        url: "",
                        action: "linkToApp",//linkToWeb
                        openIn: "_system", // "_blank" or "_system",
                        actionName: "Link to App Content"
                    }
                });

            })
        );
        it('CarouselImage should exists', function () {
            //console.log($modalInstance);

            expect(CarouselImage).toBeDefined();
        });
        it('CarouselImage.link should exists', function () {
            expect(CarouselImage.link).toBeDefined();
        });
        it('CarouselImage.ok should exists', function () {
            expect(CarouselImage.ok).toBeDefined();
        });
        it('CarouselImage.selectImage should exists', function () {
            expect(CarouselImage.selectImage).toBeDefined();
        });
        it('CarouselImage.removeImage should exists', function () {
            expect(CarouselImage.removeImage).toBeDefined();
        });
        it('CarouselImage.cancel should exists', function () {
            expect(CarouselImage.cancel).toBeDefined();
        });
        it('CarouselImage.cancel should call modalInstance.dismiss', function () {
            CarouselImage.cancel();
            expect(modalInstance.dismiss).toHaveBeenCalled();
        });
        it('CarouselImage.ok should call modalInstance.close', function () {
            CarouselImage.link = {imageUrl:'test.test'};
            CarouselImage.ok();
            expect(modalInstance.close).toHaveBeenCalled();
        });
        it('CarouselImage.ok should do nothing if CarouselImage.link.imageUrl is falsy', function () {
            CarouselImage.link = {imageUrl:''};
            CarouselImage.ok();
            expect(modalInstance.close).not.toHaveBeenCalled();
        });
        it('CarouselImage.removeImage should make CarouselImage.link.imageUrl blank', function () {
            CarouselImage.link = {imageUrl:'test.test'};
            CarouselImage.removeImage();
            expect(CarouselImage.link.imageUrl).toEqual('');
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
