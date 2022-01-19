"use strict";

var downloads = {
    sync: function sync($scope, db) {
        db.get((err, res) => {
            let downloadedIDS = [];
            if (err) {
                return callback(err);
            }
            if (res) {
                downloadedIDS = res.map(a => a.mediaId);
                    if ($scope.WidgetHome) {
                        $scope.WidgetHome.item = $scope.WidgetHome.items.map(item => {
                            if (downloadedIDS.indexOf(item.id) > -1) {
                                item.hasDownloadedMedia = true;
                                let downloadedItem = res[downloadedIDS.indexOf(item.id)];
                                if (downloadedItem.mediaType == "video") {
                                    item.data.hasDownloadedVideo = true;
                                }

                                else if (downloadedItem.mediaType == "audio") {
                                    item.data.hasDownloadedAudio = true;
                                }
                            }
                            else {
                                item.hasDownloadedMedia = false;
                                item.data.hasDownloadedVideo = false;
                                item.data.hasDownloadedAudio = false;
                            }
                            return item;
                        });
                    }
                    if ($scope.WidgetMedia) {
                        let matchingItems = res.filter(item => item.mediaId == $scope.WidgetMedia.item.id);
                        if (matchingItems.length > 0) {
                            $scope.WidgetMedia.item.hasDownloadedMedia = true;
                            matchingItems.map(downloadedItem => {
                                if (downloadedItem.mediaType == "video") {
                                    // buildfire.dialog.toast({
                                    //     message: `Found downloaded video ${downloadedItem.mediaPath}`,
                                    // });
                                    if (!window.navigator.onLine) {
                                        $scope.WidgetMedia.item.data.videoUrl = downloadedItem.mediaPath;
                                    }
                                    $scope.WidgetMedia.item.data.hasDownloadedVideo = true;
                                }

                                else if (downloadedItem.mediaType == "audio") {
                                    if (!window.navigator.onLine) {
                                        $scope.WidgetMedia.item.data.audioUrl = downloadedItem.mediaPath;
                                    }
                                    $scope.WidgetMedia.item.hasDownloadedAudio = true;
                                }

                            });
                        }
                        else {
                            $scope.WidgetMedia.item.hasDownloadedMedia = false;
                            $scope.WidgetMedia.item.data.hasDownloadedVideo = false;
                            $scope.WidgetMedia.item.data.hasDownloadedAudio = false;
                        }
                    }
                }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    }
}