(function (angular, buildfire, location) {
    'use strict';
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidgetServices', ['mediaCenterEnums'])
        .provider('Buildfire', [function () {
            this.$get = function () {
                return buildfire;
            };
        }])
        .provider('Messaging', [function () {
            this.$get = function () {
                return buildfire.messaging;
            };
        }])
        .factory('Location', [function () {
            var _location = location;
            return {
                go: function (path, pushToHistory) {
                    if(pushToHistory) {
                        setTimeout(function () {
                            buildfire.history.push(path);
                        }, 1000);
                    }
                    _location.href = path;
                },
                goToHome: function () {
                    _location.href = _location.href.substr(0, _location.href.indexOf('#'));
                }
            };
        }])
      .factory('Orders', [function () {
          var ordersMap = {
              Manually: "Manually",
              Default: "Manually",
              Newest: "Newest",
              Oldest: "Oldest",
              Most: " Oldest",
              Least: " Oldest",
              MediaDateAsc:"Media Date Asc",
              MediaDateDesc:"Media Date Desc"
          };
          var orders = [
              {id: 1, name: "Manually", value: "Manually", key: "rank", order: 1},
              {id: 1, name: "Newest", value: "Newest", key: "dateCreated", order: -1},
              {id: 1, name: "Oldest", value: "Oldest", key: "dateCreated", order: 1},
              {id: 1, name: "Media Title A-Z", value: "Media Title A-Z", key: "title", order: 1},
              {id: 1, name: "Media Title Z-A", value: "Media Title Z-A", key: "title", order: -1},
              {id: 1, name: "Media Date Asc", value: "Media Date Asc", key: "mediaDate", order: 1},
              {id: 1, name: "Media Date Desc", value: "Media Date Desc", key: "mediaDate", order: -1}
          ];
          return {
              ordersMap: ordersMap,
              options: orders,
              getOrder: function (name) {
                  return orders.filter(function (order) {
                      return order.name === name;
                  })[0];
              }
          };
      }])

      .factory("DB", ['Buildfire', '$q', 'MESSAGES', 'CODES', function (Buildfire, $q, MESSAGES, CODES) {
            function DB(tagName) {
                this._tagName = tagName;
            }

            DB.prototype.get = function () {
                var that = this;
                var deferred = $q.defer();
                Buildfire.datastore.get(that._tagName, function (err, result) {
                    if (err && err.code == CODES.NOT_FOUND) {
                        return deferred.resolve();
                    }
                    else if (err) {
                        return deferred.reject(err);
                    }
                    else {
                        return deferred.resolve(result);
                    }
                });
                return deferred.promise;
            };
            DB.prototype.getById = function (id) {
                var that = this;
                var deferred = $q.defer();
                Buildfire.datastore.getById(id, that._tagName, function (err, result) {
                    console.log("GET BY ID", result)

                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result && result.data) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };
            DB.prototype.insert = function (items) {
                var that = this;
                var deferred = $q.defer();
                if (typeof items == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                }
                if (Array.isArray(items)) {
                    Buildfire.datastore.bulkInsert(items, that._tagName, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        else if (result) {
                            return deferred.resolve(result);
                        } else {
                            return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                        }
                    });
                } else {
                    Buildfire.datastore.insert(items, that._tagName, false, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        else if (result) {
                            return deferred.resolve(result);
                        } else {
                            return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                        }
                    });
                }
                return deferred.promise;
            };
            DB.prototype.find = function (options) {
                var that = this;
                var deferred = $q.defer();
                if (typeof options == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.OPTION_REQUIRES));
                }
                Buildfire.datastore.search(options, that._tagName, function (err, result) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };
            DB.prototype.update = function (id, item) {
                var that = this;
                var deferred = $q.defer();
                if (typeof id == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                }
                if (typeof item == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                }
                Buildfire.datastore.update(id, item, that._tagName, function (err, result) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };
            DB.prototype.save = function (item) {
                var that = this;
                var deferred = $q.defer();
                if (typeof item == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                }
                Buildfire.datastore.save(item, that._tagName, function (err, result) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };
            DB.prototype.delete = function (id) {
                var that = this;
                var deferred = $q.defer();
                if (typeof id == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                }
                Buildfire.datastore.delete(id, that._tagName, function (err, result) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };
            return DB;
        }])
        .factory("AppDB", ['$rootScope', 'Buildfire', '$q', 'MESSAGES', 'CODES', function ($rootScope, Buildfire, $q, MESSAGES, CODES) {
            function AppDB() {};

            const getTagName = () => {
                return 'MediaContent' + ($rootScope.user && $rootScope.user._id ? $rootScope.user._id : Buildfire.context.deviceId ? Buildfire.context.deviceId : '');
            };

            AppDB.prototype.get = () => {
                const tagName = getTagName();
                var deferred = $q.defer();
                Buildfire.appData.get(tagName, (err, result) => {
                    if (err && err.code == CODES.NOT_FOUND) {
                        return deferred.resolve();
                    }
                    else if (err) {
                        return deferred.reject(err);
                    }
                    else {
                        return deferred.resolve(result);
                    }
                });
                return deferred.promise;
            };

            AppDB.prototype.getById = (id) => {
                const tagName = getTagName();
                var deferred = $q.defer();
                Buildfire.appData.getById(id, tagName, (err, result) => {
                    console.log("GET BY ID", result)
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result && result.data) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };

            AppDB.prototype.insertAndUpdate = (item) => {
                const tagName = getTagName();
                var deferred = $q.defer();
                if (typeof item == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                }

                const _set = { $set: { [`playlist.${item.id}`]: item.data } };
                Buildfire.appData.update($rootScope.globalPlaylistItems.id, _set, tagName, (err, result) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };

            AppDB.prototype.insertAndUpdateAll = (items) => {
                const tagName = getTagName();
                var deferred = $q.defer();
                if (typeof items == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                }
                const _set = { $set: {} };

                for (let item of items) {
                    _set.$set[`playlist.${item.id}`] = item.data;
                }

                Buildfire.appData.update($rootScope.globalPlaylistItems.id, _set, tagName, (err, result) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };

            AppDB.prototype.save = (item) => {
                const tagName = getTagName();
                var deferred = $q.defer();
                if (typeof item == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                };

                Buildfire.appData.save(item, tagName, (err, result) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };

            AppDB.prototype.delete = (id) => {
                const tagName = getTagName();
                var deferred = $q.defer();
                if (typeof id == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                }

                const itemId = `playlist.${id}`;

                let unset = {
                    $unset: {
                        [itemId]: "",
                    },
                };

                Buildfire.appData.update($rootScope.globalPlaylistItems.id, unset, tagName, (err, result) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };

            AppDB.prototype.deleteAll = (itemsIds) => {
                const tagName = getTagName();
                var deferred = $q.defer();

                let unset = {
                    $unset: {},
                };

                itemsIds.forEach(itemId => {
                    unset['$unset'][`playlist.${itemId}`] = "";
                });
                
                Buildfire.appData.update($rootScope.globalPlaylistItems.id, unset, tagName, (err, result) => {
                    if (err) {
                        return deferred.reject(err);
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };

            // Global Playlist Limit get and set
            AppDB.prototype.getGlobalPlaylistLimit = () => {
                const tagName = "GlobalPlayListSettings";
                var deferred = $q.defer();
                Buildfire.appData.get(tagName, (err, result) => {
                    if (err && err.code == CODES.NOT_FOUND) {
                        return deferred.resolve();
                    }
                    else if (err) {
                        return deferred.reject(err);
                    }
                    else {
                        return deferred.resolve(result);
                    }
                });
                return deferred.promise;
            };

            return AppDB;
        }]);
})(window.angular, window.buildfire, window.location);