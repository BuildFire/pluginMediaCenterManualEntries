'use strict';

(function (angular, buildfire) {
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidget')
        .provider('Buildfire', [function () {
            this.$get = function () {
                return buildfire;
            }
        }])
        .factory("MediaCenter", ['Buildfire', 'MESSAGES', 'CODES', function (Buildfire, MESSAGES, CODES) {
            var _tagName = "MediaCenter";
            return {
                get: function (callback) {
                    if (typeof callback != 'function') {
                        return callback(new Error(MESSAGES.ERROR.NOT_FOND));
                    }
                    Buildfire.datastore.get(_tagName, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        else if (result && result.data) {
                            return callback(err, result);
                        } else {
                            return callback(new Error(MESSAGES.ERROR.NOT_FOND));
                        }
                    });
                },
                insert: function (items, callback) {
                    if (typeof items == 'undefined') {
                        return callback(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                    }
                    if (typeof callback != 'function') {
                        return callback(new Error(MESSAGES.ERROR.CALLBACK_NOT_DEFINED));
                    }
                    if (Array.isArray(items)) {
                        Buildfire.datastore.bulkInsert(items, _tagName, function (err, data) {
                            if (err) {
                                return callback(err);
                            }
                            else if (result) {
                                return callback(err, result);
                            } else {
                                return callback(new Error(MESSAGES.ERROR.NOT_FOND));
                            }
                        });
                    } else {
                        Buildfire.datastore.insert(items, _tagName, false, function (err, result) {
                            if (err) {
                                return callback(err);
                            }
                            else if (result) {
                                return callback(err, result);
                            } else {
                                return callback(new Error(MESSAGES.ERROR.NOT_FOND));
                            }
                        });
                    }
                },
                find: function (options, callback) {
                    if (typeof callback == 'undefined') {
                        callback = options;
                        options = "";
                    }
                    if (typeof callback != 'function') {
                        return callback(new Error(MESSAGES.ERROR.CALLBACK_NOT_DEFINED));
                    }
                    Buildfire.datastore.search(options, _tagName, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        else if (result) {
                            return callback(err, result);
                        } else {
                            return callback(new Error(MESSAGES.ERROR.NOT_FOND));
                        }
                    });
                },
                update: function (id, item, callback) {
                    if (typeof id == 'undefined') {
                        return callback(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                    }
                    if (typeof item == 'undefined') {
                        return callback(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                    }
                    if (typeof callback != 'function') {
                        return callback(new Error(MESSAGES.ERROR.CALLBACK_NOT_DEFINED));
                    }
                    Buildfire.datastore.update(id, item, _tagName, function (err, result) {
                        return callback(err, result);
                    })
                },
                save: function (item, callback) {
                    if (typeof item == 'undefined') {
                        return callback(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                    }
                    if (typeof callback != 'function') {
                        return callback(new Error(MESSAGES.ERROR.CALLBACK_NOT_DEFINED));
                    }
                    Buildfire.datastore.save(item, _tagName, function (err, result) {
                        return callback(err, result);
                    });
                },
                delete: function (id, callback) {
                    if (typeof id == 'undefined') {
                        return callback(new Error(MESSAGES.ERROR.ID_NOT_DEFINED));
                    }
                    if (typeof callback != 'function') {
                        return callback(new Error(MESSAGES.ERROR.CALLBACK_NOT_DEFINED));
                    }
                    Buildfire.datastore.delete(id, _tagName, function (err, result) {
                        return callback(err, result);
                    });
                }
            }
        }]);
})(window.angular, window.buildfire);