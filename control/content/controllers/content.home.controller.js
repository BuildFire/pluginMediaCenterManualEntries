'use strict';

(function (angular, window) {
    angular
        .module('mediaCenterContent')
        .controller('ContentHomeCtrl', ['$scope', 'MediaCenterInfo', 'Modals', 'DB', 'COLLECTIONS', 'Orders', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS',
            function ($scope, MediaCenterInfo, Modals, DB, COLLECTIONS, Orders, AppConfig, Messaging, EVENTS, PATHS) {
                var ContentHome = this;
                ContentHome.info = MediaCenterInfo;
                AppConfig.setSettings(MediaCenterInfo.data);
                updateMasterInfo(ContentHome.info);
                var tmrDelayForMedia = null;
                var MediaContent = new DB(COLLECTIONS.MediaContent);
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);
                var _skip = 0,
                    _limit = 10,
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
                ContentHome.items = [];
                ContentHome.sortOptions = Orders.options;
                //on remove button click remove carousel Image
                ContentHome.rmCarouselImage = function (index) {
                    if (typeof index == "undefined") {
                        return;
                    }
                    var image = ContentHome.info.data.content.images[index]
                    if (typeof image == "undefined") {
                        return;
                    }
                    Modals.removePopupModal({title: image.title}).then(function (result) {
                        if (result)
                            ContentHome.info.data.content.images.splice(index, 1);
                        else {
                            console.info('Unable to load data.')
                        }
                    }, function (cancelData) {
                        //do something on cancel
                    });
                }

                var updateSearchOptions = function () {
                    var order = Orders.getOrder(ContentHome.info.data.content.sortBy || Orders.ordersMap.Default);
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
                ContentHome.addUpdateCarouselImage = function (index) {
                    var link = null;
                    if (typeof index != 'undefined') {
                        link = ContentHome.info.data.content.images[index];
                    }
                    Modals.carouselImageModal(link).then(function (link) {
                        if (link) {
                            if (typeof index != 'undefined') {
                                ContentHome.info.data.content.images[index] = link;
                            }
                            else {
                                if (!ContentHome.info.data.content.images)
                                    ContentHome.info.data.content.images = [];
                                ContentHome.info.data.content.images.push(JSON.parse(angular.toJson(link)));
                            }
                        } else {
                            console.info('Unable to load data.')
                        }
                    }, function (err) {
                        //do something on cancel
                    });
                }
                ContentHome.carouselOptions = {
                    handle: '> .cursor-grab'
                };
                ContentHome.noMore = false;
                ContentHome.getMore = function (search) {
                    if (ContentHome.isBusy && !ContentHome.noMore) {
                        return;
                    }
                    ContentHome.isBusy = true;
                    MediaContent.find(searchOptions).then(function success(result) {
                        console.log("#########Data###########", result.length)
                        if (result.length <= _limit) {// to indicate there are more
                            ContentHome.noMore = true;
                        } else {
                            result.pop();
                            searchOptions.skip = searchOptions.skip + _limit;
                            ContentHome.noMore = false;
                        }
                        ContentHome.items = ContentHome.items ? ContentHome.items.concat(result) : result;
                        ContentHome.isBusy = false;
                    }, function fail() {
                        ContentHome.isBusy = false;
                    })
                }

                ContentHome.toggleSortOrder = function (name) {
                    ContentHome.info.data.content.sortBy = name;
                };
                ContentHome.itemSortableOptions = {
                    handle: '> .cursor-grab',
                    disabled: !(ContentHome.info.data.content.sortBy === Orders.ordersMap.Manually),
                    stop: function (e, ui) {
                        var endIndex = ui.item.sortable.dropindex,
                            maxRank = 0,
                            draggedItem = ContentHome.items[endIndex];

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
                                //Buildfire.datastore.update(draggedItem.id, draggedItem.data, TAG_NAMES.PEOPLE, function (err) {
                                //    if (err) {
                                //        console.error('Error during updating rank');
                                //    } else {
                                //        if (ContentHome.data.content.rankOfLastItem < maxRank) {
                                //            ContentHome.data.content.rankOfLastItem = maxRank;
                                //            RankOfLastItem.setRank(maxRank);
                                //        }
                                //    }
                                //})
                            }
                        }
                    }
                };
                updateSearchOptions();
                function updateMasterInfo(info) {
                    ContentHome.masterInfo = angular.copy(info);
                }

                function resetInfo() {
                    ContentHome.info = angular.copy(ContentHome.masterInfo);
                }

                function isUnchanged(info) {
                    return angular.equals(info, ContentHome.masterInfo);
                }

                function updateData() {
                    MediaCenter.update(ContentHome.info.id, ContentHome.info.data).then(function (data) {
                        updateMasterInfo(data);
                    }, function (err) {
                        resetInfo();
                        console.error('Error-------', err);
                    });
                }

                function saveDataWithDelay(info) {
                    if (tmrDelayForMedia) {
                        clearTimeout(tmrDelayForMedia);
                    }
                    if (!isUnchanged(ContentHome.info)) {
                        tmrDelayForMedia = setTimeout(function () {
                            updateData();
                        }, 1000);
                    }
                }

                $scope.$watch(function () {
                    return ContentHome.info;
                }, saveDataWithDelay, true);

                Messaging.sendMessageToWidget({
                    name: EVENTS.ROUTE_CHANGE,
                    message: {
                        path: PATHS.HOME
                    }
                });

            }])
})(window.angular, window);
