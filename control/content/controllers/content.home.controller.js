(function (angular) {
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', '$window', function ($scope, $window) {
            var ContentHome = this;
            ContentHome.data = {
                design: {
                    listLayout: 'list-1'
                }
            }
        }]);
})(window.angular, undefined);