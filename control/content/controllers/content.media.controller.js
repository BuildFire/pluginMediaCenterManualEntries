(function (angular) {
    angular
        .module('mediaCenterContent')
        .controller('ContentMediaCtrl', ['$scope', '$window', 'Buildfire', 'DB', 'COLLECTIONS', 'Location', 'media', function ($scope, $window, Buildfire, DB, COLLECTIONS, Location, media) {
            var ContentMedia = this;
            var tmrDelayForMedia = null;
            var MediaContent = new DB(COLLECTIONS.MediaContent);

            function init() {
                var data = {
                    topImage: '',
                    summary: '',
                    body: '',
                    srcUrl: '',
                    audioUrl: '',
                    videoUrl: '',
                    image: '',
                    dateCreated: '',
                    rank: '',
                    links: [] // this will contain action links
                };
                ContentMedia.linksSortableOptions = {
                    handle: '> .handle'
                };
                ContentMedia.bodyContentWYSIWYGOptions = {
                    plugins: 'advlist autolink link image lists charmap print preview',
                    skin: 'lightgray',
                    trusted: true,
                    theme: 'modern'
                };
                updateMasterItem({data: data});
                if (media) {
                    ContentMedia.item = media;
                }
                else {
                    ContentMedia.item = {data: data};
                }
            }

            function updateMasterItem(item) {
                ContentMedia.masterItem = angular.copy(item);
            }

            function resetItem() {
                ContentMedia.item = angular.copy(ContentMedia.masterItem);
            }

            function isChanged(item) {
                var isDescChanged = false;
                if (item.data.body)
                    isDescChanged = !angular.equals(tinymce.editors[0].getContent({format: 'text'}).trim(), "")
                return isDescChanged && !angular.equals(item, ContentMedia.masterItem);
            }
            function updateItemData() {
                MediaContent.update(ContentMedia.item.id, ContentMedia.item.data).then(function (data) {
                    updateMasterItem(ContentMedia.item);
                }, function (err) {
                    resetItem();
                    console.error('Error-------', err);
                });
            }
            function addNewItem() {
                console.log('Add new item');
                MediaContent.insert(ContentMedia.item.data).then(function (data) {
                    MediaContent.getById(data.id).then(function (data) {
                        ContentMedia.item = data;
                        updateMasterItem(data);
                    }, function (err) {
                        resetItem();
                        console.error('Error while getting----------', err);
                    });
                }, function (err) {
                    console.error('---------------Error while inserting data------------', err);
                });
            }

            function updateItemsWithDelay(item) {
                if (tmrDelayForMedia) {
                    clearTimeout(tmrDelayForMedia);
                }
                if (isChanged(ContentMedia.item)) {
                    tmrDelayForMedia = setTimeout(function () {
                        if (item.id) {
                            updateItemData();
                        }
                        else {
                            ContentMedia.item.data.dateCreated = +new Date();
                            addNewItem();
                        }

                    }, 1000);
                }
            }

            var selectImageOptions = {showIcons: false, multiSelection: false};
            var topImagecallback = function (error, result) {
                if (error) {
                    return console.error('Error:', error);
                }
                if (result.selectedFiles && result.selectedFiles.length) {
                    ContentMedia.item.data.topImage = result.selectedFiles[0];
                    $scope.$digest();
                }
            };

            ContentMedia.selectTopImage = function () {
                Buildfire.imageLib.showDialog(selectImageOptions, topImagecallback);
            };

            ContentMedia.removeTopImage = function () {
                ContentMedia.item.data.topImage = '';
            };
            var audioImageCallback = function (error, result) {
                if (error) {
                    return console.error('Error:', error);
                }
                if (result.selectedFiles && result.selectedFiles.length) {
                    ContentMedia.item.data.image = result.selectedFiles[0];
                    $scope.$digest();
                }
            };
            ContentMedia.selectAudioImage = function () {
                Buildfire.imageLib.showDialog(selectImageOptions, audioImageCallback);
            };

            ContentMedia.removeAudioImage = function () {
                ContentMedia.item.data.image = '';
            };

            var linksOptions = {showIcons: false};
            var addLinkCallback = function (error, result) {
                if (error) {
                    return console.error('Error:', error);
                }
                if (!ContentMedia.item.data.links)
                    ContentMedia.item.data.links = [];
                ContentMedia.item.data.links.push(result);
                $scope.$digest();
            };

            ContentMedia.openAddLinkPopup = function () {
                Buildfire.actionItems.showDialog(null, linksOptions, addLinkCallback);
            };

            ContentMedia.openEditLinkPopup = function (link, index) {
                Buildfire.actionItems.showDialog(link, linksOptions, function (error, result) {
                    if (error) {
                        return console.error('Error:', error);
                    }
                    if (!ContentMedia.item.data.links)
                        ContentMedia.item.data.links = [];
                    ContentMedia.item.data.links.splice(index, 1, result);
                    $scope.$digest();
                });
            };

            ContentMedia.removeLink = function (index) {
                if (ContentMedia.item.data && ContentMedia.item.data.links)
                    ContentMedia.item.data.links.splice(index, 1);
            };

            ContentMedia.done = function () {
                if (ContentMedia.item.id) {
                    MediaContent.update(ContentMedia.item.id, ContentMedia.item.data).then(function (data) {
                        Location.goToHome();
                    }, function (err) {
                        console.error('error----', err);
                        //do something on error
                    });
                }

            };

            ContentMedia.delete = function () {
                if (ContentMedia.item.id)
                    MediaContent.delete(ContentMedia.item.id).then(function (data) {
                        Location.goToHome();
                    }, function (err) {
                        console.error('Error while deleting an item-----', err);
                    });
            };

            $scope.$watch(function () {
                return ContentMedia.item;
            }, updateItemsWithDelay, true);

            init();
        }]);
})(window.angular);