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
                //scroll current view to top when loaded.
                Buildfire.navigation.scrollTop();
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
                if (!AppConfig.getSettings()) {
                    AppConfig.setSettings({
                        content: {
                            images: [],
                            descriptionHTML: '<p>&nbsp;<br></p>',
                            description: '',
                            sortBy: Orders.ordersMap.Newest,
                            rankOfLastItem: 0
                        },
                        design: {
                            listLayout: "list-1",
                            itemLayout: "item-1",
                            backgroundImage: ""
                        }
                    });
                }
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

                var updating = false;

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
                        mediaDate: new Date(),
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
                     * if controller is for opened in edit mode, Load media data
                     * else init it with bootstrap data
                     */
                    if (media) {
                        ContentMedia.item = media;
                        if (media.data.mediaDate)
                            ContentMedia.item.data.mediaDate = new Date(media.data.mediaDate);
                        updateMasterItem(ContentMedia.item);

                    }
                    else {
                        ContentMedia.item = {data: data};
                        updateMasterItem(ContentMedia.item);

                    }

                    /**
                     * Initialize the links
                     */
                    if (ContentMedia.item.data.links)
                        ContentMedia.linkEditor.loadItems(ContentMedia.item.data.links);
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
                    if (item.data.body && tinymce.editors[0] && angular.equals(tinymce.editors[0].getContent({format: 'text'}).trim(), "")) {
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
                    updating = true;
                    ContentMedia.item.data.bodyHTML = ContentMedia.item.data.body;
                    MediaContent.update(ContentMedia.item.id, ContentMedia.item.data).then(function (data) {
                        updateMasterItem(ContentMedia.item);
                        updating = false;
                        Messaging.sendMessageToWidget({
                            name: EVENTS.ITEMS_CHANGE,
                            message: {}
                        });
                    }, function (err) {
                        resetItem();
                        console.error('Error-------', err);
                    });
                }

                /**
                 * This addNewItem method will call the Builfire insert method to insert ContentMedia.item
                 */

                function addNewItem() {
                    updating = true;
                    ContentMedia.item.data.bodyHTML = ContentMedia.item.data.body;
                    MediaContent.insert(ContentMedia.item.data).then(function (data) {
                        MediaContent.getById(data.id).then(function (item) {
                            ContentMedia.item = item;
                            ContentMedia.item.data.deepLinkUrl = Buildfire.deeplink.createLink({id: item.id});
                            updateMasterItem(item);
                            updating = false;
                            MediaCenterSettings.content.rankOfLastItem = item.data.rank;
                            if (appId && MediaCenterSettings) {
                                MediaCenter.update(appId, MediaCenterSettings).then(function (data) {
                                    console.info("Updated MediaCenter rank");
                                }, function (err) {
                                    console.error('Error-------', err);
                                });
                            }
                            else {
                                MediaCenter.insert(MediaCenterSettings).then(function (data) {
                                    console.info("Inserted MediaCenter rank");
                                }, function (err) {
                                    console.error('Error-------', err);
                                });
                            }
                            Messaging.sendMessageToWidget({
                                name: EVENTS.ITEMS_CHANGE,
                                message: {}
                            });

                        }, function (err) {
                            resetItem();
                            console.error('Error while getting----------', err);
                        });
                    }, function (err) {
                        console.error('---------------Error while inserting data------------', err);
                    });
                }


                function isValidItem(item) {
                    return item.title;
                }

                /**
                 * updateItemsWithDelay called when ever there is some change in current media item
                 * @param item
                 */
                function updateItemsWithDelay(item) {
                    if (updating) {
                    console.log(' came but updating is going on');
                    return;
                }
                    if (tmrDelayForMedia) {
                        clearTimeout(tmrDelayForMedia);
                    }
                    ContentMedia.isItemValid = isValidItem(ContentMedia.item.data);
                    if (!isUnChanged(ContentMedia.item) && ContentMedia.isItemValid) {

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

                // create a new instance of the buildfire action Items
                ContentMedia.linkEditor = new Buildfire.components.actionItems.sortableList("#actionItems");
                // this method will be called when a new item added to the list
                ContentMedia.linkEditor.onAddItems = function (items) {
                    if (!ContentMedia.item.data.links)
                        ContentMedia.item.data.links = [];
                    ContentMedia.item.data.links.push(items);
                    $scope.$digest();
                };
                // this method will be called when an item deleted from the list
                ContentMedia.linkEditor.onDeleteItem = function (item, index) {
                    ContentMedia.item.data.links.splice(index, 1);
                    $scope.$digest();
                };
                // this method will be called when you edit item details
                ContentMedia.linkEditor.onItemChange = function (item, index) {
                    ContentMedia.item.data.links.splice(index, 1, item);
                    $scope.$digest();
                };
                // this method will be called when you change the order of items
                ContentMedia.linkEditor.onOrderChange = function (item, oldIndex, newIndex) {
                    var temp = ContentMedia.item.data.links[oldIndex];
                    ContentMedia.item.data.links[oldIndex] = ContentMedia.item.data.links[newIndex];
                    ContentMedia.item.data.links[newIndex] = temp;
                    $scope.$digest();
                };
                /**
                 * done will close the single item view
                 */
                ContentMedia.done = function () {
                    Location.goToHome();
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