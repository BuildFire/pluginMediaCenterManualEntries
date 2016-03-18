(function (angular) {
    'use strict';
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', 'MediaCenterInfo', 'Modals', 'DB', '$timeout', 'COLLECTIONS', 'Orders', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Buildfire', '$csv',
            function ($scope, MediaCenterInfo, Modals, DB, $timeout, COLLECTIONS, Orders, AppConfig, Messaging, EVENTS, PATHS, Buildfire, $csv) {
                /**
                 * Breadcrumbs  related implementation
                 */
                Buildfire.history.pop();

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
                            rankOfLastItem: 0
                        },
                        design: {
                            listLayout: "list-1",
                            itemLayout: "item-1",
                            backgroundImage: ""
                        }
                    }
                };

                if (MediaCenterInfo) {
                    updateMasterInfo(MediaCenterInfo);
                    ContentHome.info = MediaCenterInfo;
                }
                else {
                    MediaCenterInfo = _infoData;
                    updateMasterInfo(_infoData);
                    ContentHome.info = _infoData;
                }

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
                var MediaContent = new DB(COLLECTIONS.MediaContent);
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);

                var _skip = 0,
                    _limit = 10,
                    _maxLimit = 19,
                    searchOptions = {
                        filter: {"$json.title": {"$regex": '/*'}},
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
                    var temp = ContentHome.info.data.content.images[oldIndex];
                    ContentHome.info.data.content.images[oldIndex] = ContentHome.info.data.content.images[newIndex];
                    ContentHome.info.data.content.images[newIndex] = temp;
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
                        searchOptions.sort = sort;
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
                        ContentHome.items = [];

                        /* reset Search options */
                        ContentHome.noMore = false;
                        searchOptions.skip = 0;
                        /* Reset skip to ensure search begins from scratch*/

                        ContentHome.isBusy = false;
                        var sortOrder = Orders.getOrder(name || Orders.ordersMap.Default);
                        ContentHome.info.data.content.sortBy = name;
                        ContentHome.info.data.content.sortByValue = sortOrder.value;
                        ContentHome.getMore();
                        ContentHome.itemSortableOptions.disabled = !(ContentHome.info.data.content.sortBy === Orders.ordersMap.Manually);
                    }
                };
                ContentHome.itemSortableOptions = {
                    handle: '> .cursor-grab',
                    disabled: !(ContentHome.info.data.content.sortBy === Orders.ordersMap.Manually),
                    stop: function (e, ui) {
                        var endIndex = ui.item.sortable.dropindex,
                            maxRank = 0,
                            draggedItem = ContentHome.items[endIndex];
                        console.log(ui.item.sortable.dropindex)
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
                                rows[index].dateCreated = +new Date();
                                rows[index].links = [];
                                rows[index].rank = rank;
                                rows[index].body = "";
                            }
                            if (validateCsv(rows)) {
                                MediaContent.insert(rows).then(function (data) {
                                    ContentHome.loading = false;
                                    ContentHome.isBusy = false;
                                    ContentHome.items = [];
                                    ContentHome.info.data.content.rankOfLastItem = rank;
                                    ContentHome.getMore();
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
                        $scope.apply();
                        //do something on cancel
                    });
                };

                /**
                 * ContentHome.searchListItem() used to search items list
                 * @param value to be search.
                 */
                ContentHome.searchListItem = function (value) {
                    var title = '';

                    searchOptions.skip = 0;
                    /*reset the skip value*/

                    ContentHome.isBusy = false;
                    ContentHome.items = [];
                    value = value.trim();
                    if (!value) {
                        value = '/*';
                    }
                    searchOptions.filter = {"$json.title": {"$regex": value}};
                    ContentHome.getMore();
                };

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
                        Modals.removePopupModal({title: ''}).then(function (result) {
                            if (result) {
                                MediaContent.delete(item.id).then(function (data) {
                                    ContentHome.items.splice(index, 1);
                                }, function (err) {
                                    console.error('Error while deleting an item-----', err);
                                });
                            }
                            else {
                                console.info('Unable to load data.');
                            }
                        }, function (cancelData) {
                            //do something on cancel
                        });
                        $timeout(function () {
                            var top = $($event.currentTarget).offset().top;
                            if (top > 100)
                                top -= 100;
                            $('.modal-dialog.modal-sm').offset({top: top, left: 0});
                        }, 500);

                    }
                };


                updateSearchOptions();
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

                Messaging.sendMessageToWidget({
                    name: EVENTS.ROUTE_CHANGE,
                    message: {
                        path: PATHS.HOME
                    }
                });
            }]);
})(window.angular, undefined);
