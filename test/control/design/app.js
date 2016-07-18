xdescribe('Unit: mediaPlugin design app', function () {
    describe('Unit: app routes', function () {
        beforeEach(module('mediaCenterDesign'));
        beforeEach(module('mediaCenterDesign', function ($provide) {
            $provide.service('Buildfire', function () {
                this.datastore = jasmine.createSpyObj('datastore', ['get']);
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
                            }
                        });
                    } else {
                        callback('Error', null);
                    }
                });
            });
        }));

        var location, route, rootScope;
        beforeEach(inject(
            function (_$location_, _$route_, _$rootScope_) {
                location = _$location_;
                route = _$route_;
                rootScope = _$rootScope_;
            }));

        describe('Home route', function () {
            beforeEach(inject(
                function ($httpBackend) {
                    $httpBackend.expectGET('templates/home.html')
                        .respond(200);
                    $httpBackend.expectGET('/')
                        .respond(200);
                }));

            it('should load the home page on successful load of /', function () {
                location.path('/');
                rootScope.$digest();
                expect(route.current.controller).toBe('DesignHomeCtrl')
            });

            it('should resolve initial values for my Controller', function () {
                expect(route.routes['/'].resolve.MediaCenterInfo).toBeDefined();
            });
        });
    });
});
describe('Unit: mediaPlugin design app Error case', function () {
    describe('Unit: app routes', function () {
        beforeEach(module('mediaCenterDesign'));
        beforeEach(module('mediaCenterDesign', function ($provide) {
            $provide.service('Buildfire', function () {
                this.datastore = jasmine.createSpyObj('datastore', ['get']);
                this.datastore.get.and.callFake(function (_tagName, callback) {
                        callback('Error', null);
                });
            });
        }));

        var location, route, rootScope;
        beforeEach(inject(
            function (_$location_, _$route_, _$rootScope_) {
                location = _$location_;
                route = _$route_;
                rootScope = _$rootScope_;
            }));

        describe('Home route', function () {
            beforeEach(inject(
                function ($httpBackend) {
                    $httpBackend.expectGET('templates/home.html')
                        .respond(200);
                    $httpBackend.expectGET('/')
                        .respond(200);
                }));

            it('should load the home page on successful load of /', function () {
                location.path('/');
                rootScope.$digest();
                expect(route.current.controller).toBe('DesignHomeCtrl')
            });

            it('should resolve initial values for my Controller', function () {
                expect(route.routes['/'].resolve.MediaCenterInfo).toBeDefined();
            });
        });
    });
});
describe('Unit: mediaPlugin design app Null case', function () {
    describe('Unit: app routes', function () {
        beforeEach(module('mediaCenterDesign'));
        beforeEach(module('mediaCenterDesign', function ($provide) {
            $provide.service('Buildfire', function () {
                this.datastore = jasmine.createSpyObj('datastore', ['get']);
                this.datastore.get.and.callFake(function (_tagName, callback) {
                        callback(null, null);
                });
            });
        }));

        var location, route, rootScope;
        beforeEach(inject(
            function (_$location_, _$route_, _$rootScope_) {
                location = _$location_;
                route = _$route_;
                rootScope = _$rootScope_;
            }));

        describe('Home route', function () {
            beforeEach(inject(
                function ($httpBackend) {
                    $httpBackend.expectGET('templates/home.html')
                        .respond(200);
                    $httpBackend.expectGET('/')
                        .respond(200);
                }));

            it('should load the home page on successful load of /', function () {
                location.path('/');
                rootScope.$digest();
                expect(route.current.controller).toBe('DesignHomeCtrl')
            });

            it('should resolve initial values for my Controller', function () {
                expect(route.routes['/'].resolve.MediaCenterInfo).toBeDefined();
            });
        });
    });
});