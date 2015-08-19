xdescribe('mediaCenterWidget: Home:app.js', function () {
    beforeEach(module('mediaCenterWidget'));
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
                $httpBackend.expectGET('templates/layouts/list-1.html')
                    .respond(200);
                $httpBackend.expectGET('/list-1')
                    .respond(200);
             }));

        it('should load the home page on successful load of /', function () {
            location.path('/list-1');
            rootScope.$digest();
            expect(route.current.controller).toBe('WidgetHomeCtrl')
        });
    });
    describe('Media route', function () {
        beforeEach(inject(
            function ($httpBackend) {
                $httpBackend.expectGET('templates/layouts/item-1.html')
                    .respond(200);
                $httpBackend.expectGET('media/item-1/12345')
                    .respond(200);
             }));

        it('should load the media page on successful load of /media/12345', function () {
            location.path('media/item-1/12345');
            rootScope.$digest();
            expect(route.current.controller).toBe('WidgetMediaCtrl')
        });
    });
});