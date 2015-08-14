'use strict';

(function (angular, buildfire, location) {
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidget')
        .provider('Buildfire', [function () {
            this.$get = function () {
                return buildfire;
            }
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
                Newest: " Newest",
                Oldest: " Oldest",
                Most: " Oldest",
                Least: " Oldest"
            }
            var orders = [
                {id: 1, name: "Manually", value: "Manually"},
                {id: 1, name: "Newest", value: "Newest"},
                {id: 1, name: "Oldest", value: "Oldest"},
                {id: 1, name: "Most", value: "Most Items"},
                {id: 1, name: "Least", value: "Least Items"}
            ];
            return {
                ordersMap: ordersMap,
                getOrder: function (name) {
                    return orders.filter(function (order) {
                        return order.name === name;
                    })[0];
                }
            }
        }])
        .factory("MediaCenter", ['Buildfire', '$q', 'MESSAGES', 'CODES', function (Buildfire, $q, MESSAGES, CODES) {
            var _tagName = "MediaCenter";
            return {
                get: function () {
                    var deferred = $q.defer();
                    Buildfire.datastore.get(_tagName, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        else if (result && result.data) {
                            return deferred.resolve(result);
                        } else {
                            return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOND));
                        }
                    });
                    return deferred.promise;
                },
                insert: function (items) {
                    var deferred = $q.defer();
                    if (typeof items == 'undefined') {
                        return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                    }
                    if (Array.isArray(items)) {
                        Buildfire.datastore.bulkInsert(items, _tagName, function (err, result) {
                            if (err) {
                                return deferred.reject(err);
                            }
                            else if (result) {
                                return deferred.resolve(result);
                            } else {
                                return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOND));
                            }
                        });
                    } else {
                        Buildfire.datastore.insert(items, _tagName, false, function (err, result) {
                            if (err) {
                                return deferred.reject(err);
                            }
                            else if (result) {
                                return deferred.resolve(result);
                            } else {
                                return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOND));
                            }
                        });
                    }
                    return deferred.promise;
                },
                find: function (options) {
                    var deferred = $q.defer();
                    if (typeof options == 'undefined') {
                        return deferred.reject(new Error(MESSAGES.ERROR.OPTION_REQUIRES));
                    }
                    Buildfire.datastore.search(options, _tagName, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        else if (result) {
                            return deferred.resolve(result);
                        } else {
                            return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOND));
                        }
                    });
                    return deferred.promise;
                },
                update: function (id, item) {
                    var deferred = $q.defer();
                    if (typeof id == 'undefined') {
                        return deferred.reject(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                    }
                    if (typeof item == 'undefined') {
                        return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                    }
                    Buildfire.datastore.update(id, item, _tagName, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        else if (result) {
                            return deferred.resolve(result);
                        } else {
                            return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOND));
                        }
                    })
                    return deferred.promise;
                },
                save: function (item) {
                    var deferred = $q.defer();
                    if (typeof item == 'undefined') {
                        return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                    }
                    Buildfire.datastore.save(item, _tagName, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        else if (result) {
                            return deferred.resolve(result);
                        } else {
                            return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOND));
                        }
                    });
                    return deferred.promise;
                },
                delete: function (id) {
                    var deferred = $q.defer();
                    if (typeof id == 'undefined') {
                        return deferred.reject(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                    }
                    Buildfire.datastore.delete(id, _tagName, function (err, result) {
                        if (err) {
                            return deferred.reject(err);
                        }
                        else if (result) {
                            return deferred.resolve(result);
                        } else {
                            return deferred.reject(new Error(MESSAGES.ERROR.NOT_FOND));
                        }
                    });
                    return deferred.promise;
                }
            }
        }]);
})(window.angular, window.buildfire, window.location);