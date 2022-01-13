(function (angular, buildfire) {
    'use strict';
    //created mediaCenterWidget module
    angular
        .module('mediaCenterWidget', [
            'mediaCenterEnums',
            'mediaCenterWidgetServices',
            'mediaCenterWidgetFilters',
            'mediaCenterWidgetModals',
            'ngAnimate',
            'ngRoute',
            'ui.bootstrap',
            'infinite-scroll',
            "ngSanitize",
            "com.2fdevs.videogular",
            "com.2fdevs.videogular.plugins.controls",
            "com.2fdevs.videogular.plugins.overlayplay",
            "rc-videogular.plugins.youtube",
            "rc-videogular.plugins.vimeo",
            // "videosharing-embed",
            "ngTouch"
        ])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        //ngClipboard to provide copytoclipboard feature
        .config(['$routeProvider', '$httpProvider', '$compileProvider', function ($routeProvider, $httpProvider, $compileProvider) {

            /**
             * To make href urls safe on mobile
             */
            //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|cdvfile):/);
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|cdvfile|file):/);
            /**
             * Disable the pull down refresh
             */
            //buildfire.datastore.disableRefresh();

            $routeProvider
                .when('/', {
                    template: '<div></div>'
                })
                .when('/media/:mediaId', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'WidgetMedia',
                    controller: 'WidgetMediaCtrl',
                    resolve: {
                        media: ['$q', '$window', 'DB', 'OFSTORAGE', 'COLLECTIONS', 'Location', '$route', function ($q, $window, DB, OFSTORAGE, COLLECTIONS, Location, $route) {
                            var isOnline = $window.navigator.onLine;
                            var isWeb = buildfire.getContext().device.platform === 'web'
                            var deferred = $q.defer();
                            var mediaId = $route.current.params.mediaId;
                            var MediaContent = new DB(COLLECTIONS.MediaContent);
                            var CachedMediaContent = new OFSTORAGE({
                                path: "/data/mediaCenterManual",
                                fileName: "cachedMediaContent"
                            });
                            var DownloadedMedia = new OFSTORAGE({
                                path: "/data/mediaCenterManual",
                                fileName: "downloadedMedia"
                            });
                            if (mediaId) {
                                if (isOnline) {
                                    console.log("$route.current.params.mediaId", $route.current.params.mediaId)
                                    MediaContent.getById($route.current.params.mediaId).then(function success(result) {
                                        if (result && result.data) {
                                            if (!isWeb) {
                                                // Check if media has downloads
                                                DownloadedMedia.get((err, res) => {
                                                    if (err) {
                                                        buildfire.dialog.toast({
                                                            message: "Found no downloaded items",
                                                        });
                                                    }
                                                    if (res) {
                                                        let matchingItems = res.filter(item => item.mediaId == mediaId);
                                                        if (matchingItems.length > 0) {
                                                            matchingItems.map(downloadedItem => {
                                                                if (downloadedItem.mediaType == "video") {
                                                                    // buildfire.dialog.toast({
                                                                    //     message: `Found downloaded video ${downloadedItem.mediaPath}`,
                                                                    // });
                                                                    result.data.hasDownloadedVideo = true;
                                                                }

                                                                else if (downloadedItem.mediaType == "audio") {
                                                                    result.data.hasDownloadedAudio = true;
                                                                }

                                                            });
                                                        }
                                                        else {
                                                            // buildfire.dialog.toast({
                                                            //     message: "Found no downloaded items",
                                                            // });
                                                        }
                                                    }
                                                    deferred.resolve(result);
                                                });
                                            }
                                            else
                                                deferred.resolve(result);
                                        }
                                        else {
                                            buildfire.dialog.toast({
                                                message: "Did not find the media",
                                            });
                                            Location.goToHome();
                                        }
                                    },
                                        function fail(error) {
                                            buildfire.dialog.toast({
                                                message: "Fetching the media failed " + mediaId,
                                            });
                                            Location.goToHome();
                                        }
                                    );
                                }

                                else {
                                    CachedMediaContent.getById(mediaId, (err, result) => {
                                        if (err) {
                                            buildfire.dialog.toast({
                                                message: "Fetching the media failed" + err,
                                            });
                                            Location.goToHome();
                                        }
                                        else {
                                            //Check if the cached media item has a downloaded video or audio
                                            DownloadedMedia.get((err, res) => {
                                                if (err) {
                                                    buildfire.dialog.toast({
                                                        message: "Found no downloaded items",
                                                    });
                                                }
                                                if (res) {
                                                    let matchingItems = res.filter(item => item.mediaId == mediaId);
                                                    if (matchingItems.length > 0) {
                                                        matchingItems.map(downloadedItem => {
                                                            if (downloadedItem.mediaType == "video") {
                                                                buildfire.dialog.toast({
                                                                    message: `Found downloaded video ${downloadedItem.mediaPath}`,
                                                                });
                                                                result.data.hasDownloadedVideo = true;
                                                                result.data.videoUrl = downloadedItem.mediaPath;
                                                            }

                                                            else if (downloadedItem.mediaType == "audio") {
                                                                result.data.hasDownloadedAudio = true;
                                                                result.data.audioUrl = downloadedItem.mediaPath;
                                                            }

                                                        });
                                                    }
                                                }
                                                deferred.resolve(result);
                                            });
                                        }
                                    })
                                }
                            }
                            else {
                                buildfire.dialog.toast({
                                    message: "Mediaid not in params",
                                });
                                Location.goToHome();
                            }
                            return deferred.promise;
                        }]
                    }
                })
                .when('/media', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'WidgetMedia',
                    controller: 'WidgetMediaCtrl',
                    resolve: {
                        media: function () {
                            return null;
                        }
                    }
                })
                .when('/nowplaying/:mediaId', {
                    templateUrl: 'templates/layouts/now-playing.html',
                    controllerAs: 'NowPlaying',
                    controller: 'NowPlayingCtrl',
                    resolve: {
                        media: ['$q', 'DB', 'COLLECTIONS', 'Location', '$route', function ($q, DB, COLLECTIONS, Location, $route) {
                            var deferred = $q.defer();
                            var MediaContent = new DB(COLLECTIONS.MediaContent);
                            if ($route.current.params.mediaId) {
                                MediaContent.getById($route.current.params.mediaId).then(function success(result) {
                                    if (result && result.data) {
                                        deferred.resolve(result);
                                    }
                                    else {
                                        Location.goToHome();
                                    }
                                },
                                    function fail() {
                                        Location.goToHome();
                                    }
                                );
                            }
                            else {
                                Location.goToHome();
                            }
                            return deferred.promise;
                        }]
                    }
                })

                .otherwise('/');
            var interceptor = ['$q', function ($q) {
                var counter = 0;

                return {

                    request: function (config) {
                        if (buildfire.spinner)
                            buildfire.spinner.show();
                        //NProgress.start();

                        counter++;
                        return config;
                    },
                    response: function (response) {
                        counter--;
                        buildfire.spinner.hide();
                        return response;
                    },
                    responseError: function (rejection) {
                        counter--;
                        if (counter === 0) {

                            buildfire.spinner.hide();
                        }

                        return $q.reject(rejection);
                    }
                };
            }];

            $httpProvider.interceptors.push(interceptor);

        }])
        .run(['Location', '$location', '$rootScope', '$window', 'Messaging', 'EVENTS', 'PATHS', 'DB', 'COLLECTIONS', function (Location, $location, $rootScope, $window, Messaging, EVENTS, PATHS, DB, COLLECTIONS) {
            buildfire.navigation.onBackButtonClick = function () {
                if ($rootScope.fullScreen) {
                    $rootScope.goingBackFullScreen = true;
                    $rootScope.$digest();
                    return;
                }
                $rootScope.goingBackFullScreen = false;
                $rootScope.goingBack = true;
                var navigate = function () {
                    buildfire.history.pop();
                    console.log($("#feedView").hasClass('notshowing'))
                    if ($("#feedView").hasClass('notshowing')) {
                        Messaging.sendMessageToControl({
                            name: EVENTS.ROUTE_CHANGE,
                            message: {
                                path: PATHS.HOME
                            }
                        });
                        $("#showFeedBtn").click();
                        $rootScope.showGlobalPlaylistButtons = true;
                        if (!$rootScope.$$phase) $rootScope.$digest();
                    } else buildfire.navigation._goBackOne();
                }

                var path = $location.path();
                if (path.indexOf('/media') == 0) {
                    navigate();
                } else if (path.indexOf('/nowplaying') == 0) {
                    if ($rootScope.playlist) {
                        $rootScope.playlist = false;
                        $rootScope.$digest();
                    } else if ($rootScope.skipMediaPage) {
                        navigate();
                    } else {
                        Location.go("#/media/" + path.split("/")[2]);
                    }
                    if (!$rootScope.$$phase) $rootScope.$digest();
                } else if ($rootScope.showEmptyState) {
                    angular.element('#emptyState').css('display', 'none');
                    angular.element('#home').css('display', 'block');
                    $rootScope.showGlobalPlaylistButtons = true;
                    $rootScope.showEmptyState = false;
                } else {
                    buildfire.navigation._goBackOne()
                    if (!$rootScope.$$phase) $rootScope.$digest();
                };
            }


            // $rootScope.online = $window.navigator.onLine;

            $rootScope.$on('$routeChangeSuccess', () => {
                var path = $location.path();
                if (path.indexOf('/media') == 0 || path.indexOf('/nowplaying') == 0) {
                    $rootScope.showGlobalPlaylistButtons = false;
                } else $rootScope.showGlobalPlaylistButtons = true;

                if (!$rootScope.$$phase) $rootScope.$digest();
            });

            $window.addEventListener("offline", function () {
                $rootScope.online = false;
                $rootScope.$emit('online');
                console.log("changing online status to false");
            });

            $window.addEventListener("online", function () {
                $rootScope.online = true;
                console.log("changing online status to true");
                $rootScope.$emit('online');
            });

            buildfire.device.onAppBackgrounded(function () {
                $rootScope.$emit('deviceLocked', {});
                //callPlayer('ytPlayer', 'pauseVideo');
            });
        }]);

})(window.angular, window.buildfire);
