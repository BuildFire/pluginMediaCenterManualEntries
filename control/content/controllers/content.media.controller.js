(function (angular) {
    angular
        .module('mediaCenterContent')
        .controller('ContentMediaCtrl', ['$scope', '$window','TAG_NAMES','Buildfire', function ($scope, $window,TAG_NAMES,Buildfire) {
            var ContentMedia = this;
            ContentMedia.data = {
                design: {
                    listLayout: 'list-1'
                }
            }
        }]);
})(window.angular);