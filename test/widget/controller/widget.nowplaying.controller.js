describe('Unit : mediaCenterPlugin NowPlaying Controller', function () {
    beforeEach(module('mediaCenterWidget'));

    var $controller, $scope, NowPlaying, $routeParams, Buildfire;


    beforeEach(inject(function (_$controller_, _$routeParams_, _$rootScope_, _Buildfire_) {

        $controller = _$controller_;
        $scope = _$rootScope_.$new();
        $routeParams = _$routeParams_;
        Buildfire = _Buildfire_;

        NowPlaying = $controller('NowPlayingCtrl', {
            $scope: $scope,
            $routeParams: $routeParams,
            media: {id: '1', data: {topImage: "demo.png",audioUrl:"abc.mp3"}},
            Buildfire: Buildfire
        });
    }));


    describe('Unit : units should be Defined', function () {
       it('it should pass if NowPlaying is defined', function () {
            expect(NowPlaying).not.toBeUndefined();
        });
         it('it should pass if Buildfire is defined', function () {
         expect(Buildfire).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.item is defined', function () {
         expect(NowPlaying.item).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.playing is defined', function () {
         expect(NowPlaying.playing).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.paused is defined', function () {
         expect(NowPlaying.paused).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.track is defined', function () {
         expect(NowPlaying.track).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.playAudio function is defined', function () {
         expect(NowPlaying.playAudio).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.previous function is defined', function () {
         expect(NowPlaying.previous).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.pause function is defined', function () {
         expect(NowPlaying.pause).not.toBeUndefined();
         });
        it('it should pass if NowPlaying.next function is defined', function () {
         expect(NowPlaying.next).not.toBeUndefined();
         });
    });

});