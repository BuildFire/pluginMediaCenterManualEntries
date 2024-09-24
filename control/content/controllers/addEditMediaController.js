/**
 * Create self executing function to avoid global scope creation
 */
(function (angular, tinymce) {
  'use strict';
  angular
    .module('mediaCenterContent')
    /**
     * Inject dependency
     */
    .controller('ContentMediaCtrl', ['$scope', '$compile', 'Buildfire', 'SearchEngine', 'DB', 'COLLECTIONS', 'Location', 'media', 'Messaging', 'EVENTS', 'PATHS', 'AppConfig', 'Orders', 'CategoryOrders',
      function ($scope, $compile, Buildfire, SearchEngine, DB, COLLECTIONS, Location, media, Messaging, EVENTS, PATHS, AppConfig, Orders, CategoryOrders) {
        window.scrollTo(0, 0);
        /**
         * Breadcrumbs  related implementation
         */
        //Buildfire.history.push('Media', {id: 'itemId'});
        //scroll current view to top when loaded.
        Buildfire.navigation.scrollTop();
        /**
         * Using Control as syntax this
         */
        var ContentMedia = this;
        /**
         * Create instance of MediaContent, MediaCenter db collection
         * @type {DB}
         */
        var MediaContent = new DB(COLLECTIONS.MediaContent);
        var SearchEngineService = new SearchEngine(COLLECTIONS.MediaContent);
        var CategoryContent = new DB(COLLECTIONS.CategoryContent);
        /**
         * Get the MediaCenter initialized settings
         */
        if (!AppConfig.getSettings()) {
          AppConfig.setSettings({
            content: {
              images: [],
              descriptionHTML: '<p>&nbsp;<br></p>',
              description: '',
              sortBy: Orders.ordersMap.Newest,
              sortCategoriesBy: CategoryOrders.ordersMap.Newest,
              rankOfLastItem: 0,
              allowShare: true,
              allowAddingNotes: true,
              allowSource: true,
              forceAutoPlay: false,
              dateIndexed: true,
              dateCreatedIndexed: true,
              enableFiltering: false,
            },
            design: {
              listLayout: "list-1",
              itemLayout: "item-1",
              backgroundImage: "",
              skipMediaPage: false
            }
          });
        }
        var MediaCenterSettings = AppConfig.getSettings();
        ContentMedia.filtersEnabled = MediaCenterSettings.content.enableFiltering;

        /**
         * Options for image library
         * @type {{showIcons: boolean, multiSelection: boolean}}
         */
        var selectImageOptions = { showIcons: false, multiSelection: false };

        ContentMedia.saving = false;

        $scope.selectCategoriesListOptions = {
          settings: {
            allowDragAndDrop: false,
            showSearchBar: true,
            showSortOptions: true,
            showAddButton: false,
            showEditButton: false,
            showDeleteButton: false,
            contentMapping: {
              idKey: "id",
              columns: [
                { titleKey: "name" },
                { toggleKey: "isIncluded" },
              ],
            },
            sortOptions: []
          },
        };

        /**
         * Init bootstrapping data
         */
        function init() {
          var data = {
            topImage: '',
            summary: '',
            title: '',
            body: '',
            bodyHTML: '',
            srcUrl: '',
            audioUrl: '',
            videoUrl: '',
            image: '',
            mediaDate: new Date(),
            mediaDateIndex: new Date().getTime(),
            rank: (MediaCenterSettings.content.rankOfLastItem || 0) + 10,
            links: [], // this will contain action links,
            searchEngineId: '',
            allowShare: true,
            allowAddingNotes: true,
            allowSource: true,
            forceAutoPlay: false,
          };
          /**
           * Define links sortable options
           * @type {{handle: string}}
           */
          ContentMedia.linksSortableOptions = {
            handle: '> .handle'
          };

          ContentMedia.assignedCategories = [];
          /**
           * Define body content WYSIWYG options
           * @type {{plugins: string, skin: string, trusted: boolean, theme: string}}
           */
          ContentMedia.bodyContentWYSIWYGOptions = {
            plugins: 'advlist autolink link image lists charmap print preview',
            skin: 'lightgray',
            trusted: true,
            theme: 'modern'
          };

          /**
           * if controller is for opened in edit mode, Load media data
           * else init it with bootstrap data
           */
          if (media) {
            media.data.topImage = getImageUrl(media.data.topImage);
            media.data.image = getImageUrl(media.data.image);
            ContentMedia.item = media;
            ContentMedia.dbItem = {
              id: media.id,
              title: media.data.title,
              videoUrl: media.data.videoUrl,
              audioUrl: media.data.audioUrl
            };
            if (media.data.mediaDate) {
              ContentMedia.item.data.mediaDate = new Date(media.data.mediaDate);
              ContentMedia.item.data.mediaDateIndex = new Date(media.data.mediaDate).getTime();
            }
            if (ContentMedia.item && ContentMedia.item.data && ((ContentMedia.item.data.categories && ContentMedia.item.data.categories.length) || (ContentMedia.item.data.subcategories && ContentMedia.item.data.subcategories.length))) {
              fetchAssignedCategories();
            }
            updateMasterItem(ContentMedia.item);

          }
          else {
            ContentMedia.item = { data: data };
            updateMasterItem(ContentMedia.item);

          }

          /**
           * Initialize the links
           */
          if (ContentMedia.item.data.links) ContentMedia.linkEditor.loadItems(ContentMedia.item.data.links);
        }

        /**
         * This updateMasterItem will update the ContentMedia.masterItem with passed item
         * @param item
         */
        function updateMasterItem(item) {
          ContentMedia.masterItem = angular.copy(item);
        }

        function fetchAssignedCategories() {
          if (ContentMedia.item && ContentMedia.item.data && ContentMedia.item.data.categories && ContentMedia.item.data.categories.length) {
            var opts =
            {
              filter: {
                "$json.id": { $in: ContentMedia.item.data.categories }
              },
              skip: 0,
              limit: 50,
            }

            ContentMedia.isBusy = true;
            var shouldUpdate = false; //to check if any categories are deleted
            CategoryContent.find(opts).then(function success(result) {
              if (!result || result.length == 0) {
                if (ContentMedia.item.data.categories && ContentMedia.item.data.categories.length || ContentMedia.item.data.subcategories && ContentMedia.item.data.subcategories.length) {
                  ContentMedia.item.data.categories = [];
                  ContentMedia.item.data.subcategories = [];
                  update();
                }
              }
              else if (result.length < opts.limit) {
                // In case a category or subcategory is deleted
                let resIds = result.map(function (item) { return item.id; });
                var resultSubcatIds = [];

                result.forEach(cat => {
                  if (cat.data.subcategories && cat.data.subcategories.length) {
                    cat.data.subcategories.forEach(subcat => {
                      resultSubcatIds.push(subcat.id);
                    });
                  }
                });
                if (ContentMedia.item.data.subcategories && ContentMedia.item.data.subcategories.length) {
                  ContentMedia.item.data.subcategories = ContentMedia.item.data.subcategories.filter(function (item) {
                    if (!resultSubcatIds.includes(item)) {
                      shouldUpdate = true;
                    }
                    return resultSubcatIds.includes(item);
                  });
                }
                ContentMedia.item.data.categories = ContentMedia.item.data.categories.filter(function (item) {
                  if (!resIds.includes(item)) {
                    shouldUpdate = true;
                  }
                  return resIds.includes(item);
                })

                if (shouldUpdate) {
                  update();
                }
              }
              ContentMedia.assignedCategories = result;
              if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
              ContentMedia.isBusy = false;
            }, function fail() {
              ContentMedia.isBusy = false;
            });

          }
          else {
            if (ContentMedia.item.data.categories && ContentMedia.item.data.categories.length || ContentMedia.item.data.subcategories && ContentMedia.item.data.subcategories.length) {
              ContentMedia.item.data.categories = [];
              ContentMedia.item.data.subcategories = [];
              update();
            }
          }
          function update() {
            MediaContent.update(ContentMedia.item.id, ContentMedia.item.data).then((data) => {
              updateMasterItem(ContentMedia.item);
              ContentMedia.saving = false;
              if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
              Messaging.sendMessageToWidget({
                name: EVENTS.ITEMS_CHANGE,
                message: {}
              });
              buildfire.dialog.toast({
                message: "Item updated successfully",
                type: "success",
              });
            }, (err) => {
              resetItem();
              return buildfire.dialog.toast({
                message: "Error while updating",
                type: "danger",
              });
            });
          }
        }

        /**
         * This resetItem will reset the ContentMedia.item with ContentMedia.masterItem
         */
        function resetItem() {
          ContentMedia.item = angular.copy(ContentMedia.masterItem);
        }

        /**
         * filter to remove the body from copied data
         * @param item
         * @returns {XMLList|XML|*}
         */
        function filter(item) {
          var newItem = angular.copy(item);
          newItem.data.body = '';
          return newItem;
        }

        /**
         * isUnChanged to check whether there is change in controller media item or not
         * @param item
         * @returns {*|boolean}
         */
        function isUnChanged(item) {
          if (item.data.body && tinymce.editors[0] && angular.equals(tinymce.editors[0].getContent({ format: 'text' }).trim(), "")) {
            return angular.equals(filter(item), ContentMedia.masterItem);
          }
          else {
            return angular.equals(item, ContentMedia.masterItem);
          }
        }

        /**
         * This updateItemData method will call the Builfire update method to update the ContentMedia.item
         */
        function updateItemData() {
          ContentMedia.item.data.bodyHTML = ContentMedia.item.data.body;
          ContentMedia.item.data && ContentMedia.item.data.title ?
            ContentMedia.item.data.titleIndex = ContentMedia.item.data.title.toLowerCase() : '';
          if (!ContentMedia.item.data.deepLinkUrl) {
            ContentMedia.item.data.deepLinkUrl = Buildfire.deeplink.createLink({ id: ContentMedia.item.id });
          }
          var isAnalyticDataChanged = false;


          if (ContentMedia.dbItem.videoUrl != ContentMedia.item.data.videoUrl ||
            ContentMedia.dbItem.audioUrl != ContentMedia.item.data.audioUrl) {
            isAnalyticDataChanged = true;
          }

          if (isAnalyticDataChanged && MediaCenterSettings.content.showViewCount) {
            Buildfire.dialog.confirm(
              {
                title: "Data Changed",
                message: "Do you want to reset views if any?",
                confirmButton: {
                  type: "danger",
                  text: "Reset"
                }
              },
              (err, isConfirmed) => {
                if (isConfirmed) {
                  unregisterEventAnalyticsIfAny(true);
                } else {
                  unregisterEventAnalyticsIfAny(false);
                }
              }
            )
          } else if (isAnalyticDataChanged) {
            unregisterEventAnalyticsIfAny(true);
          } else {
            updateData();
          }
        }

        function updateData() {
          MediaContent.update(ContentMedia.item.id, ContentMedia.item.data).then((data) => {

            const promises = [registerAnalytics(ContentMedia.item, createNewDeeplink(ContentMedia.item))];
            if (ContentMedia.item.data.searchEngineId) {
              promises.push(SearchEngineService.update(ContentMedia.item.data.searchEngineId, ContentMedia.item.data));
            } else {
              promises.push(SearchEngineService.insert({ ...ContentMedia.item.data, id: ContentMedia.item.id }));
            }

            Promise.all(promises).then(() => {
              updateMasterItem(ContentMedia.item);
              ContentMedia.saving = false;
              if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
              buildfire.dialog.toast({
                message: "Item updated successfully",
                type: "success",
              });
              ContentMedia.done();
            }).catch((err) => {
              console.error(err);
              resetItem();
              return buildfire.dialog.toast({
                message: "Error while updating",
                type: "danger",
              });
            });
          }, (err) => {
            console.error(err);
            resetItem();
            return buildfire.dialog.toast({
              message: "Error while updating",
              type: "danger",
            });
          });
        }

        function unregisterEventAnalyticsIfAny(deleteViews) {
          if (deleteViews) {
            removeViews(media.id, "VIDEO");
            removeViews(media.id, "AUDIO");
            removeViews(media.id, "Article");
          }
          unregisterAnalytics(ContentMedia.item).then(() => {
            updateData();
          }).catch((err) => {
            console.error(err);
            return buildfire.dialog.toast({
              message: "Error while updating",
              type: "danger",
            });
          });
        }

        function removeViews(mediaId, mediaType) {
          buildfire.publicData.searchAndUpdate(
            {
              $and: [
                { "$json.mediaId": { $eq: mediaId } },
                { '$json.mediaType': mediaType },
              ]
            },
            {
              $set: {
                isActive: false, _buildfire: {
                  index: {
                    string1: mediaId + "-false",
                  },
                },

              }
            },
            "MediaCount",
            (err, result) => {
              if (err) return console.error(err);
              console.log(result.nModified + " records updated");
            }
          );
        }
        /**
         * This addNewItem method will call the Builfire insert method to insert ContentMedia.item
         */

        function createNewDeeplink(obj) {
          return new Promise((resolve, reject) => {
            new Deeplink({
              deeplinkId: obj.id,
              name: obj.data.title,
              deeplinkData: { id: obj.id },
              imageUrl: (obj.data.topImage) ? obj.data.topImage : null
            }).save((err, res) => {
              if (err)
                return reject(err);
              else
                return resolve(res);
            });
          })
        }

        function addNewItem(callback) {
          ContentMedia.item.data.bodyHTML = ContentMedia.item.data.body;
          ContentMedia.item.data && ContentMedia.item.data.title ?
            ContentMedia.item.data.titleIndex = ContentMedia.item.data.title.toLowerCase() : '';

          MediaContent.insert(ContentMedia.item.data).then((item) => {
            item.data.deepLinkUrl = Buildfire.deeplink.createLink({ id: item.id });

            Promise.all([registerAnalytics(item), SearchEngineService.insert({ ...item.data, id: item.id }), createNewDeeplink(item)])
              .then(() => {
                ContentMedia.saving = false;
                callback();
                if (!$scope.$$phase) {
                  $scope.$digest();
                  $scope.$apply();
                }
              }).catch((err) => {
                callback(err);
              });
          }).catch((err) => {
            callback(err);
          });
        }

        function registerAnalytics(item) {
          return new Promise((resolve, reject) => {
            let events = [];
            if (item.data.videoUrl) {
              events = events.concat([{
                title: item.data.title + " Video Play Count",
                key: item.id + "_videoPlayCount",
                description: "Video Play Count",
              }, {
                title: item.data.title + " Continues Video Play Count",
                key: item.id + "_continuesVideoPlayCount",
                description: "Continues Video Play Count",
              }]);

              if (MediaCenterSettings.content.allowOfflineDownload) {
                events.push({
                  title: item.data.title + " Video Downloads",
                  key: item.id + "_downloads",
                  description: "Video Downloads",
                });
              }
            }
            if (item.data.audioUrl) {
              events = events.concat([{
                title: item.data.title + " Audio Play Count",
                key: item.id + "_audioPlayCount",
                description: "Audio Play Count",
              }, {
                title: item.data.title + " Continues Audio Play Count",
                key: item.id + "_continuesAudioPlayCount",
                description: "Continues Audio Play Count",
              }]);

              if (MediaCenterSettings.content.allowOfflineDownload) {
                events.push({
                  title: item.data.title + " Audio Downloads",
                  key: item.id + "_downloads",
                  description: "Audio Downloads",
                });
              }
            }
            if (!item.data.videoUrl && !item.data.audioUrl) {
              events = events.concat([{
                title: item.data.title + " Article Open Count",
                key: item.id + "_articleOpenCount",
                description: "Article Open Count",
              }, {
                title: item.data.title + " Continues Article Open Count",
                key: item.id + "_continuesArticleOpenCount",
                description: "Continues Article Open Count",
              }]);

            }

            Analytics.bulkRegisterEvents(events, { silentNotification: true }).then(() => {
              resolve();
            }).catch((err) => {
              reject(err);
            });
          });
        }

        function unregisterAnalytics(item) {
          return new Promise((resolve, reject) => {
            let eventKeys = [];
            if (item.data.videoUrl) {
              eventKeys.push(item.id + "_videoPlayCount");
              eventKeys.push(item.id + "_continuesVideoPlayCount");

              if (MediaCenterSettings.content.allowOfflineDownload) {
                eventKeys.push(item.id + "_downloads");
              }
            }
            if (item.data.audioUrl) {
              eventKeys.push(item.id + "_audioPlayCount");
              eventKeys.push(item.id + "_continuesAudioPlayCount");

              if (MediaCenterSettings.content.allowOfflineDownload) {
                eventKeys.push(item.id + "_downloads");
              }
            }
            if (!item.data.videoUrl && !item.data.audioUrl) {
              eventKeys.push(item.id + "_articleOpenCount");
              eventKeys.push(item.id + "_continuesArticleOpenCount");
            }

            Analytics.bulkUnRegisterEvents(eventKeys).then(() => {
              resolve();
            }).catch((err) => {
              reject(err);
            });
          });
        }

        function isValidItem(item) {
          return item.title;
        }

        /**
         * updateItem called when ever there is some change in current media item
         * @param item
         */
        ContentMedia.updateItem = () => {
          if (ContentMedia.saving) return;
          ContentMedia.isItemValid = isValidItem(ContentMedia.item.data);
          if (!ContentMedia.isItemValid) {
            $scope.titleRequired = 'Required';
            var scrollDiv = document.getElementById("titleInput").offsetTop;
            return window.scrollTo({ top: scrollDiv, behavior: 'smooth' });
          } else {
            $scope.titleRequired = false;
            ContentMedia.saving = true;
            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
            if (ContentMedia.item.data.mediaDate) {
              ContentMedia.item.data.mediaDateIndex = new Date(ContentMedia.item.data.mediaDate).getTime();
            }
            if (ContentMedia.item.id) {
              updateItemData();
            } else {
              ContentMedia.item.data.dateCreated = new Date().getTime();
              addNewItem((err) => {
                if (err) {
                  console.error(err)
                  buildfire.dialog.toast({
                    message: "Error while saving item",
                    type: "danger",
                  });
                } else {
                  buildfire.dialog.toast({
                    message: "Item saved successfully",
                    type: "success",
                  });
                  ContentMedia.done();
                }
              });
            }
          }
        }

        // correct image src for dropbox to crop/resize and show it
        function getImageUrl(imageSrc) {
          if (imageSrc && imageSrc.includes("dropbox.com")) {
            imageSrc = imageSrc.replace("www.dropbox", "dl.dropboxusercontent");
            imageSrc = imageSrc.replace("dropbox.com", "dl.dropboxusercontent.com");
          }
          return imageSrc;
        }

        ContentMedia.addListImage = function () {
          var options = { showIcons: false, multiSelection: false },
            listImgCB = function (error, result) {
              if (error) {
                console.error('Error:', error);
              } else {
                ContentMedia.item.data.topImage = result && result.selectedFiles && result.selectedFiles[0] || null;
                if (!$scope.$$phase) $scope.$digest();
              }
            };
          buildfire.imageLib.showDialog(options, listImgCB);
        };
        ContentMedia.removeListImage = function () {
          ContentMedia.item.data.topImage = "";
        };
        ContentMedia.addAudioImage = function () {
          var options = { showIcons: false, multiSelection: false },
            listImgCB = function (error, result) {
              if (error) {
                console.error('Error:', error);
              } else {
                ContentMedia.item.data.image = result && result.selectedFiles && result.selectedFiles[0] || null;
                if (!$scope.$$phase) $scope.$digest();
              }
            };
          buildfire.imageLib.showDialog(options, listImgCB);
        };
        ContentMedia.removeAudioImage = function () {
          ContentMedia.item.data.image = "";
        };

        /**
         * callback function of top image icon selection click
         */
        ContentMedia.selectTopImage = function () {
          Buildfire.imageLib.showDialog(selectImageOptions, function topImageCallback(error, result) {
            if (error) {
              return console.error('Error:', error);
            }
            if (result.selectedFiles && result.selectedFiles.length) {
              ContentMedia.item.data.topImage = result.selectedFiles[0];
              $scope.$digest();
            }
          });
        };
        /**
         * Will remove the top image url
         */
        ContentMedia.removeTopImage = function () {
          ContentMedia.item.data.topImage = '';
        };
        /**
         * callback function of audio image icon selection click
         */
        ContentMedia.selectAudioImage = function () {
          Buildfire.imageLib.showDialog(selectImageOptions, function audioImageCallback(error, result) {
            if (error) {
              return console.error('Error:', error);
            }
            if (result.selectedFiles && result.selectedFiles.length) {
              ContentMedia.item.data.image = result.selectedFiles[0];
              $scope.$digest();
            }
          });
        };
        /**
         * Will remove the audio image url
         */
        ContentMedia.removeAudioImage = function () {
          ContentMedia.item.data.image = '';
        };

        // create a new instance of the buildfire action Items
        ContentMedia.linkEditor = new Buildfire.components.actionItems.sortableList("#actionItems");
        // this method will be called when a new item added to the list
        ContentMedia.linkEditor.onAddItems = function (items) {
          if (!ContentMedia.item.data.links)
            ContentMedia.item.data.links = [];
          ContentMedia.item.data.links.push(items);
          $scope.$digest();
        };
        // this method will be called when an item deleted from the list
        ContentMedia.linkEditor.onDeleteItem = function (item, index) {
          ContentMedia.item.data.links.splice(index, 1);
          $scope.$digest();
        };
        // this method will be called when you edit item details
        ContentMedia.linkEditor.onItemChange = function (item, index) {
          ContentMedia.item.data.links.splice(index, 1, item);
          $scope.$digest();
        };
        // this method will be called when you change the order of items
        ContentMedia.linkEditor.onOrderChange = function (item, oldIndex, newIndex) {
          var temp = ContentMedia.item.data.links[oldIndex];
          ContentMedia.item.data.links[oldIndex] = ContentMedia.item.data.links[newIndex];
          ContentMedia.item.data.links[newIndex] = temp;
          $scope.$digest();
        };
        /**
         * done will close the single item view
         */
        ContentMedia.done = function () {
          setTimeout(() => {
            Messaging.sendMessageToWidget({
              name: EVENTS.ROUTE_CHANGE,
              message: {
                path: PATHS.HOME
              }
            });
            Location.goToHome();
          }, 0);
        };

        ContentMedia.cancelAdd = function () {
          Messaging.sendMessageToWidget({
            name: EVENTS.ROUTE_CHANGE,
            message: {
              path: PATHS.HOME
            }
          });
          Location.goToHome();
        };

        var _skip = 0,
          _limit = 50,
          searchOptions = {
            filter: {},
            skip: _skip,
            limit: _limit // the plus one is to check if there are any more
          };

        ContentMedia.showCategories = function () {
          const subcategoryDialog = new DialogComponent('dialogComponent', 'subcategoryModal');

          const container = document.querySelector('#dialogComponent');
          $compile(container)($scope);

          if (!$scope.$$phase) {
            $scope.$apply();
            $scope.$digest();
          }

          subcategoryDialog.showDialog(
            {
              title: 'Select Categories',
              saveText: 'Save',
              hideDelete: false,
            }, (e) => subcategoryDialog.close());

          ContentMedia.isBusy = true;
          searchOptions.skip = 0;
          ContentMedia.updateSearchOptions();

          CategoryContent.find(searchOptions).then(function success(result) {
            if (result.length < _limit) {
              ContentMedia.noMore = true;
            } else {
              searchOptions.skip = searchOptions.skip + _limit;
              ContentMedia.noMore = false;
            }

            ContentMedia.allCategories = result;
            ContentMedia.showCatModal = true;
            ContentMedia.isBusy = false;
            if (!$scope.$$phase) {
              $scope.$apply();
              $scope.$digest();
            }
          }, function fail() {
            ContentMedia.isBusy = false;
          });
        };

        ContentMedia.updateSearchOptions = function () {
          var order;
          if (MediaCenterSettings && MediaCenterSettings.content)
            order = CategoryOrders.getOrder(MediaCenterSettings.content.sortCategoriesBy || CategoryOrders.ordersMap.Default);
          if (order) {
            var sort = {};
            sort[order.key] = order.order;
            if ((order.name == "Category Title A-Z" || order.name === "Category Title Z-A")) {
              if (order.name == "Category Title A-Z") {
                searchOptions.sort = { titleIndex: 1 }
              }
              if (order.name == "Category Title Z-A") {
                searchOptions.sort = { titleIndex: -1 }
              }
            } else {
              searchOptions.sort = sort;
            }
            return true;
          }
          else {
            return false;
          }
        };

        ContentMedia.getMore = function () {
          if (ContentMedia.isBusy && !ContentMedia.noMore) {
            return;
          }
          ContentMedia.isBusy = true;
          ContentMedia.updateSearchOptions();
          CategoryContent.find(searchOptions).then(function success(result) {
            if (result.length <= _limit) {// to indicate there are more
              ContentMedia.noMore = true;
            }
            else {
              result.pop();
              searchOptions.skip = searchOptions.skip + _limit;
              ContentMedia.noMore = false;
            }

            ContentMedia.allCategories = ContentMedia.allCategories ? ContentMedia.allCategories.concat(result) : result;
            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
            ContentMedia.isBusy = false;
          }, function fail() {
            ContentMedia.isBusy = false;
          });
        };

        ContentMedia.isIcon = function (icon) {
          if (icon) {
            return icon.indexOf("http") != 0;
          }
        };


        ContentMedia.pickSubcategory = function (categoryId, subcategoryId) {
          ContentMedia.item.data.subcategories = ContentMedia.item.data.subcategories || [];
          if (categoryId && subcategoryId) {
            if (ContentMedia.item.data.categories.indexOf(categoryId) == -1) {
              ContentMedia.item.data.categories.push(categoryId);
            }
            if (ContentMedia.item.data.subcategories.indexOf(subcategoryId) == -1) {
              ContentMedia.item.data.subcategories.push(subcategoryId);
            }
            else {
              ContentMedia.item.data.subcategories.splice(ContentMedia.item.data.subcategories.indexOf(subcategoryId), 1);
            }
          }
        };

        ContentMedia.pickCategory = function (categoryId) {
          ContentMedia.item.data.categories = ContentMedia.item.data.categories || [];
          if (ContentMedia.item.data.categories.indexOf(categoryId) == -1) {
            ContentMedia.item.data.categories.push(categoryId);
            var assignedCategory = ContentMedia.allCategories.filter(function (item) {
              return item.id == categoryId;
            })[0];
            if (assignedCategory) ContentMedia.assignedCategories.push(assignedCategory);
          }
          else {
            ContentMedia.item.data.categories.splice(ContentMedia.item.data.categories.indexOf(categoryId), 1);
            if (ContentMedia.item.data.subcategories) {
              let cat = ContentMedia.allCategories.find(function (item) {
                return item.id == categoryId;
              });
              ContentMedia.assignedCategories = ContentMedia.assignedCategories.filter(function (item) {
                return item.id != categoryId;
              });
              let catSubcats = cat.data.subcategories.map(function (item) {
                return item.id;
              });
              ContentMedia.item.data.subcategories = ContentMedia.item.data.subcategories.filter(function (item) {
                return catSubcats.indexOf(item) == -1;
              });
            }
          }
        }

        ContentMedia.sendUpdatedDataToWidget = function () {
          if (ContentMedia.item) {
            Messaging.sendMessageToWidget({
              name: EVENTS.ITEMS_CHANGE,
              message: {
                itemUpdatedData: ContentMedia.item
              }
            });
          }
        }

        /**
         * ContentMedia.searchListItem() used to search items list
         * @param value to be search.
         */
        ContentMedia.searchListItem = function (value) {
          searchOptions.skip = 0;
          /*reset the skip value*/

          ContentMedia.isBusy = false;
          ContentMedia.items = [];
          if (!value) {
            value = '/*';
          }
          value = value.trim();
          searchOptions.filter = { "$json.name": { "$regex": value, $options: "-i", } };
          ContentMedia.allCategories = [];
          ContentMedia.getMore();
        };

        ContentMedia.onEnterKey = (keyEvent) => {
          if (keyEvent.which === 13) ContentMedia.searchListItem($scope.categorySearch);
        }
        /**
         * Initialize bootstrap data
         */
        init();
        
        $scope.$watch(function () {
					return ContentMedia.item;
				}, ContentMedia.sendUpdatedDataToWidget, true);
      }]);
})(window.angular, window.tinymce);
