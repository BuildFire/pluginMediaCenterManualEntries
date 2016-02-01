describe('mediaCenterDesignServices: Services', function () {
    var COLLECTIONS;
    beforeEach(module('mediaCenterDesignServices'));
    beforeEach(inject(function ($injector) {
        COLLECTIONS = $injector.get('COLLECTIONS');
    }));

    describe('ImageLib service', function () {
        var ImageLib;
        beforeEach(inject(
            function (_ImageLib_) {
                ImageLib = _ImageLib_;
            }));
        it('ImageLib should exists', function () {
            expect(ImageLib).toBeDefined();
        });
    });
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
         expect(typeof MediaCenter.get).toEqual('function');
         expect(MediaCenter.save).toBeDefined();
         expect(MediaCenter.update).toBeDefined();
         });
    });
    describe('MediaContent service', function () {
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
            expect(MediaContent.save).toBeDefined();
            expect(MediaContent.update).toBeDefined();
        });
    });
    describe('Messaging service', function () {
        var Messaging;
        beforeEach(inject(
            function (_Buildfire_) {
                Messaging = _Buildfire_.messaging;
            }));
        it('Messaging should exists', function () {
            expect(Messaging).toBeDefined();
        });
    });

});
describe('Unit : ImageLib Factory', function () {
    beforeEach(module('mediaCenterDesignServices'));
    //var ImageLibrary, Buildfire, STATUS_MESSAGES, STATUS_CODE, q;
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