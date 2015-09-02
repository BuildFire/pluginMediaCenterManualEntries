/**
 * Create self executing funton to avoid global scope creation
 */
(function (angular, tinymce) {
    'use strict';
    angular
        .module('mediaCenterContent')
    /**
     * Inject dependency
     */
        .controller('ContentMediaCtrl', ['$scope', '$window', 'Buildfire', 'DB', 'COLLECTIONS', 'Location', 'media', 'Messaging', 'EVENTS', 'PATHS', 'AppConfig',
            function ($scope, $window, Buildfire, DB, COLLECTIONS, Location, media, Messaging, EVENTS, PATHS, AppConfig) {
                /**
                 * Using Control as syntax this
                 */
                var ContentMedia = this;
                var tmrDelayForMedia = null;
                /**
                 * Create instance of MediaContent, MediaCenter db collection
                 * @type {DB}
                 */
                var MediaContent = new DB(COLLECTIONS.MediaContent);
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                /**
                 * Get the MediaCenter initialized settings
                 */
                var MediaCenterSettings = AppConfig.getSettings();
                /**
                 * Get the MediaCenter master collection data object id
                 */
                var appId = AppConfig.getAppId();
                /**
                 * Options for image library
                 * @type {{showIcons: boolean, multiSelection: boolean}}
                 */
                var selectImageOptions = {showIcons: false, multiSelection: false};

                /**
                 * Init bootstrapping data
                 */
                function init() {
                    var data = {
                        topImage: '',
                        summary: '',
                        title: '',
                        body: '',
                        bodyHTML: '',
                        srcUrl: '',
                        audioUrl: '',
                        videoUrl: '',
                        image: '',
                        dateCreated: '',
                        rank: (MediaCenterSettings.content.rankOfLastItem || 0) + 10,
                        links: [] // this will contain action links
                    };
                    /**
                     * Define links sortable options
                     * @type {{handle: string}}
                     */
                    ContentMedia.linksSortableOptions = {
                        handle: '> .handle'
                    };
                    /**
                     * Define body content WYSIWYG options
                     * @type {{plugins: string, skin: string, trusted: boolean, theme: string}}
                     */
                    ContentMedia.bodyContentWYSIWYGOptions = {
                        plugins: 'advlist autolink link image lists charmap print preview',
                        skin: 'lightgray',
                        trusted: true,
                        theme: 'modern'
                    };
                    /**
                     * Update master data once it data is loaded
                     */
                    updateMasterItem({data: data});

                    /**
                     * if controller is for opened in edit mode, Load media data
                     * else init it with bootstrap data
                     */
                    if (media) {
                        ContentMedia.item = media;
                    }
                    else {
                        ContentMedia.item = {data: data};
                    }
                }

                /**
                 * This updateMasterItem will update the ContentMedia.masterItem with passed item
                 * @param item
                 */
                function updateMasterItem(item) {
                    ContentMedia.masterItem = angular.copy(item);
                }

                /**
                 * This resetItem will reset the ContentMedia.item with ContentMedia.masterItem
                 */
                function resetItem() {
                    ContentMedia.item = angular.copy(ContentMedia.masterItem);
                }

                /**
                 * filter to remove the body from copied data
                 * @param item
                 * @returns {XMLList|XML|*}
                 */
                function filter(item) {
                    var newItem = angular.copy(item);
                    newItem.data.body = '';
                    return newItem;
                }

                /**
                 * isUnChanged to check whether there is change in controller media item or not
                 * @param item
                 * @returns {*|boolean}
                 */
                function isUnChanged(item) {
                    if (item.data.body && angular.equals(tinymce.editors[0].getContent({format: 'text'}).trim(), "")) {
                        return angular.equals(filter(item), ContentMedia.masterItem);
                    }
                    else {
                        return angular.equals(item, ContentMedia.masterItem);
                    }
                }

                /**
                 * This updateItemData method will call the Builfire update method to update the ContentMedia.item
                 */
                function updateItemData() {
                    ContentMedia.item.data.bodyHTML = ContentMedia.item.data.body;
                    MediaContent.update(ContentMedia.item.id, ContentMedia.item.data).then(function (data) {
                        updateMasterItem(ContentMedia.item);
                    }, function (err) {
                        resetItem();
                        console.error('Error-------', err);
                    });
                }

                /**
                 * This addNewItem method will call the Builfire insert method to insert ContentMedia.item
                 */

                function addNewItem() {
                    ContentMedia.item.data.bodyHTML = ContentMedia.item.data.body;
                    MediaContent.insert(ContentMedia.item.data).then(function (data) {
                        MediaContent.getById(data.id).then(function (item) {
                            ContentMedia.item = item;
                            updateMasterItem(item);
                            MediaCenterSettings.content.rankOfLastItem = item.data.rank;
                            MediaCenter.update(appId, MediaCenterSettings).then(function (data) {
                                console.info("Updated MediaCenter rank");
                            }, function (err) {
                                console.error('Error-------', err);
                            });
                        }, function (err) {
                            resetItem();
                            console.error('Error while getting----------', err);
                        });
                    }, function (err) {
                        console.error('---------------Error while inserting data------------', err);
                    });
                }

                /**
                 * updateItemsWithDelay called when ever there is some change in current media item
                 * @param item
                 */
                function updateItemsWithDelay(item) {
                    if (tmrDelayForMedia) {
                        clearTimeout(tmrDelayForMedia);
                    }
                    if (!isUnChanged(ContentMedia.item)) {
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

                /**
                 * callback function of top image icon selection click
                 */
                ContentMedia.selectTopImage = function () {
                    Buildfire.imageLib.showDialog(selectImageOptions, function topImageCallback(error, result) {
                        if (error) {
                            return console.error('Error:', error);
                        }
                        if (result.selectedFiles && result.selectedFiles.length) {
                            ContentMedia.item.data.topImage = result.selectedFiles[0];
                            $scope.$digest();
                        }
                    });
                };
                /**
                 * Will remove the top image url
                 */
                ContentMedia.removeTopImage = function () {
                    ContentMedia.item.data.topImage = '';
                };
                /**
                 * callback function of audio image icon selection click
                 */
                ContentMedia.selectAudioImage = function () {
                    Buildfire.imageLib.showDialog(selectImageOptions, function audioImageCallback(error, result) {
                        if (error) {
                            return console.error('Error:', error);
                        }
                        if (result.selectedFiles && result.selectedFiles.length) {
                            ContentMedia.item.data.image = result.selectedFiles[0];
                            $scope.$digest();
                        }
                    });
                };
                /**
                 * Will remove the audio image url
                 */
                ContentMedia.removeAudioImage = function () {
                    ContentMedia.item.data.image = '';
                };
                /**
                 * Options for links
                 * @type {{showIcons: boolean}}
                 */
                var linksOptions = {showIcons: false};
                /**
                 * Add dynamic link popup
                 */
                ContentMedia.openAddLinkPopup = function () {
                    Buildfire.actionItems.showDialog(null, linksOptions, function addLinkCallback(error, result) {
                        if (error) {
                            return console.error('Error:', error);
                        }
                        if (!ContentMedia.item.data.links) {
                            ContentMedia.item.data.links = [];
                        }
                        ContentMedia.item.data.links.push(result);
                        $scope.$digest();
                    });
                };
                /**
                 * open dynamic link popup in edit mode
                 */
                ContentMedia.openEditLinkPopup = function (link, index) {
                    Buildfire.actionItems.showDialog(link, linksOptions, function editLinkCallback(error, result) {
                        if (error) {
                            return console.error('Error:', error);
                        }
                        if (!ContentMedia.item.data.links) {
                            ContentMedia.item.data.links = [];
                        }
                        ContentMedia.item.data.links.splice(index, 1, result);
                        $scope.$digest();
                    });
                };

                /**
                 * remove dynamic link
                 */
                ContentMedia.removeLink = function (index) {
                    if (ContentMedia.item.data && ContentMedia.item.data.links) {
                        ContentMedia.item.data.links.splice(index, 1);
                    }
                };
                /**
                 * done will close the single item view
                 */
                ContentMedia.done = function () {
                    Location.goToHome();
                };
                /**
                 * will delete the current item from MediaContent collection
                 */
                ContentMedia.delete = function () {
                    if (ContentMedia.item.id) {
                        MediaContent.delete(ContentMedia.item.id).then(function (data) {
                            Location.goToHome();
                        }, function (err) {
                            console.error('Error while deleting an item-----', err);
                        });
                    }
                };
                /**
                 * Initialize bootstrap data
                 */
                init();
                /**
                 * On rout change update the widget layout
                 */
                Messaging.sendMessageToWidget({
                    name: EVENTS.ROUTE_CHANGE,
                    message: {
                        path: PATHS.MEDIA,
                        id: ContentMedia.item.id || null
                    }
                });
                /**
                 * Watch on ContentMedia.item to see changes and call updateItemsWithDelay
                 */
                $scope.$watch(function () {
                    return ContentMedia.item;
                }, updateItemsWithDelay, true);
            }]);
})(window.angular, window.tinymce);