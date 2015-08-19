xdescribe('mediaCenterWidget: Services', function () {
    var COLLECTIONS,
        CODES,
        MESSAGES,
        EVENTS,
        PATHS;
    beforeEach(module('mediaCenterWidget'));
    beforeEach(inject(function ($injector) {
        COLLECTIONS = $injector.get('COLLECTIONS');
        CODES = $injector.get('CODES');
        MESSAGES = $injector.get('MESSAGES');
        EVENTS = $injector.get('EVENTS');
        PATHS = $injector.get('EVENTS');
    }));
    describe('enums COLLECTIONS', function () {
        it('COLLECTIONS should exists', function () {
            expect(COLLECTIONS).toBeDefined();
            expect(CODES).toBeDefined();
            expect(MESSAGES).toBeDefined();
            expect(EVENTS).toBeDefined();
            expect(PATHS).toBeDefined();
        });
    });
});