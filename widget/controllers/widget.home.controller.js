(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders', '$location',
            function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, Messaging, EVENTS, PATHS, Location, Orders, $location) {
                $rootScope.showFeed = true;
                var WidgetHome = this;
                WidgetHome.deepLink = false;
                var _infoData = {
                    data: {
                        content: {
                            images: [],
                            descriptionHTML: '<p>&nbsp;<br></p>',
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
                var view = null;

                /**
                 * Create instance of MediaContent, MediaCenter db collection
                 * @type {DB}
                 */
                var MediaContent = new DB(COLLECTIONS.MediaContent),
                    MediaCenter = new DB(COLLECTIONS.MediaCenter);

                /**
                 * WidgetHome.media contains MediaCenterInfo.
                 * @type {MediaCenterInfo|*}
                 */
                var MediaCenterInfo = null;
                MediaCenter.get().then(function success(result) {
                    if (result && result.data && result.id) {
                        MediaCenterInfo = result;
                    }
                    else {
                        MediaCenterInfo = _infoData;
                    }
                    WidgetHome.media = MediaCenterInfo;
                    $rootScope.backgroundImage = MediaCenterInfo.data.design.backgroundImage;
                    $rootScope.allowShare = MediaCenterInfo.data.content.allowShare;
                    $rootScope.allowSource = MediaCenterInfo.data.content.allowSource;
                    $rootScope.transferAudioContentToPlayList = MediaCenterInfo.data.content.transferAudioContentToPlayList;
                    $rootScope.forceAutoPlay = MediaCenterInfo.data.content.forceAutoPlay;
                },
                    function fail() {
                        MediaCenterInfo = _infoData;
                        WidgetHome.media = MediaCenterInfo;
                    }
                );
                var _skip = 0,
                    _limit = 15,
                    searchOptions = {
                        filter: { "$json.title": { "$regex": '/*' } },
                        skip: _skip,
                        limit: _limit + 1 // the plus one is to check if there are any more
                    };
                /**
                 * WidgetHome.isBusy is used for infinite scroll.
                 * @type {boolean}
                 */
                WidgetHome.isBusy = false;


                /*declare the device width heights*/
                $rootScope.deviceHeight = WidgetHome.deviceHeight = window.innerHeight;
                $rootScope.deviceWidth = WidgetHome.deviceWidth = window.innerWidth || 320;

                /*initialize the device width heights*/
                var initDeviceSize = function (callback) {
                    WidgetHome.deviceHeight = window.innerHeight;
                    WidgetHome.deviceWidth = window.innerWidth;
                    if (callback) {
                        if (WidgetHome.deviceWidth == 0 || WidgetHome.deviceHeight == 0) {
                            setTimeout(function () {
                                initDeviceSize(callback);
                            }, 500);
                        } else {
                            callback();
                            if (!$scope.$$phase && !$scope.$root.$$phase) {
                                $scope.$apply();
                            }
                        }
                    }
                };
                /**
                 * Messaging.onReceivedMessage is called when any event is fire from Content/design section.
                 * @param event
                 */
                WidgetHome.goTo = function (id) {
                    var foundObj = WidgetHome.items.find(function (el) { return el.id == id; });
                    var index = WidgetHome.items.indexOf(foundObj);

                    $rootScope.showFeed = false;
                    var navigate = function (item) {
                        console.log(item)
                        if (item && item.data) {
                            if (!WidgetHome.media.data.design.skipMediaPage || (WidgetHome.media.data.design.skipMediaPage && item.data.videoUrl)
                                || (WidgetHome.media.data.design.skipMediaPage && !item.data.videoUrl && !item.data.audioUrl)) {
                                Location.go('#/media/' + item.id, true);
                            } else {
                                Location.go('#/nowplaying/' + item.id, true);
                            }
                        }
                    }

                    if (index != -1) {
                        navigate(WidgetHome.items[index]);
                    } else {
                        MediaContent.getById(id).then(function success(result) {


                            if (Object.keys(result.data).length > 2)
                                navigate(result);
                            else {
                                WidgetHome.setEmptyState();
                                // Location.goToHome();
                            }
                        });
                    }

                };

                WidgetHome.setEmptyState = function () {
                    $rootScope.showFeed = true;
                    $rootScope.showEmptyState = true;
                    $window.deeplinkingDone = true;

                    angular.element('#home').css('display', 'none');
                    angular.element('#emptyState').css('display', 'block');
                }

                Messaging.onReceivedMessage = function (event) {
                    if (event.message && event.message.path == 'MEDIA') {
                        WidgetHome.goTo(event.message.id);
                    }
                    if (event.message && event.message.path == 'HOME') {
                        buildfire.history.get({ pluginBreadCrumbsOnly: true }, function (err, result) {
                            result.map(item => buildfire.history.pop());
                            Location.goToHome();
                        });
                    }
                    if (event.cmd == "refresh") /// message comes from the strings page on the control side
                        location.reload();
                };

                var onUpdateCallback = function (event) {
                    if (event.tag == "MediaCenter") {
                        if (event.data) {
                            WidgetHome.media.data = event.data;
                            $rootScope.backgroundImage = WidgetHome.media.data.design && WidgetHome.media.data.design.backgroundImage;
                            $rootScope.allowShare = WidgetHome.media.data.content.allowShare;
                            $rootScope.allowSource = WidgetHome.media.data.content.allowSource;
                            $rootScope.transferAudioContentToPlayList = WidgetHome.media.data.content.transferAudioContentToPlayList;
                            $rootScope.forceAutoPlay = WidgetHome.media.data.content.forceAutoPlay;
                            $scope.$apply();
                            if (view && event.data.content && event.data.content.images) {
                                view.loadItems(event.data.content.images);
                            }
                            WidgetHome.refreshItems();
                        }
                    }
                    else {
                        WidgetHome.refreshItems();
                    }
                };

                /**
                 * Buildfire.datastore.onUpdate method calls when Data is changed.
                 */
                var listener = Buildfire.datastore.onUpdate(onUpdateCallback);


                /**
                 * updateGetOptions method checks whether sort options changed or not.
                 * @returns {boolean}
                 */
                var updateGetOptions = function () {
                    var order = Orders.getOrder(WidgetHome.media.data.content.sortBy || Orders.ordersMap.Default);
                    if (order) {
                        var sort = {};
                        sort[order.key] = order.order;
                        console.log(sort, order, WidgetHome.media.data.content.updatedRecords)
                        if ((order.name == "Media Title A-Z" || order.name === "Media Title Z-A")) {
                            if (order.name == "Media Title A-Z") {
                                WidgetHome.media.data.content.updatedRecords ? searchOptions.sort = { titleIndex: 1 }
                                : searchOptions.sort = { title: 1 }
                            }
                            if (order.name == "Media Title Z-A") {
                                WidgetHome.media.data.content.updatedRecords ? searchOptions.sort = { titleIndex: -1 }
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

                // ShowDescription only when it have content
                WidgetHome.showDescription = function () {
                    if (WidgetHome.media.data.content.descriptionHTML == '<p>&nbsp;<br></p>' || WidgetHome.media.data.content.descriptionHTML == '<p><br data-mce-bogus="1"></p>' || WidgetHome.media.data.content.descriptionHTML == '')
                        return false;
                    else
                        return true;
                };

                /**
                 * WidgetHome.items holds the array of items.
                 * @type {Array}
                 */
                WidgetHome.items = [];
                /**
                 * WidgetHome.noMore checks for further data
                 * @type {boolean}
                 */
                WidgetHome.noMore = false;

                /**
                 * loadMore method loads the items in list page.
                 */
                WidgetHome.loadMore = function () {
                    if (WidgetHome.isBusy || WidgetHome.noMore) {
                        return;
                    }
                    updateGetOptions();
                    WidgetHome.isBusy = true;

                    MediaContent.find(searchOptions).then(function success(result) {
                        if (WidgetHome.noMore)
                            return;

                        if (result.length <= _limit) {// to indicate there are more

                            WidgetHome.noMore = true;
                        }
                        else {
                            result.pop();
                            searchOptions.skip = searchOptions.skip + _limit;
                            WidgetHome.noMore = false;
                        }
                        // $rootScope.deepLinkNavigate = true;
                        // $rootScope.seekTime = 10.22;
                        WidgetHome.items = WidgetHome.items ? WidgetHome.items.concat(result) : result;
                        WidgetHome.isBusy = false;
                        $rootScope.myItems = WidgetHome.items;
                        bookmarks.sync($scope);
                        if (!$window.deeplinkingDone && buildfire.deeplink) {
                            buildfire.deeplink.getData(function (data) {
                                var exists = data && data.id && WidgetHome.items.find(item => item.id === data.id);
                                if (data && data.mediaId) {
                                    $rootScope.showFeed = false;
                                    $rootScope.fromSearch = true;
                                    $window.deeplinkingDone = true;
                                    window.setTimeout(() => {
                                        WidgetHome.goTo(data.mediaId);
                                    }, 0);
                                }
                                else if (data && data.link) {
                                    $rootScope.showFeed = false;
                                    $rootScope.fromSearch = true;
                                    $window.deeplinkingDone = true;
                                    var foundObj = WidgetHome.items.find(function (el) { return el.id == data.link; });
                                    if (!foundObj) return WidgetHome.setEmptyState();
                                    if (data.timeIndex && foundObj.data.videoUrl || foundObj.data.audioUrl) {
                                        $rootScope.deepLinkNavigate = true;
                                        $rootScope.seekTime = data.timeIndex;
                                    }
                                    window.setTimeout(() => {
                                        if (foundObj.data.audioUrl && $rootScope.seekTime) {
                                            return Location.go('#/nowplaying/' + foundObj.id)
                                        }

                                        WidgetHome.goTo(data.link);
                                    }, 0);
                                }
                                else if (data && data.deepLinkUrl) {
                                    var startOfQueryString = data.deepLinkUrl.indexOf("?dld");
                                    var deepLinkUrl = data.deepLinkUrl.slice(startOfQueryString + 5, data.deepLinkUrl.length);
                                    var itemId = JSON.parse(deepLinkUrl).id;
                                    $rootScope.showFeed = false;
                                    $rootScope.fromSearch = true;
                                    $window.deeplinkingDone = true;
                                    window.setTimeout(() => {
                                        WidgetHome.goTo(itemId);
                                    }, 0);
                                }
                                else if (data && exists) {
                                    $window.deeplinkingDone = true;
                                    $rootScope.showFeed = false;
                                    window.setTimeout(() => {
                                        WidgetHome.goTo(data.id);
                                    }, 0);
                                } else if (data && !exists) {
                                    $window.deeplinkingDone = true;
                                    WidgetHome.deepLink = true;
                                    const text = strings.get("deeplink.deeplinkMediaNotFound") ? strings.get("deeplink.deeplinkMediaNotFound") : "Media does not exist!";
                                    buildfire.components.toast.showToastMessage({ text }, () => { });
                                } else WidgetHome.deepLink = true;
                            });
                        }
                    }, function fail() {
                        WidgetHome.isBusy = false;
                        console.error('error');
                    });
                };

                WidgetHome.openLinks = function (actionItems, $event) {
                    if (actionItems && actionItems.length) {
                        var options = {};
                        var callback = function (error, result) {
                            if (error) {
                                console.error('Error:', error);
                            }
                        };

                        $event.preventDefault();
                        $timeout(function () {
                            Buildfire.actionItems.list(actionItems, options, callback);
                        });
                    }
                };

                WidgetHome.refreshItems = function () {
                    searchOptions.skip = 0;
                    WidgetHome.items = [];
                    WidgetHome.noMore = false;
                    WidgetHome.loadMore();
                };

                WidgetHome.goToMedia = function (ind) {
                    if (typeof ind != 'number') {
                        var foundObj = WidgetHome.items.find(function (el) { return el.id == ind; });
                        ind = WidgetHome.items.indexOf(foundObj);
                    }

                    $rootScope.showFeed = false;
                    if (ind != -1) {
                        if (!WidgetHome.media.data.design.skipMediaPage || (WidgetHome.media.data.design.skipMediaPage && WidgetHome.items[ind].data.videoUrl)
                            || (WidgetHome.media.data.design.skipMediaPage && !WidgetHome.items[ind].data.videoUrl && !WidgetHome.items[ind].data.audioUrl)) {
                            Location.go('#/media/' + WidgetHome.items[ind].id, true);
                        } else {
                            Location.go('#/nowplaying/' + WidgetHome.items[ind].id, true);
                        }
                    }
                };

                buildfire.auth.onLogin(function () {
                    bookmarks.sync($scope);
                });

                buildfire.auth.onLogout(function () {
                    bookmarks.sync($scope);
                });

                WidgetHome.bookmark = function ($event, item) {
                    $event.stopImmediatePropagation();
                    var isBookmarked = item.data.bookmarked ? true : false;
                    if (isBookmarked) {
                        bookmarks.delete($scope, item);
                    } else {
                        bookmarks.add($scope, item);
                    }
                };

                WidgetHome.bookmarked = function ($event, item) {
                    $event.stopImmediatePropagation();
                    WidgetHome.bookmark($event, item);
                };

                WidgetHome.share = function ($event, item) {
                    $event.stopImmediatePropagation();

                    var link = {};
                    link.title = item.data.title;
                    link.type = "website";
                    link.description = item.data.summary ? item.data.summary : null;
                    //link.imageUrl = item.data.topImage ? item.data.topImage : null;

                    link.data = {
                        "mediaId": item.id
                    };

                    buildfire.deeplink.generateUrl(link, function (err, result) {
                        if (err) {
                            console.error(err)
                        } else {
                            // output : {"url":"https://buildfire.com/shortlinks/f6fd5ca6-c093-11ea-b714-067610557690"}
                            buildfire.device.share({
                                subject: link.title,
                                text: link.description,
                                image: link.imageUrl,
                                link: result.url
                            }, function (err, result) { });

                        }
                    });
                };

                $rootScope.$on("Carousel:LOADED", function () {
                    if (WidgetHome.media.data.content && WidgetHome.media.data.content.images) {
                        view = new Buildfire.components.carousel.view("#carousel", WidgetHome.media.data.content.images);
                        //view.loadItems(WidgetHome.media.data.content.images, false);
                    } else {
                        view.loadItems([]);
                    }
                });

                // Messaging.sendMessageToControl({
                //     name: EVENTS.ROUTE_CHANGE,
                //     message: {
                //         path: PATHS.HOME
                //     }
                // });

                $rootScope.$watch('showFeed', function () {
                    if ($rootScope.showFeed) {
                        listener.clear();
                        listener = Buildfire.datastore.onUpdate(onUpdateCallback);
                        bookmarks.sync($scope);
                        console.log("SHOW FEED SYNC")
                        MediaCenter.get().then(function success(result) {
                            WidgetHome.media = result;
                            if (WidgetHome.media.data.design && WidgetHome.media.data.design.skipMediaPage) $rootScope.skipMediaPage = true;
                        },
                            function fail() {
                                WidgetHome.media = _infoData;
                            }
                        );

                    }
                });
                $rootScope.$watch('goingBack', function () {
                    if ($rootScope.goingBack) {
                        WidgetHome.deepLink = true;
                    }
                });
                /**
                 * Implementation of pull down to refresh
                 */
                var onRefresh = Buildfire.datastore.onRefresh(function () {
                    Location.goToHome();
                });


            }]);
})(window.angular);
