/**
 * Created by intelligrape on 24/8/15.
 */
describe('WidgetMedia Controller', function () {
    beforeEach(module('mediaCenterWidget'));

    var $controller, COLLECTIONS, DB, $timeout, Buildfire, $rootScope, Messaging, AppConfig, media;

    beforeEach(inject(function (_$controller_, _COLLECTIONS_, _DB_, _$timeout_, _Buildfire_, $q, _$rootScope_, _Messaging_, _AppConfig_, _media_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $controller = _$controller_;
            COLLECTIONS = _COLLECTIONS_;
            DB = _DB_;
            $timeout = _$timeout_;
            Buildfire = _Buildfire_;
            $rootScope = _$rootScope_;
            Messaging = _Messaging_;
            AppConfig = _AppConfig_;
            media=_media_;
        }
    ));
    describe('WidgetMediaCtrl.media', function () {
        it('shd be initialised properly', function () {
            var $scope = $rootScope.$new();
            var controller = $controller('WidgetMediaCtrl', {$scope: $scope, media: {data: AppConfig.getSettings()}});
            expect(controller.media).toBeDefined();
        });
    });
    describe('WidgetMediaCtrl.item', function () {
        it('shd be initialised properly', function () {
            var $scope = $rootScope.$new();
            var controller = $controller('WidgetMediaCtrl', {$scope: $scope, item: media});
            expect(controller.item).toBeDefined();
        });
    });
});