(function (angular) {
    angular
        .module('mediaCenterContent')
        .controller('ContentMediaCtrl', ['$scope', '$window','Buildfire','DB', 'COLLECTIONS','$routeParams','Location','media',function ($scope, $window,Buildfire,DB,COLLECTIONS,$routeParams,Location,media) {
            var ContentMedia = this;
            ContentMedia.isNewItemInserted = false;
            ContentMedia.unchangedData = true;

            ContentMedia.bodyContentWYSIWYGOptions={
                plugins: 'advlist autolink link image lists charmap print preview',
                skin: 'lightgray',
                trusted: true,
                theme: 'modern'
            };
            var data={
                topImage: '',
                summary: '',
                body: '',
                srcUrl: '',
                audioUrl: '',
                videoUrl: '',
                image: '',
                dateCreated:+new Date(),
                rank: '',
                links: [] // this will contain action links
            };
            if(media){
              ContentMedia.item=media;
            }
            else {
                ContentMedia.item={data:data};
            }
            var MediaContent = new DB(COLLECTIONS.MediaContent);
            var options = {showIcons: false, multiSelection: false};
            var callback = function (error, result) {
                if (error) {
                    return console.error('Error:', error);
                }
                if (result.selectedFiles && result.selectedFiles.length) {
                    ContentMedia.item.data.topImage = result.selectedFiles[0];
                    $scope.$digest();
                }
            };

            ContentMedia.selectTopImage = function () {
                Buildfire.imageLib.showDialog(options, callback);
            };

            ContentMedia.removeTopImage = function () {
                ContentMedia.item.data.topImage = null;
            };
            ContentMedia.selectAudioImage = function () {
                Buildfire.imageLib.showDialog(options,function (error, result) {
                    if (error) {
                        return console.error('Error:', error);
                    }
                    if (result.selectedFiles && result.selectedFiles.length) {
                        ContentMedia.item.data.image = result.selectedFiles[0];
                        $scope.$digest();
                    }
                });
            };

            ContentMedia.removeAudioImage = function () {
                ContentMedia.item.data.image = null;
            };

            ContentMedia.openAddLinkPopup = function () {
                var options = {showIcons: false};
                var callback = function (error, result) {
                    console.log(result);
                    if (error) {
                        return console.error('Error:', error);
                    }
                    if (!ContentMedia.item.data.links)
                        ContentMedia.item.data.links = [];
                    ContentMedia.item.data.links.push(result);
                    $scope.$digest();
                };
                Buildfire.actionItems.showDialog(null, options, callback);
            };

            ContentMedia.done=function(){
                if(ContentMedia.item && ContentMedia.item.id) {
                    MediaContent.update(ContentMedia.item.id,ContentMedia.item.data);
                }

                Location.goToHome();

            };

            ContentMedia.delete=function(){
                if(ContentMedia.item && ContentMedia.item.id)
                MediaContent.delete(ContentMedia.item.id).then(function(data){
                    Location.goToHome();
                },function(err){
                    console.error('Error while deleting an item-----',err);
                });
            };

            updateMasterItem(ContentMedia.item);
            function updateMasterItem(item) {
                ContentMedia.masterItem = angular.copy(item);
            }

            function resetItem() {
                ContentMedia.item = angular.copy(ContentMedia.masterItem);
            }

            function isUnchanged(item) {
                return angular.equals(item, ContentMedia.masterItem);
            }

             function updateItemData() {
                 MediaContent.update(ContentMedia.item.id,ContentMedia.item.data).then(function(data){
                     updateMasterItem(ContentMedia.item);
                 },function(err){
                     console.error('Error-------',err);
                 });
            }

            function addNewItem(){
                MediaContent.insert(ContentMedia.item.data).then(function(data){
                    MediaContent.getById(data.id).then(function(data){
                        ContentMedia.item=data;
                        updateMasterItem(data);
                    },function(err){
                        ContentMedia.item=ContentMedia.masterItem;
                        console.error('Error while getting----------',err);
                    });
                },function(err){
                    console.error('---------------Error while inserting data------------',err);
                });
            }

            var tmrDelayForMedia = null;
            var updateItemsWithDelay = function (item) {
                if (tmrDelayForMedia) {
                    clearTimeout(tmrDelayForMedia);
                }
                ContentMedia.unchangedData = angular.equals(ContentMedia.masterItem, ContentMedia.item.data);
                if (!isUnchanged(ContentMedia.item)) {
                    tmrDelayForMedia = setTimeout(function () {
                        if (item.id) {
                            updateItemData();
                        }
                        else if (!ContentMedia.isNewItemInserted) {
                            addNewItem();
                        }
                    }, 1000);
                }
            };

            $scope.$watch(function () {
                return ContentMedia.item;
            }, updateItemsWithDelay, true);
        }]);
})(window.angular);