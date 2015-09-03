(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'MediaCenterInfo', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders',
            function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, MediaCenterInfo, AppConfig, Messaging, EVENTS, PATHS, Location, Orders) {
                var WidgetHome = this;
                WidgetHome.media = MediaCenterInfo;

                var _skip = 0,
                    _limit = 5,
                    searchOptions = {
                        filter: {"$json.title": {"$regex": '/*'}},
                        skip: _skip,
                        limit: _limit + 1 // the plus one is to check if there are any more
                    };

                WidgetHome.isBusy = false;

                var currentBackgroundImage = WidgetHome.media.data.design.backgroundImage;
                AppConfig.setSettings(MediaCenterInfo.data);
                AppConfig.changeBackgroundTheme(currentBackgroundImage);

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
                          /*  case EVENTS.DESIGN_LAYOUT_CHANGE:
                                WidgetHome.media.data.design.listLayout = event.message.listLayout;
                                $scope.$digest();
                                break;
                            case EVENTS.DESIGN_BGIMAGE_CHANGE:
                                WidgetHome.media.data.design.backgroundImage = event.message.backgroundImage;
                                AppConfig.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);
                                $scope.$apply();

                                break;*/
                        }
                    }
                };

                Buildfire.datastore.onUpdate(function (event) {
                    $scope.imagesUpdated = false;
                    MediaCenter.get().then(function success(result) {
                            if (result && result.data) {
                                WidgetHome.media = result;
                                $scope.imagesUpdated = true;

                                /* reset Search options */
                                WidgetHome.noMore=false;
                                searchOptions.skip = 0;
                                /* Reset skip to ensure search begins from scratch*/

                                AppConfig.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);

                                WidgetHome.items =[];
                                WidgetHome.loadMore();

                                $scope.$apply();
                            }
                        },
                        function fail(error) {
                        }
                    );

                    /*switch (event.tag) {
                     case COLLECTIONS.MediaContent:
                     if (event.data) {
                     /!**
                     * condition added to update the background image
                     *!/
                     if (event.data.design && event.data.design.backgroundImage && currentBackgroundImage == event.data.design.backgroundImage) {
                     // do something on same
                     }
                     else {
                     currentBackgroundImage = event.data.design.backgroundImage;
                     AppConfig.changeBackgroundTheme(currentBackgroundImage);
                     }
                     }
                     break;
                     }*/

                });

                var MediaContent = new DB(COLLECTIONS.MediaContent);
                var MediaCenter = new DB(COLLECTIONS.MediaCenter);

                var currentItemLayout,
                    currentListLayout, currentSortOrder, currentBackgroundImage;

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

                $scope.isDefined = function (item) {
                    return item.imageUrl !== undefined && item.imageUrl !== '';
                };

                WidgetHome.items = [];
                WidgetHome.noMore = false;

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
                        console.log('error');
                    });
                };

            }]);
})(window.angular, undefined);