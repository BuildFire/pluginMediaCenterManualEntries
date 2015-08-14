(function (angular) {
    angular
        .module('mediaCenterContent')
        .controller('ContentMediaCtrl', ['$scope', '$window','TAG_NAMES','Buildfire','Media','$routeParams',function ($scope, $window,TAG_NAMES,Buildfire,Media,$routeParams) {
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
            ContentMedia.selectAudioImage = function () {
                Buildfire.imageLib.showDialog(options,function (error, result) {
                    if (error) {
                        return console.error('Error:', error);
                    }
                    if (result.selectedFiles && result.selectedFiles.length) {
                        console.log(result.selectedFiles);
                        ContentMedia.data.image = result.selectedFiles[0];
                        $scope.$digest();
                    }
                });
            };

            ContentMedia.removeAudioImage = function () {
                ContentMedia.data.image = null;
            };

            if($routeParams.id){
                Media.getById($routeParams.id,function(err,result){
                    if(err){
                        console.error('Error while getting data------',err);
                    }
                    else{
                        ContentMedia.data=result;
                    }
                });
            }

            ContentMedia.done=function(){
                Media.add(ContentMedia.data,function(err,result){
                    if(err){
                        console.error('-----Error while adding media-----',err);
                    }
                });
            };
            ContentMedia.delete=function(){
                Media.delete(ContentMedia.data.id,function(err,result){
                    if(err){
                        console.error('-----Error while adding media-----',err);
                    }
                });
            };

           /* var tmrDelayForPeoples = null;
            var updateItemsWithDelay = function (item) {
                if (tmrDelayForPeoples) {
                    clearTimeout(tmrDelayForPeoples);
                    ContentMedia.isUpdating = false;
                }
                ContentMedia.unchangedData = angular.equals(_data, ContentMedia.data);
                ContentMedia.isItemValid = isValidItem(ContentMedia.data);
                if (!ContentMedia.isUpdating && !isUnchanged(ContentMedia.item) && ContentMedia.isItemValid) {
                    tmrDelayForPeoples = setTimeout(function () {
                        if (item.id) {
                            ContentMedia.updateItemData();
                        }
                        else if (!ContentMedia.isNewItemInserted) {
                            ContentMedia.addNewItem();
                        }
                    }, 1000);
                }
            };

            $scope.$watch(function () {
                return ContentMedia.data;
            }, updateItemsWithDelay, true);*/
        }]);
})(window.angular);