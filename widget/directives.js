(function (angular, buildfire) {
    angular
        .module('mediaCenterWidget')
        .directive('playBtn', function () {
            var linker = function (scope, element, attrs) {
                if (attrs.playBtn == 'true')
                    element.addClass('play-btn');
            }
            return {
                restrict: 'A',
                link: linker
            };
        })
        .directive("buildFireCarousel", ["$rootScope", function ($rootScope) {
            return {
                restrict: 'A',
                link: function (scope, elem, attrs) {
                    $rootScope.$broadcast("Carousel:LOADED");
                }
            };
        }])
      .directive("loadImage", ['Buildfire', '$parse', function (Buildfire, $parse) {
          return {
              restrict: 'A',
              link: function (scope, element, attrs) {
                  var getImageItem = attrs.imageItem ? $parse(attrs.imageItem) : null;

                  function updateImageLoadedState(isLoaded) {
                      scope.$evalAsync(function () {
                          var target = getImageItem ? getImageItem(scope) : scope.item;
                          if (target) {
                              target.imageLoaded = isLoaded;
                          }
                      });
                  }

                  attrs.$observe('finalSrc', function (_img) {
                      if (!_img) {
                          updateImageLoadedState(false);
                          return;
                      }

                      var options = {};
                      if (attrs.cropWidth) options.width = attrs.cropWidth;
                      if (attrs.cropHeight) options.height = attrs.cropHeight;

                      var processImage = attrs.cropType === 'resize' ? Buildfire.imageLib.local.resizeImage : Buildfire.imageLib.local.cropImage;

                      updateImageLoadedState(false);

                      processImage(_img, options, function (err, imgUrl) {
                          var finalSrc = err ? _img : imgUrl;

                          var img = new Image();
                          img.onload = function () {
                                 scope.$evalAsync(function () {
                                     element.attr("src", finalSrc);
                                     updateImageLoadedState(true);
                                 });
                          };
                          img.onerror = function () {
                              scope.$evalAsync(function () {
                                  element.attr("src", _img);
                                  updateImageLoadedState(true);
                              });
                          };
                          img.src = finalSrc;
                      });
                  });
              }
          };
      }])

      .directive('scrolly', function () {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    let raw = element[0], timeOut = null, timer = 300;
                    element.on('scroll', function () {
                        if (raw.scrollTop + raw.offsetHeight >= (raw.scrollHeight*0.60)) { //at the bottom
                            clearTimeout(timeOut);
                            timeOut = setTimeout(()=>{
                                scope.$apply(attrs.scrolly);
                            }, timer)
                        }
                    })
                }
            }
        })
        /**
       * A directive which is used handle background image for layouts.
       */
        .directive('backImg', ["$rootScope", function ($rootScope) {
            return function (scope, element, attrs) {
                attrs.$observe('backImg', function (value) {
                    var img = '';
                    if (value) {
                        buildfire.imageLib.local.cropImage(value, {
                            width: $rootScope.deviceWidth,
                            height: $rootScope.deviceHeight
                        }, function (err, imgUrl) {
                            if (imgUrl) {
                                img = imgUrl;
                                element.attr("style", 'background:url(' + img + ') !important; background-size: cover !important;');
                            } else {
                                img = '';
                                element.attr("style", 'background-color: white;');
                            }
                            element.css({
                                'background-size': 'cover !important'
                            });
                        });
                    }
                    else {
                        img = "";
                        element.attr("style", 'background-color:white');
                        element.css({
                            'background-size': 'cover !important'
                        });
                    }
                });
            };
        }])
        .directive('mediaActionIcons', ['MEDIA_ACTION_ICONS', '$rootScope', 'COLLECTIONS', '$injector', 'CommentsService', function (MEDIA_ACTION_ICONS, $rootScope, COLLECTIONS, $injector, CommentsService) {
            return {
                restrict: 'E',
                scope: {
                    widgetMedia: '=',
                    onIconAction: '&'
                },
                template: '<div ng-repeat="icon in visibleIcons" class="flex flex-align-center cursor-pointer" ng-class="getIconClasses(icon, $index)" ng-click="onIconAction({actionId: icon.id})" ng-bind-html="getIconHtml(icon) | safeHtml"></div><div ng-if="hasMoreIcons" class="flex flex-align-center flex-justify-end" ng-click="openMoreDrawer()"><i class="material-icons-outlined">more_horiz</i></div>',
                link: function (scope, element) {
                    scope.visibleIcons = [];
                    scope.hiddenIcons = [];
                    scope.hasMoreIcons = false;
                    scope.commentsCount = 0;
                    scope.viewsCount = 0;
                    scope.initMediaActionIcons = function () {
                        const WidgetMedia = scope.widgetMedia;
                        if (!WidgetMedia || !WidgetMedia.media) return;

                        let icons = [
                            MEDIA_ACTION_ICONS.VIEWS,
                            MEDIA_ACTION_ICONS.REACTIONS,
                            MEDIA_ACTION_ICONS.COMMENTS,
                            MEDIA_ACTION_ICONS.SHARE,
                            WidgetMedia.item?.data?.bookmarked ? MEDIA_ACTION_ICONS.FAVORITE_FILLED : MEDIA_ACTION_ICONS.FAVORITE,
                            MEDIA_ACTION_ICONS.NOTE,
                            WidgetMedia.item?.data?.hasDownloadedVideo ? MEDIA_ACTION_ICONS.REMOVE_DOWNLOAD_VIDEO : MEDIA_ACTION_ICONS.DOWNLOAD_VIDEO,
                            WidgetMedia.item?.data?.hasDownloadedAudio ? MEDIA_ACTION_ICONS.REMOVE_DOWNLOAD_AUDIO : MEDIA_ACTION_ICONS.DOWNLOAD_AUDIO,
                            MEDIA_ACTION_ICONS.SOURCE_LINK,
                            MEDIA_ACTION_ICONS.OPEN_ACTION_LINKS,
                            $rootScope.isInGlobalPlaylist?.(WidgetMedia.item?.id) ? MEDIA_ACTION_ICONS.PLAYLIST_REMOVE : MEDIA_ACTION_ICONS.PLAYLIST_ADD
                        ];

                        // Filter icons based on settings
                        if (!WidgetMedia.media.data.content.showViewCount) icons = icons.filter(i => i.id !== 'views');
                        if (!WidgetMedia.allowUserReactions?.()) icons = icons.filter(i => i.id !== 'reactions');
                        if (!WidgetMedia.allowUserComment?.()) icons = icons.filter(i => i.id !== 'comments');
                        if (!WidgetMedia.media.data.content.allowShare) icons = icons.filter(i => i.id !== 'share');
                        if (!WidgetMedia.media.data.content.allowAddingNotes) icons = icons.filter(i => i.id !== 'note');
                        if (!WidgetMedia.item?.data?.links?.length || !$rootScope.online) icons = icons.filter(i => i.id !== 'openActionLinks');
                        if (!WidgetMedia.media.data.content.allowOfflineDownload) {
                            icons = icons.filter(i => i.id !== 'downloadVideo' && i.id !== 'downloadAudio');
                        } else {
                            if (!WidgetMedia.item?.data?.audioUrl) icons = icons.filter(i => i.id !== 'downloadAudio');
                            if (!WidgetMedia.item?.data?.videoUrl) icons = icons.filter(i => i.id !== 'downloadVideo');
                        }
                        if (!WidgetMedia.media.data.content.allowSource || !WidgetMedia.item?.data || (!WidgetMedia.item.data.srcUrl && !WidgetMedia.item.data.videoUrl && !WidgetMedia.item.data.audioUrl)) {
                            icons = icons.filter(i => i.id !== 'sourceLink');
                        }
                        if (!WidgetMedia.media.data.content.globalPlaylist || !$rootScope.online || !WidgetMedia.item?.data?.audioUrl || !WidgetMedia.item?.data?.videoUrl) {
                            icons = icons.filter(i => i.id !== 'playlist');
                        }

                        scope.renderIcons(icons, WidgetMedia);
                        scope.loadCommentsCount(WidgetMedia);
                        scope.loadViewsCount(WidgetMedia);
                        if (WidgetMedia.allowUserReactions?.()) buildfire.components.reactions.injectReactions('#reactionsContainer');

                        CommentsService.setCommentCallbacks(
                            () => scope.loadCommentsCount(WidgetMedia),
                            () => scope.loadCommentsCount(WidgetMedia),
                            () => scope.loadCommentsCount(WidgetMedia),
                            () => scope.loadCommentsCount(WidgetMedia)
                        );
                    };

                    scope.renderIcons = function (icons, WidgetMedia) {
                        element[0].innerHTML = '';

                        let maxIconsCount = WidgetMedia.media?.data?.design?.itemLayout === "item-2" ? 4 : 5;
                        const visibleIcons = icons.slice(0, maxIconsCount);
                        const hiddenIcons = icons.slice(maxIconsCount);

                        for (let index = 0; index < maxIconsCount; index++) {
                            const icon = visibleIcons[index];
                            if (icon && index === maxIconsCount - 1 && hiddenIcons.length > 0) {
                                scope.createMoreIcon([icon].concat(hiddenIcons));
                            } else if (icon) {
                                scope.createIcon(icon, index, maxIconsCount, WidgetMedia);
                            }
                        }
                    };

                    scope.createIcon = function (icon, index, maxIconsCount, WidgetMedia) {
                        const iconEl = document.createElement('div');
                        iconEl.id = icon.id;
                        iconEl.classList.add('flex', 'flex-align-center', 'cursor-pointer', 'flex-justify-center', 'media-action-icon-element');
                        if (index > 0 && icon.id !== 'views' && icon.id !== 'comments') {
                            iconEl.classList.add(index === maxIconsCount - 1 ? 'flex-justify-end' : 'flex-justify-center');
                        }

                        // Add aria-label for accessibility
                        const ariaLabels = {
                            views: 'View count',
                            comments: 'Comments',
                            share: 'Share',
                            favorite: WidgetMedia.item?.data?.bookmarked ? 'Remove from favorites' : 'Add to favorites',
                            note: 'Add note',
                            downloadVideo: WidgetMedia.item?.data?.hasDownloadedVideo ? 'Remove downloaded video' : 'Download video',
                            downloadAudio: WidgetMedia.item?.data?.hasDownloadedAudio ? 'Remove downloaded audio' : 'Download audio',
                            sourceLink: 'Source link',
                            openActionLinks: 'Open action links',
                            playlist: $rootScope.isInGlobalPlaylist?.(WidgetMedia.item?.id) ? 'Remove from playlist' : 'Add to playlist'
                        };
                        iconEl.setAttribute('aria-label', ariaLabels[icon.id] || icon.id);
                        iconEl.setAttribute('role', 'button');
                        iconEl.setAttribute('tabindex', '0');

                        // Check if this is a download icon and item is currently downloading
                        const isDownloadIcon = icon.id === 'downloadVideo' || icon.id === 'downloadAudio';
                        const isDownloading = isDownloadIcon && $rootScope.currentlyDownloading && $rootScope.currentlyDownloading.indexOf(WidgetMedia.item.id) > -1;

                        if (isDownloading) {
                            iconEl.style.pointerEvents = 'none'; // Disable clicks while downloading
                            iconEl.setAttribute('aria-label', 'Downloading');
                        }

                        if (icon.id === 'reactions') {
                            iconEl.innerHTML = `
                            <div id="reactionsContainer">
                              <div
                                  bf-reactions-item-id="${WidgetMedia.item.id}"
                                  bf-reactions-item-type="${WidgetMedia.mediaType}"
                                  bf-reactions-group-name="${$rootScope.reactions.groupName}"
                                  bf-reactions-show-count="true"
                                  bf-reactions-show-users-reactions="true">
                              </div>
                            </div>`;
                        } else {
                            iconEl.innerHTML = icon.iconName.includes('<') ? icon.iconName : `<i class="${icon.filled ? 'material-icons' : 'material-icons-outlined'}">${icon.iconName}</i>`;
                            iconEl.onclick = () => scope.onIconAction({actionId: icon.id});
                        }

                        if (icon.id === 'comments') {
                            iconEl.querySelector('.material-icons-outlined').classList.add('flip-horizontal');
                            const commentsSpan = document.createElement('span');
                            commentsSpan.classList.add('margin-left-five');
                            commentsSpan.classList.add('count-container');
                            commentsSpan.textContent = (scope.commentsCount || 0).toLocaleString('en-US');
                            iconEl.appendChild(commentsSpan);
                        } else if (icon.id === 'views') {
                            const viewsSpan = document.createElement('span');
                            viewsSpan.classList.add('margin-left-five');
                            viewsSpan.classList.add('count-container');
                            viewsSpan.textContent = (scope.viewsCount || 0).toLocaleString('en-US');
                            iconEl.appendChild(viewsSpan);
                        }

                        let iconsHolder = element[0].querySelector('.action-icons-holder');
                        if (!iconsHolder) {
                            iconsHolder = document.createElement('div');
                            iconsHolder.classList.add('action-icons-holder', 'flex', 'flex-align-start');
                            element[0].appendChild(iconsHolder);
                        }
                        iconsHolder.appendChild(iconEl);
                    };

                    scope.loadCommentsCount = function (WidgetMedia) {
                        CommentsService.getCommentsCount(WidgetMedia.item.id, (error, count) => {
                            if (!error) {
                                scope.commentsCount = count;
                                const commentsEl = element[0].querySelector('#comments span');
                                if (commentsEl) commentsEl.textContent = scope.commentsCount.toLocaleString('en-US');
                                scope.$apply();
                            }
                        });
                    };

                    scope.loadViewsCount = function (WidgetMedia) {
                        const allCheckViewFilter = {
                            filter: {
                                "_buildfire.index.string1": WidgetMedia.item.id + "-true"
                            },
                            skip: 0,
                            limit: 1,
                            recordCount: true
                        };
                        buildfire.publicData.search(allCheckViewFilter, COLLECTIONS.MediaCount, function (err, res) {
                            if (!err && res && WidgetMedia) {
                                WidgetMedia.count = res.totalRecord;
                                scope.viewsCount = WidgetMedia.count;
                                const viewsEl = element[0].querySelector('#views span');
                                if (viewsEl) viewsEl.textContent = scope.viewsCount.toLocaleString('en-US');
                                scope.$apply();
                            }
                        });
                    };

                    scope.createMoreIcon = function (allIcons) {
                        const moreIcon = document.createElement('div');
                        moreIcon.classList.add('flex', 'flex-align-center', 'flex-justify-center', 'media-action-icon-element', 'cursor-pointer');
                        moreIcon.innerHTML = '<i class="material-icons-outlined">more_horiz</i>';
                        moreIcon.setAttribute('aria-label', 'More options');
                        moreIcon.setAttribute('role', 'button');
                        moreIcon.setAttribute('tabindex', '0');

                        moreIcon.onclick = () => {
                            const drawerItems = allIcons.map(i => ({id: i.id, text: scope.getIconText(i.id)}));
                            buildfire.components.drawer.open({listItems: drawerItems}, (err, result) => {
                                if (result) scope.onIconAction({actionId: result.id});
                                buildfire.components.drawer.closeDrawer();
                            });
                        };
                        element[0].appendChild(moreIcon);
                    };

                    scope.getIconText = function (iconId) {
                        const WidgetMedia = scope.widgetMedia;
                        const textMap = {
                            note: "itemDrawer.addNote",
                            downloadVideo: WidgetMedia.item?.data?.hasDownloadedVideo ? "itemDrawer.removeDownloadedVideo" : "itemDrawer.downloadVideo",
                            downloadAudio: WidgetMedia.item?.data?.hasDownloadedAudio ? "homeDrawer.removeDownloadedAudio" : "homeDrawer.downloadAudio",
                            share: "itemDrawer.share",
                            sourceLink: "itemDrawer.mediaSource",
                            openActionLinks: "itemDrawer.openLinks",
                            favorite: WidgetMedia.item?.data?.bookmarked ? "itemDrawer.removeFromFavorites" : "itemDrawer.favorite",
                            playlist: $rootScope.isInGlobalPlaylist?.(WidgetMedia.item?.id) ? "itemDrawer.removeFromPlaylist" : "itemDrawer.addToPlaylist"
                        };
                        return getString(textMap[iconId] || iconId);
                    };

                    scope.$watch('widgetMedia.media', scope.initMediaActionIcons);
                    scope.$watch('widgetMedia.iconRefresh', scope.initMediaActionIcons);
                    scope.$watch(() => $rootScope.currentlyDownloading, scope.initMediaActionIcons, true);
                    scope.$watch('widgetMedia.item.data.hasDownloadedVideo', scope.initMediaActionIcons);
                    scope.$watch('widgetMedia.item.data.hasDownloadedAudio', scope.initMediaActionIcons);
                    scope.initMediaActionIcons();
                }
            };
        }]);
})(window.angular, window.buildfire);
