/*
describe('mediaCenterModals: Services', function () {
    var $modal, $q;
    beforeEach(module('mediaCenterModals'));
    beforeEach(inject(function ($injector) {
        $modal = $injector.get('$modal');
        $q = $injector.get('$q');
    }));

    xdescribe('Modals service', function () {
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
        var scope, $modalInstance, CarouselImage;
        beforeEach(inject(function ($controller, _$rootScope_, _$modal_) {
                scope = _$rootScope_.$new();
                $modalInstance = _$modalInstance_;
                CarouselImage = $controller('CarouselImageCtrl', {
                    $scope: scope,
                    $modalInstance: _$modal_.op,
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
       /!* it('CarouselImage.Link should exists', function () {
            expect(CarouselImage.Link).toBeDefined();
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
        });*!/
    });
});*/
