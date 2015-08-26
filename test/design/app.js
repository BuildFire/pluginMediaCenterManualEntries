/**
 * Created by lakshay on 18/8/15.
 */
describe('mediaCenterDesign', function () {
    beforeEach(module('mediaCenterDesign'));
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
    });

    describe('Design Controller', function () {
        //beforeEach(module('mediaCenterDesign'));

        var $controller, COLLECTIONS, DB, $timeout, Buildfire, $rootScope;

        beforeEach(inject(function (_$controller_, _COLLECTIONS_, _DB_, /*_MediaCenterInfo_ ,*/_$timeout_, _Buildfire_, $q, _$rootScope_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $controller = _$controller_;
            COLLECTIONS_ = _COLLECTIONS_;
            DB_ = _DB_;
            $timeout_ = _$timeout_;
            Buildfire_ = _Buildfire_;
            $rootScope = _$rootScope_;
            /* spyOn(_MediaCenterInfo_, "makeRemoteCallReturningPromise").and.callFake(function() {
             var deferred = $q.defer();
             deferred.resolve('Remote call result');
             return deferred.promise;
             });*/
        }));

        describe('DesignHome.layouts', function () {
            it('shd be initialised properly', function () {
                var $scope = $rootScope.$new();
                var controller = $controller('DesignHomeCtrl', {$scope: $scope, MediaCenterInfo: {}});
                expect(controller.layouts).toBeDefined();
            });
        });

        describe('changeLayout', function () {
            it('shd change the DesignHome object and watchers must be called', function () {
                var $scope = $rootScope.$new();
                var controller = $controller('DesignHomeCtrl', {
                    $scope: $scope,
                    MediaCenterInfo: {data: {design: {listLayout: 'test'}}}
                });
                var earlyObject = angular.copy(controller.mediaInfo.data);
                controller.changeLayout('test1', 'list');
                expect(controller.mediaInfo.data).not.toEqual(earlyObject);
            });
        });

        describe('DesignHome.removeBackgroundImage', function () {
            it('shd make the backgroundImage property null', function () {
                var $scope = $rootScope.$new();
                var controller = $controller('DesignHomeCtrl', {
                    $scope: $scope,
                    MediaCenterInfo: {data: {design: {listLayout: 'test',backgroundImage: 'test'}}}
                });
                controller.removeBackgroundImage();
                expect(controller.mediaInfo.data.design.backgroundImage).toBeNull();
            });
        });

        describe('DesignHome.addBackgroundImage', function () {
            it('shd give test value to the null backgroundImage property', function () {
                var $scope = $rootScope.$new();
                var controller = $controller('DesignHomeCtrl', {
                    $scope: $scope,
                    MediaCenterInfo: {data: {design: {listLayout: 'test',backgroundImage: null}}},
                    Buildfire: {imageLib: {showDialog: function (o,c){return (null,{selectedFiles:['test']});} }}
                });

                controller.addBackgroundImage();
                expect(controller.mediaInfo.data.design.backgroundImage).not.toBeNull();
            });
                                                                                                                                                                    });
    });


});