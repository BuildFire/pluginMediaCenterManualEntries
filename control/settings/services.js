(function (angular, buildfire, location) {
    'use strict';
    //created mediaCenterWidget module
    angular
        .module('mediaCenterDesignServices', ['mediaCenterEnums'])
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
                {id: 1, name: "Manually", value: "Manually", key: "rank", order: 1},
                {id: 1, name: "Newest", value: "Newest", key: "dateCreated", order: -1},
                {id: 1, name: "Oldest", value: "Oldest", key: "dateCreated", order: 1},
                {id: 1, name: "Most", value: "Most Items", key: "title", order: 1},
                {id: 1, name: "Least", value: "Least Items", key: "title", order: -1}
            ];
            return {
                ordersMap: ordersMap,
                options: orders
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
            return DB;
        }])
        .factory("utils", ['Buildfire', '$q', 'MESSAGES', 'CODES', function (Buildfire, $q, MESSAGES, CODES) {
            const utils = {
                checkEquality(val1, val2) {
                    if (val1 === val2) {
                        return true;
                    }

                    if (typeof val1 !== 'object' || typeof val2 !== 'object' || val1 === null || val2 === null) {
                        return false;
                    }

                    if (Array.isArray(val1) && Array.isArray(val2)) {
                        return utils.deepCompareArrays(val1, val2);
                    }

                    if (!Array.isArray(val1) && !Array.isArray(val2)) {
                        return utils.deepCompareObjects(val1, val2);
                    }

                    return false;
                },

                deepCompareObjects(obj1, obj2) {
                    const keys1 = Object.keys(obj1);
                    const keys2 = Object.keys(obj2);

                    if (keys1.length !== keys2.length) {
                        return false;
                    }

                    for (let key of keys1) {
                        if (!keys2.includes(key) || !utils.checkEquality(obj1[key], obj2[key])) {
                            return false;
                        }
                    }

                    return true;
                },

                deepCompareArrays(arr1, arr2) {
                    if (arr1.length !== arr2.length) {
                        return false;
                    }

                    for (let i = 0; i < arr1.length; i++) {
                        if (!utils.checkEquality(arr1[i], arr2[i])) {
                            return false;
                        }
                    }

                    return true;
                }
            };
            return utils;
        }]);
})(window.angular, window.buildfire, window.location);
