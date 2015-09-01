(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('NowPlayingCtrl', ['$scope', '$window', 'track', 'AppConfig', 'Messaging', 'Buildfire', 'COLLECTIONS', 'EVENTS', '$timeout', "$sce", function ($scope, $window, track, AppConfig, Messaging, Buildfire, COLLECTIONS, EVENTS, $timeout, $sce) {
            var NowPlaying = this;
            NowPlaying.tarck=track;

            console.log('Now playing controller loaded',NowPlaying.track);
        }]);
})(window.angular, undefined);
