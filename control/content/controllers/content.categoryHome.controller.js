(function (angular) {
    'use strict';
    angular
        .module('mediaCenterContent')
        .controller('ContentCategoryHomeCtrl', ['$scope', 'CategoryHomeInfo', 'Location', 'Modals', 'SearchEngine', 'DB', '$timeout', 'COLLECTIONS', 'CategoryOrders', 'Orders', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Buildfire', '$csv',
            function ($scope, CategoryHomeInfo, Location, Modals, SearchEngine, DB, $timeout, COLLECTIONS, CategoryOrders, Orders, AppConfig, Messaging, EVENTS, PATHS, Buildfire, $csv) {
                /**
                 * Breadcrumbs  related implementation
                 */
                //Buildfire.history.pop();

                //scroll current view to top when loaded.
                Buildfire.navigation.scrollTop();
                var ContentCategoryHome = this;

                var _infoData = {
                    data: {
                        content: {
                            images: [],
                            descriptionHTML: '',
                            description: '',
                            sortCategoriesBy: Orders.ordersMap.Newest,
                            sortCategoriesBy:CategoryOrders.ordersMap.Newest,
                            rankOfLastItem: 0,
                            rankOfLastCategory:0,
                            allowShare: true,
                            allowSource: true,
                            allowOfflineDownload: false,
                            enableFiltering: false,
                            transferAudioContentToPlayList: false,
                            forceAutoPlay: false,
                            dateIndexed: true,
                            dateCreatedIndexed: true
                        },
                        design: {
                            listLayout: "list-1",
                            itemLayout: "item-1",
                            backgroundImage: "",
                            skipMediaPage: false
                        }
                    }
                };

                var CategoryContent = new DB(COLLECTIONS.CategoryContent);
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);

                if (CategoryHomeInfo) {
                    updateMasterInfo(CategoryHomeInfo);
                    console.log("info ", CategoryHomeInfo.data);
                    ContentCategoryHome.info = CategoryHomeInfo;
                }
                else {
                    CategoryHomeInfo = _infoData;
                    updateMasterInfo(_infoData);
                    ContentCategoryHome.info = _infoData;
                }
                if (typeof (ContentCategoryHome.info.data.content.sortCategoriesBy) !== 'undefined'
                    && ContentCategoryHome.info.data.content.sortCategoriesBy === 'Most') {
                    ContentCategoryHome.info.data.content.sortCategoriesBy = 'Category Title A-Z';
                    ContentCategoryHome.info.data.content.sortCategoriesByValue = 'Category Title A-Z';
                }
                if (typeof (ContentCategoryHome.info.data.content.sortCategoriesBy) !== 'undefined'
                    && ContentCategoryHome.info.data.content.sortCategoriesBy === 'Least') {
                    ContentCategoryHome.info.data.content.sortCategoriesBy = 'Category Title Z-A';
                    ContentCategoryHome.info.data.content.sortCategoriesByValue = 'Category Title Z-A';
                }


                var header = {
                    icon: 'Icon image',
                    name: 'Name',
                };
                var headerRow = ["icon", "name"];
                var tmrDelayForMedia = null;


                /**
                 * Create instance of CategoryContent, MediaCenter db collection
                 * @type {DB}
                 */

                var _skip = 0,
                    _limit = 10,
                    _maxLimit = 30,
                    searchOptions = {
                        filter: {},
                        skip: _skip,
                        limit: _limit + 1 // the plus one is to check if there are any more
                    };

                ContentCategoryHome.isBusy = false;
                /* tells if data is being fetched*/
                ContentCategoryHome.items = [];
                ContentCategoryHome.sortOptions = CategoryOrders.options;
                

                var updateSearchOptions = function () {
                    var order;
                    if (ContentCategoryHome.info && ContentCategoryHome.info.data && ContentCategoryHome.info.data.content)
                        order = CategoryOrders.getOrder(ContentCategoryHome.info.data.content.sortCategoriesBy || CategoryOrders.ordersMap.Default);
                    if (order) {
                        //Handles Indexing Changes categoryDate/mediaDateIndex
                        if (ContentCategoryHome.info.data.content.dateIndexed && order.key == "categoryDate") {
                            order.key = "mediaDateIndex";
                        } else if (!ContentCategoryHome.info.data.content.dateIndexed && order.key == "categoryDateIndex") {//so it don't couse issues before data is updated
                            order.key = "categoryDate";
                        }
                        //END Handles Indexing Changes categoryDate/mediaDateIndex                        
                        var sort = {};
                        sort[order.key] = order.order;
                        if ((order.name == "Category Title A-Z" || order.name === "Category Title Z-A")) {
                            if (order.name == "Category Title A-Z") {
                                ContentCategoryHome.info.data.content.updatedRecords ? searchOptions.sort = { titleIndex: 1 }
                                    : searchOptions.sort = { title: 1 }
                            }
                            if (order.name == "Category Title Z-A") {
                                ContentCategoryHome.info.data.content.updatedRecords ? searchOptions.sort = { titleIndex: -1 }
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
                 * ContentCategoryHome.noMore tells if all data has been loaded
                 */
                ContentCategoryHome.noMore = false;
                /* Update all */
                ContentCategoryHome.updateRecords = function (name) {
                    ContentCategoryHome.items = [];
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
                        buildfire.datastore.search({ pageSize, page, recordCount: true }, "CategoryContent", function (err, data) {
                            if (data && data.result && data.result.length) {
                                allItems = allItems.concat(data.result);
                                if (data.totalRecord > allItems.length) {
                                    data.result.map(item => {
                                        item.data.titleIndex = item.data.title.toLowerCase();
                                        buildfire.datastore.update(item.id, item.data, "CategoryContent", (err, res) => {
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
                                        buildfire.datastore.update(item.id, item.data, "CategoryContent", (err, res) => {
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
                                    var sortOrder = CategoryOrders.getOrder(name || CategoryOrders.ordersMap.Default);
                                    ContentCategoryHome.info.data.content.sortCategoriesBy = name;
                                    ContentCategoryHome.info.data.content.sortCategoriesByValue = sortOrder.value;
                                    ContentCategoryHome.info.data.content.updatedRecords = true;
                                    updateData(ContentCategoryHome.info)
                                }
                            } else {

                            }
                        })
                    }
                    get();
                }

                if ((ContentCategoryHome.info.data.content.sortCategoriesBy == "Category Title A-Z"
                    || ContentCategoryHome.info.data.content.sortCategoriesBy === "Category Title Z-A")
                    && !ContentCategoryHome.info.data.content.updatedRecords) {
                    ContentCategoryHome.updateRecords(ContentCategoryHome.info.data.content.sortCategoriesBy);
                }

                ContentCategoryHome.goToMediaHome = function () {
                    Location.goToHome();
                };

                ContentCategoryHome.navigateToSettings = function () {
                    Buildfire.navigation.navigateToTab(
                        {
                          tabTitle: "Settings",
                        },
                        (err) => {
                          if (err) return console.error(err); // `Content` tab was not found
                      
                          console.log("NAVIGATION FINISHED");
                        }
                      );
                }

                /**
                 * ContentCategoryHome.getMore is used to load the items
                 */


                ContentCategoryHome.getMore = function () {
                    console.log("getting more");
                    if (ContentCategoryHome.isBusy && !ContentCategoryHome.noMore) {
                        return;
                    }
                    updateSearchOptions();
                    ContentCategoryHome.isBusy = true;
                    CategoryContent.find(searchOptions).then(function success(result) {
                        if (!result.length) {
                            ContentCategoryHome.info.data.content.updatedRecords = true;
                        }

                        if (result.length <= _limit) {// to indicate there are more
                            ContentCategoryHome.noMore = true;
                        }
                        else {
                            result.pop();
                            searchOptions.skip = searchOptions.skip + _limit;
                            ContentCategoryHome.noMore = false;
                        }

                        ContentCategoryHome.items = ContentCategoryHome.items ? ContentCategoryHome.items.concat(result) : result;
                        ContentCategoryHome.isBusy = false;
                    }, function fail() {
                        ContentCategoryHome.isBusy = false;
                    });
                };

                ContentCategoryHome.getMore();

                /**
                 * ContentCategoryHome.toggleSortOrder() to change the sort by
                 */
                ContentCategoryHome.toggleSortOrder = function (name) {
                    if (!name) {
                        console.info('There was a problem sorting your data');
                    } else {
                        var sortOrder = CategoryOrders.getOrder(name || CategoryOrders.ordersMap.Default);

                        if ((name === "Category Title A-Z" || name === "Category Title Z-A")
                            && !ContentCategoryHome.info.data.content.updatedRecords) {
                            ContentCategoryHome.info.data.content.sortCategoriesBy = name;
                            ContentCategoryHome.info.data.content.sortCategoriesByValue = sortOrder.value;
                            ContentCategoryHome.isBusy = false;

                            ContentCategoryHome.updateRecords(name);
                        } else {
                            ContentCategoryHome.items = [];
                            console.log(name)
                            /* reset Search options */
                            ContentCategoryHome.noMore = false;
                            searchOptions.skip = 0;
                            /* Reset skip to ensure search begins from scratch*/

                            ContentCategoryHome.isBusy = false;


                            ContentCategoryHome.info.data.content.sortCategoriesBy = name;
                            ContentCategoryHome.info.data.content.sortCategoriesByValue = sortOrder.value;
                            ContentCategoryHome.getMore();
                            ContentCategoryHome.itemSortableOptions.disabled = !(ContentCategoryHome.info.data.content.sortCategoriesBy === CategoryOrders.ordersMap.Manually);
                        }

                    }
                };
                ContentCategoryHome.itemSortableOptions = {
                    handle: '> .cursor-grab',
                    disabled: !(ContentCategoryHome.info.data.content.sortCategoriesBy === CategoryOrders.ordersMap.Manually),
                    stop: function (e, ui) {
                        var endIndex = ui.item.sortable.dropindex,
                            maxRank = 0,
                            draggedItem = ContentCategoryHome.items[endIndex];
                        //console.log(ui.item.sortable.dropindex)
                        if (draggedItem) {
                            var prev = ContentCategoryHome.items[endIndex - 1],
                                next = ContentCategoryHome.items[endIndex + 1];
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
                                CategoryContent.update(draggedItem.id, draggedItem.data, function (err) {
                                    if (err) {
                                        console.error('Error during updating rank');
                                    } else {
                                        if (ContentCategoryHome.data.content.rankOfLastItem < maxRank) {
                                            ContentCategoryHome.data.content.rankOfLastItem = maxRank;
                                        }
                                    }
                                });
                            }
                        }
                    }
                };

                /**
                 * ContentCategoryHome.getTemplate() used to download csv template
                 */
                ContentCategoryHome.getTemplate = function () {
                    var templateData = [{
                        icon: '',
                        name: '',
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
                    CategoryContent.find(searchOption).then(function (result) {
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
                 * ContentCategoryHome.exportCSV() used to export people list data to CSV
                 */
                ContentCategoryHome.exportCSV = function () {
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
                                    delete value.data.mediaDateIndex;
                                    persons.push(value.data);
                                });
                                var csv = $csv.jsonToCsv(angular.toJson(persons), {
                                    header: header
                                });
                                $csv.download(csv, "Export.csv");
                            }
                            else {
                                ContentCategoryHome.getTemplate();
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
                ContentCategoryHome.openImportCSVDialog = function () {
                    $csv.import(headerRow).then(function (rows) {
                        ContentCategoryHome.loading = true;
                        if (rows && rows.length > 1) {

                            var columns = rows.shift();

                            for (var _index = 0; _index < headerRow.length; _index++) {
                                if (header[headerRow[_index]] != columns[headerRow[_index]]) {
                                    ContentCategoryHome.loading = false;
                                    ContentCategoryHome.csvDataInvalid = true;
                                    /* $timeout(function hideCsvDataError() {
                                     ContentCategoryHome.csvDataInvalid = false;
                                     }, 2000);*/
                                    break;
                                }
                            }

                            if (!ContentCategoryHome.loading)
                                return;

                            var rank = ContentCategoryHome.info.data.content.rankOfLastItem || 0;
                            for (var index = 0; index < rows.length; index++) {
                                rank += 10;
                                rows[index].dateCreated = new Date().getTime();
                                rows[index].links = [];
                                rows[index].rank = rank;
                                rows[index].body = rows[index].bodyHTML;
                                rows[index].titleIndex = rows[index].title ? rows[index].titleIndex = rows[index].title.toLowerCase() : '';
                                //MEDIA DATE INDEX
                                var setMediaDateIndex = new Date().getTime();
                                if (rows[index].mediaDateIndex) {
                                    setMediaDateIndex = rows[index].mediaDateIndex;
                                } else if (rows[index].categoryDate) {
                                    setMediaDateIndex = new Date(rows[index].categoryDate).getTime();
                                } else if (rows[index].dateCreated) {
                                    setMediaDateIndex = new Date(rows[index].dateCreated).getTime();
                                }
                                rows[index].mediaDateIndex = setMediaDateIndex;
                                //MEDIA DATE INDEX
                            }
                            if (validateCsv(rows)) {
                                CategoryContent.insert(rows).then(function (data) {
                                    ContentCategoryHome.loading = false;
                                    ContentCategoryHome.isBusy = false;
                                    ContentCategoryHome.items = [];
                                    ContentCategoryHome.info.data.content.rankOfLastItem = rank;
                                    ContentCategoryHome.getMore();
                                    ContentCategoryHome.setDeeplinks();
                                }, function errorHandler(error) {
                                    console.error(error);
                                    ContentCategoryHome.loading = false;
                                    $scope.$apply();
                                });
                            } else {
                                ContentCategoryHome.loading = false;
                                ContentCategoryHome.csvDataInvalid = true;
                                $timeout(function hideCsvDataError() {
                                    ContentCategoryHome.csvDataInvalid = false;
                                }, 2000);
                            }
                        }
                        else {
                            ContentCategoryHome.loading = false;
                            ContentCategoryHome.csvDataInvalid = true;
                            /*
                             $timeout(function hideCsvDataError() {
                             ContentCategoryHome.csvDataInvalid = false;
                             }, 2000);*/
                            $scope.$apply();
                        }
                    }, function (error) {
                        ContentCategoryHome.loading = false;
                        $scope.$apply();
                        //do something on cancel
                    });
                };


                /**
                 * ContentCategoryHome.searchListItem() used to search items list
                 * @param value to be search.
                 */
                ContentCategoryHome.searchListItem = function (value) {
                    searchOptions.skip = 0;
                    /*reset the skip value*/

                    ContentCategoryHome.isBusy = false;
                    ContentCategoryHome.items = [];
                    value = value.trim();
                    if (!value) {
                        value = '/*';
                    }
                    searchOptions.filter = { "$json.title": { "$regex": value, $options: "-i", } };
                    ContentCategoryHome.getMore();
                };

                ContentCategoryHome.onEnterKey = (keyEvent) => {
                    if (keyEvent.which === 13) ContentCategoryHome.searchListItem($scope.search);
                }

                /**
                 * ContentCategoryHome.removeListItem() used to delete an item from item list
                 * @param _index tells the index of item to be deleted.
                 */
                ContentCategoryHome.removeListItem = function (index, $event) {
                    if ("undefined" == typeof index) {
                        return;
                    }
                    var item = ContentCategoryHome.items[index];
                    if ("undefined" !== typeof item) {
                        Buildfire.dialog.confirm(
                            {
                                title: "Delete Item",
                                message: 'Are you sure you want to delete this item?',
                                confirmButton: {
                                    type: "danger",
                                    text: "Delete"
                                }
                            },
                            (err, isConfirmed) => {
                                if (isConfirmed) {
                                    CategoryContent.delete(item.id).then(function (data) {
                                        console.log("Item deleted");
                                        ContentCategoryHome.items.splice(index, 1);
                                    }, function (err) {
                                        console.error('Error while deleting an item-----', err);
                                    });
                                }
                            }
                        );
                    }
                };


                ContentCategoryHome.goTo = function (id) {
                    console.log(id);
                    Location.go('#category/' + id);
                };

                updateSearchOptions();

                function updateMasterInfo(info) {
                    ContentCategoryHome.masterInfo = angular.copy(info);
                }

                function resetInfo() {
                    //ContentCategoryHome.info = angular.copy(ContentCategoryHome.masterInfo);
                }

                function isUnchanged(info) {
                    return angular.equals(info, ContentCategoryHome.masterInfo);
                }


                //TODO :- Need to check this function
                function updateData(_info) {
                    if (!_info.id) {
                        MediaCenter.save(_info.data).then(function (data) {
                            MediaCenter.get().then(function (getData) {
                                /* ContentCategoryHome.masterInfo = angular.copy(_info);
                                 _info.id = getData.id;
                                 AppConfig.setSettings(_info.data);*/
                                updateMasterInfo(data);
                            }, function (err) {
                                console.error(err);
                            });
                        }, function (err) {
                            console.error('Error-------', err);
                        });
                    } else {
                        MediaCenter.update(_info.id, _info.data).then(function (data) {
                            updateMasterInfo(data);
                        }, function (err) {
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

                ContentCategoryHome.goToCategories = function () {
                    Location.go('#category/');
                };

                ContentCategoryHome.goToCategory = function (id) {
                    Location.go('#category/' + id);
                };

                //var initInfo = true;
                $scope.$watch(function () {
                    return ContentCategoryHome.info;
                }, saveDataWithDelay, true);

                // Messaging.sendMessageToWidget({
                //     name: EVENTS.ROUTE_CHANGE,
                //     message: {
                //         path: PATHS.HOME
                //     }
                // });
            }]);
})(window.angular);
