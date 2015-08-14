describe('mediaCenterWidget: Services', function () {
    beforeEach(module('mediaCenterWidget'));
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
    describe('MediaCenter service', function () {
        var MediaCenter;
        beforeEach(inject(
            function (_MediaCenter_) {
                MediaCenter = _MediaCenter_;
            }));
        it('MediaCenter should exists', function () {
            expect(MediaCenter).toBeDefined();
        });
        it('MediaCenter methods should exists', function () {
            expect(MediaCenter.get).toBeDefined();
            expect(MediaCenter.find).toBeDefined();
            expect(MediaCenter.save).toBeDefined();
            expect(MediaCenter.update).toBeDefined();
            expect(MediaCenter.delete).toBeDefined();
            expect(MediaCenter.insert).toBeDefined();
        });
    });
});