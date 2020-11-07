"use strict";

var bookmarks = {
    add: function add($scope, item) {
        var options = {
            id: item.id,
            title: item.data.title,
            payload: {
                mediaId: encodeURIComponent(item.id)
            },
            icon: item.data.topImage
        };
        var callback = function callback(err, data) {
            if (err) throw err;
            if ($scope.WidgetHome) {
                $scope.WidgetHome.items.map(function (i) {
                    var isBookmarked = i.id === item.id;
                    if (isBookmarked) {
                        i.data.bookmarked = true;
                    }
                });
            } else if ($scope.WidgetMedia) {
                $scope.WidgetMedia.item.data.bookmarked = true;
            } else if ($scope.NowPlaying) {
                $scope.NowPlaying.item.data.bookmarked = true;
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };
        buildfire.bookmarks ? buildfire.bookmarks.add(options, callback) : null;
    },
    delete: function _delete($scope, item) {
        var callback = function callback() {
            if ($scope.WidgetHome) {
                $scope.WidgetHome.items.map(function (i) {
                    var isBookmarked = i.id === item.id;
                    if (isBookmarked) {
                        i.data.bookmarked = false;
                    }
                });
            } else if ($scope.WidgetMedia) {
                $scope.WidgetMedia.item.data.bookmarked = false;
            } else if ($scope.NowPlaying) {
                $scope.NowPlaying.item.data.bookmarked = false;
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };
        buildfire.bookmarks ? buildfire.bookmarks.delete(item.id, callback) : null;
    },
    _getAll: function _getAll(callback) {
        var cb = function cb(err, bookmarks) {
            if (err) throw err;
            callback(bookmarks);
        };
        buildfire.bookmarks ? buildfire.bookmarks.getAll(cb) : cb(null, []);
    },
    sync: function sync($scope) {
        this._getAll(function (bookmarks) {
            var bookmarkIds = [];
            bookmarks.forEach(function (bookmark) {
                bookmarkIds.push(bookmark.id);
            });
            if ($scope.WidgetHome) {
                $scope.WidgetHome.items.map(function (item) {
                    var isBookmarked = bookmarkIds.includes(item.id);
                    if (isBookmarked) {
                        item.data.bookmarked = true;
                    } else {
                        item.data.bookmarked = false;
                    }
                });
            } else if ($scope.WidgetMedia) {
                var isBookmarked = bookmarkIds.includes($scope.WidgetMedia.item.id);
                if (isBookmarked) {
                    $scope.WidgetMedia.item.data.bookmarked = true;
                } else {
                    $scope.WidgetMedia.item.data.bookmarked = false;
                }
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    }
};