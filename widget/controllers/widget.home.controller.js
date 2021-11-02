(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'AppDB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders', '$location',
            function ($scope, $window, DB, AppDB, COLLECTIONS, $rootScope, Buildfire, Messaging, EVENTS, PATHS, Location, Orders, $location) {
                $rootScope.loadingGlobalPlaylist = true;
                $rootScope.showFeed = true;
                var WidgetHome = this;
                WidgetHome.deepLink = false;
                $rootScope.loadingData = true;
                buildfire.spinner.hide();

                $rootScope.globalPlaylistStrings = {
                    itemAdded: strings.get('globalPlaylist.itemAdded'),
                    itemRemoved: strings.get('globalPlaylist.itemRemoved'),
                    addedAllItemsToPlaylist: strings.get('globalPlaylist.addedAllItemsToPlaylist'),
                    addedItemsToPlaylist: strings.get('globalPlaylist.addedItemsToPlaylist'),
                    removedAllItemsFromPlaylist: strings.get('globalPlaylist.removedAllItemsFromPlaylist'),
                    playlistLimitReached: strings.get('globalPlaylist.playlistLimitReached')
                }

                const isLauncher = window.location.href.includes('launcherPlugin');
                const slideElement = document.querySelector(".slide")
                if (isLauncher) {
                    slideElement.classList.add("safe-area");
                } else {
                    slideElement.classList.remove("safe-area");
                }

                buildfire.navigation.onAppLauncherActive(() => {
                    $rootScope.refreshItems();
                });

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
                            forceAutoPlay: false,
                            autoPlay: false,
                            autoPlayDelay: { label: "Off", value: 0 },
                            globalPlaylist: false,
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
                let MediaContent = new DB(COLLECTIONS.MediaContent),
                    MediaCenter = new DB(COLLECTIONS.MediaCenter),
                    GlobalPlaylist = new AppDB();

                const getCurrentUser = (callback) => {
                    Buildfire.auth.getCurrentUser((err, user) => {
                        $rootScope.user = user;
                        callback();
                    });
                }


                /**
                 * WidgetHome.media contains MediaCenterInfo.
                 * @type {MediaCenterInfo|*}
                 */
                var MediaCenterInfo = null;
            
                MediaCenter.get().then(function success(result) {
                    if (result && result.data && result.id) {
                        MediaCenterInfo = result;
                    } else {
                        MediaCenterInfo = _infoData;
                    }
                    WidgetHome.media = MediaCenterInfo;

                    $rootScope.backgroundImage = MediaCenterInfo.data.design.backgroundImage;
                    $rootScope.allowShare = MediaCenterInfo.data.content.allowShare;
                    $rootScope.allowSource = MediaCenterInfo.data.content.allowSource;
                    $rootScope.transferAudioContentToPlayList = MediaCenterInfo.data.content.transferAudioContentToPlayList;
                    $rootScope.forceAutoPlay = MediaCenterInfo.data.content.forceAutoPlay;
                    $rootScope.skipMediaPage = MediaCenterInfo.data.design.skipMediaPage

                    $rootScope.autoPlay = MediaCenterInfo.data.content.autoPlay;
                    $rootScope.autoPlayDelay = MediaCenterInfo.data.content.autoPlayDelay;
                    $rootScope.globalPlaylist = MediaCenterInfo.data.content.globalPlaylist;
                    $rootScope.globalPlaylistPlugin = MediaCenterInfo.data.content.globalPlaylistPlugin;
                    $rootScope.showGlobalPlaylistNavButton = MediaCenterInfo.data.content.showGlobalPlaylistNavButton;
                    $rootScope.showGlobalAddAllToPlaylistButton = MediaCenterInfo.data.content.showGlobalAddAllToPlaylistButton;
                },
                    function fail() {
                        MediaCenterInfo = _infoData;
                        WidgetHome.media = MediaCenterInfo;
                    }
                );
                var _skip = 0,
                    _limit = 50,
                    searchOptions = {
                        filter: { },
                        skip: _skip,
                        limit: _limit // the plus one is to check if there are any more
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

                WidgetHome.goTo = function (id) {
                    var foundObj = WidgetHome.items.find(function (el) { return el.id == id; });
                    var index = WidgetHome.items.indexOf(foundObj);

                    $rootScope.currentIndex = index;

                    $rootScope.showFeed = false;
                    var navigate = function (item) {
                        if (item && item.data) {
                            if (!$rootScope.skipMediaPage || ($rootScope.skipMediaPage && item.data.videoUrl)
                                || ($rootScope.skipMediaPage && !item.data.videoUrl && !item.data.audioUrl)) {
                                Location.go('#/media/' + item.id, true);
                            } else {
                                Location.go('#/nowplaying/' + item.id, true);
                            }
                        }
                    }

                    if (index != -1) {
                        navigate(WidgetHome.items[index]);
                        $rootScope.showGlobalPlaylistButtons = false;
                    } else {
                        MediaContent.getById(id).then(function success(result) {

                            if (Object.keys(result.data).length > 2){
                                navigate(result);
                                $rootScope.showGlobalPlaylistButtons = false;
                            } else {
                                WidgetHome.setEmptyState();
                            }
                        });
                    }
                };

                WidgetHome.setEmptyState = function () {
                    $rootScope.showFeed = true;
                    $rootScope.showEmptyState = true;
                    $window.deeplinkingDone = true;
                    $rootScope.showGlobalPlaylistButtons = false;

                    angular.element('#home').css('display', 'none');
                    angular.element('#emptyState').css('display', 'block');
                }

                /**
                 * Messaging.onReceivedMessage is called when any event is fire from Content/design section.
                 * @param event
                 */
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
                    buildfire.spinner.show();
                    if (event.tag == "MediaCenter") {
                        if (event.data) {
                            WidgetHome.media.data = event.data;
                            $rootScope.backgroundImage = WidgetHome.media.data.design && WidgetHome.media.data.design.backgroundImage;
                            $rootScope.allowShare = WidgetHome.media.data.content.allowShare;
                            $rootScope.allowSource = WidgetHome.media.data.content.allowSource;
                            $rootScope.transferAudioContentToPlayList = WidgetHome.media.data.content.transferAudioContentToPlayList;
                            $rootScope.forceAutoPlay = WidgetHome.media.data.content.forceAutoPlay;
                            $rootScope.skipMediaPage = WidgetHome.media.data.design.skipMediaPage;

                            $rootScope.autoPlay = WidgetHome.media.data.content.autoPlay;
                            $rootScope.autoPlayDelay = WidgetHome.media.data.content.autoPlayDelay;
                            $rootScope.globalPlaylist = WidgetHome.media.data.content.globalPlaylist;
                            $rootScope.globalPlaylistPlugin = WidgetHome.media.data.content.globalPlaylistPlugin;
                            $rootScope.showGlobalPlaylistNavButton = WidgetHome.media.data.content.showGlobalPlaylistNavButton;
                            $rootScope.showGlobalAddAllToPlaylistButton = WidgetHome.media.data.content.showGlobalAddAllToPlaylistButton;

                            if (view && event.data.content && event.data.content.images) {
                                view.loadItems(event.data.content.images);
                            }
                            $rootScope.refreshItems();
                            buildfire.spinner.hide();
                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                        } else {
                            buildfire.spinner.hide();
                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                        }
                    } else if (event.tag === "MediaContent") {
                        // Make sure to delete from globalPlaylist if exists
                        if ($rootScope.isInGlobalPlaylist(event.id)) {
                            if (event.data) {
                                GlobalPlaylist.insertAndUpdate(event).then(() => {
                                    $rootScope.globalPlaylistItems.playlist[event.id] = event.data;
                                    $rootScope.refreshItems();
                                    buildfire.spinner.hide();
                                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                });
                            } else {
                                // If there is no data, it means the the item has been deleted
                                // so we need to remove it from the globalPlaylist
                                GlobalPlaylist.delete(event.id).then(() => {
                                    delete $rootScope.globalPlaylistItems.playlist[event.id];
                                    $rootScope.refreshItems();
                                    buildfire.spinner.hide();
                                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                });
                            }
                        } else {
                            $rootScope.refreshItems();
                            buildfire.spinner.hide();
                        }
                    }
                };

                /**
                 * Buildfire.datastore.onUpdate method calls when Data is changed.
                 */
                var listener = Buildfire.datastore.onUpdate(onUpdateCallback);

                Buildfire.appData.onUpdate(event => {
                    // Tag name for global playlist
                    const globalPlaylistTag = 'MediaContent' + ($rootScope.user && $rootScope.user._id ? $rootScope.user._id : Buildfire.context.deviceId ? Buildfire.context.deviceId : 'globalPlaylist');
                    if (event) {
                        if (event.tag === "GlobalPlayListSettings") {
                            if (event.data) {
                                $rootScope.globalPlaylistLimit = event.data.globalPlaylistLimit;
                            }
                        } else if (event.tag === globalPlaylistTag) {
                            if (event.data.playlist) {
                                $rootScope.globalPlaylistItems.playlist = event.data.playlist;
                            }
                        }
                    }
                    buildfire.spinner.hide();
                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                });

                /**
                 * updateGetOptions method checks whether sort options changed or not.
                 * @returns {boolean}
                 */
                var updateGetOptions = function () {
                    var order = Orders.getOrder(WidgetHome.media.data.content.sortBy || Orders.ordersMap.Default);
                    if (order) {
                        var sort = {};
                        sort[order.key] = order.order;
                        
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
                        if(WidgetHome.media.data.content.sortBy === 'Most')
                            searchOptions.sort = { title: 1 }
                        if(WidgetHome.media.data.content.sortBy === 'Least')
                            searchOptions.sort = { title: -1 }
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
                
                // Check if an item is in the globalPlaylist
                $rootScope.isInGlobalPlaylist = (itemId) => {
                    return (
                        $rootScope.globalPlaylistItems &&
                        $rootScope.globalPlaylistItems.playlist &&
                        $rootScope.globalPlaylistItems.playlist[itemId]
                    );
                };

                // Check if all the items are in the globalPlaylist
                $rootScope.areAllInGlobalPlaylist = () => {
                    if ($rootScope.globalPlaylistItems && $rootScope.globalPlaylistItems.playlist) {
                        let playlistItems = [];
                        let widgetItems = [];

                        for (let item of WidgetHome.items) {
                            widgetItems.push(item.id);
                        }

                        for (let itemId in $rootScope.globalPlaylistItems.playlist) {
                            if (widgetItems.indexOf(itemId) !== -1) {
                                playlistItems.push(itemId);
                            }
                        }

                        if (widgetItems.length === 0) return false;

                        return playlistItems.length === widgetItems.length;
                    }
                };

                $rootScope.goToPlaylistPlugin = () => {
                    buildfire.spinner.show();

                    if (!$rootScope.showGlobalPlaylistNavButton || !$rootScope.globalPlaylistPlugin) {
                        buildfire.dialog.toast({
                            message: `Couldn't navigate to the playlist feature`,
                            type: 'warning',
                            duration: 2000
                        });
                        return buildfire.spinner.hide();
                    }
                    try {
                        const actionItem = {
                            action: "linkToApp",
                            title: $rootScope.globalPlaylistPlugin.title,
                            iconUrl: $rootScope.globalPlaylistPlugin.iconUrl,
                            instanceId: $rootScope.globalPlaylistPlugin.instanceId,
                            iconClassName: $rootScope.globalPlaylistPlugin.iconClassName,
                        };

                        // Navigate to the playlist plugin
                        buildfire.actionItems.execute(
                            actionItem,
                            (err) => {
                                if (err) {
                                    console.error(err);
                                    buildfire.dialog.toast({
                                        message: `Couldn't navigate to the playlist feature`,
                                        type: 'warning',
                                        duration: 2000
                                    });
                                };
                            }
                        );
                        buildfire.spinner.hide();
                    } catch (err) {
                        console.error(err);
                        buildfire.dialog.toast({
                            message: `Couldn't navigate to the playlist feature`,
                            type: 'warning',
                            duration: 2000
                        });
                        buildfire.spinner.hide();
                    }
                }

                $rootScope.addAllToGlobalPlaylist = ($event) => {
                    $event.stopImmediatePropagation();
                                            
                    $rootScope.addAllToPlaylistLoading = true;

                    if ($rootScope.areAllInGlobalPlaylist()) {
                        let itemsIds = WidgetHome.items.map(item => item.id);
                        GlobalPlaylist.deleteAll(itemsIds).then(() => {
                            $rootScope.globalPlaylistItems.playlist = {};
                            $rootScope.addAllToPlaylistLoading = false;
                            buildfire.dialog.toast({
                                message: $rootScope.globalPlaylistStrings.removedAllItemsFromPlaylist,
                                type: 'success',
                                duration: 2000
                            });
                            
                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                        });
                    } else {

                        var takenSlots=Object.keys($rootScope.globalPlaylistItems.playlist).length;
                        var freeSlots=$rootScope.globalPlaylistLimit-takenSlots;
                        if (typeof $rootScope.globalPlaylistLimit === 'number' && freeSlots < 1) {
                            buildfire.dialog.toast({
                                message: $rootScope.globalPlaylistStrings.playlistLimitReached,
                                type: 'warning'
                            });
                            $rootScope.addAllToPlaylistLoading = false;
                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                        } else {
                            var filteredItems=WidgetHome.items.filter(el=>!$rootScope.isInGlobalPlaylist(el.id));
                            var itemsToAdd=[...filteredItems].splice(0, freeSlots);
                            GlobalPlaylist.insertAndUpdateAll(itemsToAdd).then(() => {
                                for (let item of itemsToAdd) {
                                    $rootScope.globalPlaylistItems.playlist[item.id] = item.data;
                                }

                                var message=(itemsToAdd.length == WidgetHome.items.length)?
                                $rootScope.globalPlaylistStrings.addedAllItemsToPlaylist:
                                $rootScope.globalPlaylistStrings.addedItemsToPlaylist;
                                buildfire.dialog.toast({
                                    message: message,
                                    type: 'success',
                                    duration: 2000
                                });
                                $rootScope.addAllToPlaylistLoading = false;
                                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                            });
                        }
                    }
                }

                $rootScope.toggleGlobalPlaylistItem = ($event, item) => {
                    $event.stopImmediatePropagation();
                    if ($rootScope.isInGlobalPlaylist(item.id)) {
                        GlobalPlaylist.delete(item.id).then(() => {
                            delete $rootScope.globalPlaylistItems.playlist[item.id];
                            buildfire.dialog.toast({
                                message: $rootScope.globalPlaylistStrings.itemRemoved,
                                type: 'success',
                                duration: 2000
                            });
                        });
                    } else {
                        if (typeof $rootScope.globalPlaylistLimit === 'number' && Object.keys($rootScope.globalPlaylistItems.playlist).length >= $rootScope.globalPlaylistLimit)  {
                            buildfire.dialog.toast({
                                message: $rootScope.globalPlaylistStrings.playlistLimitReached,
                                type: 'warning',
                                duration: 3000
                            });
                        } else {
                            // Save Item in the globalPlaylist
                            GlobalPlaylist.insertAndUpdate(item).then(() => {
                                $rootScope.globalPlaylistItems.playlist[item.id] = item.data;
                                buildfire.dialog.toast({
                                    message: $rootScope.globalPlaylistStrings.itemAdded,
                                    type: 'success',
                                    duration: 2000
                                });
                            });
                        }
                    }
                }

                $rootScope.playPrevItem = () => {
                    if ($rootScope.currentIndex === 0) {
                        WidgetHome.goToMedia(WidgetHome.items.length - 1);
                    } else {
                        WidgetHome.goToMedia($rootScope.currentIndex - 1);
                    }
                }

                let delayInterval;
                $rootScope.playNextItem = (userInput) => {
                    if (userInput) return WidgetHome.goToMedia($rootScope.currentIndex + 1);

                    if ($rootScope.autoPlay) {
                        let delay = $rootScope.autoPlayDelay.value;
                        if (!delay) {
                            WidgetHome.goToMedia($rootScope.currentIndex + 1);
                        } else {
                            $rootScope.showCountdown = true;

                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                            
                            $rootScope.delayCountdownText = `Next will play in ${delay}`;
                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                            if (delayInterval) clearInterval(delayInterval);
                            delayInterval = setInterval(() => {
                                --delay
                                $rootScope.delayCountdownText = delay !== 0 ? `Next will play in ${delay}` : 'Loading next item...';
                                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                if (delay === 0) {
                                    $rootScope.clearCountdown();
                                    WidgetHome.goToMedia($rootScope.currentIndex + 1);
                                }
                            }, 1000);
                        }
                    }
                }

                $rootScope.clearCountdown = () => {
                    $rootScope.showCountdown = false;
                    $rootScope.delayCountdownText = '';
                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                    if (delayInterval) clearInterval(delayInterval);
                }

                WidgetHome.loadMore = function () {
                    if (WidgetHome.isBusy || WidgetHome.noMore) {
                        buildfire.spinner.hide();
                        $rootScope.loadingData = false;
                        if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                        return;
                    }

                    updateGetOptions();
                    $rootScope.loadingData = true;
                    WidgetHome.isBusy = true;
                    buildfire.spinner.show();
                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();

                    const getMediaItems = () => {
                        MediaContent.find(searchOptions).then(function success(result) {
                            if (WidgetHome.noMore) {
                                buildfire.spinner.hide();
                                $rootScope.loadingData = false;
                                return;
                            }

                            // $rootScope.deepLinkNavigate = true;
                            // $rootScope.seekTime = 10.22;
                            WidgetHome.items = WidgetHome.items ? WidgetHome.items.concat(result) : result;
                            // WidgetHome.items = result;
                            WidgetHome.isBusy = false;
                            $rootScope.myItems = WidgetHome.items;
                            bookmarks.sync($scope);

                            if (result.length < _limit) {// to indicate there is no more
                                WidgetHome.noMore = true;
                            }
                            else {
                                result.pop();
                                searchOptions.skip = searchOptions.skip + _limit;
                                WidgetHome.noMore = false;
                                // In order to get all the items
                                return getMediaItems();
                            }
                            
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
                            setTimeout(() => {
                                WidgetHome.isBusy = false;
                                $rootScope.loadingData = false;
                                buildfire.spinner.hide();
                                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                            }, 0);
                        }, function fail(err) {
                            WidgetHome.isBusy = false;
                            $rootScope.loadingData = false;
                            buildfire.spinner.hide();
                            console.error(err);
                        });
                    }

                    const getGlobalPlaylistItems = () => {
                        return new Promise(resolve => {
                            $rootScope.loadingGlobalPlaylist = true;
                            GlobalPlaylist.get()
                            .then(result => {
                                if (!result.data.playlist) {
                                    // If there is no object, then create the parent object
                                    GlobalPlaylist.save({ playlist: {}})
                                    .then(result => {
                                        result.data.id = result.id;
                                        $rootScope.globalPlaylistItems = result.data;
                                        resolve();
                                    });
                                    } else {
                                        result.data.id = result.id;
                                        $rootScope.globalPlaylistItems = result.data;
                                        resolve();
                                    }
                            }).catch(err => {
                                console.error(err);
                                resolve()
                            })
                        })
                    }

                    const getGlobalPlaylistLimit = () => {
                        GlobalPlaylist.getGlobalPlaylistLimit().then((result) => {
                            if (result && result.data && typeof result.data.globalPlaylistLimit !== 'undefined') {
                                $rootScope.globalPlaylistLimit = result.data.globalPlaylistLimit;
                            } else {
                                $rootScope.globalPlaylistLimit = undefined;
                            };
                        });
                    };

                    if ($rootScope.globalPlaylist) {
                        getCurrentUser(() => {
                            // Get limit from appData
                            getGlobalPlaylistLimit();
                            
                            getGlobalPlaylistItems()
                            .then(getMediaItems)
                            .finally(() => {
                                buildfire.spinner.hide();
                                $rootScope.loadingGlobalPlaylist = false
                            });
                        });
                    } else getGlobalPlaylistItems().then(getMediaItems).finally(() => {
                        setTimeout(() => {
                            buildfire.spinner.hide();
                            WidgetHome.isBusy = false;
                            $rootScope.loadingData = false;
                            $rootScope.loadingGlobalPlaylist = false;
                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                        }, 0);
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

                $rootScope.refreshItems = function () {
                    buildfire.spinner.show();
                    searchOptions.skip = 0;
                    WidgetHome.items = [];
                    WidgetHome.noMore = false;
                    WidgetHome.glovalPlaylistLoaded = false;
                    if ($rootScope.globalPlaylist) $rootScope.globalPlaylistItems = { playlist: {} };
                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                    WidgetHome.loadMore();
                };

                WidgetHome.goToMedia = function (ind) {
                    if (typeof ind != 'number') {
                        var foundObj = WidgetHome.items.find(function (el) { return el.id == ind; });
                        ind = WidgetHome.items.indexOf(foundObj);
                    }

                    if (typeof ind === 'undefined' || !WidgetHome.items[ind]) {
                        ind = 0;
                    }

                    $rootScope.showFeed = false;
                    
                    if (ind != -1) {
                        if ($rootScope.autoPlay && !WidgetHome.items[ind]) ind = 0;

                        $rootScope.currentIndex = ind;

                        if (!$rootScope.skipMediaPage || ($rootScope.skipMediaPage && WidgetHome.items[ind].data.videoUrl)
                            || ($rootScope.skipMediaPage && !WidgetHome.items[ind].data.videoUrl && !WidgetHome.items[ind].data.audioUrl)) {
                                Location.go('#/media/' + WidgetHome.items[ind].id, true);
                        } else {
                                Location.go('#/nowplaying/' + WidgetHome.items[ind].id, true);
                        }
                        $rootScope.showGlobalPlaylistButtons = false;
                    }
                };

                buildfire.auth.onLogin(function (user) {
                    buildfire.spinner.show();
                    bookmarks.sync($scope);
                    $rootScope.user = user;
                    $rootScope.refreshItems();
                });

                buildfire.auth.onLogout(function () {
                    buildfire.spinner.show();
                    bookmarks.sync($scope);
                    $rootScope.user = null;
                    $rootScope.refreshItems();
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
                    link.description = item.data.summary ? item.data.summary : '';
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

                $rootScope.$watch('showFeed', function () {
                    if ($rootScope.showFeed) {
                        listener.clear();
                        listener = Buildfire.datastore.onUpdate(onUpdateCallback);
                        bookmarks.sync($scope);
                        if(!WidgetHome.items.length) WidgetHome.deepLink = true;
                        MediaCenter.get().then(function success(result) {
                            WidgetHome.media = result;
                            if (WidgetHome.media.data.design && $rootScope.skipMediaPage) $rootScope.skipMediaPage = true;
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
