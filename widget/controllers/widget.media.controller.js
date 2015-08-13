(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', function ($scope, $window) {
            var WidgetHome = this;
            WidgetHome.data = {
                design: {
                    listLayout: 'list-1'
                }
            }
        }]);
})(window.angular, window);