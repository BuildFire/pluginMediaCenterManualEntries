/**
 * Created by intelligrape on 24/8/15.
 */
describe('WidgetMedia Controller', function () {
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
            console.log($controller);
            expect(WidgetMedia).toBeDefined();
        });
    });
    /* describe('WidgetMediaCtrl.item', function () {
     it('shd be initialised properly', function () {
     var $scope = $rootScope.$new();
     var controller = $controller('WidgetMediaCtrl', {$scope: $scope, item: media});
     expect(controller.item).toBeDefined();
     });
     });
     describe('WidgetMediaCtrl.changeBackgroundTheme', function () {
     it('shd be initialised properly', function () {
     var $scope = $rootScope.$new();
     var controller = $controller('WidgetMediaCtrl', {$scope: $scope, AppConfig: {changeBackgroundTheme:function(image){}}});
     controller.AppConfig.changeBackgroundTheme('imageUrl');
     expect(AppConfig.setSettings());
     });
     });*/
});