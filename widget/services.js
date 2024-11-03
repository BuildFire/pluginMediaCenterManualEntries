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
                    if (pushToHistory) {
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
                MediaDateAsc: "Media Date Asc",
                MediaDateDesc: "Media Date Desc"
            };
            var orders = [
                { id: 1, name: "Manually", value: "Manually", key: "rank", order: 1 },
                { id: 1, name: "Newest", value: "Newest", key: "dateCreated", order: -1 },
                { id: 1, name: "Oldest", value: "Oldest", key: "dateCreated", order: 1 },
                { id: 1, name: "Media Title A-Z", value: "Media Title A-Z", key: "title", order: 1 },
                { id: 1, name: "Media Title Z-A", value: "Media Title Z-A", key: "title", order: -1 },
                { id: 1, name: "Media Date Asc", value: "Media Date Asc", key: "mediaDateIndex", order: 1 },
                { id: 1, name: "Media Date Desc", value: "Media Date Desc", key: "mediaDateIndex", order: -1 }
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
                {id: 1, name: "Manually", value: "Manually", key: "rank", order: 1},
                {id: 1, name: "Category Title A-Z", value: "Category Title A-Z", key: "title", order: 1},
                {id: 1, name: "Category Title Z-A", value: "Category Title Z-A", key: "title", order: -1},
                {id: 1, name: "Newest", value: "Newest", key: "createdOn", order: -1},
                {id: 1, name: "Oldest", value: "Oldest", key: "createdOn", order: 1},
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
        .factory("OFSTORAGE", ['Buildfire', function (Buildfire) {
            function OFSTORAGE(data = {}) {
                this.instanceId = Buildfire.getContext().instanceId;
                this.path = data.path;
                this.fileName = `cache_${this.instanceId}_${data.fileName}.json`;
            }

            OFSTORAGE.prototype.get = function (callback) {
                    buildfire.services.fileSystem.fileManager.readFileAsText({
                        path: this.path,
                        fileName: this.fileName,
                    }, (error, result) => {
                        if (error && error.code !== 1) {
                            return callback(error);
                        }
                        let parsedResult;
                        try {
                            if (result) {
                            parsedResult = JSON.parse(result);
                            result = result ? parsedResult : [];
                            callback(null, result);
                            }
                            else {
                                return callback(null, []);
                            }
                        }
                        catch (e) {
                            callback("Error parsing");
                        }
                    });
            };

            OFSTORAGE.prototype.getById = function (id, callback) {
                this.get((error, result) => {
                    if (error) return callback(error);
                    callback(null, result.filter(item => item.id === id)[0]);
                });
            };

            OFSTORAGE.prototype.insert = function (item, callback) {
                try {
                    buildfire.services.fileSystem.fileManager.writeFileAsText(
                        {
                            path: this.path,
                            fileName: this.fileName,
                            content: JSON.stringify(item),
                        },
                        (err, isWritten) => {
                            if (err) {
                                return callback(err);
                            }

                            callback(null, isWritten);
                        }
                    );
                } catch (err) {
                }
            }

            // OFSTORAGE.prototype.update = function (item) {
            //     Buildfire.localStorage.setItem(this.tagName, item);
            // }

            // OFSTORAGE.prototype.getById = function (id) {
            //     let res = Buildfire.localStorage.getItem(this.tagName);
            //     if (res) {
            //         res = JSON.parse(res);
            //         return res.filter(function (item) {
            //             return item.mediaId == id;
            //         })[0];
            //     }
            //     return false;
            // };

            return OFSTORAGE;
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
            function AppDB() { };

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
        }])
        .factory("UserDB", ['$rootScope', 'Buildfire', '$q', 'MESSAGES', 'CODES', function ($rootScope, Buildfire, $q, MESSAGES, CODES) {
            function UserDB(tagName) {
                this._tagName = tagName;
            }

            UserDB.prototype.get = function () {
                const that = this;
                const deferred = $q.defer();
                Buildfire.userData.get(that._tagName, (err, result) => {
                    if (err && err.code == CODES.NOT_FOUND) {
                        return deferred.reject();
                    }
                    else if (err) {
                        return deferred.reject(err);
                    }
                    else if(result && !result.data.openedItems){
                        const data = new MediaMetaData();
                        that.save(data).then((res) => {
                            deferred.resolve(new MediaMetaData(res.data));
                        });
                    }
                    else {
                        return deferred.resolve(new MediaMetaData({...result.data, id: result.id}));
                    }
                });
                return deferred.promise;
            };


            UserDB.prototype.save = function (data) {
                const that = this;
                const deferred = $q.defer();
                if (typeof data == 'undefined') {
                    return deferred.reject(new Error(MESSAGES.ERROR.DATA_NOT_DEFINED));
                };

                Buildfire.userData.save(data, that._tagName, (err, result) => {
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

            return UserDB;
        }])
        .factory("LocalStorageDB", ['Buildfire', function (Buildfire) {

            function LocalStorageDB (key){
                this.key = key;
            }

            LocalStorageDB.prototype.get = function (callback){
                Buildfire.localStorage.getItem(
                    this.key,
                    (error, value) => {
                        if (error) return callback(error, null);
                        callback(null, value);
                    }
                );
            };

            LocalStorageDB.prototype.getAll = function(callback){
                Buildfire.localStorage.getItem(
                    this.key,
                    (error, value) => {
                        if (error) return callback(error, null);

                        value = JSON.parse(value);
                        callback(null, value);
                    }
                );
            };

            LocalStorageDB.prototype.save = function (data) {
                Buildfire.localStorage.setItem(this.key, data);
            };

            LocalStorageDB.prototype.reset = function (){
                this.save([]);
            };

            return LocalStorageDB;
        }])
        .factory("DropboxLinksManager", [function () {
            return {
                convertDropbox(url) {
                    if (url) {
                        url = url.replace("www.dropbox", "dl.dropboxusercontent");
                        url = url.replace("dropbox.com", "dl.dropboxusercontent.com");
                        url = url.replace("dl.dropbox.com", "dl.dropboxusercontent.com");
                      }
                      return url;
                }
            }
        }])
        .factory("VideoJSController", ['$rootScope', 'DropboxLinksManager', function ($rootScope, DropboxLinksManager) {
            let vidPlayer = null, playOverlay, currentTime = 0, type = null;
            let playInterval;

            function init(videoOptions) {
                let { item, videoType, startAt } = videoOptions;

                currentTime = startAt ? startAt : 0;
                type = videoType;

                const videoContainer = document.getElementById('videoContainer');
                const videoId = `videoJsElement_${item.id}_${Date.now()}`;
                videoContainer.innerHTML = `
                <video
                    class="video-js vjs-styles-defaults"
                    id="${videoId}"
                    title="${item.title}"
                ></video>`;

                vidPlayer = videojs(videoId, {
                    muted: false,
                    playsinline: true,
                    controls: true,
                    techOrder: ["html5", "youtube", "vimeo"],
                    modestbranding: true,
                    enableDocumentPictureInPicture: true
                });

                addNextPreviousButtons();
                addOverlayPlayButton();

                vidPlayer.src({
                    src: DropboxLinksManager.convertDropbox(item.videoUrl),
                    type: videoType,
                });


                if ($rootScope.autoPlay) {
                    playInterval = setInterval(() => {
                        play();
                    }, 50)
                }
            }
            function addOverlayPlayButton() {
                // Create the play button overlay
                playOverlay = document.createElement('button');
                playOverlay.className = 'vjs-play-overlay hidden';
                playOverlay.onclick = function () {
                    play();
                };

                // Add the overlay to the player container
                vidPlayer.el().appendChild(playOverlay);
            }

            function addNextPreviousButtons() {
                let Button = videojs.getComponent('Button');

                // Define the Next Button
                let NextButton = videojs.extend(Button, {
                    constructor: function () {
                        Button.apply(this, arguments);
                        this.addClass('vjs-icon-next-item');
                        this.addClass('vjs-icon-placeholder');
                    },
                    handleClick: function () {
                        $rootScope.playPrevItem();
                    }
                });

                // Define the Previous Button
                let PrevButton = videojs.extend(Button, {
                    constructor: function () {
                        Button.apply(this, arguments);
                        this.addClass('vjs-icon-previous-item');
                        this.addClass('vjs-icon-placeholder');
                    },
                    handleClick: function () {
                        $rootScope.playNextItem(true);
                    }
                });

                videojs.registerComponent('NextButton', NextButton);
                videojs.registerComponent('PrevButton', PrevButton);

                // Add Next button
                vidPlayer.getChild('controlBar').addChild('PrevButton', {}, vidPlayer.controlBar.children().indexOf(vidPlayer.controlBar.getChild('playToggle')));

                // Insert Next button after the play button
                vidPlayer.getChild('controlBar').addChild('NextButton', {}, vidPlayer.controlBar.children().indexOf(vidPlayer.controlBar.getChild('playToggle')) + 1);
            }

            function onVideoReady(callback) {
                if (type === 'video/mp4') {
                    vidPlayer.on('canplay', function () {
                        callback();
                    });
                } else {
                    callback();
                }
            }

            function onPlayerReady(callback) {
                vidPlayer.on('ready', function () {
                    vidPlayer.currentTime(currentTime);
                    playOverlay.classList.remove('hidden');

                    if (buildfire.getContext().device.platform === 'Android') {
                        const fullScreenIcon = document.querySelector('.vjs-fullscreen-control');
                        fullScreenIcon.classList.add('hidden');
                    }

                    callback();
                });
            }

            function onVideoPlayed(callback) {
                vidPlayer.on('play', function () {
                    callback();
                    playOverlay.classList.add('hidden');
                    clearInterval(playInterval);
                });
            }

            function onVideoPaused(callback) {
                vidPlayer.on('pause', function () {
                    callback();
                    playOverlay.classList.remove('hidden');
                });
            }

            function play() {
                vidPlayer.play();
            }

            function pause() {
                vidPlayer.pause();
            }

            return {
                init,
                play,
                pause,
                onPlayerReady,
                onVideoReady,
                onVideoPlayed,
                onVideoPaused,
                get currentTime() {
                    return vidPlayer.currentTime();
                },
                get currentSource() {
                    return vidPlayer ? vidPlayer.src() : '';
                }
            };
        }])

})(window.angular, window.buildfire, window.location);
