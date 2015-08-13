(function (angular, window) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetMediaCtrl', ['$scope', '$window', function ($scope, $window) {
            var WidgetMedia = this;
            WidgetMedia.data = {
                design: {
                    listLayout: 'list-1'
                }
            }
            console.log(WidgetMedia.data)
        }]);
})(window.angular, window);