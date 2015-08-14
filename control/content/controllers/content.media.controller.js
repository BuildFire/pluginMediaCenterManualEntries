(function (angular) {
    angular
        .module('mediaCenterContent')
        .controller('ContentMediaCtrl', ['$scope', '$window','TAG_NAMES','Buildfire', function ($scope, $window,TAG_NAMES,Buildfire) {
            var ContentMedia = this;
            ContentMedia.data = {};

            var options = {showIcons: false, multiSelection: false};
            var callback = function (error, result) {
                if (error) {
                    return console.error('Error:', error);
                }
                if (result.selectedFiles && result.selectedFiles.length) {
                    console.log(result.selectedFiles);
                    ContentMedia.data.topImage = result.selectedFiles[0];
                    $scope.$digest();
                }
            };

            ContentMedia.selectTopImage = function () {
                Buildfire.imageLib.showDialog(options, callback);
            };

            ContentMedia.removeTopImage = function () {
                ContentMedia.data.topImage = null;
            };

        }]);
})(window.angular);