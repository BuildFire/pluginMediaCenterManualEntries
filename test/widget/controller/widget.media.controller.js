xdescribe('WidgetMedia Controller', function () {
    beforeEach(module('mediaCenterWidget'));

    var $controller, $scope, Orders, COLLECTIONS, DB, $timeout, Buildfire, $rootScope, Messaging, AppConfig, media, WidgetMedia;

    beforeEach(inject(function (_$controller_, _COLLECTIONS_, _Orders_, _DB_, _$timeout_, _$rootScope_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $controller = _$controller_;
            COLLECTIONS = _COLLECTIONS_;
            DB = _DB_;
            $timeout = _$timeout_;
            $rootScope = _$rootScope_;
            $scope = $rootScope.$new();
            Orders = _Orders_;
            Buildfire = {
                navigation: {
                    openWindow: jasmine.createSpy()
                },
                datastore: {
                    onUpdate: function () {
                    },
                    onRefresh: function () {
                    }
                },
                actionItems: {execute: jasmine.createSpy()}
            };
            WidgetMedia = $controller('WidgetMediaCtrl', {
                $scope: $scope,
                item: {
                    data: {
                        content: {
                            images: [],
                            descriptionHTML: '',
                            description: '',
                            sortBy: Orders.ordersMap.Newest,
                            rankOfLastItem: 0
                        },
                        design: {
                            listLayout: "list-1",
                            itemLayout: "item-1",
                            backgroundImage: ""
                        }
                    }
                },
                media: {
                    data: {
                        content: {
                            images: [],
                            descriptionHTML: '',
                            description: '',
                            sortBy: Orders.ordersMap.Newest,
                            rankOfLastItem: 0
                        },
                        design: {
                            listLayout: "list-1",
                            itemLayout: "item-1",
                            backgroundImage: "imageurl"
                        }
                    }
                },
                Buildfire: Buildfire
            });

        }
    ))
    ;

    describe('WidgetMedia', function () {
        it('shd be initialised properly', function () {
            expect(WidgetMedia).toBeDefined();
        });
    });

    describe('Units: units should be Defined', function () {
        it('it should pass if COLLECTIONS is defined', function () {
            expect(COLLECTIONS).toBeDefined();
        });
        it('it should pass if DB is defined', function () {
            expect(DB).toBeDefined();
        });
        it('it should pass if Orders is defined', function () {
            expect(Orders).not.toBeUndefined();
        });
        /*  it('it should pass if Orders is defined', function () {
         expect().not.toBeUndefined();
         });*/

    });

    describe('WidgetMedia.showSourceIframe', function () {
        it('should add protocol to the url if its not there', function () {
            WidgetMedia.item.data.srcUrl = 'www.google.com';
            WidgetMedia.showSourceIframe();
            expect(Buildfire.navigation.openWindow).toHaveBeenCalledWith('http://www.google.com', '_system');
        });
    });


    describe('WidgetMedia.executeAction', function () {
        it('should add call Buildfire.actionItems.execute', function () {
            WidgetMedia.executeAction();
            expect(Buildfire.actionItems.execute).toHaveBeenCalled();
        });
    });

    describe('WidgetMedia.toggleShowVideo', function () {
        it('should make WidgetMedia.showVideo false and pause', function () {
            WidgetMedia.API = {
                play: jasmine.createSpy(),
                pause: jasmine.createSpy()
            };
            WidgetMedia.showVideo = true;
            WidgetMedia.toggleShowVideo();
            expect(WidgetMedia.showVideo).toBeFalsy();
        });
        xit('should make WidgetMedia.showVideo true and play', function () {
            WidgetMedia.showVideo = false;
            WidgetMedia.toggleShowVideo();
            expect(WidgetMedia.showVideo).toBeTruthy();
        });
    });

    describe('WidgetMedia.onPlayerReady', function () {
        it('should add make the API equal to the input', function () {
            WidgetMedia.API = {};
            WidgetMedia.onPlayerReady({a: 1});

            expect(WidgetMedia.API.a).toEqual(1);
        });
    });


    describe('WidgetMedia.changeVideoSrc', function () {
        it('should assign value to WidgetMedia.videoPlayerConfig.sources', function () {
            WidgetMedia.item.data.videoUrl = 'a.mp4';
            WidgetMedia.videoPlayerConfig = {};
            WidgetMedia.changeVideoSrc();

            expect(WidgetMedia.videoPlayerConfig.sources).toBeDefined();
        });
    });

    describe('WidgetMedia.sourceChanged', function () {

        beforeEach(function () {
            WidgetMedia.API = {stop: jasmine.createSpy()};
        });

        it('should assign value to WidgetMedia.videoPlayerConfig.sources', function () {
            WidgetMedia.sourceChanged();
            expect(WidgetMedia.API.stop).toHaveBeenCalled();
        });
    });
})
;