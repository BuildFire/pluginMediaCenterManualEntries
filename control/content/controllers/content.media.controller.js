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
    .controller('ContentMediaCtrl', ['$scope', 'Buildfire', 'SearchEngine', 'DB', 'COLLECTIONS', 'Location', 'media', 'Messaging', 'EVENTS', 'PATHS', 'AppConfig', 'Orders',
      function ($scope, Buildfire, SearchEngine, DB, COLLECTIONS, Location, media, Messaging, EVENTS, PATHS, AppConfig, Orders) {
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
        var MediaCenter = new DB(COLLECTIONS.MediaCenter);
        var SearchEngineService = new SearchEngine(COLLECTIONS.MediaContent);
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
              rankOfLastItem: 0,
              allowShare: true,
              allowSource: true,
              transferAudioContentToPlayList:false,
              forceAutoPlay:false
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
        /**
         * Get the MediaCenter master collection data object id
         */
        var appId = AppConfig.getAppId();
        /**
         * Options for image library
         * @type {{showIcons: boolean, multiSelection: boolean}}
         */
        var selectImageOptions = { showIcons: false, multiSelection: false };

        ContentMedia.saving = false;

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
            rank: (MediaCenterSettings.content.rankOfLastItem || 0) + 10,
            links: [], // this will contain action links,
            searchEngineId: '',
            allowShare: true,
            allowSource: true,
            transferAudioContentToPlayList:false,
            forceAutoPlay:false
          };
          /**
           * Define links sortable options
           * @type {{handle: string}}
           */
          ContentMedia.linksSortableOptions = {
            handle: '> .handle'
          };
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
            ContentMedia.item = media;
            if (media.data.mediaDate)
              ContentMedia.item.data.mediaDate = new Date(media.data.mediaDate);
            if (ContentMedia.item.data.topImage) {
              //topImage.loadbackground(ContentMedia.item.data.topImage);
            }
            if (ContentMedia.item.data.image) {
              audioImage.loadbackground(ContentMedia.item.data.image);
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
          if (ContentMedia.item.data.links)
            ContentMedia.linkEditor.loadItems(ContentMedia.item.data.links);
        }

        /**
         * This updateMasterItem will update the ContentMedia.masterItem with passed item
         * @param item
         */
        function updateMasterItem(item) {
          ContentMedia.masterItem = angular.copy(item);
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
          if (ContentMedia.item.data.searchEngineId) {
            SearchEngineService.update(ContentMedia.item.data.searchEngineId, ContentMedia.item.data).then(function () {
              update();
            });
          } else {
            update();
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
              ContentMedia.done();
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
         * This addNewItem method will call the Builfire insert method to insert ContentMedia.item
         */

        function createNewDeeplink(obj){
          new Deeplink({
            deeplinkId:obj.id,
            name:obj.data.title,
            deeplinkData:{id:obj.id},
            imageUrl:(obj.data.topImage)?obj.data.topImage:null
          }).save();
        }

        function addNewItem(callback) {
          ContentMedia.item.data.bodyHTML = ContentMedia.item.data.body;
          ContentMedia.item.data && ContentMedia.item.data.title ? 
          ContentMedia.item.data.titleIndex = ContentMedia.item.data.title.toLowerCase() : '';
          SearchEngineService.insert(ContentMedia.item.data).then(function (searchEngineData) {
            ContentMedia.item.data.searchEngineId = searchEngineData.id;
            MediaContent.insert(ContentMedia.item.data).then((data) => {
              createNewDeeplink(data);
              MediaContent.getById(data.id).then((item) => {
                ContentMedia.item = item;
                ContentMedia.item.data.deepLinkUrl = Buildfire.deeplink.createLink({ id: item.id });
                updateMasterItem(item);
                ContentMedia.saving = false;
                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                MediaCenterSettings.content.rankOfLastItem = item.data.rank;
                if (appId && MediaCenterSettings) {
                  MediaCenter.update(appId, MediaCenterSettings).then((data) => {
                  }, (err) => {
                    callback(err);
                  });
                }else {
                  MediaCenter.insert(MediaCenterSettings).then((data) => {
                    console.info("Inserted MediaCenter rank");
                  }, (err) => {
                    callback(err);
                  });
                }
                Messaging.sendMessageToWidget({
                  name: EVENTS.ITEMS_CHANGE,
                  message: {}
                });

                callback()
              }, (err) => {
                resetItem(err);
              });
            }, (err) => {
              callback(err);
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
            return buildfire.dialog.toast({
              message: "Item title is required",
              type: "warning",
            });
          } else {
            ContentMedia.saving = true;
            if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
            if (ContentMedia.item.id) {
              createNewDeeplink(ContentMedia.item);
              updateItemData();
            } else {
              ContentMedia.item.data.dateCreated = +new Date();
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
        /* Build fire thumbnail component to add thumbnail image*/
        //var topImage = new Buildfire.components.images.thumbnail("#topImage", {
        //  title: "Top Image",
        //  dimensionsLabel: "1200x675"
        //});
        //
        //topImage.onChange = function (url) {
        //  ContentMedia.item.data.topImage = url;
        //  if (!$scope.$$phase && !$scope.$root.$$phase) {
        //    $scope.$apply();
        //  }
        //};
        //
        //topImage.onDelete = function (url) {
        //  ContentMedia.item.data.topImage = "";
        //  if (!$scope.$$phase && !$scope.$root.$$phase) {
        //    $scope.$apply();
        //  }
        //};



        /* Build fire thumbnail component to add thumbnail image*/
        var audioImage = new Buildfire.components.images.thumbnail("#audioImage", {
          title: "Audio Image",
          dimensionsLabel: "1024x1024"
        });

        audioImage.onChange = function (url) {
          ContentMedia.item.data.image = url;
          if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
          }
        };

        audioImage.onDelete = function (url) {
          ContentMedia.item.data.image = "";
          if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
          }
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
          //console.log('Done called------------------------------------------------------------------------');
          //Buildfire.history.pop();
          setTimeout(() => {
            Messaging.sendMessageToWidget({
              name: EVENTS.ROUTE_CHANGE,
              message: {
                path: PATHS.HOME
              }
            });
            Location.goToHome();
            
            }, 200);
        };
          
          ContentMedia.cancelAdd = function () {
          Location.goToHome();
        };
        /**
         * Initialize bootstrap data
         */
        init();
        /**
         * On rout change update the widget layout
         */
        // Messaging.sendMessageToWidget({
        //   name: EVENTS.ROUTE_CHANGE,
        //   message: {
        //     path: PATHS.MEDIA,
        //     id: ContentMedia.item.id || null
        //   }
        // });
      }]);
})(window.angular, window.tinymce);