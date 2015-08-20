
describe('Controller: ContentHomeCtrl', function () {

// load the controller's module
    beforeEach(module('mediaCenterContent'));

    var
        ContentHomeCtrl,
        MediaCenterInfo,
        scope;

// Initialize the controller and a mock scope
    beforeEach(inject(function ($controller, $rootScope, _MediaCenterInfo_) {
        scope = $rootScope.$new();
        MediaCenterInfo = _MediaCenterInfo_;
        ContentHomeCtrl = $controller('ContentHomeCtrl', {
            $scope: scope
        });
    }));

    it('should attach a list of awesomeThings to the scope', function () {
       // expect(scope.awesomeThings.length).toBe(3);
    });
});
