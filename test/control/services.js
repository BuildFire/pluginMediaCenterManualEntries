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
    describe('MediaContent service', function () {
        var MediaContent;
        beforeEach(inject(
            function (_MediaContent_) {
                MediaContent = _MediaContent_;
            }));
        it('Buildfire should exists', function () {
            expect(MediaContent).toBeDefined();
        });
    });
});