/**
 * Created by lakshay on 18/8/15.
 */
describe('mediaCenterDesign', function () {
    beforeEach(module('mediaCenterDesign'));
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
            expect(route.current.controller).toBe('DesignHomeCtrl')
        });
    });
});