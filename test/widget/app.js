describe('Unit: mediaPlugin widget app', function () {
    describe('Unit: app routes', function () {
        beforeEach(module('mediaCenterWidget'));
        var location, route, rootScope;
        beforeEach(inject(
            function (_$location_, _$route_, _$rootScope_) {
                location = _$location_;
                route = _$route_;
                rootScope = _$rootScope_;
            }));

        describe('Media route', function () {
            beforeEach(inject(
                function ($httpBackend) {
                    $httpBackend.expectGET('templates/media.html')
                        .respond(200);
                    $httpBackend.expectGET('/media')
                        .respond(200);
                }));

            it('should load the home page on successful load of /', function () {
                location.path('/media');
                rootScope.$digest();
                expect(route.current.controller).toBe('WidgetMediaCtrl')
            });
        });

        describe('Media with Id route', function () {
            beforeEach(inject(
                function ($httpBackend) {
                    $httpBackend.expectGET('templates/media.html')
                        .respond(200);
                    $httpBackend.expectGET('/media/:mediaId')
                        .respond(200);
                }));

            it('should load the home page on successful load of /', function () {
                location.path('/media/:mediaId');
                rootScope.$digest();
                expect(route.current.controller).toBe('WidgetMediaCtrl')
            });
        });
        describe('nowplaying with Id route', function () {
            beforeEach(inject(
                function ($httpBackend) {
                    $httpBackend.expectGET('templates/layouts/now-playing.html')
                        .respond(200);
                    $httpBackend.expectGET('/nowplaying/:mediaId')
                        .respond(200);
                }));

            it('should load the home page on successful load of /', function () {
                location.path('/nowplaying/:mediaId');
                rootScope.$digest();
                expect(route.current.controller).toBe('NowPlayingCtrl')
            });
        });
    });
    
});