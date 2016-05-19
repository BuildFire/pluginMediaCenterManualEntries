describe('mediaCenterContent', function () {
    beforeEach(module('mediaCenterContent'));
    var location, route, rootScope;
    beforeEach(module('mediaCenterContent', function ($provide) {
        $provide.service('Buildfire', function () {
            this.imageLib = jasmine.createSpyObj('imageLib', ['showDialog']);
            this.imageLib.showDialog.and.callFake(function (options, callback) {
                callback(null, {selectedFiles: ['test']});
            });
            this.datastore = jasmine.createSpyObj('datastore', ['get', 'getById']);
            this.datastore.get.and.callFake(function (_tagName, callback) {
                if (_tagName) {
                    callback(null, {
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        },
                        id:'123'
                    });
                } else {
                    callback('Error', null);
                }
            });
            this.history = {
                push: function (label, id) {
                },
                onPop: function (data) {
                },
                pop: function () {

                }
            };
            this.datastore.getById.and.callFake(function (_tagName, id, callback) {
                if (_tagName) {
                    callback(null, {
                        data: {
                            design: {
                                itemListLayout: 'layout1',
                                bgImage: ''
                            },
                            content: {
                                images: [{title: 'bg1.png'}]
                            }
                        }
                    });
                } else {
                    callback('Error', null);
                }
            });
        });
    }));
    beforeEach(inject(
        function( _$location_, _$route_, _$rootScope_ ) {
            location = _$location_;
            route = _$route_;
            rootScope = _$rootScope_;
        }));

    describe('Home route', function() {
        beforeEach(inject(
            function($httpBackend) {
                $httpBackend.expectGET('templates/home.html')
                    .respond(200);
                $httpBackend.expectGET('/')
                    .respond(200);
            }));

        it('should load the home page on successful load of /', function() {
            location.path('/');
            rootScope.$digest();
            expect(route.current.controller).toBe('ContentHomeCtrl')
        });
    });

    describe('Media route', function() {
        beforeEach(inject(
            function($httpBackend) {
                $httpBackend.expectGET('templates/media.html')
                    .respond(200);
                $httpBackend.expectGET('/media')
                    .respond(200);
            }));

        it('should load the media page on successful load of /media', function() {
            location.path('/media');
            rootScope.$digest();
            expect(route.current.controller).toBe('ContentMediaCtrl')
        });
    });

    describe('Media Edit route', function() {
        beforeEach(inject(
            function($httpBackend) {
                $httpBackend.expectGET('templates/media.html')
                    .respond(200);
                $httpBackend.expectGET('/media/:itemId')
                    .respond(200);
            }));

        it('should load the media Edit page on successful load of /media', function() {
            location.path('/media/:itemId');
            rootScope.$digest();
            expect(route.current.controller).toBe('ContentMediaCtrl')
        });
    });
});
describe('mediaCenterContent', function () {
    beforeEach(module('mediaCenterContent'));
    var location, route, rootScope;
    beforeEach(module('mediaCenterContent', function ($provide) {
        $provide.service('Buildfire', function () {
            this.imageLib = jasmine.createSpyObj('imageLib', ['showDialog']);
            this.imageLib.showDialog.and.callFake(function (options, callback) {
                callback(null, {selectedFiles: ['test']});
            });
            this.datastore = jasmine.createSpyObj('datastore', ['get', 'getById']);
            this.datastore.get.and.callFake(function (_tagName, callback) {
                    callback('Error', null);
            });
            this.datastore.getById.and.callFake(function (_tagName, id, callback) {
                    callback(null, {data:{}});
            });
            this.history = {
                push: function (label, id) {
                },
                onPop: function (data) {
                },
                pop: function () {

                }
            };
        });
    }));
    beforeEach(inject(
        function( _$location_, _$route_, _$rootScope_ ) {
            location = _$location_;
            route = _$route_;
            rootScope = _$rootScope_;
        }));

    describe('Home route', function() {
        beforeEach(inject(
            function($httpBackend) {
                $httpBackend.expectGET('templates/home.html')
                    .respond(200);
                $httpBackend.expectGET('/')
                    .respond(200);
            }));

        it('should load the home page on successful load of /', function() {
            location.path('/');
            rootScope.$digest();
            expect(route.current.controller).toBe('ContentHomeCtrl')
        });
    });

    describe('Media route', function() {
        beforeEach(inject(
            function($httpBackend) {
                $httpBackend.expectGET('templates/media.html')
                    .respond(200);
                $httpBackend.expectGET('/media')
                    .respond(200);
            }));

        it('should load the media page on successful load of /media', function() {
            location.path('/media');
            rootScope.$digest();
            expect(route.current.controller).toBe('ContentMediaCtrl')
        });
    });

    describe('Media Edit route', function() {
        beforeEach(inject(
            function($httpBackend) {
                $httpBackend.expectGET('templates/media.html')
                    .respond(200);
                $httpBackend.expectGET('/media/:itemId')
                    .respond(200);
            }));

        it('should load the media Edit page on successful load of /media', function() {
            location.path('/media/:itemId');
            rootScope.$digest();
            expect(route.current.controller).toBe('ContentMediaCtrl')
        });
    });
});