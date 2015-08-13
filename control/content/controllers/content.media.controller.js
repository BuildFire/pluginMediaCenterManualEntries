(function (angular) {
    angular
        .module('mediaCenterContent')
        .controller('ContentMediaCtrl', ['$scope', '$window', function ($scope, $window) {
            var ContentMedia = this;
            ContentMedia.data = {
                design: {
                    listLayout: 'list-1'
                }
            }
        }]);
})(window.angular, undefined);