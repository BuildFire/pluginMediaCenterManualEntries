(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'MediaCenterInfo', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders',
            function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, MediaCenterInfo, AppConfig, Messaging, EVENTS, PATHS, Location, Orders) {
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
                 * WidgetHome.media contains MediaCenterInfo.
                 * @type {MediaCenterInfo|*}
                 */

                if (!MediaCenterInfo)
                    MediaCenterInfo = _infoData;

                WidgetHome.media = MediaCenterInfo;
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
                /**
                 * AppConfig.setSettings() set the Settings.
                 */
                AppConfig.setSettings(MediaCenterInfo.data);

                /*declare the device width heights*/
                WidgetHome.deviceHeight = window.innerHeight;
                WidgetHome.deviceWidth = window.innerWidth;

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
                                    default :

                                        break
                                }
                                Location.go(url);
                                break;
                        }
                    }
                };

                /**
                 * Buildfire.datastore.onUpdate method calls when Data is changed.
                 */
                Buildfire.datastore.onUpdate(function (event) {
                    if (event.tag == "MediaCenter") {
                        if (event.data) {
                            WidgetHome.media.data = event.data;
                            console.log(WidgetHome.media);
                            $scope.$apply();
                            if (view && event.data.content && event.data.content.images) {
                                view.loadItems(event.data.content.images);
                            }
                        }
                    }
                    else {
                        WidgetHome.items = [];
                        WidgetHome.noMore = false;
                        WidgetHome.loadMore();
                    }
                });

                /**
                 * Create instance of MediaContent, MediaCenter db collection
                 * @type {DB}
                 */
                var MediaContent = new DB(COLLECTIONS.MediaContent);
                //var MediaCenter = new DB(COLLECTIONS.MediaCenter); // commented bcos its not used

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
                    if (WidgetHome.media.data.content.descriptionHTML == '<p>&nbsp;<br></p>' || WidgetHome.media.data.content.descriptionHTML == '<p><br data-mce-bogus="1"></p>')
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

                    if (WidgetHome.isBusy && !WidgetHome.noMore) {
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

                WidgetHome.goToMedia = function (ind) {
                    Location.go('#/media/' + WidgetHome.items[ind].id);
                };

                $rootScope.$on("Carousel:LOADED", function () {
                    if (WidgetHome.media.data.content && WidgetHome.media.data.content.images) {
                        view = new Buildfire.components.carousel.view("#carousel", []);
                        view.loadItems(WidgetHome.media.data.content.images, false);
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

            }]);
})(window.angular, undefined);