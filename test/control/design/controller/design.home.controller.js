/*
describe("DesignHomeCtrl", function () {

    var $rootScope,
        $scope,
        controller,
        mediaCenterSpy,
        q;


    beforeEach(function () {
        module('mediaCenterDesign');

        inject(function ($injector, $q) {
            $rootScope = $injector.get('$rootScope');
            $scope = $rootScope.$new();
            controller = $injector.get('$controller')('DesignHomeCtrl', {
                $scope: $scope,
                MediaCenterInfo: {id: '1', data: {design: {listLayout: 'test', backgroundImage: 'test1'}}},
                Buildfire: {
                    imageLib: {
                        showDialog: function (options, callback) {
                            controller._callback(null, {selectedFiles: ['test']});
                        }
                    }
                }
            });
            q = $q;
        });
    });


    describe('Initialization', function () {
        it('should initialize the listLayouts to the default value', function () {
            expect(controller.layouts.listLayouts.length).toEqual(4);
        });

        it('should initialize the itemLayouts to the default value', function () {
            expect(controller.layouts.itemLayouts.length).toEqual(2);
        });
    });

    describe('changeLayout', function () {
        it('should change the value of mediaInfo list when called for list', function () {
            controller.changeLayout('test', 'list');
            expect(controller.mediaInfo.data.design["listLayout"]).toEqual('test');
        });

        it('should change the value of mediaInfo item when called for item', function () {
            controller.changeLayout('test', 'item');
            expect(controller.mediaInfo.data.design["itemLayout"]).toEqual('test');
        });

        it('should do nothing if layout is null', function () {
            controller.mediaInfo.data.design["itemLayout"] = 'test';
            controller.changeLayout(null, 'item');
            expect(controller.mediaInfo.data.design["itemLayout"]).toEqual('test');
        });

        it('should do nothing if layout is undefined', function () {
            controller.mediaInfo.data.design["itemLayout"] = 'test';
            controller.changeLayout(undefined, 'item');
            expect(controller.mediaInfo.data.design["itemLayout"]).toEqual('test');
        });

        it('should do nothing if mediaInfo.data.design is undefined', function () {
            controller.mediaInfo.data.design = undefined;
            controller.changeLayout('test', 'item');
            expect(controller.mediaInfo.data.design).toBeUndefined();
        });


        it('should do nothing if mediaInfo.data.design is null', function () {
            controller.mediaInfo.data.design = null;
            controller.changeLayout('test', 'item');
            expect(controller.mediaInfo.data.design).toBeNull();
        });
    });

    describe('removeBackgroundImage', function () {
        it('should make the background image property null', function () {
            controller.removeBackgroundImage();
            expect(controller.mediaInfo.data.design.backgroundImage).toBeNull();
        });
    });

    describe('addBackgroundImage', function () {

        beforeEach(function () {
            controller._mediaCenter.update = function () {
                var deferred = q.defer();
                deferred.resolve('Remote call result');
                return deferred.promise;
            };
        });

        it('should make the background image property null', function () {
            controller.removeBackgroundImage();
            controller.addBackgroundImage();
            expect(controller.mediaInfo.data.design.backgroundImage).toEqual('test');
        });
    });

    describe('watcher of controller.mediaInfo', function () {

        it('should change the lastSaved when mediainfo is changed succesfully on db', function () {
            controller._lastSaved = null;
            controller._mediaCenter.update = function () {
                var deferred = q.defer();
                deferred.resolve('Remote call result');
                return deferred.promise;
            };
            //controller.mediaInfo = {};
            controller.mediaInfo.data.design.backgroundImage = 'test';
            controller.removeBackgroundImage();
            $scope.$digest();
            expect(controller._lastSaved).not.toBeNull();
        });

        it('should revert the MediaInfo to lastSaved when db change failed', function () {
            //controller._lastSaved = null;
            controller._mediaCenter.update = function () {
                var deferred = q.defer();
                deferred.reject('Remote call result');
                return deferred.promise;
            };

            controller.removeBackgroundImage();
            $scope.$digest();
            expect(controller.mediaInfo.data.design.backgroundImage).toEqual('test1');
        });
    });

});*/
