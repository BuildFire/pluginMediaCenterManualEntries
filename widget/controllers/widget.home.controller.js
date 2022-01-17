(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'AppDB', 'OFSTORAGE', 'COLLECTIONS', '$rootScope', 'Buildfire', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders', '$location',
            function ($scope, $window, DB, AppDB, OFSTORAGE, COLLECTIONS, $rootScope, Buildfire, Messaging, EVENTS, PATHS, Location, Orders, $location) {
                $rootScope.loadingGlobalPlaylist = true;
                $rootScope.showFeed = true;
                $rootScope.currentlyDownloading = [];
                var WidgetHome = this;
                WidgetHome.deepLink = false;
                $rootScope.loadingData = true;
                WidgetHome.isWeb = Buildfire.getContext().device.platform == 'web';
                // $rootScope.online = $window.navigator.onLine;
                $rootScope.online = $window.navigator.onLine;
                WidgetHome.online = $rootScope.online;
                // $rootScope.online = false;
                // WidgetHome.online = false;
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
                var view = null;

                /**
                 * Create instance of MediaContent, MediaCenter db collection
                 * @type {DB}
                 */
                let MediaContent = new DB(COLLECTIONS.MediaContent),
                    MediaCenter = new DB(COLLECTIONS.MediaCenter),
                    GlobalPlaylist = new AppDB(),
                    CachedMediaContent = new OFSTORAGE({
                        path: "/data/mediaCenterManual",
                        fileName: "cachedMediaContent"
                    }),
                    CachedMediaCenter = new OFSTORAGE({
                        path: "/data/mediaCenterManual",
                        fileName: "cachedMediaCenter"
                    }),
                    DownloadedMedia = new OFSTORAGE({
                        path: "/data/mediaCenterManual",
                        fileName: "downloadedMedia"
                    });

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

                if ($rootScope.online) {
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
                        $rootScope.allowOfflineDownload = MediaCenterInfo.data.content.allowOfflineDownload;

                        if (!WidgetHome.isWeb) {
                            CachedMediaCenter.insert(MediaCenterInfo, (err, res) => {
                                if (err) {
                                    buildfire.dialog.toast({
                                        message: `Error`,
                                        type: 'warning',
                                    });
                                }
                            });
                        }
                    },
                        function fail() {
                            MediaCenterInfo = _infoData;
                            WidgetHome.media = MediaCenterInfo;
                            if (!WidgetHome.isWeb) {
                                CachedMediaCenter.insert(MediaCenterInfo, (err, res) => { });
                            }
                        }
                    );
                }

                else {
                    if (!WidgetHome.isWeb) {
                        CachedMediaCenter.get((err, res) => {
                            if (err) WidgetHome.media = _infoData;

                            if (res) WidgetHome.media = res;

                            $rootScope.backgroundImage = WidgetHome.media.data.design.backgroundImage;
                            $rootScope.allowShare = WidgetHome.media.data.content.allowShare;
                            $rootScope.allowSource = WidgetHome.media.data.content.allowSource;
                            $rootScope.transferAudioContentToPlayList = WidgetHome.media.data.content.transferAudioContentToPlayList;
                            $rootScope.forceAutoPlay = WidgetHome.media.data.content.forceAutoPlay;
                            $rootScope.skipMediaPage = WidgetHome.media.data.design.skipMediaPage

                            $rootScope.autoPlay = WidgetHome.media.data.content.autoPlay;
                            $rootScope.autoPlayDelay = WidgetHome.media.data.content.autoPlayDelay;
                            $rootScope.globalPlaylist = WidgetHome.media.data.content.globalPlaylist;
                            $rootScope.globalPlaylistPlugin = WidgetHome.media.data.content.globalPlaylistPlugin;
                            $rootScope.showGlobalPlaylistNavButton = WidgetHome.media.data.content.showGlobalPlaylistNavButton;
                            $rootScope.showGlobalAddAllToPlaylistButton = WidgetHome.media.data.content.showGlobalAddAllToPlaylistButton;
                            $rootScope.allowOfflineDownload = WidgetHome.media.data.content.allowOfflineDownload;
                        });
                    }
                    else {
                        WidgetHome.media = _infoData;
                    }
                }


                var _skip = 0,
                    _limit = 50,
                    searchOptions = {
                        filter: {},
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

                Buildfire.deeplink.onUpdate((deeplinkData) => {
                    if (deeplinkData && deeplinkData.id) {
                        $window.deeplinkingDone = true;
                        $rootScope.showFeed = false;
                        window.setTimeout(() => {
                            WidgetHome.goTo(deeplinkData.id);
                        }, 0);
                    }
                });

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

                            if (Object.keys(result.data).length > 2) {
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
                            $rootScope.allowOfflineDownload = WidgetHome.media.data.content.allowOfflineDownload;

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
                        //Handles Indexing Changes mediaDate/mediaDateIndex
                        if (WidgetHome.media.data.content.dateIndexed && order.key == "mediaDate") {
                            order.key = "mediaDateIndex";
                        } else if (!WidgetHome.media.data.content.dateIndexed && order.key == "mediaDateIndex") {//so it don't couse issues before data is updated
                            order.key = "mediaDate";
                        }
                        //END Handles Indexing Changes mediaDate/mediaDateIndex
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
                        if (WidgetHome.media.data.content.sortBy === 'Most')
                            searchOptions.sort = { title: 1 }
                        if (WidgetHome.media.data.content.sortBy === 'Least')
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

                $rootScope.addAllToGlobalPlaylist = () => {

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

                        var takenSlots = Object.keys($rootScope.globalPlaylistItems.playlist).length;
                        var freeSlots = $rootScope.globalPlaylistLimit - takenSlots;
                        if (typeof $rootScope.globalPlaylistLimit === 'number' && freeSlots < 1) {
                            buildfire.dialog.toast({
                                message: $rootScope.globalPlaylistStrings.playlistLimitReached,
                                type: 'warning'
                            });
                            $rootScope.addAllToPlaylistLoading = false;
                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                        } else {
                            var filteredItems = WidgetHome.items.filter(el => !$rootScope.isInGlobalPlaylist(el.id));
                            var itemsToAdd = [...filteredItems].splice(0, freeSlots);
                            GlobalPlaylist.insertAndUpdateAll(itemsToAdd).then(() => {
                                for (let item of itemsToAdd) {
                                    $rootScope.globalPlaylistItems.playlist[item.id] = item.data;
                                }

                                var message = (itemsToAdd.length == WidgetHome.items.length) ?
                                    $rootScope.globalPlaylistStrings.addedAllItemsToPlaylist :
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

                $rootScope.toggleGlobalPlaylistItem = (item) => {
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
                        if (typeof $rootScope.globalPlaylistLimit === 'number' && Object.keys($rootScope.globalPlaylistItems.playlist).length >= $rootScope.globalPlaylistLimit) {
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

                    $rootScope.loadingData = true;
                    WidgetHome.isBusy = true;
                    buildfire.spinner.show();
                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();


                    updateGetOptions();
                    $rootScope.loadingData = true;
                    WidgetHome.isBusy = true;
                    buildfire.spinner.show();
                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();

                    const getMediaItems = () => {
                        MediaContent.find(searchOptions).then((result) => {
                            if (WidgetHome.noMore) {
                                buildfire.spinner.hide();
                                $rootScope.loadingData = false;
                                return;
                            }

                            // $rootScope.deepLinkNavigate = true;
                            // $rootScope.seekTime = 10.22;
                            WidgetHome.items = WidgetHome.items ? WidgetHome.items.concat(result) : result;
                            //Check if items have downloaded media
                            CachedMediaContent.insert(WidgetHome.items, (error, res) => {
                                if (WidgetHome.items.length > 0 && Buildfire.getContext().device.platform != 'web') {
                                    DownloadedMedia.get((err, res) => {
                                        let downloadedIDS = [];
                                        if (err) {
                                            return callback(err);
                                        }
                                        if (res) {
                                            downloadedIDS = res.map(item => item.mediaId);
                                            if (downloadedIDS.length > 0) {
                                                WidgetHome.items = WidgetHome.items.map(item => {
                                                    if (downloadedIDS.indexOf(item.id) > -1) {
                                                        item.hasDownloadedMedia = true;
                                                        let downloadedItem = res[downloadedIDS.indexOf(item.id)];
                                                        if (downloadedItem.mediaType == "video") {
                                                            item.data.hasDownloadedVideo = true;
                                                        }

                                                        else if (downloadedItem.mediaType == "audio") {
                                                            item.data.hasDownloadedAudio = true;
                                                        }
                                                    }
                                                    return item;
                                                });
                                            }
                                        }
                                        // WidgetHome.items = result;
                                        WidgetHome.isBusy = false;
                                        $rootScope.myItems = WidgetHome.items;
                                        bookmarks.sync($scope);
                                        if (!WidgetHome.isWeb) downloads.sync($scope, DownloadedMedia);

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
                                    });
                                }
                                else {
                                    // WidgetHome.items = result;
                                    WidgetHome.isBusy = false;
                                    $rootScope.myItems = WidgetHome.items;
                                    bookmarks.sync($scope);
                                    if (!WidgetHome.isWeb) downloads.sync($scope, DownloadedMedia);

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
                                }
                            }, function fail(err) {
                                WidgetHome.isBusy = false;
                                $rootScope.loadingData = false;
                                buildfire.spinner.hide();
                                console.error(err);
                            });
                        });
                    }

                    const getCachedItems = (callback) => {
                        if (Buildfire.getContext().device.platform === 'web') {
                            buildfire.dialog.toast({
                                message: "You can't use offline mode in web browser",
                            });
                            WidgetHome.items = [];
                            setTimeout(() => {
                                buildfire.spinner.hide();
                                WidgetHome.isBusy = false;
                                $rootScope.loadingData = false;
                                $rootScope.loadingGlobalPlaylist = false;
                                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                return callback(null, true);
                            }, 0);
                        }
                        CachedMediaContent.get((err, res) => {
                            let cachedItems = [];
                            if (err) {
                                return callback(err);
                            }
                            if (res) {
                                cachedItems = res;
                            }
                            // buildfire.dialog.toast({
                            //     message: "Cached items found " + cachedItems.length,
                            // });
                            if (!cachedItems) cachedItems = [];
                            WidgetHome.items = WidgetHome.items ? WidgetHome.items.concat(cachedItems) : cachedItems;
                            DownloadedMedia.get((err, res) => {
                                let downloadedIDS = [];
                                if (err) {
                                    return callback(err);
                                }
                                if (res) {
                                    downloadedIDS = res.map(item => item.mediaId);
                                    if (downloadedIDS.length > 0) {
                                        WidgetHome.items = WidgetHome.items.map(item => {
                                            if (downloadedIDS.indexOf(item.id) > -1) {
                                                item.hasDownloadedMedia = true;
                                                let downloadedItem = res[downloadedIDS.indexOf(item.id)];
                                                if (downloadedItem.mediaType == "video") {
                                                    item.data.hasDownloadedVideo = true;
                                                }

                                                else if (downloadedItem.mediaType == "audio") {
                                                    item.data.hasDownloadedAudio = true;
                                                }
                                            }

                                            return item;
                                        });
                                    }
                                }
                                buildfire.dialog.alert({
                                    message: "You are offline! Downloaded media is available.",
                                });
                                setTimeout(() => {
                                    buildfire.spinner.hide();
                                    WidgetHome.isBusy = false;
                                    $rootScope.loadingData = false;
                                    $rootScope.loadingGlobalPlaylist = false;
                                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                    callback(null, true);
                                }, 0);
                            });
                        });
                    }

                    const getGlobalPlaylistItems = () => {
                        return new Promise(resolve => {
                            $rootScope.loadingGlobalPlaylist = true;
                            GlobalPlaylist.get()
                                .then(result => {
                                    if (!result.data.playlist) {
                                        // If there is no object, then create the parent object
                                        GlobalPlaylist.save({ playlist: {} })
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
                    if ($rootScope.globalPlaylist && $rootScope.online) {
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
                    } else if ($rootScope.online) {
                        getGlobalPlaylistItems().then(getMediaItems).finally(() => {
                            setTimeout(() => {
                                buildfire.spinner.hide();
                                WidgetHome.isBusy = false;
                                $rootScope.loadingData = false;
                                $rootScope.loadingGlobalPlaylist = false;
                                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                            }, 0);
                        });
                    }
                    else {
                        getCachedItems((err, res) => {
                        });
                    }

                    setTimeout(() => {
                        buildfire.spinner.hide();
                        WidgetHome.isBusy = false;
                        $rootScope.loadingData = false;
                        $rootScope.loadingGlobalPlaylist = false;
                        if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                    }, 0);
                };

                WidgetHome.openLinks = function (actionItems) {
                    if (actionItems && actionItems.length) {
                        var options = {};
                        var callback = function (error, result) {
                            if (error) {
                                console.error('Error:', error);
                            }
                        };

                        $timeout(function () {
                            Buildfire.actionItems.list(actionItems, options, callback);
                        });
                    }
                };


                WidgetHome.addNote = function (item) {
                    var options = {
                        itemId: item.id,
                        title: item.data.title,
                        imageUrl: item.data.topImage
                    };

                    var callback = function (err, data) {
                        if (err) throw err;
                        console.log(data);
                    };

                    buildfire.notes.openDialog(options, callback);
                };

                WidgetHome.showDrawer = function ($event, item) {
                    $event.stopImmediatePropagation();
                    let listItems = [];
                    listItems.push({ text: "Add Note" });
                    if (WidgetHome.media.data.content.allowOfflineDownload && $rootScope.online) {
                        if (item.data.videoUrl) {
                            if (item.data.hasDownloadedVideo) {
                                listItems.push({ text: "Remove Downloaded Video" });
                            }

                            else {
                                listItems.push({ text: "Download Video" });
                            }
                        }

                        // if (item.data.audioUrl) {
                        //     if (item.data.hasDownloadedAudio) {
                        //         listItems.push({ text: "Remove Downloaded Audio" });
                        //     }

                        //     else {
                        //         listItems.push({ text: "Download Audio" });
                        //     }
                        // }
                    }

                    if (WidgetHome.media.data.content.allowShare && $rootScope.online) {
                        listItems.push({ text: "Share" });
                    }

                    if (item.data.links.length && $rootScope.online) {
                        listItems.push({ text: "Open Links" });
                    }

                    if (WidgetHome.media.data.content.globalPlaylist && $rootScope.online) {
                        if ($rootScope.isInGlobalPlaylist(item.id)) {
                            listItems.push({ text: "Remove from Playlist" });
                        }
                        else {
                            listItems.push({ text: "Add to Playlist" });
                        }
                    }

                    if ($rootScope.online) {
                        if (item.data.bookmarked) {
                            listItems.push({ text: "Remove from favorites" });
                        }
                        else {
                            listItems.push({ text: "Favorite" });
                        }
                    }

                    buildfire.components.drawer.open(
                        {
                            isHTML: false,
                            listItems: listItems
                        },
                        (err, result) => {
                            if (err) return console.error(err);
                            buildfire.components.drawer.closeDrawer();
                            if (result) {
                                if (result.text == "Download Video") {
                                    $rootScope.download(item, "video");
                                }

                                // if (result.text == "Download Audio") {
                                //     $rootScope.download(item, "audio");
                                // }

                                if (result.text == "Remove Downloaded Video") {
                                    $rootScope.removeDownload(item, "video");
                                }

                                // if (result.text == "Remove Downloaded Audio") {
                                //     $rootScope.removeDownloaded(item, "audio");
                                // }

                                if (result.text == "Share") {
                                    WidgetHome.share(item);
                                }

                                if (result.text == "Open Links") {
                                    WidgetHome.openLinks(item.data.links);
                                }

                                if (result.text == "Add to Playlist") {
                                    $rootScope.toggleGlobalPlaylistItem(item);
                                }

                                if (result.text == "Remove from Playlist") {
                                    $rootScope.toggleGlobalPlaylistItem(item);
                                }

                                if (result.text == "Add Note") {
                                    WidgetHome.addNote(item);
                                }

                                if (result.text == "Remove from favorites") {
                                    WidgetHome.bookmark(item);
                                }

                                if (result.text == "Favorite") {
                                    WidgetHome.bookmark(item);
                                }
                            }
                        }
                    );
                };

                WidgetHome.getVideoDownloadURL = function (videoURL) {
                    if (videoURL) {
                        var myType;
                        var source;
                        var videoUrlToSend = videoURL;
                        if (videoUrlToSend.includes("www.dropbox") || videoUrlToSend.includes("dl.dropbox.com")) {
                            videoUrlToSend = videoUrlToSend.replace("www.dropbox", "dl.dropboxusercontent").split("?dl=")[0];
                            videoUrlToSend = videoUrlToSend.replace("dl.dropbox.com", "dl.dropboxusercontent.com");
                            myType = videoUrlToSend.split('.').pop();
                            source = "dropbox";
                        } else {
                            source = videoUrlToSend.includes("youtube.com") ? "youtube" : videoUrlToSend.includes("vimeo") ? "vimeo" : "other";
                            myType = videoUrlToSend.split('.').pop();
                        }
                        return {
                            uri: videoUrlToSend,
                            type: myType,
                            source: source
                        }
                    }
                }

                // WidgetHome.getAudioDownloadURL = function () {
                //     // if (WidgetMedia.item.data.audioUrl) {
                //     //     var myType;
                //     //     var audioUrlToSend = WidgetMedia.item.data.audioUrl;
                //     //         myType = audioUrlToSend.split('.').pop();

                //     //     return {
                //     //         uri: audioUrlToSend,
                //     //         type: myType,
                //     //     }
                //     // }
                // }

                $rootScope.download = function (item, mediaType) {
                    if (Buildfire.getContext().device.platform === 'web') {
                        buildfire.dialog.alert({
                            message: "You can't download media in the web browser",
                        });
                        return;
                    }
                    if (mediaType === 'video') {
                        if (item.data.videoUrl) {
                            //check videoURL is valid
                            let { uri, type, source } = WidgetHome.getVideoDownloadURL(item.data.videoUrl);
                            if (source === 'youtube' || source === 'vimeo') {
                                buildfire.dialog.show(
                                    {
                                        title: "Cannot download Media",
                                        message:
                                            "This media is not available for download.",
                                        isMessageHTML: true,
                                        actionButtons: [
                                            {
                                                text: "Ok",
                                                type: "primary",
                                                action: () => {
                                                },
                                            },
                                        ],
                                    },
                                    (err, actionButton) => {
                                    }
                                );
                            }
                            else {
                                buildfire.dialog.show(
                                    {
                                        title: "Download is starting",
                                        message:
                                            "Please do not press the back button until the download is finished.",
                                        isMessageHTML: true,
                                        actionButtons: [
                                            {
                                                text: "Ok",
                                                type: "primary",
                                                action: () => {
                                                },
                                            },
                                        ],
                                    },
                                    (err, actionButton) => {
                                        if (actionButton.text == "Ok") {
                                            $rootScope.currentlyDownloading.push(item.id);
                                            if (!$rootScope.$$phase && !$rootScope.$root.$$phase) $rootScope.$apply();
                                            buildfire.services.fileSystem.fileManager.download(
                                                {
                                                    uri:
                                                        uri,
                                                    path: "/data/mediaCenterManual/" + Buildfire.getContext().instanceId + "/" + mediaType + "/",
                                                    fileName: item.id + "." + type,
                                                },
                                                (err, filePath) => {
                                                    if (err) {
                                                        console.log("error in downloading", JSON.stringify(err));
                                                        buildfire.dialog.toast({
                                                            message: `Error`,
                                                            type: 'warning',
                                                        });
                                                        return;
                                                    }
                                                    // Save the offline media
                                                    buildfire.analytics.trackAction('mediaDownloadedOffline');
                                                    new OfflineAccess({
                                                        db: DownloadedMedia,
                                                    }).save({
                                                        mediaId: item.id,
                                                        mediaType: mediaType,
                                                        mediaPath: filePath,
                                                        createdOn: new Date(),
                                                    }, (err, result) => {
                                                        if (err) {
                                                            console.error(err);
                                                            return;
                                                        }
                                                        let index = $rootScope.currentlyDownloading.indexOf(item.id);
                                                        $rootScope.currentlyDownloading.splice(index, 1);
                                                        item.data.hasDownloadedVideo = true;
                                                        item.hasDownloadedMedia = true;
                                                        if (!$rootScope.showFeed) {
                                                            let homeItem = WidgetHome.items.filter(x => x.id === item.id)[0];
                                                            if (homeItem) {
                                                                homeItem.data.hasDownloadedVideo = true;
                                                                homeItem.hasDownloadedMedia = homeItem.data.hasDownloadedAudio;
                                                            }
                                                        }
                                                        buildfire.dialog.toast({
                                                            message: `Media has been successfully downloaded.`,
                                                        });
                                                        setTimeout(() => {
                                                            if (!$rootScope.$$phase && !$rootScope.$root.$$phase) $rootScope.$apply();
                                                        }, 0);
                                                    });
                                                }
                                            );
                                        }
                                    }
                                );
                            }

                        }
                    }
                };

                $rootScope.removeDownload = function (item, mediaType) {
                    buildfire.spinner.show();
                    let type;
                    if (mediaType === 'video') {
                        type = WidgetHome.getVideoDownloadURL(item.data.videoUrl).type;
                    }
                    buildfire.services.fileSystem.fileManager.deleteFile(
                        {
                            path: "/data/mediaCenterManual/" + Buildfire.getContext().instanceId + "/" + mediaType + "/",
                            fileName: item.id + "." + type
                        },
                        (err, isDeleted) => {
                            if (err) return console.error(err);
                            if (isDeleted) {
                                new OfflineAccess({
                                    db: DownloadedMedia,
                                }).delete({
                                    mediaId: item.id,
                                    mediaType: mediaType,
                                }, (err, res) => {
                                    if (err) {
                                        console.error(err);
                                        return;
                                    }
                                    item.data.hasDownloadedVideo = false;
                                    item.data.videoURL = "";
                                    item.hasDownloadedMedia = item.data.hasDownloadedAudio;
                                    if (!$rootScope.showFeed) {
                                        let homeItem = WidgetHome.items.filter(x => x.id === item.id)[0];
                                        if (homeItem) {
                                            homeItem.data.hasDownloadedVideo = false;
                                            homeItem.hasDownloadedMedia = homeItem.data.hasDownloadedAudio;
                                        }
                                    }
                                    buildfire.spinner.hide();
                                    setTimeout(() => {
                                        if (!$rootScope.$$phase && !$rootScope.$root.$$phase) $rootScope.$apply();
                                    }, 0);
                                    buildfire.dialog.toast({
                                        message: `Media has been removed from downloads.`,
                                    });
                                });
                            }
                        }
                    );
                };

                WidgetHome.isDownloading = function (item) {
                    return $rootScope.currentlyDownloading.indexOf(item.id) > -1;
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
                    if (!WidgetHome.isWeb) downloads.sync($scope, DownloadedMedia);
                    $rootScope.user = user;
                    $rootScope.refreshItems();
                });

                buildfire.auth.onLogout(function () {
                    buildfire.spinner.show();
                    bookmarks.sync($scope);
                    if (!WidgetHome.isWeb) downloads.sync($scope, DownloadedMedia);
                    $rootScope.user = null;
                    $rootScope.refreshItems();
                });

                WidgetHome.bookmark = function (item) {
                    var isBookmarked = item.data.bookmarked ? true : false;
                    if (isBookmarked) {
                        bookmarks.delete($scope, item);
                    } else {
                        bookmarks.add($scope, item);
                    }
                };

                WidgetHome.bookmarked = function (item) {
                    WidgetHome.bookmark(item);
                };

                WidgetHome.share = function (item) {

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

                $rootScope.$on('online', function () {
                    WidgetHome.online = $rootScope.online;
                    Location.goToHome();
                });

                $rootScope.$watch('showFeed', function () {
                    if ($rootScope.showFeed) {
                        listener.clear();
                        listener = Buildfire.datastore.onUpdate(onUpdateCallback);
                        bookmarks.sync($scope);
                        if (!WidgetHome.isWeb) downloads.sync($scope, DownloadedMedia);
                        if (!WidgetHome.items.length) WidgetHome.deepLink = true;
                        if (!$rootScope.online && !WidgetHome.isWeb) {
                            CachedMediaCenter.get((err, res) => {
                                if (err) {
                                    WidgetHome.media = _infoData;
                                }

                                else {
                                    WidgetHome.media = res;
                                }
                                setTimeout(() => {
                                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                }, 0);
                            });
                        }
                        else {
                            MediaCenter.get().then(function success(result) {
                                WidgetHome.media = result;
                                if (WidgetHome.media.data.design && $rootScope.skipMediaPage) $rootScope.skipMediaPage = true;
                                if (!WidgetHome.isWeb) {
                                    CachedMediaCenter.insert(result, (err, res) => {
                                        if (err) {
                                            buildfire.dialog.toast({
                                                message: `Error`,
                                                type: 'warning',
                                            });
                                        }

                                        setTimeout(() => {
                                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                        }, 0);
                                    });
                                }
                            },
                                function fail() {
                                    WidgetHome.media = _infoData;
                                    setTimeout(() => {
                                        if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                    }, 0);
                                }

                            );
                        }
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
