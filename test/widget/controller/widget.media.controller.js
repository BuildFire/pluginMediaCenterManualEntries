/**
 * Created by intelligrape on 24/8/15.
 */
xdescribe('WidgetMedia Controller', function () {
    beforeEach(module('mediaCenterWidget'));

    var $controller, $scope, Orders, COLLECTIONS, DB, $timeout, Buildfire, $rootScope, Messaging, AppConfig, media, WidgetMedia;

    beforeEach(inject(function (_$controller_, _COLLECTIONS_, _Orders_, _DB_, _$timeout_, _$rootScope_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $controller = _$controller_;
            COLLECTIONS = _COLLECTIONS_;
            DB = _DB_;
            $timeout = _$timeout_;
            //Buildfire = _Buildfire_;
            $rootScope = _$rootScope_;
            $scope = $rootScope.$new();
            //Messaging = _Messaging_;
            //AppConfig = _AppConfig_;
            Orders = _Orders_;
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
                }
            });

        }
    ));

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

    });
});