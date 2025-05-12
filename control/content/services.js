(function (angular, buildfire, location) {
    'use strict';
    //created mediaCenterWidget module
    var settings, appId;
    var Settings = {
        setSettings: function (newSettings) {
            settings = newSettings;
        },
        setAppId: function (newId) {
            appId = newId;
        },
        getSetting: function () {
            return settings;
        },
        getAppId: function () {
            return appId;
        }
    };
    angular
        .module('mediaCenterContentServices', ['mediaCenterEnums'])
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
        .provider('ImageLib', [function () {
            this.$get = function () {
                return buildfire.imageLib;
            };
        }])
        .factory('Location', [function () {
            var _location = location;
            return {
                go: function (path) {
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
                Least: " Oldest"
            };
            var orders = [
                { id: 1, name: "Manual", value: "Manually", key: "rank", order: 1 },
                { id: 1, name: "Media Title A-Z", value: "Media Title A-Z", key: "title", order: 1 },
                { id: 1, name: "Media Title Z-A", value: "Media Title Z-A", key: "title", order: -1 },
                { id: 1, name: "Media Date Asc", value: "Media Date Asc", key: "mediaDateIndex", order: 1 },
                { id: 1, name: "Media Date Desc", value: "Media Date Desc", key: "mediaDateIndex", order: -1 },
                { id: 1, name: "Newest", value: "Newest", key: "dateCreated", order: -1 },
                { id: 1, name: "Oldest", value: "Oldest", key: "dateCreated", order: 1 },
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
        .factory('CategoryOrders', [function () {
            var ordersMap = {
                Manually: "Manually",
                Default: "Manually",
                Newest: "Newest",
                Oldest: "Oldest",
                Most: " Oldest",
                Least: " Oldest"
            };
            var orders = [
                { id: 1, name: "Manual", value: "Manually", key: "rank", order: 1 },
                { id: 1, name: "Category Title A-Z", value: "Category Title A-Z", key: "name", order: 1 },
                { id: 1, name: "Category Title Z-A", value: "Category Title Z-A", key: "name", order: -1 },
                { id: 1, name: "Newest", value: "Newest", key: "createdOn", order: -1 },
                { id: 1, name: "Oldest", value: "Oldest", key: "createdOn", order: 1 },
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
        .factory('SubcategoryOrders', [function () {
            var ordersMap = {
                Manually: "Manually",
                Default: "Manually",
                Newest: "Newest",
                Oldest: "Oldest",
                Most: " Oldest",
                Least: " Oldest"
            };
            var orders = [
                { id: 1, name: "Manual", value: "Manually", key: "rank", order: 1 },
                { id: 1, name: "Subcategory Title A-Z", value: "Subcategory Title A-Z", key: "title", order: 1 },
                { id: 1, name: "Subcategory Title Z-A", value: "Subcategory Title Z-A", key: "title", order: -1 },
                { id: 1, name: "Subcategory Date Asc", value: "Subcategory Date Asc", key: "subcategoryDateIndex", order: 1 },
                { id: 1, name: "Subcategory Date Desc", value: "Subcategory Date Desc", key: "subcategoryDateIndex", order: -1 },
                { id: 1, name: "Newest", value: "Newest", key: "dateCreated", order: -1 },
                { id: 1, name: "Oldest", value: "Oldest", key: "dateCreated", order: 1 },
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
        .factory("SearchEngine", ["Buildfire", '$q', 'MESSAGES', function (Buildfire, $q, MESSAGES) {
            function SearchEngine(tagName) {
                this._tagName = tagName;
            }
            SearchEngine.prototype.insert = function (item) {
                var that = this;
                var deferred = $q.defer();
                if (typeof item == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                }
                var data = {
                    key: item.id,
                    tag: that._tagName,
                    title: item.title,
                    description: item.summary,
                    imageUrl: item.topImage,
                };

                if (item.deepLinkUrl) {
                    data.data = {
                        deepLinkUrl: item.deepLinkUrl
                    }
                };

                Buildfire.services.searchEngine.save(data, function (err, result) {
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

            SearchEngine.prototype.update = function (id, item) {
                var that = this;
                var deferred = $q.defer();
                if (typeof id == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                }
                if (typeof item == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                }

                var data = {
                    id: id,
                    tag: that._tagName,
                    title: item.title,
                    description: item.summary,
                    imageUrl: item.topImage,
                    data: {
                        deepLinkUrl: item.deepLinkUrl
                    },
                };

                Buildfire.services.searchEngine.update(data, function (err, result) {
                    if (err) {
                        if (err.errorMessage === "Not Found") {
                            return deferred.resolve(that.insert(item));
                        } else {
                            return deferred.reject(err);
                        }
                    }
                    else if (result) {
                        return deferred.resolve(result);
                    } else {
                        return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOUND));
                    }
                });
                return deferred.promise;
            };

            SearchEngine.prototype.delete = function (key, callback) {
                var that = this;
                var deferred = $q.defer();

				if (typeof key === 'undefined') {
					var error = new Error(MESSAGES.ERROR.ID_NOT_DEFINED);
					deferred.reject(error);
					callback(error, null);
					return deferred.promise;
				}

                var data = {
                key,
                tag: that._tagName
                };

                Buildfire.services.searchEngine.delete(data, function (err, result) {
                    if (err) {
                        if (err.errorMessage && err.errorMessage === 'Not Found'){
							deferred.resolve(true);
                            callback(null, true);
						}
						else {
							deferred.reject(err);
							callback(err, null);
                    }
                    } else if (result) {
						deferred.resolve(result);
                        callback(null, result);
                    }
                });
                return deferred.promise;
            };

            return SearchEngine;
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
            DB.prototype.getManyByIds = function (ids, callback, records = []) {
                if (!ids.length) return callback(records);
                const batchSize = 20;
                const batch = ids.splice(0, batchSize);

                const promises = batch.map(_recordId => this.getById(_recordId));

                Promise.all(promises).then((res) => {
                    this.getManyByIds(ids, callback, [...records, ...res])
                });
            }
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
                console.log("Saving", item);
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
            DB.prototype.bulkUpdateItems = function (items, callback) {
                if (!items.length) return callback(null, []);
                const batchSize = 20;
                const batch = items.splice(0, batchSize);

                const promises = batch.map(_record =>
                    new Promise((resolve, reject) =>
                        this.update(_record.id, _record).then(() => {
                            resolve(true);
                        }).catch(err => reject(err))
                    ));

                Promise.allSettled(promises).then(() => this.bulkUpdateItems(items, callback));
            };
            return DB;
        }])
        .value('Settings', Settings)
        .factory("AppConfig", ['$rootScope', 'Buildfire', 'Settings', function ($rootScope, Buildfire, Settings) {
            return {
                setSettings: function (newSettings) {
                    Settings.setSettings(newSettings);
                },
                setAppId: function (newAppId) {
                    Settings.setAppId(newAppId);
                },
                getSettings: function () {
                    return Settings.getSetting();
                },
                getAppId: function () {
                    return Settings.getAppId();
                }
            };
        }])
        .factory("PerfomanceIndexingService", ['Buildfire', function (Buildfire) {
            return {
                buildMediaCountDataIndex: function (data) {
                    var mediaType = data.mediaType;
                    if (mediaType === "VIDEO") {
                        mediaType = "Video"
                    }
                    var index = {
                        'string1': data.mediaId + "-" + (data.isActive ? "true" : "false"),
                        "text": data.mediaId + "-" + data.userId + '-' + mediaType + "-" + (data.isActive ? "true" : "false"),
                        "array1": [{
                            "string1": "mediaCount-" + data.mediaId + "-" + data.userId + '-' + mediaType + "-" + (data.isActive ? "true" : "false"),
                        }]
                    }
                    return index;
                },

                getMediaCountDataWithIndex: function (item) {
                    item.data._buildfire = {
                        index: this.buildMediaCountDataIndex(item.data)
                    }
                    return item;
                },
                processMediaCountsData: function (record, callback) {
                    if (record.data.userId) {
                        record = this.getMediaCountDataWithIndex(record);
                        buildfire.publicData.update(record.id, record.data, 'MediaCount', function (err, result) {
                            if (err) return console.error(err);
                            if (result && result.id) {
                                callback();
                            }
                        });
                    } else {
                        callback();
                    }

                },

                iterateMediaCountData: function (records, index) {
                    if (index !== records.length) {
                        this.processMediaCountsData(records[index], () => this.iterateMediaCountData(records, index + 1));
                    } else {
                        buildfire.datastore.get('MediaCenter', (err, result) => {
                            result.data.indexingUpdateDoneV2 = true;
                            buildfire.datastore.save(result.data, 'MediaCenter', (err, saved) => {
                                buildfire.dialog.alert(
                                    {
                                        title: 'MCM Update',
                                        message: "Database has been successfully updated. Thank you for your patience!",
                                    }, (err, isConfirmed) => {
                                        if (err) return console.error(err);
                                        if (isConfirmed) {

                                        }
                                    }
                                );
                            });
                        });
                    }
                },
                startMediaCountDataIndexingUpdate: function () {
                    let searchOptions = {
                        limit: 50,
                        skip: 0,

                    }, records = [];

                    const getMediaCountData = () => {
                        buildfire.publicData.search(searchOptions, "MediaCount", (err, result) => {
                            if (err) console.error(err);
                            if (result.length < searchOptions.limit) {
                                records = records.concat(result);
                                console.log(records)
                                this.iterateMediaCountData(records, 0);
                            } else {
                                searchOptions.skip = searchOptions.skip + searchOptions.limit;
                                records = records.concat(result);
                                return getMediaCountData();
                            }
                        })
                    }

                    getMediaCountData();
                },
                showIndexingDialog: function () {
                    buildfire.dialog.confirm(
                        {
                            title: 'MCM Update',
                            message: "We are improving your database perfomance, please do not close your browser or leave the plugin until you see success dialog. This may take a while...",
                            confirmButton: { text: "Yes", type: "success" },
                        }, (err, isConfirmed) => {
                            if (err) return console.error(err);
                            if (isConfirmed) return this.startMediaCountDataIndexingUpdate();
                        }
                    );
                }
            }

        }])
        .factory("nanoid", [function () {
            return (t = 21) =>
                crypto
                    .getRandomValues(new Uint8Array(t))
                    .reduce(
                        (t, e) =>
                        (t +=
                            (e &= 63) < 36
                                ? e.toString(36)
                                : e < 62
                                    ? (e - 26).toString(36).toUpperCase()
                                    : e > 62
                                        ? '-'
                                        : '_'),
                        ''
                    )
        }])



})(window.angular, window.buildfire, window.location);
