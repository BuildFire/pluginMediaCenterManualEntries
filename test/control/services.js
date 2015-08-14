describe('mediaCenterContent: Services', function () {
    beforeEach(module('mediaCenterContent'));
    describe('Buildfire service', function () {
        var Buildfire;
        beforeEach(inject(
            function (_Buildfire_) {
                Buildfire = _Buildfire_;
            }));
        it('Buildfire should exists', function () {
            expect(Buildfire).toBeDefined();
        });
    });
    describe('Media service', function () {
        var Media;
        beforeEach(inject(
            function (_Media_) {
                Media = _Media_;
            }));
        it('Buildfire should exists', function () {
            expect(Media).toBeDefined();
        });
    });
});