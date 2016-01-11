describe("DesignHomeCtrl", function () {

    var $rootScope,
        $scope,
        controller,
        mediaCenterSpy,
        Buildfire,
        q;
    Buildfire={
        components:{
            images:{
                thumbnail:function(id){
                    this.id=id;
                    this.loadbackground=function(url){
                        console.log('Load background method called');
                    };
                    this.onChange=function(){
                        console.log('onChange called');
                    };
                    this.onDelete=function(){
                        console.log('on Delete called');
                    };
                }
            }
        }
    };


    beforeEach(function () {
        module('mediaCenterDesign');

        inject(function ($injector, $q) {
            $rootScope = $injector.get('$rootScope');
            $scope = $rootScope.$new();
            controller = $injector.get('$controller')('DesignHomeCtrl', {
                $scope: $scope,
                MediaCenterInfo: {id: '1', data: {design: {listLayout: 'test', backgroundImage: 'test1'}}},
                Buildfire: Buildfire
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
        it('should do nothing if onChange called', function () {
            var background=new Buildfire.components.images.thumbnail('id');
            background.onChange=function(url){
                controller.mediaInfo.data.design.backgroundImage=url;
            };
            background.onChange('test1');
            $rootScope.$apply();
            expect(controller.mediaInfo.data.design.backgroundImage).toEqual('test1');
        });
        it('should do nothing if onDelete called', function () {
            var background=new Buildfire.components.images.thumbnail('id');
            background.onDelete=function(url){
                controller.mediaInfo.data.design.backgroundImage='';
            };
            background.onDelete('test1');
            $rootScope.$apply();
            expect(controller.mediaInfo.data.design.backgroundImage).toEqual('');
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

            $scope.$digest();
            expect(controller.mediaInfo.data.design.backgroundImage).toEqual('test1');
        });
    });
});

// Empty case
describe("DesignHomeCtrl", function () {
    var $rootScope,
        $scope,
        controller,
        mediaCenterSpy,
        Buildfire,
        q;
    Buildfire={
        components:{
            images:{
                thumbnail:function(id){
                    this.id=id;
                    this.loadbackground=function(url){
                        console.log('Load background method called');
                    };
                }
            }
        }
    };

    beforeEach(function () {
        module('mediaCenterDesign');
        inject(function ($injector, $q) {
            $rootScope = $injector.get('$rootScope');
            $scope = $rootScope.$new();
            controller = $injector.get('$controller')('DesignHomeCtrl', {
                $scope: $scope,
                MediaCenterInfo: null,
                Buildfire: Buildfire
            });
            q = $q;
        });
    });
    describe('Initialization with empty', function () {
        it('should initialize the listLayouts to the default value', function () {
            expect(controller.layouts.listLayouts.length).toEqual(4);
        });
    });
});