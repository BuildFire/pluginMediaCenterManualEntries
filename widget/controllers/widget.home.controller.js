(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$timeout', '$window', 'DB', 'AppDB', 'OFSTORAGE', 'COLLECTIONS', '$rootScope', 'Buildfire', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders', '$location',
            function ($scope, $timeout, $window, DB, AppDB, OFSTORAGE, COLLECTIONS, $rootScope, Buildfire, Messaging, EVENTS, PATHS, Location, Orders, $location) {
                $rootScope.loadingGlobalPlaylist = true;
                $rootScope.showFeed = true;
                $rootScope.currentlyDownloading = [];
                var WidgetHome = this;
                WidgetHome.displayItems = [];
                WidgetHome.deepLink = false;
                $rootScope.loadingData = true;
                WidgetHome.isWeb = Buildfire.getContext().device.platform == 'web';
                // $rootScope.online = $window.navigator.onLine;
                $rootScope.online = $window.navigator.onLine;
                WidgetHome.online = $rootScope.online;
                $rootScope.backgroundColor = buildfire.getContext().appTheme.colors.backgroundColor ? { "background-color": buildfire.getContext().appTheme.colors.backgroundColor } : { "background-color": '#ffffff' };
                // $rootScope.online = false;
                // WidgetHome.online = false;
                buildfire.spinner.hide();
                $rootScope.resizeImg = (url) => buildfire.imageLib.resizeImage(url);


                $rootScope.globalPlaylistStrings = {
                    itemAdded: strings.get('globalPlaylist.itemAdded'),
                    itemRemoved: strings.get('globalPlaylist.itemRemoved'),
                    addedAllItemsToPlaylist: strings.get('globalPlaylist.addedAllItemsToPlaylist'),
                    addedItemsToPlaylist: strings.get('globalPlaylist.addedItemsToPlaylist'),
                    removedAllItemsFromPlaylist: strings.get('globalPlaylist.removedAllItemsFromPlaylist'),
                    playlistLimitReached: strings.get('globalPlaylist.playlistLimitReached')
                }

                const isLauncher = window.location.href.includes('launcherPlugin');
                const slideElement = document.querySelector(".slide");
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
                            allowAddingNotes: true,
                            allowSource: true,
                            transferAudioContentToPlayList: false,
                            forceAutoPlay: false,
                            autoPlay: false,
                            autoPlayDelay: { label: "Off", value: 0 },
                            globalPlaylist: false,
                            dateIndexed: true,
                            dateCreatedIndexed: true,
                            enableFiltering: false,
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
                        $rootScope.allowAddingNotes = MediaCenterInfo.data.content.allowAddingNotes;
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
                        $rootScope.enableFiltering = MediaCenterInfo.data.content.enableFiltering;

                        if (isLauncher && MediaCenterInfo.data.content.enableFiltering) {
                            slideElement.classList.add("launcher-with-filter");
                        } else {
                            slideElement.classList.remove("launcher-with-filter");
                        }

                        if (!WidgetHome.isWeb) {
                            CachedMediaCenter.insert(MediaCenterInfo, (err, res) => {
                                if (err) {
                                }
                            });
                        }
                    },
                        function fail() {
                            MediaCenterInfo = _infoData;
                            WidgetHome.media = MediaCenterInfo;
                            if (!WidgetHome.isWeb) {
                                CachedMediaCenter.insert(MediaCenterInfo, (err, res) => {
                                    if (err) {
                                    }
                                });
                            }
                        }
                    );
                }

                else {
                    if (!WidgetHome.isWeb) {
                        CachedMediaCenter.get((err, res) => {
                            if (err) {
                                WidgetHome.media = _infoData;
                            }

                            if (res) {
                                WidgetHome.media = res;
                            }


                            $rootScope.backgroundImage = WidgetHome.media.data.design.backgroundImage;
                            $rootScope.allowShare = WidgetHome.media.data.content.allowShare;
                            $rootScope.allowAddingNotes = WidgetHome.media.data.content.allowAddingNotes;
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
                            $rootScope.enableFiltering = WidgetHome.media.data.content.enableFiltering;

                            if (isLauncher && WidgetHome.media.data.content.enableFiltering) {
                                slideElement.classList.add("launcher-with-filter");
                            } else {
                                slideElement.classList.remove("launcher-with-filter");
                            }
                        });
                    }
                    else {
                        WidgetHome.media = _infoData;
                    }
                }


                var _skip = 0,
                    _limit = 20,
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
                            $rootScope.allowAddingNotes = WidgetHome.media.data.content.allowAddingNotes;
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
                            $rootScope.enableFiltering = WidgetHome.media.data.content.enableFiltering;

                            if (view && event.data.content && event.data.content.images) {
                                view.loadItems(event.data.content.images);
                            }

                            if (isLauncher && WidgetHome.media.data.content.enableFiltering) {
                                slideElement.classList.add("launcher-with-filter");
                            } else {
                                slideElement.classList.remove("launcher-with-filter");
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
                    let filters = $rootScope.activeFilters;
                    if (filters) {
                        let orS = [];
                        let finalFilter = {};
                        if (Object.keys(filters) && Object.keys(filters).length > 0) {
                            let categories = Object.keys(filters);
                            for (let i = 0; i < categories.length; i++) {
                                let and = filters[categories[i]].length > 0 ? [] : {};
                                if (filters[categories[i]].length > 0) {
                                    filters[categories[i]].forEach(function (item) {
                                        and.push({ "$json.subcategories": item });
                                    });
                                }
                                else {
                                    and = {
                                        "$json.categories": categories[i]
                                    }
                                }
                                if (filters[categories[i]].length > 0) {
                                    orS.push({
                                        "$or": and
                                    });
                                }
                                else {
                                    orS.push(and);
                                }
                            }
                        }
                        else {
                            orS = null;
                        }

                        if (orS) {
                            finalFilter = {
                                "$and": orS
                            }
                            console.log(finalFilter);
                        }
                        searchOptions.filter = finalFilter;
                    }
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

                var _htmlDisplayItemsLimit = 20;
                WidgetHome.stopScroll = false;
                WidgetHome.skip = 0;
                WidgetHome.addMore = function () {
                    if (!WidgetHome.noMore) {
                        WidgetHome.stopScroll = true;
                        WidgetHome.loadMore();
                    }
                    else {
                        if (WidgetHome.displayItems.length < WidgetHome.items.length) {
                            WidgetHome.stopScroll = true;
                            var moreItems = WidgetHome.items.slice(WidgetHome.skip, WidgetHome.skip + _htmlDisplayItemsLimit);
                            WidgetHome.displayItems = WidgetHome.displayItems.concat(moreItems);
                            WidgetHome.skip += _htmlDisplayItemsLimit;
                            $timeout(function () {//debounce
                                WidgetHome.stopScroll = false;
                            }, 800);
                        } else {
                            WidgetHome.stopScroll = true;
                        }
                    }
                }
                //==============================================================================================================
                WidgetHome.currentSkip = 0;
                WidgetHome.currentlyLoading = false;

                WidgetHome.checkForDeeplink = () => {
                    if (!$window.deeplinkingDone) {
                        buildfire.deeplink.getData((data) => {
                            if (!data) return;
                            let itemId = null;
                            if (data.id) itemId = data.id;
                            else if (data.mediaId) itemId = data.mediaId;
                            else if (data && data.deepLinkUrl) {
                                var startOfQueryString = data.deepLinkUrl.indexOf("?dld");
                                var deepLinkUrl = data.deepLinkUrl.slice(startOfQueryString + 5, data.deepLinkUrl.length);
                                itemId = JSON.parse(deepLinkUrl).id;
                            }
                            else if (data && data.link) {
                                if (data.timeIndex && foundObj.data.videoUrl || foundObj.data.audioUrl) {
                                    $rootScope.deepLinkNavigate = true;
                                    $rootScope.seekTime = data.timeIndex;
                                }
                                if (foundObj.data.audioUrl && $rootScope.seekTime)
                                    return Location.go('#/nowplaying/' + foundObj.id);
                            }
                            else if (data && data.screen) {
                                if (WidgetHome.media && WidgetHome.media.data && WidgetHome.media.data.content) {
                                    if (WidgetHome.media.data.content.enableFiltering) {
                                        $window.deeplinkingDone = true;
                                        return WidgetHome.goToFilterScreen();
                                    }
                                }
                            }
                            $rootScope.showFeed = false;
                            $rootScope.fromSearch = true;
                            $window.deeplinkingDone = true;
                            WidgetHome.goTo(itemId);
                        });
                    }

                    buildfire.deeplink.onUpdate((deeplinkData) => {
                        if (deeplinkData && deeplinkData.id) {
                            $window.deeplinkingDone = true;
                            $rootScope.showFeed = false;
                            WidgetHome.goTo(deeplinkData.id);

                        }
                    });
                }


                WidgetHome.syncWithOfflineData = (callback) => {
                    if (!WidgetHome.isWeb) {
                        CachedMediaContent.insert(WidgetHome.items, (error, res) => {
                            if (error) return callback(err, null);
                            if (WidgetHome.items.length > 0) {
                                DownloadedMedia.get((err, res) => {
                                    let downloadedIDS = [];
                                    if (err || (!res && !res.length)) return callback(err, null);
                                    downloadedIDS = res.map(item => item.mediaId);
                                    downloadedIDS.length ?
                                        WidgetHome.items = WidgetHome.items.map(item => {
                                            if (downloadedIDS.indexOf(item.id) > -1) {
                                                item.hasDownloadedMedia = true;
                                                let downloadedItem = res[downloadedIDS.indexOf(item.id)];
                                                if (downloadedItem.mediaType == "video") {
                                                    if (downloadedItem.originalMediaUrl != item.data.videoUrl || !downloadedItem.originalMediaUrl || item.data.videoUrl.length == 0)
                                                        item.data.hasDownloadedVideo = true;
                                                    else
                                                        item.data.hasDownloadedVideo = true;
                                                }
                                                else if (downloadedItem.mediaType == "audio")
                                                    item.data.hasDownloadedAudio = true;
                                            }
                                            return item;
                                        }) : null;

                                    downloads.sync($scope, DownloadedMedia);
                                    callback(err, true);
                                });
                            } else return callback(null, true);
                        });
                    } else return callback(null, true);
                }


                const getCachedItems = (callback) => {
                    if (Buildfire.getContext().device.platform === 'web') {
                        buildfire.dialog.toast({
                            message: "You can't use offline mode in web browser",
                        });
                        WidgetHome.items = [];
                        WidgetHome.stopScroll = false;
                        WidgetHome.skip = 0;
                        WidgetHome.displayItems = [];
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
                        if (WidgetHome.noMore) {
                            buildfire.spinner.hide();
                            $rootScope.loadingData = false;
                            return;
                        }
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
                        WidgetHome.items = cachedItems;
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
                            WidgetHome.items.sort(function (a, b) {
                                if (a.hasDownloadedMedia && !b.hasDownloadedMedia) return -1;
                                if (!a.hasDownloadedMedia && b.hasDownloadedMedia) return 1;
                                return 0;
                            });
                            WidgetHome.noMore = true;
                            WidgetHome.displayItems = WidgetHome.items;
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

                WidgetHome.loadMore = () => {
                    updateGetOptions();
                    const getRecords = () => {

                        if (WidgetHome.currentlyLoading || WidgetHome.noMore) return;
                        buildfire.spinner.show();
                        WidgetHome.stopScroll = true;
                        WidgetHome.currentlyLoading = true;

                        MediaContent.find(searchOptions).then((result) => {
                            WidgetHome.items = WidgetHome.items.concat(result);

                            const finish = () => {
                                $rootScope.myItems = WidgetHome.items;
                                $rootScope.loadingData = false;
                                WidgetHome.stopScroll = false;
                                WidgetHome.currentlyLoading = false;
                                bookmarks.sync($scope);
                                buildfire.spinner.hide();
                                if (!WidgetHome.items.length) {
                                    angular.element('#emptyContainer').css('display', 'block');
                                }
                            }

                            if (result.length < searchOptions.limit) {
                                WidgetHome.noMore = true;
                            } else {
                                searchOptions.skip = searchOptions.skip + searchOptions.limit;
                                WidgetHome.currentSkip = searchOptions.skip;
                            }

                            WidgetHome.syncWithOfflineData((error, done) => {
                                if (error) console.error(error);
                                else if (done) {
                                    finish();
                                    WidgetHome.checkForDeeplink();
                                }
                            });
                        });
                    }

                    if ($rootScope.globalPlaylist && $rootScope.online) {
                        getCurrentUser(() => {
                            getGlobalPlaylistLimit();

                            getGlobalPlaylistItems()
                                .then(getRecords)
                                .finally(() => {
                                    $rootScope.loadingGlobalPlaylist = false
                                });
                        });
                    } else if ($rootScope.online) {
                        getGlobalPlaylistItems().then(getRecords).finally(() => {
                            setTimeout(() => {
                                WidgetHome.isBusy = false;
                                $rootScope.loadingData = false;
                                $rootScope.loadingGlobalPlaylist = false;
                                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                            }, 0);
                        });
                    }
                    else {
                        getCachedItems((err, res) => { });
                    }
                }
                //==============================================================================================================

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
                    if (WidgetHome.media.data.content.allowAddingNotes !== false && $rootScope.online) {
                        listItems.push({ id: "addNote", text: strings.get("homeDrawer.addNote") });
                    }
                    if (WidgetHome.media.data.content.allowOfflineDownload && $rootScope.online) {
                        if (item.data.videoUrl) {
                            if (item.data.hasDownloadedVideo) {
                                listItems.push({ id: "removeDownloadedVideo", text: strings.get("homeDrawer.removeDownloadedVideo") });
                            }

                            else {
                                if ($rootScope.currentlyDownloading.indexOf(item.id) < 0)
                                    listItems.push({ id: "downloadVideo", text: strings.get("homeDrawer.downloadVideo") });
                            }
                        }

                        if (item.data.audioUrl) {
                            if (item.data.hasDownloadedAudio) {
                                listItems.push({ id: "removeDownloadedAudio", text: strings.get("homeDrawer.removeDownloadedAudio") });
                            }

                            else {
                                if ($rootScope.currentlyDownloading.indexOf(item.id) < 0)
                                listItems.push({ id: "downloadAudio", text: strings.get("homeDrawer.downloadAudio") });
                            }
                        }
                    }

                    if (WidgetHome.media.data.content.allowShare && $rootScope.online) {
                        listItems.push({ id: "share", text: strings.get("homeDrawer.share") });
                    }

                    if (item.data.links.length && $rootScope.online) {
                        listItems.push({ id: "openLinks", text: strings.get("homeDrawer.openLinks") });
                    }

                    if (WidgetHome.media.data.content.globalPlaylist && $rootScope.online) {
                        if ($rootScope.isInGlobalPlaylist(item.id)) {
                            listItems.push({ id: "removeFromPlaylist", text: strings.get("homeDrawer.removeFromPlaylist") });
                        }
                        else {
                            listItems.push({ id: "addToPlaylist", text: strings.get("homeDrawer.addToPlaylist") });
                        }
                    }

                    if ($rootScope.online) {
                        if (item.data.bookmarked) {
                            listItems.push({ id: "removeFromFavorites", text: strings.get("homeDrawer.removeFromFavorites") });
                        }
                        else {
                            listItems.push({ id: "favorite", text: strings.get("homeDrawer.favorite") });
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
                                if (result.id == "downloadVideo") {
                                    $rootScope.download(item, "video");
                                }

                                if (result.id == "removeDownloadedVideo") {
                                    $rootScope.removeDownload(item, "video");
                                }

                                if (result.id == "downloadAudio") {
                                    $rootScope.download(item, "audio");
                                }

                                if (result.id == "removeDownloadedAudio") {
                                    $rootScope.removeDownload(item, "audio");
                                }

                                if (result.id == "share") {
                                    WidgetHome.share(item);
                                }

                                if (result.id == "openLinks") {
                                    WidgetHome.openLinks(item.data.links);
                                }

                                if (result.id == "addToPlaylist") {
                                    $rootScope.toggleGlobalPlaylistItem(item);
                                }

                                if (result.id == "removeFromPlaylist") {
                                    $rootScope.toggleGlobalPlaylistItem(item);
                                }

                                if (result.id == "addNote") {
                                    WidgetHome.addNote(item);
                                }

                                if (result.id == "removeFromFavorites") {
                                    WidgetHome.bookmark(item);
                                }

                                if (result.id == "favorite") {
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

                WidgetHome.getAudioDownloadURL = function (audioUrl) {
                        var myType;
                        var audioUrlToSend = audioUrl;
                        myType = audioUrlToSend.split('.').pop();
                        return {
                            uri: audioUrlToSend,
                            type: myType,
                            source: null
                        }
                }

                var downloadInvalid = () => {
                    buildfire.dialog.show(
                        {
                            title: "Cannot download Media",
                            message: "This media is not available for download.",
                            isMessageHTML: true,
                            actionButtons: [
                                {
                                    text: "Ok",
                                    type: "primary",
                                    action: () => { }
                                },
                            ],
                        }, (err, actionButton) => { });
                }

                var beginDownload = (callback) => {
                    buildfire.dialog.show(
                        {
                            title: "Download is starting",
                            message: "Please do not press the back button until the download is finished.",
                            isMessageHTML: true,
                            actionButtons: [
                                {
                                    text: "Ok",
                                    type: "primary",
                                    action: () => { },
                                },
                            ]
                        }, (err, actionButton) => {
                            if (actionButton.text == "Ok") callback();
                        });
                }

                $rootScope.download = function (item, mediaType) {
                    if (Buildfire.getContext().device.platform === 'web') {
                        buildfire.dialog.alert({
                            message: "You can't download media in the web browser",
                        });
                        return;
                    }
                    beginDownload(() => {
                        let { uri, type, source } = mediaType == 'video' ? WidgetHome.getVideoDownloadURL(item.data.videoUrl)
                            : WidgetHome.getAudioDownloadURL(item.data.audioUrl);
                        if (source && (source === 'youtube' || source === 'vimeo')) return downloadInvalid();
                        $rootScope.currentlyDownloading.push(item.id);
                        if (!$rootScope.$$phase && !$rootScope.$root.$$phase) $rootScope.$apply();
                        buildfire.services.fileSystem.fileManager.download(
                            {
                                uri: uri,
                                path: "/data/mediaCenterManual/" + Buildfire.getContext().instanceId + "/" + mediaType + "/",
                                fileName: item.id + "." + type,
                                returnAsWebUri: true
                            },
                            (err, filePath) => {
                                if (err) {
                                    let index = $rootScope.currentlyDownloading.indexOf(item.id);
                                    $rootScope.currentlyDownloading.splice(index, 1);
                                    buildfire.dialog.toast({
                                        message: `Error`,
                                        type: 'warning',
                                    });
                                    return;
                                }
                                new OfflineAccess({
                                    db: DownloadedMedia,
                                }).save({
                                    mediaId: item.id,
                                    mediaType: mediaType,
                                    mediaPath: filePath,
                                    originalMediaUrl: mediaType == 'video' ? item.data.videoUrl : item.data.audioUrl,
                                    createdOn: new Date(),
                                }, (err, result) => {
                                    if (err) {
                                        console.error(err);
                                        return;
                                    }
                                    buildfire.analytics.trackAction(`${item.id}_downloads`);
                                    let index = $rootScope.currentlyDownloading.indexOf(item.id);
                                    $rootScope.currentlyDownloading.splice(index, 1);
                                    if (mediaType == 'video')
                                        item.data.hasDownloadedVideo = true;
                                    else
                                        item.data.hasDownloadedAudio = true;

                                    item.hasDownloadedMedia = true;
                                    if (!$rootScope.showFeed) {
                                        let homeItem = WidgetHome.items.filter(x => x.id === item.id)[0];
                                        if (homeItem) {
                                            if (mediaType == 'video')
                                                homeItem.data.hasDownloadedVideo = true;
                                            else
                                                homeItem.data.hasDownloadedAudio = true;

                                            homeItem.hasDownloadedMedia = true;
                                        }
                                    }
                                    buildfire.dialog.toast({
                                        message: `Media has been successfully downloaded.`,
                                    });
                                    setTimeout(() => {
                                        if (!$rootScope.$$phase && !$rootScope.$root.$$phase) $rootScope.$apply();
                                    }, 0);
                                });
                            });
                    });
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
                    searchOptions.skip = 0;
                    WidgetHome.items = [];
                    WidgetHome.stopScroll = false;
                    WidgetHome.skip = 0;
                    WidgetHome.displayItems = []
                    WidgetHome.noMore = false;
                    WidgetHome.globalPlaylistLoaded = false;
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

                WidgetHome.dismissOfflineBox = function () {
                    $rootScope.showOfflineBox = false;
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
                        if ($rootScope.online) {
                            listener.clear();
                            listener = Buildfire.datastore.onUpdate(onUpdateCallback);
                        }
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
                                    WidgetHome.loadMore();
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
                                        }
                                        setTimeout(() => {
                                            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                                        }, 0);
                                    });
                                }
                                WidgetHome.loadMore();
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

                $rootScope.loadMore = () => WidgetHome.loadMore();

                WidgetHome.goToFilterScreen = function () {
                    $rootScope.showFeed = false;
                    Location.go('#/filters', true);
                };

                $rootScope.$watch('goingBack', function () {
                    if ($rootScope.goingBack) {
                        WidgetHome.deepLink = true;
                    }
                });
                $rootScope.$on('activeFiltersChanged', function () {
                    if ($rootScope.activeFilters) {
                        if (Object.keys($rootScope.activeFilters) && Object.keys($rootScope.activeFilters).length) {
                            WidgetHome.activeFilters = true;
                        }
                        else {
                            WidgetHome.activeFilters = false;
                        }
                        WidgetHome.items = [];
                        searchOptions.skip = 0;
                        WidgetHome.displayItems = [];
                        WidgetHome.noMore = false;
                        WidgetHome.loadMore();
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