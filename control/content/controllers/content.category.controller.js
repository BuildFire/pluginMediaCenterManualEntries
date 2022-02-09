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
    .controller('ContentCategoryCtrl', ['$scope', 'Buildfire', 'SearchEngine', 'DB', 'COLLECTIONS', 'Location', 'category', 'Messaging', 'EVENTS', 'PATHS', 'AppConfig', 'Orders', 'SubcategoryOrders', 'CategoryOrders', '$csv',
      function ($scope, Buildfire, SearchEngine, DB, COLLECTIONS, Location, category, Messaging, EVENTS, PATHS, AppConfig, Orders, SubcategoryOrders, CategoryOrders, $csv) {
        /**
         * Using Control as syntax this
         */
        var ContentCategory = this;
        ContentCategory.subcategoryTitle = "";
        /**
         * Create instance of MediaContent, MediaCenter db collection
         * @type {DB}
         */
        var MediaContent = new DB(COLLECTIONS.MediaContent);
        var MediaCenter = new DB(COLLECTIONS.MediaCenter);
        var SearchEngineService = new SearchEngine(COLLECTIONS.MediaContent);
        var CategoryContent = new DB(COLLECTIONS.CategoryContent);
        var SubcategoryContent = new DB(COLLECTIONS.SubcategoryContent);
        var CategoryAccess = new Categories({
          db: CategoryContent
        })
        var SubcategoryAccess = new Subcategories({
          db: SubcategoryContent
        });
        /**
         * Get the MediaCenter initialized settings
         */

        if (!AppConfig.getSettings()) {
          AppConfig.setSettings({
            content: {
              images: [],
              descriptionHTML: '',
              description: '',
              sortCategoriesBy: Orders.ordersMap.Newest,
              sortCategoriesBy: CategoryOrders.ordersMap.Newest,
              rankOfLastItem: 0,
              rankOfLastCategory: 0,
              allowShare: true,
              allowSource: true,
              allowOfflineDownload: false,
              enableFiltering: false,
              transferAudioContentToPlayList: false,
              forceAutoPlay: false,
              dateIndexed: true,
              dateCreatedIndexed: true
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

        console.log('Settings', MediaCenterSettings);

        function init() {
          ContentCategory.isBusy = true;
          Buildfire.auth.getCurrentUser((err, user) => {
            if (err) {
              ContentCategory.saving = false;
              return;
            }
            var data = {
              name: "",
              icon: "",
              subcategories: [
              ],
              sortBy: SubcategoryOrders.ordersMap.Newest, // to sort subcategories
              rank: parseInt((MediaCenterSettings.content.rankOfLastCategory || 0) + 10),
              rankOfLastSubcategory: 0,
              lastSubcategoryId: 0,
              createdOn: "",
              createdBy: "",
              lastUpdatedOn: "",
              lastUpdatedBy: "",
              deletedOn: "",
              deletedBy: "",
            };

            ContentCategory.sortOptions = SubcategoryOrders.options;
            if (user) ContentCategory.user = user;

            /**
             * if controller is for opened in edit mode, Load media data
             * else init it with bootstrap data
             */
            if (category) {
              console.log("category", category);
              ContentCategory.item = category;
              ContentCategory.mode = 'edit';
              ContentCategory.title = "Edit Category";
              ContentCategory.displayedSubactegories = ContentCategory.item.data.subcategories; // used to display searched subcategories
              updateMasterItem(ContentCategory.item);
            }
            else {
              ContentCategory.item = { data: data };
              ContentCategory.mode = 'add';
              ContentCategory.title = "Add Category";
              ContentCategory.displayedSubactegories = ContentCategory.item.data.subcategories;
              updateMasterItem(ContentCategory.item);
            }

            ContentCategory.itemSortableOptions.disabled = !(ContentCategory.item.data.sortBy === SubcategoryOrders.ordersMap.Manually);
            ContentCategory.isBusy = false;
            $scope.$apply();
          });
        };

        init();

        ContentCategory.searchText = "";
        ContentCategory.saving = false;

        function updateMasterItem(item) {
          ContentCategory.masterItem = angular.copy(item);
        }

        ContentCategory.addIcon = function () {
          var options = { showIcons: true, multiSelection: false },
            listImgCB = function (error, result) {
              if (error) {
                console.error('Error:', error);
              } else {
                console.log("icon", result);
                ContentCategory.item.data.icon = result && result.selectedFiles && result.selectedFiles[0] || result && result.selectedIcons && result.selectedIcons[0] || "";
                console.log("icon", ContentCategory.item.data.icon);
                if (!$scope.$$phase) $scope.$digest();
              }
            };
          buildfire.imageLib.showDialog(options, listImgCB);
        };

        ContentCategory.removeIcon = function () {
          ContentCategory.item.data.icon = "";
        };

        //To render icon whether it is an image or icon
        ContentCategory.isIcon = function (icon) {
          if (icon) {
            return icon.indexOf("http") != 0;
          }
          return ContentCategory.item.data.icon && ContentCategory.item.data.icon.indexOf("http") != 0;
        };

        ContentCategory.updateItem = function () {
          if (ContentCategory.item.data.name) {
            ContentCategory.saving = true;
            ContentCategory.item.data.name = ContentCategory.item.data.name.trim();
            if (ContentCategory.item.id) {
              //then we are editing the item
              ContentCategory.item.data.id = ContentCategory.item.id;
              ContentCategory.item.data.lastUpdatedOn = new Date();
              ContentCategory.item.data.lastUpdatedBy = ContentCategory.user;
              ContentCategory.item.data.rankOfLastSubcategory = ContentCategory.item.data.subcategories.length ? ContentCategory.item.data.subcategories[ContentCategory.item.data.subcategories.length - 1].rank : 0;
              CategoryAccess.updateCategory(ContentCategory.item, function (err, result) {
                if (err) {
                  ContentCategory.saving = false;
                  console.error('Error saving data: ', err);
                  return;
                }
                else {
                  ContentCategory.item = result;
                  updateMasterItem(ContentCategory.item);
                  Messaging.sendMessageToWidget({
                    name: EVENTS.CATEGORIES_CHANGE,
                    message: {}
                  });
                  ContentCategory.saving = false;
                  ContentCategory.done();
                }
              });
            }

            else {
              //then we are adding the item
              ContentCategory.item.data.createdOn = new Date();
              ContentCategory.item.data.createdBy = ContentCategory.user;

              ContentCategory.item.data.lastSubcategoryId = ContentCategory.item.data.subcategories.length ? ContentCategory.item.data.subcategories.length : 0;
              ContentCategory.item.data.rankOfLastSubcategory = ContentCategory.item.data.subcategories.length ? ContentCategory.item.data.subcategories[ContentCategory.item.data.subcategories.length - 1].rank : 0;
              ContentCategory.addItem((err, result) => {
                if (err) {
                  ContentCategory.saving = false;
                  return console.log('Error saving data: ', err);
                }
                if (result) {
                  ContentCategory.item = result;
                  updateMasterItem(ContentCategory.item);
                  if (ContentCategory.item.data.subcategories && ContentCategory.item.data.subcategories.length) {
                    ContentCategory.item.data.subcategories.map((subcategory, index) => {
                      subcategory.categoryId = result.id;
                      subcategory.id = result.id + "_" + index;
                    });
                  }
                    ContentCategory.item.data.id = result.id;
                    CategoryAccess.updateCategory(ContentCategory.item, function (err, result) {
                      if (err) {
                        ContentCategory.saving = false;
                        console.error('Error saving data: ', err);
                        return;
                      }
                      else {
                        ContentCategory.item = result;
                        updateMasterItem(ContentCategory.item);
                        Messaging.sendMessageToWidget({
                          name: EVENTS.CATEGORIES_CHANGE,
                          message: {}
                        });
                        ContentCategory.saving = false;
                        MediaCenterSettings.content.rankOfLastCategory = ContentCategory.item.data.rank;
                        MediaCenter.save(MediaCenterSettings).then(() => {
                          ContentCategory.done();
                        });
                      }
                    });
                }
              });
              return;
            }

          }
          else {
            $scope.titleRequired = true;
          }
        }



        ContentCategory.addItem = function (cb) {
          CategoryAccess.addCategory(ContentCategory.item.data, function (err, result) {
            if (err) {
              console.error('Error saving data: ', err);
              return cb("Error saving data");
            }
            else {
              ContentCategory.item = result;
              updateMasterItem(ContentCategory.item);
              cb(null, result);
            }
          });
        }

        ContentCategory.done = function () {
          setTimeout(() => {
            Location.go("#/categoryHome");
          }, 0);
        };

        ContentCategory.showSubcategoryModal = function (mode, editedSubcategory) {
          if (mode == "Add") {
            ContentCategory.subcategoryModalMode = "Add";
            ContentCategory.addSubcategoryTitle = "Add Subcategory";
            ContentCategory.showSubModal = true;
          }
          else if (mode == "Edit" && editedSubcategory && editedSubcategory.name) {
            // we are editing
            ContentCategory.subcategoryModalMode = "Edit";
            ContentCategory.addSubcategoryTitle = "Edit Subcategory";
            ContentCategory.subcategoryTitle = editedSubcategory.name;
            ContentCategory.showSubModal = true;
            ContentCategory.editedSubcategory = editedSubcategory;
          }
        }

        ContentCategory.closeSubcategoryModal = function () {
          ContentCategory.showSubModal = false;
          ContentCategory.subcategoryTitle = "";
        };

        ContentCategory.addSucbategoryIcon = function (subcategory, event) {
          let subIndex = ContentCategory.item.data.subcategories.indexOf(subcategory);
          var options = { showIcons: true, multiSelection: false },
            listImgCB = function (error, result) {
              if (error) {
                console.error('Error:', error);
              } else {
                ContentCategory.item.data.subcategories[subIndex].icon = result && result.selectedFiles && result.selectedFiles[0] || result && result.selectedIcons && result.selectedIcons[0] || "";
                if (!$scope.$$phase) $scope.$digest();
              }
            };
          buildfire.imageLib.showDialog(options, listImgCB);
        };

        ContentCategory.removeSubcategoryIcon = function (subcategory) {
          let subIndex = ContentCategory.item.data.subcategories.indexOf(subcategory);
          ContentCategory.item.data.subcategories[subIndex].icon = "";
        };

        ContentCategory.updateSubcategory = function () {
          if (ContentCategory.subcategoryTitle) {
            if (ContentCategory.subcategoryModalMode == "Add") {
              ContentCategory.item.data.subcategories.push(new Subcategory({
                name: ContentCategory.subcategoryTitle,
                id: ContentCategory.item.id + "_" + ContentCategory.item.data.lastSubcategoryId,
                rank: (ContentCategory.item.data.rankOfLastSubcategory || 0) + 10,
                icon: "",
                createdOn: new Date(),
                createdBy: ContentCategory.user || "",
                lastUpdatedOn: "",
                lastUpdatedBy: "",
                deletedOn: "",
                deletedBy: "",
              }));
              ContentCategory.closeSubcategoryModal();
              ContentCategory.subcategoryTitle = "";
              ContentCategory.item.data.rankOfLastSubcategory = (ContentCategory.item.data.rankOfLastSubcategory || 0) + 10;
              ContentCategory.item.data.lastSubcategoryId = parseInt(ContentCategory.item.data.lastSubcategoryId + 1);
            }
            else {
              let itemIndex = ContentCategory.item.data.subcategories.indexOf(ContentCategory.editedSubcategory);
              ContentCategory.item.data.subcategories[itemIndex] = new Subcategory({
                id: ContentCategory.editedSubcategory.id,
                name: ContentCategory.subcategoryTitle,
                categoryId: ContentCategory.item.id,
                rank: ContentCategory.editedSubcategory.rank || (ContentCategory.item.data.rankOfLastCategory || 0) + 10,
                icon: ContentCategory.editedSubcategory.icon || "",
                createdOn: ContentCategory.editedSubcategory.createdOn || new Date(),
                createdBy: ContentCategory.editedSubcategory.createdBy || "",
                lastUpdatedOn: new Date(),
                lastUpdatedBy: ContentCategory.user || "",
                deletedOn: "",
                deletedBy: "",
              })
              ContentCategory.closeSubcategoryModal();
              ContentCategory.subcategoryTitle = "";
            }
          }
          ContentCategory.searchSubcategories();
        };

        ContentCategory.removeSubcategory = function (subcategory) {
          buildfire.dialog.confirm(
            {
              title: "Delete Sucbategory",
              confirmButton: {
                type: "danger",
                text: "Delete"
              },
              message: "Are you sure you want to delete this subcategory? This action is not reversible.",
            },
            (err, isConfirmed) => {
              if (err) console.error(err);

              if (isConfirmed) {
                let itemIndex = ContentCategory.item.data.subcategories.indexOf(subcategory);
                ContentCategory.item.data.subcategories.splice(itemIndex, 1);
                ContentCategory.searchSubcategories();
                $scope.$apply();
              } else {
                //Prevent action
              }
            }
          );
        };

        //TODO fix this function
        ContentCategory.toggleSortOrder = function (name) {
          if (!name) {
            console.info('There was a problem sorting your data');
          } else {
            var sortOrder = SubcategoryOrders.getOrder(name || SubcategoryOrders.ordersMap.Default);
            ContentCategory.item.data.sortBy = name;
            ContentCategory.item.data.sortByValue = sortOrder.value;
            ContentCategory.sort();
            // ContentCategory.getMore();
            ContentCategory.itemSortableOptions.disabled = !(ContentCategory.item.data.sortBy === SubcategoryOrders.ordersMap.Manually);
          }
        };

        ContentCategory.itemSortableOptions = {
          handle: '> .cursor-grab',
          disabled: ContentCategory.isBusy || !(ContentCategory.item.data.sortBy === SubcategoryOrders.ordersMap.Manually),
          stop: function (e, ui) {
            var endIndex = ui.item.sortable.dropindex,
              maxRank = 0,
              draggedItem = ContentCategory.displayedSubactegories[endIndex];
            //console.log(ui.item.sortable.dropindex)
            if (draggedItem) {
              var prev = ContentCategory.displayedSubactegories[endIndex - 1],
                next = ContentCategory.displayedSubactegories[endIndex + 1];
              var isRankChanged = false;
              if (next) {
                if (prev) {
                  draggedItem.rank = ((prev.rank || 0) + (next.rank || 0)) / 2;
                  isRankChanged = true;
                } else {
                  draggedItem.rank = (next.rank || 0) / 2;
                  isRankChanged = true;
                }
              } else {
                if (prev) {
                  draggedItem.rank = (((prev.rank || 0) * 2) + 10) / 2;
                  maxRank = draggedItem.rank;
                  isRankChanged = true;
                }
              }
              if (isRankChanged) {
                if (ContentCategory.item.data.rankOfLastSubcategory < maxRank) {
                  ContentCategory.item.data.rankOfLastSubcategory = maxRank;
                }
                ContentCategory.item.data.subcategories.sort(function (a, b) {
                  return a.rank - b.rank;
                });
                ContentCategory.searchSubcategories();
              }
            }
          }
        };

        ContentCategory.sort = function () {
          if (ContentCategory.item.data.sortBy === "Subcategory Title A-Z") {
            ContentCategory.item.data.subcategories.sort(function (a, b) {
              return a.name.localeCompare(b.name);
            });
          }

          if (ContentCategory.item.data.sortBy === "Subcategory Title Z-A") {
            ContentCategory.item.data.subcategories.sort(function (a, b) {
              return b.name.localeCompare(a.name);
            });
          }

          if (ContentCategory.item.data.sortBy === "Manually") {
            ContentCategory.item.data.subcategories.sort(function (a, b) {
              return a.rank - b.rank;
            });
          }

          if (ContentCategory.item.data.sortBy === "Newest") {
            ContentCategory.item.data.subcategories.sort(function (a, b) {
              return (new Date(b.createdOn) - new Date(a.createdOn));
            });
          }

          if (ContentCategory.item.data.sortBy === "Oldest") {
            console.log("oldest", ContentCategory.item.data.subcategories);
            ContentCategory.item.data.subcategories.sort(function (a, b) {
              return (new Date(a.createdOn) - new Date(b.createdOn));
            });
          }
        };

        ContentCategory.cancelAdd = function () {
          Location.go("#/categoryHome");
        };

        ContentCategory.searchSubcategories = function () {
          if (ContentCategory.searchText == "") {
            ContentCategory.displayedSubactegories = ContentCategory.item.data.subcategories;
          }
          else {
            ContentCategory.displayedSubactegories = ContentCategory.item.data.subcategories.filter(function (subcategory) {
              return subcategory.name.toLowerCase().indexOf(ContentCategory.searchText.toLowerCase()) > -1;
            });
          }
        };

        ContentCategory.onEnterKey = function (keyEvent) {
          if (keyEvent.which === 13) ContentCategory.searchSubcategories();
        };

        var header = {
          name: "Subcategory name",
        };
        var headerRow = ["name"];

        ContentCategory.getTemplate = function () {
          var templateData = [{
            name: '',
          }];
          var csv = $csv.jsonToCsv(angular.toJson(templateData), {
            header: header
          });
          $csv.download(csv, "Template.csv");
        };

        ContentCategory.exportCSV = function () {
          if (ContentCategory.item.data.subcategories && ContentCategory.item.data.subcategories.length) {
            let persons = ContentCategory.item.data.subcategories.map(function (subcategory) {
              return { name: subcategory.name };
            });
            var csv = $csv.jsonToCsv(angular.toJson(persons), {
              header: header
            });
            $csv.download(csv, "Export.csv");
          }
          else {
            ContentCategory.getTemplate();
          }
        };

        function isValidItem(item, index, array) {
          return item.name;
        }

        function validateCsv(items) {
          if (!Array.isArray(items) || !items.length) {
            return false;
          }
          return items.every(isValidItem);
        }

        ContentCategory.openImportCSVDialog = function () {
          $csv.import(headerRow).then(function (rows) {
            ContentCategory.loading = true;
            if (rows && rows.length > 1) {

              var columns = rows.shift();

              for (var _index = 0; _index < headerRow.length; _index++) {
                if (header[headerRow[_index]] != columns[headerRow[_index]]) {
                  ContentCategory.loading = false;
                  ContentCategory.csvDataInvalid = true;
                  /* $timeout(function hideCsvDataError() {
                   ContentCategory.csvDataInvalid = false;
                   }, 2000);*/
                  break;
                }
              }

              if (!ContentCategory.loading)
                return;

              var rank = 0;
              for (var index = 0; index < rows.length; index++) {
                rank += 10;
                rows[index].createdOn = new Date().getTime();
                rows[index].createdBy = ContentCategory.user || "";
                rows[index].lastUpdatedOn = "";
                rows[index].lastUpdatedBy = "";
                rows[index].deletedOn = "";
                rows[index].deletedBy = "";
                rows[index].rank = rank;
                rows[index].id = ContentCategory.item.id ? ContentCategory.item.id + "_" + parseInt(ContentCategory.item.data.lastSubcategoryId + index) : "";
                rows[index].name = rows[index].name;
              }
              if (validateCsv(rows)) {
                // MediaContent.insert(rows).then(function (data) {
                //     ContentCategory.loading = false;
                //     ContentCategory.isBusy = false;
                //     ContentCategory.items = [];
                //     ContentCategory.info.data.content.rankOfLastItem = rank;
                // }, function errorHandler(error) {
                //     console.error(error);
                //     ContentCategory.loading = false;
                //     $scope.$apply();
                // });
                ContentCategory.item.data.rankOfLastCategory = rank;
                ContentCategory.item.data.lastSubcategoryId = parseInt(ContentCategory.item.data.lastSubcategoryId + rows.length);
                ContentCategory.item.data.subcategories = rows;
                ContentCategory.searchSubcategories();
              } else {
                ContentCategory.loading = false;
                ContentCategory.csvDataInvalid = true;
                $timeout(function hideCsvDataError() {
                  ContentCategory.csvDataInvalid = false;
                }, 2000);
              }
            }
            else {
              ContentCategory.loading = false;
              ContentCategory.csvDataInvalid = true;
              /*
               $timeout(function hideCsvDataError() {
               ContentCategory.csvDataInvalid = false;
               }, 2000);*/
              $scope.$apply();
            }
          }, function (error) {
            ContentCategory.loading = false;
            $scope.$apply();
            //do something on cancel
          });
        };
      }]);
})(window.angular, window.tinymce);