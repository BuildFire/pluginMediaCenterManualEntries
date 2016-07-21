xdescribe('mediaCenterWidgetModals: Services', function () {
    var $modal, $q;
    beforeEach(module('mediaCenterWidgetModals'));
    beforeEach(module('mediaCenterWidgetFilters'));
    beforeEach(inject(function ($injector) {
        $q = $injector.get('$q');
    }));

    describe('Modals service', function () {
        var Modals;
        $modal = jasmine.createSpyObj('$modal', ['open']);
        beforeEach(inject(
            function (_Modals_) {
                Modals = _Modals_;
            }));
        it('Modals should exists', function () {
            expect(Modals).toBeDefined();
        });
    })
});
