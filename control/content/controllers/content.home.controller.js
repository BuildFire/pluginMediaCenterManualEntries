(function (angular) {
    'use strict';
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', 'MediaCenterInfo', 'Location', 'Modals', 'SearchEngine', 'DB', '$timeout', 'COLLECTIONS', 'Orders', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Buildfire', '$csv',
            function ($scope, MediaCenterInfo, Location, Modals, SearchEngine, DB, $timeout, COLLECTIONS, Orders, AppConfig, Messaging, EVENTS, PATHS, Buildfire, $csv) {
                /**
                 * Breadcrumbs  related implementation
                 */
                //Buildfire.history.pop();

                //scroll current view to top when loaded.
                Buildfire.navigation.scrollTop();
                var ContentHome = this;

                var _infoData = {
                    data: {
                        content: {
                            images: [],
                            descriptionHTML: '',
                            description: '',
                            sortBy: Orders.ordersMap.Newest,
                            rankOfLastItem: 0,
                            allowShare: true,
                            allowSource: true,
                            transferAudioContentToPlayList: false,
                            forceAutoPlay: false
                        },
                        design: {
                            listLayout: "list-1",
                            itemLayout: "item-1",
                            backgroundImage: "",
                            skipMediaPage: false
                        }
                    }
                };
                var MediaContent = new DB(COLLECTIONS.MediaContent);
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                var SearchEngineService = new SearchEngine(COLLECTIONS.MediaContent);


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
                if (typeof (ContentHome.info.data.content.allowSource) == 'undefined')
                    ContentHome.info.data.content.allowSource = true;
                if (typeof (ContentHome.info.data.content.transferAudioContentToPlayList) == 'undefined')
                    ContentHome.info.data.content.transferAudioContentToPlayList = false;
                if (typeof (ContentHome.info.data.content.forceAutoPlay) == 'undefined')
                    ContentHome.info.data.content.forceAutoPlay = false;
                if (typeof (ContentHome.info.data.content.updatedRecords) == 'undefined')
                    ContentHome.info.data.content.updatedRecords = false;
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
                //MediaCenter.save(ContentHome.info.data).then(function (result) {});

                AppConfig.setSettings(MediaCenterInfo.data);
                AppConfig.setAppId(MediaCenterInfo.id);

                var header = {
                    topImage: 'Top image',
                    title: 'Title',
                    summary: 'Summary',
                    bodyHTML: 'Media Content',
                    srcUrl: 'Source URL',
                    audioUrl: 'Audio URL',
                    videoUrl: 'Video URL',
                    image: 'Thumbnail Image URL'
                };
                var headerRow = ["topImage", "title", "summary", "bodyHTML", "srcUrl", "audioUrl", "videoUrl", "image"];
                var tmrDelayForMedia = null;

                /**
                 * Create instance of MediaContent, MediaCenter db collection
                 * @type {DB}
                 */

                var _skip = 0,
                    _limit = 10,
                    _maxLimit = 19,
                    searchOptions = {
                        filter: { "$json.title": { "$regex": '/*' } },
                        skip: _skip,
                        limit: _limit + 1 // the plus one is to check if there are any more
                    };
                //option for wysiwyg
                ContentHome.bodyWYSIWYGOptions = {
                    plugins: 'advlist autolink link image lists charmap print preview',
                    skin: 'lightgray',
                    trusted: true,
                    theme: 'modern'
                };
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

                var updateSearchOptions = function () {
                    var order;
                    if (ContentHome.info && ContentHome.info.data && ContentHome.info.data.content)
                        order = Orders.getOrder(ContentHome.info.data.content.sortBy || Orders.ordersMap.Default);
                    if (order) {
                        var sort = {};
                        sort[order.key] = order.order;
                        if ((order.name == "Media Title A-Z" || order.name === "Media Title Z-A")) {
                            if (order.name == "Media Title A-Z") {
                                ContentHome.info.data.content.updatedRecords ? searchOptions.sort = { titleIndex: 1 }
                                    : searchOptions.sort = { title: 1 }
                            }
                            if (order.name == "Media Title Z-A") {
                                ContentHome.info.data.content.updatedRecords ? searchOptions.sort = { titleIndex: -1 }
                                    : searchOptions.sort = { title: -1 }
                            }
                        } else {
                            searchOptions.sort = sort;
                        }

                        return true;
                    }
                    else {
                        return false;
                    }
                };
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
                            if (data && data.result && data.result.length) {
                                allItems = allItems.concat(data.result);
                                if (data.totalRecord > allItems.length) {
                                    data.result.map(item => {
                                        item.data.titleIndex = item.data.title.toLowerCase();
                                        buildfire.datastore.update(item.id, item.data, "MediaContent", (err, res) => {
                                            console.log(res.data.titleIndex)
                                        })
                                    });
                                    page++;
                                    get();
                                }
                                else {
                                    let count = allItems.length - data.result.length;
                                    data.result.map(item => {
                                        item.data.titleIndex = item.data.title.toLowerCase();
                                        buildfire.datastore.update(item.id, item.data, "MediaContent", (err, res) => {
                                            console.log(res.data.titleIndex)
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
                            } else {

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

                /**
                 * ContentHome.getMore is used to load the items
                 */
                ContentHome.getMore = function () {
                    if (ContentHome.isBusy && !ContentHome.noMore) {
                        return;
                    }
                    updateSearchOptions();
                    ContentHome.isBusy = true;
                    MediaContent.find(searchOptions).then(function success(result) {
                        if (!result.length) {
                            ContentHome.info.data.content.updatedRecords = true;
                        }

                        if (result.length <= _limit) {// to indicate there are more
                            ContentHome.noMore = true;
                        }
                        else {
                            result.pop();
                            searchOptions.skip = searchOptions.skip + _limit;
                            ContentHome.noMore = false;
                        }

                        ContentHome.items = ContentHome.items ? ContentHome.items.concat(result) : result;
                        ContentHome.isBusy = false;
                    }, function fail() {
                        ContentHome.isBusy = false;
                    });
                };

                /**
                 * ContentHome.toggleSortOrder() to change the sort by
                 */
                ContentHome.toggleSortOrder = function (name) {
                    if (!name) {
                        console.info('There was a problem sorting your data');
                    } else {
                        var sortOrder = Orders.getOrder(name || Orders.ordersMap.Default);

                        if ((name === "Media Title A-Z" || name === "Media Title Z-A")
                            && !ContentHome.info.data.content.updatedRecords) {
                            ContentHome.info.data.content.sortBy = name;
                            ContentHome.info.data.content.sortByValue = sortOrder.value;
                            ContentHome.isBusy = false;

                            ContentHome.updateRecords(name);
                        } else {
                            ContentHome.items = [];
                            console.log(name)
                            /* reset Search options */
                            ContentHome.noMore = false;
                            searchOptions.skip = 0;
                            /* Reset skip to ensure search begins from scratch*/

                            ContentHome.isBusy = false;


                            ContentHome.info.data.content.sortBy = name;
                            ContentHome.info.data.content.sortByValue = sortOrder.value;
                            ContentHome.getMore();
                            ContentHome.itemSortableOptions.disabled = !(ContentHome.info.data.content.sortBy === Orders.ordersMap.Manually);
                        }

                    }
                };
                ContentHome.itemSortableOptions = {
                    handle: '> .cursor-grab',
                    disabled: !(ContentHome.info.data.content.sortBy === Orders.ordersMap.Manually),
                    stop: function (e, ui) {
                        var endIndex = ui.item.sortable.dropindex,
                            maxRank = 0,
                            draggedItem = ContentHome.items[endIndex];
                        //console.log(ui.item.sortable.dropindex)
                        if (draggedItem) {
                            var prev = ContentHome.items[endIndex - 1],
                                next = ContentHome.items[endIndex + 1];
                            var isRankChanged = false;
                            if (next) {
                                if (prev) {
                                    draggedItem.data.rank = ((prev.data.rank || 0) + (next.data.rank || 0)) / 2;
                                    isRankChanged = true;
                                } else {
                                    draggedItem.data.rank = (next.data.rank || 0) / 2;
                                    isRankChanged = true;
                                }
                            } else {
                                if (prev) {
                                    draggedItem.data.rank = (((prev.data.rank || 0) * 2) + 10) / 2;
                                    maxRank = draggedItem.data.rank;
                                    isRankChanged = true;
                                }
                            }
                            if (isRankChanged) {
                                MediaContent.update(draggedItem.id, draggedItem.data, function (err) {
                                    if (err) {
                                        console.error('Error during updating rank');
                                    } else {
                                        if (ContentHome.data.content.rankOfLastItem < maxRank) {
                                            ContentHome.data.content.rankOfLastItem = maxRank;
                                        }
                                    }
                                });
                            }
                        }
                    }
                };

                /**
                 * ContentHome.getTemplate() used to download csv template
                 */
                ContentHome.getTemplate = function () {
                    var templateData = [{
                        topImage: '',
                        title: '',
                        summary: '',
                        bodyHTML: '',
                        srcUrl: '',
                        audioUrl: '',
                        videoUrl: '',
                        image: ''
                    }];
                    var csv = $csv.jsonToCsv(angular.toJson(templateData), {
                        header: header
                    });
                    $csv.download(csv, "Template.csv");
                };

                /**
                 * records holds the data to export the data.
                 * @type {Array}
                 */
                var records = [];

                /**
                 * getRecords function get the  all items from DB
                 * @param searchOption
                 * @param records
                 * @param callback
                 */
                function getRecords(searchOption, records, callback) {
                    MediaContent.find(searchOption).then(function (result) {
                        if (result.length <= _maxLimit) {// to indicate there are more
                            records = records.concat(result);
                            return callback(records);
                        }
                        else {
                            result.pop();
                            searchOption.skip = searchOption.skip + _maxLimit;
                            records = records.concat(result);
                            return getRecords(searchOption, records, callback);
                        }
                    }, function (error) {
                        throw (error);
                    });
                }

                /**
                 * ContentHome.exportCSV() used to export people list data to CSV
                 */
                ContentHome.exportCSV = function () {
                    var search = angular.copy(searchOptions);
                    search.skip = 0;
                    search.limit = _maxLimit + 1;
                    getRecords(search,
                        []
                        , function (data) {
                            if (data && data.length) {
                                var persons = [];
                                angular.forEach(angular.copy(data), function (value) {
                                    delete value.data.dateCreated;
                                    delete value.data.links;
                                    delete value.data.rank;
                                    delete value.data.body;
                                    persons.push(value.data);
                                });
                                var csv = $csv.jsonToCsv(angular.toJson(persons), {
                                    header: header
                                });
                                $csv.download(csv, "Export.csv");
                            }
                            else {
                                ContentHome.getTemplate();
                            }
                            records = [];
                        });
                };
                function isValidItem(item, index, array) {
                    return item.title || item.summary;
                }

                function validateCsv(items) {
                    if (!Array.isArray(items) || !items.length) {
                        return false;
                    }
                    return items.every(isValidItem);
                }

                /**
                 * method to open the importCSV Dialog
                 */
                ContentHome.openImportCSVDialog = function () {
                    $csv.import(headerRow).then(function (rows) {
                        ContentHome.loading = true;
                        if (rows && rows.length > 1) {

                            var columns = rows.shift();

                            for (var _index = 0; _index < headerRow.length; _index++) {
                                if (header[headerRow[_index]] != columns[headerRow[_index]]) {
                                    ContentHome.loading = false;
                                    ContentHome.csvDataInvalid = true;
                                    /* $timeout(function hideCsvDataError() {
                                     ContentHome.csvDataInvalid = false;
                                     }, 2000);*/
                                    break;
                                }
                            }

                            if (!ContentHome.loading)
                                return;

                            var rank = ContentHome.info.data.content.rankOfLastItem || 0;
                            for (var index = 0; index < rows.length; index++) {
                                rank += 10;
                                rows[index].dateCreated = new Date();
                                rows[index].links = [];
                                rows[index].rank = rank;
                                rows[index].body = rows[index].bodyHTML;
                                rows[index].titleIndex = rows[index].title ? rows[index].titleIndex = rows[index].title.toLowerCase() : '';
                            }
                            if (validateCsv(rows)) {
                                MediaContent.insert(rows).then(function (data) {
                                    ContentHome.loading = false;
                                    ContentHome.isBusy = false;
                                    ContentHome.items = [];
                                    ContentHome.info.data.content.rankOfLastItem = rank;
                                    ContentHome.getMore();
                                    ContentHome.setDeeplinks();
                                }, function errorHandler(error) {
                                    console.error(error);
                                    ContentHome.loading = false;
                                    $scope.$apply();
                                });
                            } else {
                                ContentHome.loading = false;
                                ContentHome.csvDataInvalid = true;
                                $timeout(function hideCsvDataError() {
                                    ContentHome.csvDataInvalid = false;
                                }, 2000);
                            }
                        }
                        else {
                            ContentHome.loading = false;
                            ContentHome.csvDataInvalid = true;
                            /*
                             $timeout(function hideCsvDataError() {
                             ContentHome.csvDataInvalid = false;
                             }, 2000);*/
                            $scope.$apply();
                        }
                    }, function (error) {
                        ContentHome.loading = false;
                        $scope.$apply();
                        //do something on cancel
                    });
                };


                ContentHome.setDeeplinks = function () {
                    var records = [];
                    var page = 0;

                    var get = function () {
                        MediaContent.find({ filter: {}, pageSize: 50, page: page, recordCount: true })
                            .then(function (data) {
                                records = records.concat(data.result);
                                if (records.length < data.totalRecord) {
                                    page++;
                                    get();
                                } else {
                                    createNewDeeplink(records);
                                    records.forEach(function (record) {
                                        if (!record.data.searchEngineId) {
                                            record.data.deepLinkUrl = Buildfire.deeplink.createLink({ id: record.id });
                                            SearchEngineService.insert(record.data).then(function (data) {
                                                record.data.searchEngineId = data.id;
                                                MediaContent.update(record.id, record.data);
                                            });
                                        }
                                    });
                                }

                            });
                    }
                    get();
                }

                function createNewDeeplink(records) {
                    for (var i = 0; i < records.length; i++) {
                        if (records[i].id && records[i].data.title) {
                            new Deeplink({
                                deeplinkId: records[i].id,
                                name: records[i].data.title,
                                deeplinkData: { id: records[i].id },
                                imageUrl: (records[i].data.topImage) ? records[i].data.topImage : null
                            }).save();
                        }
                    }
                }

                /**
                 * ContentHome.searchListItem() used to search items list
                 * @param value to be search.
                 */
                ContentHome.searchListItem = function (value) {
                    searchOptions.skip = 0;
                    /*reset the skip value*/

                    ContentHome.isBusy = false;
                    ContentHome.items = [];
                    value = value.trim();
                    if (!value) {
                        value = '/*';
                    }
                    searchOptions.filter = { "$json.title": { "$regex": value, $options: "-i",} };
                    ContentHome.getMore();
                };

                ContentHome.onEnterKey = (keyEvent) => {
                    if (keyEvent.which === 13) ContentHome.searchListItem($scope.search);
                }

                /**
                 * ContentHome.removeListItem() used to delete an item from item list
                 * @param _index tells the index of item to be deleted.
                 */
                ContentHome.removeListItem = function (index, $event) {
                    if ("undefined" == typeof index) {
                        return;
                    }
                    var item = ContentHome.items[index];
                    if ("undefined" !== typeof item) {
                        buildfire.dialog.confirm(
                            {
                              title: "Delete Item",
                              message: 'Are you sure you want to delete this item?',
                              isMessageHTML: true,
                              confirmButton: {
                                type: "danger",
                                text: "Delete"
                              }
                            },
                            (err, isConfirmed) => {
                              if (isConfirmed) {
                                if (item.data.searchEngineId) {
                                    SearchEngineService.delete(item.data.searchEngineId);
                                }
                                removeDeeplink(item);
                                MediaContent.delete(item.id).then(function (data) {
                                    ContentHome.items.splice(index, 1);
                                }, function (err) {
                                    console.error('Error while deleting an item-----', err);
                                });
                              }
                            }
                          );
                    }
                };


                ContentHome.goTo = function (id) {
                    console.log(id);
                    Location.go('#media/' + id);
                    Messaging.sendMessageToWidget({
                        name: EVENTS.ROUTE_CHANGE,
                        message: {
                            path: PATHS.MEDIA,
                            id: id || null
                        }
                    });
                };

                updateSearchOptions();

                function removeDeeplink(item) {
                    Deeplink.deleteById(item.id);
                }

                function updateMasterInfo(info) {
                    ContentHome.masterInfo = angular.copy(info);
                }

                function resetInfo() {
                    //ContentHome.info = angular.copy(ContentHome.masterInfo);
                }

                function isUnchanged(info) {
                    return angular.equals(info, ContentHome.masterInfo);
                }

                function updateData(_info) {
                    if (!_info.id) {
                        MediaCenter.save(_info.data).then(function (data) {
                            MediaCenter.get().then(function (getData) {
                                /* ContentHome.masterInfo = angular.copy(_info);
                                 _info.id = getData.id;
                                 AppConfig.setSettings(_info.data);*/
                                updateMasterInfo(data);
                                AppConfig.setSettings(_info.data);
                            }, function (err) {
                                console.error(err);
                            });
                        }, function (err) {
                            resetInfo();
                            console.error('Error-------', err);
                        });
                    } else {
                        MediaCenter.update(_info.id, _info.data).then(function (data) {
                            updateMasterInfo(data);
                            AppConfig.setSettings(_info.data);
                        }, function (err) {
                            resetInfo();
                            console.error('Error-------', err);
                        });
                    }


                }

                function saveDataWithDelay(_info) {
                    if (tmrDelayForMedia) {
                        clearTimeout(tmrDelayForMedia);
                    }
                    if (!isUnchanged(_info)) {
                        tmrDelayForMedia = setTimeout(function () {
                            updateData(_info);
                        }, 1000);
                    }
                }

                //var initInfo = true;
                $scope.$watch(function () {
                    return ContentHome.info;
                }, saveDataWithDelay, true);

                // Messaging.sendMessageToWidget({
                //     name: EVENTS.ROUTE_CHANGE,
                //     message: {
                //         path: PATHS.HOME
                //     }
                // });
            }]);
})(window.angular);
