(function (angular) {
  'use strict';
  angular
    .module('mediaCenterContent')
    .controller('ContentCategoryHomeListCtrl', [
      '$scope',
      'CategoryOrders',
      'DB',
      'COLLECTIONS',
      'AppConfig',
      function ($scope, CategoryOrders, DB, COLLECTIONS, AppConfig) {
        const CategoryContent = new DB(COLLECTIONS.CategoryContent);
        const MediaCenter = new DB(COLLECTIONS.MediaCenter);

        let _skip = 0,
          _limit = 50,
          searchOptions = {
            filter: {},
            sort: { createdOn: -1 },
            skip: _skip,
            limit: _limit + 1, // the plus one is to check if there are any more
          },
          mediaCenterData = AppConfig.getSettings();

        $scope.mediaItemsListOptions = {
          appearance: {
            title: 'Categories',
            addButtonText: 'Add Category',
            addButtonStyle: 'filled',
            info: "Use categories if you want your media to be easily filtered. Filtering option must be enabled in <a onclick='navigateToSettings()'>Settings</a>"
          },
          settings: {
            newBehavior: true,
            allowDragAndDrop: true,
            showSearchBar: true,
            showSortOptions: true,
            showAddButton: true,
            showEditButton: true,
            showDeleteButton: true,
            allowDragAndDrop: true,
            contentMapping: {
              idKey: 'id',
              columns: [
                { imageKey: 'icon' },
                { titleKey: 'name' },
              ],
            },
          },
          sortOptions: CategoryOrders.options.map((option) => ({ ...option, title: option.name, sortKey: option.key, default: option.value === mediaCenterData.content.sortCategoriesBy })),
        };
        $scope.items = [];
        $scope.isBusy = false;
        /**
         * $scope.noMore tells if all data has been loaded
         */
        $scope.noMore = false;

        $scope.initList = (listSelector) => {

          $scope.mediaList = new buildfire.components.control.listView(listSelector, $scope.mediaItemsListOptions);
          $scope.handleListScroll();

          $scope.toggleLoadingState(true);

          $scope.mediaList.onItemActionClick = (event) => $scope.onItemActionClick(event);
          $scope.mediaList.onAddButtonClick = () => $scope.editMediaItem();
          $scope.mediaList.onSearchInput = (searchValue) => $scope.searchListItem(searchValue);
          $scope.mediaList.onOrderChange = (event) => $scope.onOrderChange(event);
          $scope.mediaList.onSortOptionChange = (event) => $scope.toggleSortOrder(event)

          $scope.getMore();
        };

        $scope.buildList = () => {
          if ($scope.mediaList) {
            $scope.toggleLoadingState();
            $scope.mediaList.clear();
            $scope.mediaList.append($scope.items);

            if (!$scope.$$phase) $scope.$digest();
          }
        };

        $scope.toggleLoadingState = (loading) => {
          const itemsEmptyContainer = document.getElementById('categoriesEmptyState');
          if (loading) {
            $scope.mediaList.selector.classList.add('hide-list');
            itemsEmptyContainer.classList.remove('hidden');
            itemsEmptyContainer.innerHTML = "<h5>Loading ...</h5>"
          } else if ($scope.items.length == 0) {
            $scope.mediaList.selector.classList.add('hide-list');
            itemsEmptyContainer.classList.remove('hidden');
            if ($scope.searchValue) {
              itemsEmptyContainer.innerHTML = "<h5>You haven't added anything else</h5>"
            } else {
              itemsEmptyContainer.innerHTML = "<h5>You haven't added anything yet</h5>"
            }
          } else {
            $scope.mediaList.selector.classList.remove('hide-list');
            itemsEmptyContainer.classList.add('hidden');
          }
        }

        $scope.toggleSortOrder = function (option) {
          MediaCenter.save({ $set: { 'content.sortCategoriesBy': option.value } }).then(() => {
            AppConfig.setSettings({ ...mediaCenterData, content: { ...mediaCenterData.content, sortCategoriesBy: option.value } });
            $scope.sortOption = option;
            searchOptions.skip = 0;
            searchOptions.sort = { [option.key]: option.order };

            $scope.noMore = false;
            $scope.items = [];
            $scope.toggleLoadingState(true);
            $scope.getMore();
          }).catch((err) => {
            return console.error(err);
          });
        };

        /**
         * $scope.getMore is used to load the items
         */
        $scope.getMore = function () {
          if ($scope.isBusy || $scope.noMore) {
            return;
          }
          $scope.isBusy = true;
          $scope.updateSearchOptions();

          CategoryContent.find(searchOptions).then((result) => {
            $scope.isBusy = false;

            if (result.length <= _limit) {
              $scope.noMore = true;
            } else {
              result.pop();
              searchOptions.skip = searchOptions.skip + _limit;
              $scope.noMore = false;
            }

            $scope.items = $scope.items.concat(result.map((item) => ({
              ...item.data,
              id: item.id,
              topImage: getImageUrl(item.data.topImage),
              image: getImageUrl(item.data.topImage),
            })));
            $scope.buildList();
            $scope.$apply();
          }).catch((err) => {
            return console.error(err);
          })
        };

        // correct image src for dropbox to crop/resize and show it
        function getImageUrl(imageSrc) {
          if (imageSrc && imageSrc.includes("dropbox.com")) {
              imageSrc = imageSrc.replace("www.dropbox", "dl.dropboxusercontent");
              imageSrc = imageSrc.replace("dropbox.com", "dl.dropboxusercontent.com");
            }
          return imageSrc || '../../../../styles/media/holder-1x1.png';
        }

        window.navigateToSettings = () => {
          buildfire.navigation.navigateToTab(
              {
                  tabTitle: "Settings",
              },
              (err) => {
                  if (err) return console.error(err); // `Content` tab was not found

                  console.log("NAVIGATION FINISHED");
              }
          );
      }

        // handle getting more categories on scroll
        $scope.handleListScroll = () => {
          const sortableListContainer = $scope.mediaList.selector.querySelector('.sortable-list-container');
          if (sortableListContainer) {
            sortableListContainer.addEventListener('scroll', (e) => {
              const { scrollTop, clientHeight, scrollHeight } = sortableListContainer;

              if (!$scope.noMore && scrollTop + clientHeight > scrollHeight * 0.8) {
                $scope.getMore();
              }
            })
          }
        }

        /**
         * $scope.searchListItem() used to search items list
         * @param value to be search.
         */
        $scope.searchListItem = function (value) {
          searchOptions.skip = 0;
          /*reset the skip value*/

          $scope.searchValue = value;
          $scope.noMore = false;
          $scope.isBusy = false;
          $scope.items = [];
          if (!value) {
            value = '/*';
          }
          value = value.trim();
          searchOptions.filter = { '$json.name': { $regex: value, $options: '-i' } };
          $scope.toggleLoadingState(true);
          $scope.getMore();
        };

        $scope.updateSearchOptions = function () {
          mediaCenterData = AppConfig.getSettings();
          const sortOrder = CategoryOrders.options.find((option) => (mediaCenterData.content && option.value === mediaCenterData.content.sortByValue));
          if (sortOrder && sortOrder.key) {
            searchOptions.sort = { [sortOrder.key]: sortOrder.order };
          } else {
            // default sort by createdOn
            searchOptions.sort = { createdOn: -1 };
          }
        };

        $scope.deleteMediaItem = function (item) {
          buildfire.dialog.confirm(
            {
              title: 'Delete Category',
              message: `Are you sure you want to delete the ${item.name} category?`,
              confirmButton: {
                type: 'danger',
                text: 'Delete',
              },
            },
            (err, isConfirmed) => {
              if (isConfirmed) {
                $scope.isBusy = true;
                Deeplink.deleteById(item.id, (err, res) => {
                  if (err) {
                    // TODO: add error handlers "toast" or "alert"
                    $scope.isBusy = false;
                    return console.error(err);
                  }

                  CategoryContent.delete(item.id).then(() => {
                    $scope.isBusy = false;
                    $scope.items = $scope.items.filter((_item) => _item.id !== item.id);
                    $scope.buildList();
                    $scope.$apply();
                  }).catch((err) => {
                    $scope.isBusy = false;
                    return console.error(err);
                  });
                })
              }
            }
          );
        }

        $scope.onItemActionClick = (event) => {
          switch (event.actionId) {
            case 'edit':
              $scope.editMediaItem(event.item.id);
              break;
            case 'delete':
              $scope.deleteMediaItem(event.item);
              break;
            case 'analytics':
            default:
              $scope.showReport(event.item);
              break;
          }
        };

        $scope.showReport = function (item) {
          if (item.videoUrl) {
            Analytics.showReports({ eventKey: item.id + "_videoPlayCount" });
          } else if (item.audioUrl) {
            Analytics.showReports({ eventKey: item.id + "_audioPlayCount" });
          } else {
            Analytics.showReports({ eventKey: item.id + "_articleOpenCount" });
          }
        }

        $scope.onOrderChange = (event) => {
          clearTimeout($scope.saveTimeout);
          $scope.saveTimeout = setTimeout(() => {
            let mediaItemsToUpdate = event.items
              .map((mediaItem, index) => ({ ...mediaItem, newRank: index + 1, id: mediaItem.id })) // Add new rank to each mediaItem
              .filter(mediaItem => (mediaItem.rank !== mediaItem.newRank))	// Filter out categories that haven't changed
              .map(mediaItem => ({ ...mediaItem, rank: mediaItem.newRank })); // override rank for each mediaItem

            CategoryContent.bulkUpdateItems(mediaItemsToUpdate, (err, result) => {
              if (err) return console.error(err);

              $scope.items = event.items.map((mediaItem, index) => ({ ...mediaItem, rank: index + 1 }));
              $scope.buildList();
            });
          }, 300);
        };

        $scope.editMediaItem = function (itemId) {
          let newPath = '#/category';
          if (itemId) {
            newPath += `/${itemId}`;
          }
          window.location.href = newPath;
        };

        $scope.initList('#categoriesList');
      },
    ])
    .filter('cropImg', function () {
      return function (url) {
        if (!url) return;
        return buildfire.imageLib.cropImage(url, { size: 'xs', aspect: '1:1' });
      };
    });
})(window.angular);
