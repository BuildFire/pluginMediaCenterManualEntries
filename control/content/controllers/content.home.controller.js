(function (angular) {
    'use strict';
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', 'MediaCenterInfo', 'Location', 'Modals', 'SearchEngine', 'DB', '$timeout', 'COLLECTIONS', 'Orders', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Buildfire', '$csv', '$rootScope',
            function ($scope, MediaCenterInfo, Location, Modals, SearchEngine, DB, $timeout, COLLECTIONS, Orders, AppConfig, Messaging, EVENTS, PATHS, Buildfire, $csv, $rootScope) {
                /**
                 * Breadcrumbs  related implementation
                 */
                //Buildfire.history.pop();

                //scroll current view to top when loaded.
                Buildfire.navigation.scrollTop();
                var ContentHome = this;
                if (!$rootScope.activeTab) $rootScope.activeTab = 'content-media-tab';
                var _infoData = {
                    data: {
                        content: {
                            images: [],
                            descriptionHTML: '',
                            description: '',
                            sortBy: Orders.ordersMap.Newest,
                            sortCategoriesBy:Orders.ordersMap.Newest,
                            rankOfLastItem: 0,
                            rankofLastCategory:0,
                            allowShare: true,
                            allowAddingNotes: true,
                            allowSource: true,
                            allowOfflineDownload: false,
                            enableFiltering: false,
                            forceAutoPlay: false,
                            dateIndexed: true,
                            dateCreatedIndexed: true
                        },
                        design: {
                            listLayout: "list-1",
                            itemLayout: "item-1",
                            backgroundImage: "",
                            skipMediaPage: false
                        },
                        indexingUpdateDone: true,
                        indexingUpdateDoneV2: true
                    }
                };
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);

                if (MediaCenterInfo) {
                    updateMasterInfo(MediaCenterInfo);
                    ContentHome.info = MediaCenterInfo;
                }
                else {
                    MediaCenterInfo = _infoData;
                    updateMasterInfo(_infoData);
                    ContentHome.info = _infoData;
                }
                if (typeof (ContentHome.info.data.content.allowShare) == 'undefined')
                    ContentHome.info.data.content.allowShare = true;
                if (typeof (ContentHome.info.data.content.allowAddingNotes) == 'undefined')
                    ContentHome.info.data.content.allowAddingNotes = true;
                if (typeof (ContentHome.info.data.content.allowSource) == 'undefined')
                    ContentHome.info.data.content.allowSource = true;
                if (typeof (ContentHome.info.data.content.forceAutoPlay) == 'undefined')
                    ContentHome.info.data.content.forceAutoPlay = false;
                if (typeof (ContentHome.info.data.content.updatedRecords) == 'undefined')
                    ContentHome.info.data.content.updatedRecords = false;
                if (typeof (ContentHome.info.data.content.allowOfflineDownload) == 'undefined')
                    ContentHome.info.data.content.allowOfflineDownload = false;
                if (typeof (ContentHome.info.data.content.enableFiltering) == 'undefined')
                    ContentHome.info.data.content.enableFiltering = false;
                if (typeof (ContentHome.info.data.content.sortBy) !== 'undefined'
                    && ContentHome.info.data.content.sortBy === 'Most') {
                    ContentHome.info.data.content.sortBy = 'Media Title A-Z';
                    ContentHome.info.data.content.sortByValue = 'Media Title A-Z';
                }
                if (typeof (ContentHome.info.data.content.sortBy) !== 'undefined'
                    && ContentHome.info.data.content.sortBy === 'Least') {
                    ContentHome.info.data.content.sortBy = 'Media Title Z-A';
                    ContentHome.info.data.content.sortByValue = 'Media Title Z-A';
                }

                // Check the number of the old views data, If it's zero, all data is update.
                if(!ContentHome.info.data.indexingUpdateDoneV2){
                    buildfire.publicData.search({filter:{$and:[
                        {"_buildfire.index.array1.string1":null},
                        {"_buildfire.index.text":{$exists:true}}
                    ]}},"MediaCount", function(err,res){
                        if(res.length === 0){
                            MediaCenterInfo.data.indexingUpdateDoneV2 = true;
                            ContentHome.info.data.indexingUpdateDoneV2 = true;
                            MediaCenter.save(ContentHome.info.data).then((e,r)=>{
                                if(e) return console.error(e);
                            })
                        }
                    })
                }

                AppConfig.setSettings(MediaCenterInfo.data);
                AppConfig.setAppId(MediaCenterInfo.id);

                var tmrDelayForMedia = null;

                //option for wysiwyg
                ContentHome.bodyWYSIWYGOptions = {
                    plugins: 'advlist autolink link image lists charmap print preview',
                    skin: 'lightgray',
                    trusted: true,
                    theme: 'modern'
                };

                ContentHome.showFilters = ContentHome.info.data.content.enableFiltering;
                ContentHome.isBusy = false;
                /* tells if data is being fetched*/
                ContentHome.items = [];
                ContentHome.sortOptions = Orders.options;

                // create a new instance of the buildfire carousel editor
                var editor = new Buildfire.components.carousel.editor("#carousel");
                // this method will be called when a new item added to the list
                editor.onAddItems = function (items) {
                    if (!ContentHome.info.data.content.images)
                        ContentHome.info.data.content.images = [];
                    ContentHome.info.data.content.images.push.apply(ContentHome.info.data.content.images, items);
                    $scope.$digest();
                };
                // this method will be called when an item deleted from the list
                editor.onDeleteItem = function (item, index) {
                    ContentHome.info.data.content.images.splice(index, 1);
                    $scope.$digest();
                };
                // this method will be called when you edit item details
                editor.onItemChange = function (item, index) {
                    ContentHome.info.data.content.images.splice(index, 1, item);
                    $scope.$digest();
                };
                // this method will be called when you change the order of items
                editor.onOrderChange = function (item, oldIndex, newIndex) {
                    var items = ContentHome.info.data.content.images;

                    var tmp = items[oldIndex];

                    if (oldIndex < newIndex) {
                        for (var i = oldIndex + 1; i <= newIndex; i++) {
                            items[i - 1] = items[i];
                        }
                    } else {
                        for (var i = oldIndex - 1; i >= newIndex; i--) {
                            items[i + 1] = items[i];
                        }
                    }
                    items[newIndex] = tmp;

                    ContentHome.info.data.content.images = items;
                    $scope.$digest();
                };

                // initialize carousel data
                if (!ContentHome.info.data.content.images)
                    editor.loadItems([]);
                else
                    editor.loadItems(ContentHome.info.data.content.images);


                /**
                 * ContentHome.noMore tells if all data has been loaded
                 */
                ContentHome.noMore = false;
                /* Update all */
                ContentHome.updateRecords = function (name) {
                    ContentHome.items = [];
                    buildfire.notifications.alert({
                        title: "Update In Progress",
                        message: `We have made an update to allow you to sort items alphabetically. For this update to occur successfully, please stay on this screen for 5 to 20 seconds until you receive an “Update Finished” message.`,
                        okButton: { text: 'Ok' }
                    }, function (e, data) {
                        if (e) console.error(e);
                        if (data) console.log(data);
                    });

                    let pageSize = 50, page = 0, allItems = [];
                    var get = function () {
                        buildfire.datastore.search({ pageSize, page, recordCount: true }, "MediaContent", function (err, data) {
                            if (data && data.result && data.totalRecord) {
                                allItems = allItems.concat(data.result);
                                if (data.totalRecord > allItems.length) {
                                    data.result.map(item => {
                                        item.data.titleIndex = item.data.title.toLowerCase();
                                        buildfire.datastore.update(item.id, item.data, "MediaContent", (err, res) => {
                                        })
                                    });
                                    page++;
                                    get();
                                } else {
                                    let count = allItems.length - data.result.length;
                                    data.result.map(item => {
                                        item.data.titleIndex = item.data.title.toLowerCase();
                                        buildfire.datastore.update(item.id, item.data, "MediaContent", (err, res) => {
                                            count++;
                                            if (count === allItems.length) {
                                                buildfire.notifications.alert({
                                                    title: "Update Finished",
                                                    message: `Your feature has been successfully updated! Please PUBLISH your app to see this update on mobile devices.`,
                                                    okButton: { text: 'Ok' }
                                                }, function (e, data) {
                                                    if (e) console.error(e);
                                                    window.location.reload();
                                                });
                                            }
                                        })
                                    });
                                    var sortOrder = Orders.getOrder(name || Orders.ordersMap.Default);
                                    ContentHome.info.data.content.sortBy = name;
                                    ContentHome.info.data.content.sortByValue = sortOrder.value;
                                    ContentHome.info.data.content.updatedRecords = true;
                                    updateData(ContentHome.info)
                                }
                            }
                        })
                    }
                    get();
                }

                if ((ContentHome.info.data.content.sortBy == "Media Title A-Z"
                    || ContentHome.info.data.content.sortBy === "Media Title Z-A")
                    && !ContentHome.info.data.content.updatedRecords) {
                    ContentHome.updateRecords(ContentHome.info.data.content.sortBy);
                }

                function updateMasterInfo(info) {
                    ContentHome.masterInfo = angular.copy(info);
                }

                function isUnchanged(info) {
                    return angular.equals(info, ContentHome.masterInfo);
                }

                function updateData(_info) {
                    console.log("updating media center");
                    if (!_info.id) {
                        MediaCenter.save(_info.data).then(function (data) {
                            MediaCenter.get().then(function (getData) {
                                updateMasterInfo(data);
                                AppConfig.setSettings(_info.data);
                            }, function (err) {
                                console.error(err);
                            });
                        }, function (err) {
                            console.error('Error-------', err);
                        });
                    } else {
                        MediaCenter.update(_info.id, _info.data).then(function (data) {
                            updateMasterInfo(data);
                            AppConfig.setSettings(_info.data);
                        }, function (err) {
                            console.error('Error-------', err);
                        });
                    }
                }

                if (!ContentHome.info.data.content.isAnalyticsRegistered) {
                    registerDefaultAnalytics().then(() => {
                        ContentHome.info.data.content.isAnalyticsRegistered = true;
                        updateData(ContentHome.info);
                    }).catch((err) => {
                        console.error(err);
                    });
                }
                function registerDefaultAnalytics() {
                    return new Promise((resolve, reject) => {
                        const events = [
                            {
                                title: "All Media Types Count",
                                key: "allMediaTypes_count",
                                description: "All Media Types Count",
                            },
                            {
                                title: "All Media Types Continues Count",
                                key: "allMediaTypes_continuesCount",
                                description: "All Media Types Continues Count",
                            },
                            {
                                title: "All Articles Open Count",
                                key: "allArticles_count",
                                description: "All Articles Open Count",
                            },
                            {
                                title: "All Articles Continues Open Count",
                                key: "allArticles_continuesCount",
                                description: "All Articles Continues Open Count",
                            },
                            {
                                title: "All Audio Play Count",
                                key: "allAudios_count",
                                description: "All Audio Play Count",
                            },
                            {
                                title: "All Audio Continues Play Count",
                                key: "allAudios_continuesCount",
                                description: "All Audio Continues Play Count",
                            },
                            {
                                title: "All Video Play Count",
                                key: "allVideos_count",
                                description: "All Video Play Count",
                            },
                            {
                                title: "All Video Continues Play Count",
                                key: "allVideos_continuesCount",
                                description: "All Video Continues Play Count",
                            },
                        ]
                        Analytics.bulkRegisterEvents(events, { silentNotification: true }).then(() => {
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    });
                }

                function saveDataWithDelay(_info) {
                    console.log("saving data");
                    if (tmrDelayForMedia) {
                        clearTimeout(tmrDelayForMedia);
                    }
                    if (!isUnchanged(_info)) {
                        tmrDelayForMedia = setTimeout(function () {
                            updateData(_info);
                        }, 1000);
                    }
                }

                ContentHome.toggleHomeView = (view = 'media') => {
                    if (view === 'media') {
                        $rootScope.activeTab = 'content-media-tab';
                    } else if (view === 'category') {
                        $rootScope.activeTab = 'content-category-tab';
                    }
                }
                
                $scope.$watch(function () {
                    return ContentHome.info;
                }, saveDataWithDelay, true);
            }]);
})(window.angular);
