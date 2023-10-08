(function (angular, buildfire, location) {
    'use strict';
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidgetHandlers', [])
        .provider('Buildfire', [
            function () {
                this.$get = function () {
                    return buildfire;
                };
            },
        ])
        .factory('openedMediaHandler', [
            'Buildfire',
            'COLLECTIONS',
            'UserDB',
            'LocalStorageOpenedItemsHandler',
            '$rootScope',
            function (Buildfire, COLLECTIONS, UserDB, LocalStorageOpenedItemsHandler, $rootScope) {
                const openedMediaHandler = {
                    get MediaMetaData() {
                        return new UserDB(COLLECTIONS.MediaMetaData);
                    },

                    sync() {
                        return this.MediaMetaData.get()
                            .then((result) => {
                                let uniqueMergedItems = [];
                                LocalStorageOpenedItemsHandler.getOpenedMediaItems(
                                    (error, response) => {
                                        if (error) response = [];
                                        const mergedItems = [...response, ...result.openedItems];
                                        uniqueMergedItems = [...new Set(mergedItems)];
                                        LocalStorageOpenedItemsHandler.save(uniqueMergedItems);
                                    }
                                );
                                return uniqueMergedItems;
                            })
                            .then((uniqueMergedItems) => {
                                this._syncToMediaMetaData(uniqueMergedItems);
                            })
                            .catch((error) => {
                                console.error('Error during sync:', error);
                            });
                    },

                    _syncToMediaMetaData(localOpenedMediaItems) {
                        const payload = {
                            $set: {
                                openedItems: localOpenedMediaItems,
                            },
                        };
                        this.MediaMetaData.save(payload);
                    },

                    add(item, mediaType, userId) {
                        let key = '';

                        if (mediaType === 'Article') {
                            key = item.id;
                        } else if (mediaType === 'Video') {
                            key = `${item.data.videoUrl}_${item.id}`;
                        } else if (mediaType === 'Audio') {
                            key = `${item.data.audioUrl}_${item.id}`;
                        } else {
                            console.warn('Unexpected media type');
                            return;
                        }

                        LocalStorageOpenedItemsHandler.getOpenedMediaItems((error, response) => {
                            if (error) return console.error(error);

                            response = [...response, key];
                            LocalStorageOpenedItemsHandler.save(response);
                            this.MediaMetaData.get()
                                .then((response) => {
                                    const payload = {
                                        $set: {
                                            openedItems: [...response.openedItems, key],
                                            lastUpdatedBy: userId,
                                        },
                                    };
                                    return this.MediaMetaData.save(payload);
                                })
                                .catch((error) => {
                                    console.error('Error while adding to MediaMetaData:', error);
                                });
                        });
                    },
                };
                return openedMediaHandler;
            },
        ])
        .factory('LocalStorageOpenedItemsHandler', [
            'Buildfire',
            'LocalStorageDB',
            'localStorageKeys',
            function (Buildfire, LocalStorageDB, localStorageKeys) {
                const LocalStorageOpenedItemsHandler = {
                    get localStorageDB() {
                        return new LocalStorageDB(
                            localStorageKeys.PLUGIN_CONFIG
                        );
                    },

                    get currentInstance() {
                        return Buildfire.context.instanceId;
                    },

                    getOpenedMediaItems(callback) {
                        this.localStorageDB.get((err, value) => {
                            if (err) callback(err, null);
                            if (!value) {
                                this.save([]);
                                callback(null, []);
                            } else {
                                try {
                                    value = JSON.parse(value);
                                    if (value && value.hasOwnProperty(this.currentInstance)) {
                                        callback(
                                            null,
                                            value[this.currentInstance].openedMediaItems
                                        );
                                    } else {
                                        this.save([]);
                                        callback(null, []);
                                    }
                                } catch (error) {
                                    callback(error, null);
                                }
                            }
                        });
                    },

                    save(data) {
                        const formatObject = {
                            [this.currentInstance]: {
                                openedMediaItems: data,
                            },
                        };

                        this.localStorageDB.getAll((error, result) => {
                            if (error) return console.error(error);
                            if (result) {
                                let mergedResult = { ...result, ...formatObject };

                                this.localStorageDB.save(mergedResult);
                            } else {
                                this.localStorageDB.save(formatObject);
                            }
                        });
                    },

                    reset() {
                        this.localStorageDB.reset();
                    },
                };

                return LocalStorageOpenedItemsHandler;
            },
        ]);
})(window.angular, window.buildfire, window.location);
