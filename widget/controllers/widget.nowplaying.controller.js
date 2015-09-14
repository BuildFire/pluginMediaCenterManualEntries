(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', '$routeParams', 'media', 'Buildfire', 'Modals', function ($scope, $routeParams, media, Buildfire, Modals) {
            var NowPlaying = this;
            NowPlaying.item = media;
            NowPlaying.playing = false;
            NowPlaying.paused = false;
            NowPlaying.track = media.data.audioUrl;

            NowPlaying.openPlaylistPopup = function () {
                Modals.playlistModal(NowPlaying.item).then(function(result){
                    console.log('Result----',result);
                },function(err){
                    console.error('Error===========',err);
                });
            };
            NowPlaying.openSettingsPopup = function () {
                Modals.audioSettingsModal(NowPlaying.item).then(function(result){
                    console.log('Result----',result);
                },function(err){
                    console.error('Error===========',err);
                });
            };
            NowPlaying.openMoreInfoPopup = function () {
                Modals.moreInfoModal(NowPlaying.item).then(function(result){
                    console.log('Result----',result);
                },function(err){
                    console.error('Error===========',err);
                });
            };
            /**
             * audioPlayer is Buildfire.services.media.audioPlayer.
             */
            var audioPlayer = Buildfire.services.media.audioPlayer;
            /**
             * audioPlayer.onEvent callback calls when audioPlayer event fires.
             */
            audioPlayer.onEvent(function (e) {
                console.log(e);
                if (e.event == "timeUpdate") {
                    $scope.currentTime = e.data.currentTime;
                    $scope.duration = e.data.duration;
                    $scope.$apply();
                }
                else if (e.event == "audioEnded") {
                    NowPlaying.playing = false;
                    $scope.$apply();
                }
                else if (e.event == "pause") {
                    NowPlaying.playing = false;
                    $scope.$apply();
                }
            });
            /**
             * NowPlaying.playAudio() plays audioPlayer service.
             */
            NowPlaying.playAudio = function () {
                NowPlaying.playing = true;
                if (NowPlaying.paused) {
                    audioPlayer.play();
                }
                else if (NowPlaying.track) {
                    audioPlayer.play({url: NowPlaying.track});
                }
            };
            NowPlaying.pause = function () {
                NowPlaying.paused = true;
                audioPlayer.pause();
            };

            NowPlaying.skip = function (num) {
                audioPlayer.skip(num);
            };

            NowPlaying.forward = function () {
                console.log('Method called');
                audioPlayer.skip(20);
            };

            NowPlaying.backward = function () {
                audioPlayer.setTime(10);
            };

            /**
             * slider to show the slider on now-playing page.
             * @type {*|jQuery|HTMLElement}
             */
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
        }]);
})(window.angular, undefined);
