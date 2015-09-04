
describe('buildFire-Carousel-Directive', function () {

    var $rootScope, $scope, $compile, el, $body = $('body'), simpleHtml = '<buildfire-carousel images="images"></buildfire-carousel>';


    beforeEach(function () {
        module('mediaCenterWidget');
        inject(function ($injector) {
            $rootScope = $injector.get('$rootScope');
            $scope = $rootScope.$new();
            $scope.images = "";//[{"imageUrl":"https://imagelibserver.s3.amazonaws.com/1440481663060-020164419920183718/fca25c50-4af5-11e5-8618-af6c4fe89f23.jpg","title":"","url":"","action":"linkToApp","openIn":"_system","actionName":"Link to App Content"}];
            $compile = $injector.get('$compile');
            el = $compile(angular.element(simpleHtml))($scope);
            $scope.$digest();
        });
    });


    it('should return an empty div with id carousel in case of no images', function () {
        expect(el.html()).toEqual('');
    });



});


describe('Unit: play Button Directive', function () {

    var $rootScope, $scope, $compile, el, $body = $('body'), simpleHtml = '<div play-btn="{{true}}"></div>';


    beforeEach(function () {
        module('mediaCenterWidget');

        inject(function ($injector) {
            $rootScope = $injector.get('$rootScope');
            $scope = $rootScope.$new();
            $scope.images = [];
            $compile = $injector.get('$compile');
            el = $compile(angular.element(simpleHtml))($scope);
        });

        $body.append(el);
        $rootScope.$apply();

    });


    it('should contain class play-btn', function () {
        expect(el.hasClass('play-btn')).toEqual(true);
    });

});
