/**
 * Created by intelligrape on 24/8/15.
 */
describe('WidgetHome Controller', function () {
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
});