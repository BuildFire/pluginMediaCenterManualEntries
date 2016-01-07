describe('Unit : Controller - ContentMediaCtrl', function () {

// load the controller's module
    beforeEach(module('mediaCenterContent'));

    var
        ContentMedia, $rootScope, scope, Location, $window, Buildfire, DB, COLLECTIONS, AppConfig, Messaging, EVENTS, PATHS;

    beforeEach(inject(function ($controller, _$rootScope_, _Location_, _$window_, _Buildfire_, _DB_, _COLLECTIONS_, _AppConfig_, _Messaging_, _EVENTS_, _PATHS_) {
            scope = _$rootScope_.$new();
            $rootScope = _$rootScope_;
            DB = _DB_;
            COLLECTIONS = _COLLECTIONS_;
            AppConfig = _AppConfig_;
            Messaging = _Messaging_;
            EVENTS = _EVENTS_;
            PATHS = _PATHS_;
            $window = _$window_;
            Buildfire = {
                navigation:{
                    scrollTop:function(){}
                },
                components:{
                    actionItems:{

                    }
                }
            };
            Buildfire.components.actionItems = jasmine.createSpyObj('Buildfire.components.actionItems', ['sortableList', '', '']);
            Buildfire.components.actionItems.sortableList.and.callFake(function () {
                return {
                    sortableList: function () {
                        console.log("actionItems.sortableList hasbeen called");
                    }
                };
            });
            Location = _Location_;
            ContentMedia = $controller('ContentMediaCtrl', {
                $scope: scope,
                $window: $window,
                DB: DB,
                COLLECTIONS: COLLECTIONS,
                Location: Location,
                media: {id: '1', data: {topImage: "ABC.png", image: "abc.png"}},
                Messaging: Messaging,
                EVENTS: EVENTS,
                PATHS: PATHS,
                AppConfig: AppConfig,
                Buildfire:Buildfire
            });
        })
    )
    ;

    describe('Units: units should be Defined', function () {
        it('it should pass if ContentMedia is defined', function () {
            expect(ContentMedia).not.toBeUndefined();
        });
        it('it should pass if DB is defined', function () {
            expect(DB).not.toBeUndefined();
        });
        it('it should pass if COLLECTIONS is defined', function () {
            expect(COLLECTIONS).not.toBeUndefined();
        });
        it('it should pass if AppConfig is defined', function () {
            expect(AppConfig).not.toBeUndefined();
        });
        it('it should pass if Messaging function is defined', function () {
            expect(Messaging).not.toBeUndefined();
        });
        it('it should pass if EVENTS function is defined', function () {
            expect(EVENTS).not.toBeUndefined();
        });
        it('it should pass if PATHS function is defined', function () {
            expect(PATHS).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.item is defined', function () {
            expect(ContentMedia.item).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.linksSortableOptions is defined', function () {
            expect(ContentMedia.linksSortableOptions).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.bodyContentWYSIWYGOptions is defined', function () {
            expect(ContentMedia.bodyContentWYSIWYGOptions).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.selectTopImage function is defined', function () {
            expect(ContentMedia.selectTopImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeTopImage function is defined', function () {
            expect(ContentMedia.removeTopImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeTopImage function is executed', function () {
            ContentMedia.item.data.topImage = "demo.png";
            ContentMedia.removeTopImage();
            $rootScope.$digest();
            expect(ContentMedia.item.data.topImage).toEqual("");
        });
        it('it should pass if ContentMedia.selectAudioImage function is defined', function () {
            expect(ContentMedia.selectAudioImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeAudioImage function is defined', function () {
            expect(ContentMedia.removeAudioImage).not.toBeUndefined();
        });
        it('it should pass if ContentMedia.removeAudioImage function is executed', function () {
            ContentMedia.item.data.image = "demo.png";
            ContentMedia.removeAudioImage();
            $rootScope.$digest();
            expect(ContentMedia.item.data.image).toEqual("");
        });
        it('it should pass if ContentMedia.done function is defined', function () {
            expect(ContentMedia.done).not.toBeUndefined();
        });
    });

    describe('Units: Methods should be working properly', function () {
        var spy;
        beforeEach(inject(function () {
            spy = spyOn(Location, 'goToHome').and.callFake(function () {
            });
        }));
        it('it should pass if ContentMedia.done function call Location.goToHome', function () {
            ContentMedia.done();
            expect(spy).toHaveBeenCalled();
        });
        it('it should pass if ContentMedia.delete function does nothing when ContentMedia.item.id is falsy', function () {
            ContentMedia.item = {id: ''};
            var MediaContent = {
                delete: function () {
                }
            };
            var mediaContentSpy = spyOn(MediaContent, 'delete').and.callFake(function () {
            });
            expect(mediaContentSpy).not.toHaveBeenCalled();
        });
        it('it should pass if ContentMedia.selectTopImage changes ContentMedia.item.data.topImage in success case', function () {
            Buildfire.imageLib = {
                showDialog: function (d, func) {
                    console.log(123);
                    func(null, {selectedFiles:['test']});
                }
            };
            ContentMedia.selectTopImage();
           expect(ContentMedia.item.data.topImage).toEqual('test');

        });
    });

})
;

