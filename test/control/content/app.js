xdescribe('mediaCenterContent', function () {
    beforeEach(module('mediaCenterContent'));
    var location, route, rootScope;
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