(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders', '$location',
            function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, Messaging, EVENTS, PATHS, Location, Orders, $location) {
                $rootScope.showFeed = true;
                var WidgetHome = this;
                var _infoData = {
                    data: {
                        content: {
                            images: [],
                            descriptionHTML: '<p>&nbsp;<br></p>',
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

                    },
                    function fail() {
                        MediaCenterInfo = _infoData;
                        WidgetHome.media = MediaCenterInfo;
                    }
                );
                var _skip = 0,
                    _limit = 10,
                    searchOptions = {
                        filter: {"$json.title": {"$regex": '/*'}},
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
                $rootScope.deviceWidth = WidgetHome.deviceWidth = window.innerWidth;

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
                Messaging.onReceivedMessage = function (event) {
                    if (event) {
                        switch (event.name) {
                            case EVENTS.ROUTE_CHANGE:
                                if((event.message && event.message.path == PATHS.MEDIA && $location.$$path.indexOf('/media') == -1) || (event.message && event.message.path != PATHS.MEDIA)) {
                                    var path = event.message.path,
                                        id = event.message.id;
                                    var url = "#/";
                                    switch (path) {
                                        case PATHS.MEDIA:
                                            url = url + "media/";
                                            if (id) {
                                                url = url + id + "/";
                                            }
                                            break;
                                    }
                                    Location.go(url);
                                    if (path == PATHS.MEDIA) {
                                        $rootScope.showFeed = false;
                                    }
                                    else {
                                        $rootScope.showFeed = true;
                                    }
                                    $scope.$apply();
                                }
                                break;
                            case EVENTS.ITEMS_CHANGE:
                                WidgetHome.refreshItems();
                                break;
                        }
                    }
                };

                var onUpdateCallback = function (event) {
                    if (event.tag == "MediaCenter") {
                        if (event.data) {
                            WidgetHome.media.data = event.data;
                            $rootScope.backgroundImage = WidgetHome.media.data.design.backgroundImage;
                            console.log(WidgetHome.media);
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
                        searchOptions.sort = sort;
                        return true;
                    }
                    else {
                        return false;
                    }
                };

                // ShowDescription only when it have content
                WidgetHome.showDescription = function () {
                    if (WidgetHome.media.data.content.descriptionHTML == '<p>&nbsp;<br></p>' || WidgetHome.media.data.content.descriptionHTML == '<p><br data-mce-bogus="1"></p>'|| WidgetHome.media.data.content.descriptionHTML == '')
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
                        WidgetHome.items = WidgetHome.items ? WidgetHome.items.concat(result) : result;
                        WidgetHome.isBusy = false;
                    }, function fail() {
                        WidgetHome.isBusy = false;
                        console.error('error');
                    });
                };

                WidgetHome.refreshItems = function () {
                    searchOptions.skip = 0;
                    WidgetHome.items = [];
                    WidgetHome.noMore = false;
                    WidgetHome.loadMore();
                };

                WidgetHome.goToMedia = function (ind) {
                    $rootScope.showFeed = false;
                    Location.go('#/media/' + WidgetHome.items[ind].id);
                };

                $rootScope.$on("Carousel:LOADED", function () {
                    if (WidgetHome.media.data.content && WidgetHome.media.data.content.images) {
                        view = new Buildfire.components.carousel.view("#carousel", WidgetHome.media.data.content.images);
                        //view.loadItems(WidgetHome.media.data.content.images, false);
                    } else {
                        view.loadItems([]);
                    }
                });

                Messaging.sendMessageToControl({
                    name: EVENTS.ROUTE_CHANGE,
                    message: {
                        path: PATHS.HOME
                    }
                });

                $rootScope.$watch('showFeed', function () {
                    if ($rootScope.showFeed) {
                        listener.clear();
                        listener = Buildfire.datastore.onUpdate(onUpdateCallback);

                        MediaCenter.get().then(function success(result) {
                                WidgetHome.media = result;
                            },
                            function fail() {
                                WidgetHome.media = _infoData;
                            }
                        );
                    }
                });
                /**
                 * Implementation of pull down to refresh
                 */
                var onRefresh=Buildfire.datastore.onRefresh(function(){
                    Location.goToHome();
                });


            }]);
})(window.angular);