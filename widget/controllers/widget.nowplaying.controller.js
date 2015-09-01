(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', '$routeParams', 'media', 'Buildfire', function ($scope, $routeParams, media, Buildfire) {
            var NowPlaying = this;
            NowPlaying.item = media;
            NowPlaying.playing=false;
            NowPlaying.paused=false;
            NowPlaying.track = media.data.audioUrl;
            var audioPlayer = Buildfire.services.media.audioPlayer;
            audioPlayer.onEvent(function (e) {
                if (e.event == "timeUpdate") {
                    $scope.currentTime = e.data.currentTime;
                    $scope.duration = e.data.duration;
                    $scope.$apply();
                }
                else if (e.event == "audioEnded") {
                    NowPlaying.playing=false;
                    $scope.$apply();
                }
                else if(e.event == "pause"){
                    NowPlaying.playing=false;
                    $scope.$apply();
                }
            });
            NowPlaying.playAudio = function () {
                NowPlaying.playing=true;
                if (NowPlaying.paused) {
                    audioPlayer.play();
                }
                else if(NowPlaying.track) {
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
                NowPlaying.paused=true;
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
