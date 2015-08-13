(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', function ($scope, $window) {
            var WidgetHome = this;
            WidgetHome.data = {
                design: {
                    listLayout: 'list-1'
                }
            }
        }]);
})(window.angular, window);