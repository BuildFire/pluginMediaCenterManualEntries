(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', '$routeParams', 'media', 'Buildfire', function ($scope, $routeParams, media, Buildfire) {
            var NowPlaying = this;
                NowPlaying.track = media.data.audioUrl;
            var audioPlayer = Buildfire.services.media.audioPlayer;
            audioPlayer.onEvent(function (e) {
                console.log(e);
                if (e.event == "timeUpdate") {
                    $scope.currentTime = e.data.currentTime;
                    $scope.duration = e.data.duration;
                    $scope.$apply();
                }
                else if (e.event == "audioEnded" && $scope.currentTrack) {
                    $scope.currentTrack.playing = false;
                    $scope.$apply();
                }
            });
            NowPlaying.playAudio = function () {
                console.log('play called');
                if (NowPlaying.track) {
                    console.log(NowPlaying.track);
                    audioPlayer.play({url: NowPlaying.track});
                }
            };
            NowPlaying.previous = function () {
                audioPlayer.previous();
            };
            NowPlaying.skip = function (num) {
                audioPlayer.skip(num);
            };
            NowPlaying.pause = function () {
                audioPlayer.pause();
            };
            NowPlaying.next = function () {
                audioPlayer.next();
            };

            var slider = $('#slider');

            slider.onchange = function () {
                if (Math.abs(this.value - $scope.currentTime) > 1)
                    audioPlayer.setTime(this.value);
            };
            slider.onmousedown = function () {
                this.stopUpdateing = true;
            };
            slider.onmouseup = function () {
                this.stopUpdateing = false;
            };

            console.log('Now playing controller loaded', NowPlaying.track, media);
        }]);
})(window.angular, undefined);
