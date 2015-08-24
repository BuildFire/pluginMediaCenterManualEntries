(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', '$rootScope', 'Buildfire', 'MediaCenterInfo', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Location','Orders',
            function ($scope, $window, DB, COLLECTIONS, $rootScope, Buildfire, MediaCenterInfo, AppConfig, Messaging, EVENTS, PATHS, Location,Orders) {
                var WidgetHome = this;
                WidgetHome.media = MediaCenterInfo;
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
                            case EVENTS.DESIGN_LAYOUT_CHANGE:
                                WidgetHome.media.data.design.listLayout = event.message.listLayout;
                                $scope.$digest();
                                break;
                            case EVENTS.DESIGN_BGIMAGE_CHANGE:
                                WidgetHome.media.data.design.backgroundImage = event.message.backgroundImage;
                                AppConfig.changeBackgroundTheme(WidgetHome.media.data.design.backgroundImage);
                                $scope.$apply();

                                break;
                        }
                    }
                };
                Buildfire.datastore.onUpdate(function (event) {
                    $scope.imagesUpdated = false;
                    MediaCenter.get().then(function success(result) {
                            if (result && result.data) {
                                WidgetHome.media = result;
                                $scope.imagesUpdated = true;
                                getContent();
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

                var _skip = 0,
                    _limit = 10,
                    searchOptions = {
                    filter: {"$json.title": {"$regex": '/*'}},
                    skip: _skip,
                    limit: _limit + 1 // the plus one is to check if there are any more
                };

                var getContent = function () {
                    updateGetOptions();
                    MediaContent.find(searchOptions).then(function success (result) {
                        WidgetHome.items = result;
                    }, function error(err, result) {
                        return console.error('-----------err-------------', err);
                    });
                };
                getContent();

                $scope.isDefined = function (item) {
                    return item.imageUrl !== undefined && item.imageUrl !== '';
                };

                WidgetHome.loadMore = function () {
                    alert('scroll');
                };

            }]);
})(window.angular, undefined);