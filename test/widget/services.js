describe('Unit: mediaCenterWidget: Services', function () {
    var COLLECTIONS;
    beforeEach(module('mediaCenterWidget'));

    beforeEach(inject(function ($injector) {
        COLLECTIONS = $injector.get('COLLECTIONS');
    }));

    describe('Unit : Buildfire service', function () {
        var Buildfire;
        beforeEach(inject(
            function (_Buildfire_) {
                Buildfire = _Buildfire_;
            }));
        it('Buildfire should exists', function () {
            expect(Buildfire).toBeDefined();
        });
    });

    describe('Unit : MediaCenter service', function () {
        var DB, MediaCenter;
        beforeEach(inject(
            function (_DB_) {
                DB = _DB_;
                MediaCenter = new DB(COLLECTIONS.MediaCenter);
            }));
        it('MediaCenter should exists', function () {
            expect(MediaCenter).toBeDefined();
            expect(MediaCenter._tagName).toEqual(COLLECTIONS.MediaCenter);
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

    describe('Unit : MediaContent service', function () {
        var DB, MediaContent;
        beforeEach(inject(
            function (_DB_) {
                DB = _DB_;
                MediaContent = new DB(COLLECTIONS.MediaContent);
            }));
        it('MediaContent should exists', function () {
            expect(MediaContent).toBeDefined();
            expect(MediaContent._tagName).toEqual(COLLECTIONS.MediaContent);
        });
        it('MediaCenter methods should exists', function () {
            expect(MediaContent.get).toBeDefined();
            expect(MediaContent.find).toBeDefined();
            expect(MediaContent.save).toBeDefined();
            expect(MediaContent.update).toBeDefined();
            expect(MediaContent.delete).toBeDefined();
            expect(MediaContent.insert).toBeDefined();
        });
    });


});

describe('Unit : ImageLib Factory', function () {
    //var ImageLibrary, Buildfire, STATUS_MESSAGES, STATUS_CODE, q;
    beforeEach(module('mediaCenterServices'));

    beforeEach(inject(function () {
        Buildfire = {
            imageLib: {}
        };
        Buildfire.imageLib = jasmine.createSpyObj('Buildfire.imageLib', ['showDialog']);
    }));

    it('Buildfire should exist and be an object', function () {
        expect(typeof Buildfire).toEqual('object');
    });
    it('Buildfire.imageLib should exist and be an object', function () {
        expect(typeof Buildfire.imageLib).toEqual('object');
    });

});