describe('mediaCenterWidget: Home:app.js', function () {
    beforeEach(module('mediaCenterWidget'));
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
                $httpBackend.expectGET('')
                    .respond(200);
            }));

        it('should load the login page on successful load of /', function() {
            location.path('/');
            rootScope.$digest();
            expect(route.current.controller).toBe('WidgetHomeCtrl')
        });
    });

});