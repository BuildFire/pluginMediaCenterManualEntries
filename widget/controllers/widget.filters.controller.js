/**
 * Create self executing function to avoid global scope creation
 */
(function (angular, tinymce) {
    'use strict';
    angular
        .module('mediaCenterWidget')
        /**
         * Inject dependency
         */
        .controller('WidgetFiltersCtrl', ['$scope', 'DB', 'COLLECTIONS', '$rootScope', 'Location', 'Messaging', 'EVENTS', 'PATHS', 'OFSTORAGE', 'CategoryOrders', 'Buildfire',
            function ($scope, DB, COLLECTIONS, $rootScope, Location, Messaging, EVENTS, PATHS, OFSTORAGE, CategoryOrders, Buildfire) {
                /**
                 * Using Control as syntax this
                 */
                var WidgetFilters = this;

                var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                var CategoryContent = new DB(COLLECTIONS.CategoryContent);
                var CachedMediaCenter = new OFSTORAGE({
                    path: "/data/mediaCenterManual",
                    fileName: "cachedMediaCenter"
                });

                /**
                 * Get the MediaCenter initialized settings
                 */

                function init() {
                    WidgetFilters.isBusy = true;
                    WidgetFilters.filtersApplyButtonString = getString('filtersScreen.applyButton');
                    if ($rootScope.online) {
                        MediaCenter.get().then(function (data) {
                            WidgetFilters.media = {
                                data: data.data
                            };
                            WidgetFilters.isBusy = false;
                            WidgetFilters.getMore();
                        }, function (err) {
                            WidgetFilters.media = {
                                data: {}
                            };
                            WidgetFilters.isBusy = false;
                            WidgetFilters.getMore();
                        });
                    }

                    else {
                        var _infoData = {
                            data: {
                                content: {
                                    images: [],
                                    descriptionHTML: '<p>&nbsp;<br></p>',
                                    description: '',
                                    sortBy: 'Newest',
                                    rankOfLastItem: 0,
                                    allowShare: true,
                                    allowFavorites: true,
                                    allowAddingNotes: true,
                                    allowSource: true,
                                    allowOfflineDownload: false,
                                    forceAutoPlay: false,
                                    autoPlay: false,
                                    autoPlayDelay: { label: "Off", value: 0 },
                                    globalPlaylist: false,
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

                        CachedMediaCenter.get((err, res) => {
                            if (err) WidgetMedia.media = _infoData;
                            else {
                                WidgetMedia.media = res
                            }
                            WidgetFilters.isBusy = false;
                            WidgetFilters.getMore();
                            setTimeout(() => {
                                if (!$scope.$$phase) $scope.$apply();
                            }, 0);
                        });

                    }

                    WidgetFilters.pickedCategories = $rootScope.activeFilters || {};
                };

                init();

                WidgetFilters.saving = false;

                var _skip = 0,
                    _limit = 30,
                    searchOptions = {
                        filter: {},
                        skip: _skip,
                        limit: _limit + 1, // the plus one is to check if there are any more
                    };

                WidgetFilters.getMore = function () {
                    if (WidgetFilters.isBusy || WidgetFilters.noMore) {
                        return;
                    }
                    WidgetFilters.isBusy = true;
                    WidgetFilters.updateSearchOptions();
                    if (!searchOptions.sort.rank) {
                        searchOptions.sort.rank = 1;
                    }
                    CategoryContent.find(searchOptions).then(function success(result) {
                        if (result.length <= _limit) {// to indicate there are more
                            WidgetFilters.noMore = true;
                        }
                        else {
                            result.pop();
                            searchOptions.skip = searchOptions.skip + _limit;
                            WidgetFilters.noMore = false;
                        }

                        WidgetFilters.allCategories = WidgetFilters.allCategories ? WidgetFilters.allCategories.concat(result) : result;
                        if (!WidgetFilters.allCategories.length) {
                            angular.element('#filterEmptyContainer').css('display', 'block');
                        } else {
                            angular.element('#filterEmptyContainer').css('display', 'none');
                        }
                        if (!$scope.$$phase) $scope.$apply();
                        WidgetFilters.isBusy = false;
                    }, function fail() {
                        WidgetFilters.isBusy = false;
                    });
                };

                WidgetFilters.updateSearchOptions = function () {
                    var order;
                    if (WidgetFilters.media && WidgetFilters.media.data && WidgetFilters.media.data.content)
                        order = CategoryOrders.getOrder(WidgetFilters.media.data.content.sortCategoriesBy || CategoryOrders.ordersMap.Default);
                    if (order) {
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


                WidgetFilters.isIcon = function (icon) {
                    if (icon) {
                        return icon.indexOf("http") != 0;
                    }
                };

                WidgetFilters.pickCategory = function (category) {
                    if (Object.keys(WidgetFilters.pickedCategories) && Object.keys(WidgetFilters.pickedCategories).length > 0 && WidgetFilters.pickedCategories[category.id]) {
                        delete WidgetFilters.pickedCategories[category.id];
                        return;
                    }

                    WidgetFilters.pickedCategories[category.id] = [];
                    if (category.data && category.data.subcategories && category.data.subcategories.length) {
                        category.data.subcategories.forEach(function (subcategory) {
                            WidgetFilters.pickedCategories[category.id].push(subcategory.id);
                        });
                    }

                }

                WidgetFilters.pickSubcategory = function (categoryId, subcategoryId) {
                    if (Object.keys(WidgetFilters.pickedCategories) && Object.keys(WidgetFilters.pickedCategories).length > 0 && WidgetFilters.pickedCategories[categoryId]) {
                        if (WidgetFilters.pickedCategories[categoryId].indexOf(subcategoryId) == -1) {
                            WidgetFilters.pickedCategories[categoryId].push(subcategoryId);
                        }
                        else {
                            WidgetFilters.pickedCategories[categoryId].splice(WidgetFilters.pickedCategories[categoryId].indexOf(subcategoryId), 1);
                            if(WidgetFilters.pickedCategories[categoryId].length == 0){
                                delete WidgetFilters.pickedCategories[categoryId];
                            }
                        }
                    }
                    else {
                        WidgetFilters.pickedCategories[categoryId] = [subcategoryId];
                    }
                };

                WidgetFilters.expand = function ($index) {
                    let subCont = document.getElementById("subcat-" + $index);
                    let chev = document.getElementsByClassName("chevron")[$index];
                    if (subCont) {
                        if (chev.classList) {
                            chev.classList.toggle('bottom');
                            if (chev.classList.contains('bottom')) {
                                chev.setAttribute('aria-label', `Collapse ${WidgetFilters.allCategories[$index].data.name} category`);
                            } else {
                                chev.setAttribute('aria-label', `Expand ${WidgetFilters.allCategories[$index].data.name} category`);
                            }
                        }
                        if (subCont.classList && subCont.classList.contains("expand")) {
                            subCont.classList.remove("expand");
                        }
                        else {
                            subCont.classList.add("expand");
                        }
                    }
                }

                WidgetFilters.getCategoryIconState = function (category) {
                    if (Object.keys(WidgetFilters.pickedCategories) && Object.keys(WidgetFilters.pickedCategories).length > 0 && Object.keys(WidgetFilters.pickedCategories).includes(category.id)) {
                        let subCats = WidgetFilters.pickedCategories[category.id] || [];
                        if (subCats.length > 0 && subCats.length < category.data.subcategories.length) {
                            return "minus";
                        }
                        else {
                            return "check";
                        }
                    }
                    else {
                        return "";
                    }
                };

                WidgetFilters.isSubcategoryPicked = function (categoryId, subcategoryId) {
                    if (Object.keys(WidgetFilters.pickedCategories) && Object.keys(WidgetFilters.pickedCategories).length > 0 && Object.keys(WidgetFilters.pickedCategories).includes(categoryId)) {
                        let subCats = WidgetFilters.pickedCategories[categoryId] || [];
                        if (subCats.length > 0 && subCats.indexOf(subcategoryId) != -1) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    }
                    else {
                        return false;
                    }
                };

                WidgetFilters.isCategoryPicked = function (categoryId) {
                    return WidgetFilters.pickedCategories[categoryId];
                };

                WidgetFilters.applyFilters = function () {
                    $rootScope.activeFilters = WidgetFilters.pickedCategories;
                    $rootScope.$emit('activeFiltersChanged');
                    buildfire.history.pop();
                    if ($("#feedView").hasClass('notshowing')) {
                        window.setTimeout(() => {
                            $("#showFeedBtn").click();
                        }, 0);

                    }
                };

                WidgetFilters.applyUpdates = function () {
                    if (!$rootScope.enableFiltering) {
                        Location.goToHome();
                        return;
                    }
                    else {
                        WidgetFilters.getMore();
                    }
                }

                Messaging.onReceivedMessage = (event) => {
                    if (event.message && event.message.path == 'MEDIA') {
						Location.go('#/media/' + event.message.id, true);
					} else if (event.message && event.message.path == 'HOME') {
                        Location.goToHome();
                    } else if (event.name === EVENTS.CATEGORIES_CHANGE) {
                        WidgetFilters.pickedCategories = {};
                        WidgetFilters.allCategories = [];
                        WidgetFilters.skip = 0;
                        WidgetFilters.noMore = false;
                        WidgetFilters.applyUpdates();
                    } else if (!$rootScope.enableFiltering) {
                        return Location.goToHome();
                    }
                };

                WidgetFilters.hasFilters = function () {
                    if (WidgetFilters.allCategories && WidgetFilters.allCategories.length > 0) {
                        return true;
                    }
                    else {
                        return false;
                    }
                };
            }]);
})(window.angular, window.tinymce);
