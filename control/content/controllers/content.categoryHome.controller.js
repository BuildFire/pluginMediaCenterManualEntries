(function (angular) {
    'use strict';
    angular
        .module('mediaCenterContent')
        .controller('ContentCategoryHomeCtrl', ['$scope', 'CategoryHomeInfo', 'Location', 'Modals', 'SearchEngine', 'DB', '$timeout', 'COLLECTIONS', 'CategoryOrders', 'SubcategoryOrders', 'Orders', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Buildfire', '$csv',
            function ($scope, CategoryHomeInfo, Location, Modals, SearchEngine, DB, $timeout, COLLECTIONS, CategoryOrders, SubcategoryOrders, Orders, AppConfig, Messaging, EVENTS, PATHS, Buildfire, $csv) {
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
                            sortBy: Orders.ordersMap.Newest,
                            sortCategoriesBy: CategoryOrders.ordersMap.Newest,
                            rankOfLastItem: 0,
                            rankOfLastCategory: 0,
                            allowShare: true,
                            allowAddingNotes: true,
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
                    subcategories: 'Subcategories',
                };
                var headerRow = ["icon", "name", "subcategories"];
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
                                searchOptions.sort = { titleIndex: 1 }
                            }
                            if (order.name == "Category Title Z-A") {
                                searchOptions.sort = { titleIndex: -1 }
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
                    if (ContentCategoryHome.isBusy && !ContentCategoryHome.noMore) {
                        return;
                    }
                    updateSearchOptions();
                    ContentCategoryHome.isBusy = true;
                    CategoryContent.find(searchOptions).then(function success(result) {

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
                            ContentCategoryHome.items = [];
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
                };
                ContentCategoryHome.itemSortableOptions = {
                    handle: '> .cursor-grab',
                    disabled: !(ContentCategoryHome.info.data.content.sortCategoriesBy === CategoryOrders.ordersMap.Manually),
                    stop: function (e, ui) {
                        var endIndex = ui.item.sortable.dropindex,
                            maxRank = 0,
                            draggedItem = ContentCategoryHome.items[endIndex];
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
                                        if (ContentCategoryHome.data.content.rankOfLastCategory < maxRank) {
                                            ContentCategoryHome.data.content.rankOfLastCategory = maxRank;
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
                        subcategories: [],
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
                                    delete value.data.createdBy;
                                    delete value.data.createdOn;
                                    delete value.data.deletedBy;
                                    delete value.data.deletedOn;
                                    delete value.data.id;
                                    delete value.data.lastSubcategoryId;
                                    delete value.data.lastUpdatedBy;
                                    delete value.data.lastUpdatedOn;
                                    delete value.data.rankOfLastSubcategory;
                                    delete value.data.rankOfLastCategory;
                                    delete value.data.sortBy;
                                    delete value.data.rank;
                                    delete value.data.sortByValue;
                                    delete value.data.titleIndex;
                                    if (value.data.subcategories && value.data.subcategories.length) {
                                        value.data.subcategories = value.data.subcategories.map(function (subcategory) {
                                            return subcategory.name;
                                        });
                                        value.data.subcategories = value.data.subcategories.join(",");
                                    }
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
                    return item.name;
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

                            var rank = ContentCategoryHome.info.data.content.rankOfLastCategory || 0;
                            for (var index = 0; index < rows.length; index++) {
                                rank += 10;
                                rows[index].createdOn = new Date().getTime();
                                let subcategories = [];
                                if (rows[index].subcategories && rows[index].subcategories.length) {
                                    rows[index].subcategories.split(",");
                                    let subRank = 0;
                                    subcategories = subcategories.map(function (subcategory, subcategoryIndex) {
                                        subRank += 10;
                                        return {
                                            name: subcategory,
                                            rank: subRank,
                                            createdOn: new Date().getTime(),
                                            lastUpdatedOn: "",
                                            lastUpdatedBy: "",
                                            deletedOn: "",
                                            deletedBy: "",
                                        }
                                    });
                                }
                                rows[index].lastSubcategoryId = subcategories.length ? subcategories.length : 0;
                                rows[index].rankOfLastSubcategory = subcategories.length ? subcategories[subcategories.length - 1].rank : 0;
                                rows[index].rank = rank;
                                rows[index].subcategories = subcategories;
                                rows[index].titleIndex = rows[index].name.toLowerCase();
                                rows[index].createdBy = "";
                                rows[index].lastUpdatedBy = "";
                                rows[index].deletedBy = "";
                                rows[index].deletedOn = "";
                                rows[index].lastUpdatedOn = "";
                                rows[index].sortBy = SubcategoryOrders.ordersMap.Newest;

                            }
                            if (validateCsv(rows)) {
                                CategoryContent.insert(rows).then(function (data) {
                                    ContentCategoryHome.loading = false;
                                    ContentCategoryHome.isBusy = false;
                                    ContentCategoryHome.items = [];
                                    ContentCategoryHome.info.data.content.rankOfLastCategory = rank;
                                    ContentCategoryHome.items = [];
                                    searchOptions.skip = 0
                                    ContentCategoryHome.getMore();
                                    ContentCategoryHome.updateSubcategories();
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
                 * ContentCategoryHome.updateSubcategories() used to give bulk inserted categories' subcategories ids
                 */
                ContentCategoryHome.updateSubcategories = function () {
                    var records = [];
                    var page = 0;

                    var get = function () {
                        CategoryContent.find({ filter: {}, pageSize: 50, page: page, recordCount: true })
                            .then(function (data) {
                                records = records.concat(data.result);
                                if (records.length < data.totalRecord) {
                                    page++;
                                    get();
                                } else {
                                    records.forEach(function (record) {
                                        if (!record.data.id) {
                                            record.data.id = record.id;
                                            if (record.data.subcategories && record.data.subcategories.length) {
                                                record.data.subcategories.map((subcategory, index) => {
                                                    subcategory.categoryId = record.id;
                                                    subcategory.id = record.id + "_" + index;
                                                });
                                            }
                                            CategoryContent.update(record.id, record.data);
                                        }
                                    });
                                }

                            });
                    }
                    get();
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
                    searchOptions.filter = { "$json.name": { "$regex": value, $options: "i", } };
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

                ContentCategoryHome.isIcon = function (icon) {
                    if (icon) {
                        return icon.indexOf("http") != 0;
                    }
                };

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
