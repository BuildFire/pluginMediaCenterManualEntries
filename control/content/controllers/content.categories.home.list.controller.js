/* eslint-disable linebreak-style */
(function (angular) {
	'use strict';
	angular
		.module('mediaCenterContent')
		.controller('ContentCategoryHomeListCtrl', [
			'$scope',
			'$rootScope',
			'CategoryOrders',
			'SubcategoryOrders',
			'DB',
			'COLLECTIONS',
			'AppConfig',
			'$csv',
			function ($scope, $rootScope, CategoryOrders, SubcategoryOrders, DB, COLLECTIONS, AppConfig, $csv) {
				const CategoryContent = new DB(COLLECTIONS.CategoryContent);
				const MediaCenter = new DB(COLLECTIONS.MediaCenter);

				let _skip = 0,
					_limit = 50,
					searchOptions = {
						filter: {},
						sort: { createdOn: -1 },
						skip: _skip,
						limit: _limit, // the plus one is to check if there are any more
					},
					mediaCenterData = AppConfig.getSettings();

				$scope.mediaItemsListOptions = {
					appearance: {
						title: 'Categories',
						addButtonText: 'Add Category',
						addButtonStyle: 'filled',
						info: 'Use categories if you want your media to be easily filtered. Filtering option must be enabled in <a onclick=\'navigateToSettings()\'>Settings</a>'
					},
					settings: {
						newBehavior: true,
						allowDragAndDrop: true,
						showSearchBar: true,
						showSortOptions: true,
						showAddButton: true,
						showEditButton: true,
						showDeleteButton: true,
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

					$scope.initBulkActions();
					$scope.handleListScroll();
					$scope.toggleLoadingState(true);

					$scope.mediaList.onItemActionClick = (event) => $scope.onItemActionClick(event);
					$scope.mediaList.onAddButtonClick = () => $scope.editMediaItem();
					$scope.mediaList.onSearchInput = (searchValue) => $scope.searchListItem(searchValue);
					$scope.mediaList.onOrderChange = (event) => $scope.onOrderChange(event);
					$scope.mediaList.onSortOptionChange = (event) => $scope.toggleSortOrder(event);

					$scope.getMore();
				};

				$scope.buildList = () => {
					if ($scope.mediaList) {
						$scope.toggleLoadingState();
						$scope.mediaList.clear();
						$scope.mediaList.append($scope.items);

						if (!$scope.$$phase) {
							$scope.$apply();
							$scope.$digest();
						}
					}
				};

				$scope.toggleLoadingState = (loading) => {
					const itemsEmptyContainer = document.getElementById('categoriesEmptyState');
					if (!itemsEmptyContainer) return;
					if (loading) {
						$scope.mediaList.selector.classList.add('hide-list');
						itemsEmptyContainer.classList.remove('hidden');
						itemsEmptyContainer.innerHTML = '<h5>Loading ...</h5>';
					} else if ($scope.items.length == 0) {
						$scope.mediaList.selector.classList.add('hide-list');
						itemsEmptyContainer.classList.remove('hidden');
						if ($scope.searchValue) {
							itemsEmptyContainer.innerHTML = '<h5>You haven\'t added anything else</h5>';
						} else {
							itemsEmptyContainer.innerHTML = '<h5>You haven\'t added anything yet</h5>';
						}
					} else {
						$scope.mediaList.selector.classList.remove('hide-list');
						itemsEmptyContainer.classList.add('hidden');
					}
				};

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

						if (result.length < _limit) {
							$scope.noMore = true;
						} else {
							searchOptions.skip = searchOptions.skip + _limit;
							$scope.noMore = false;
						}

						$scope.items = $scope.items.concat(result.map((item) => ({
							...item.data,
							id: item.id,
							icon: getImageUrl(item.data.icon),
						})));
						$scope.buildList();
					}).catch((err) => {
						return console.error(err);
					});
				};

				// correct image src for dropbox to crop/resize and show it
				function getImageUrl(imageSrc) {
					if (imageSrc && imageSrc.includes('dropbox.com')) {
						imageSrc = imageSrc.replace('www.dropbox', 'dl.dropboxusercontent');
						imageSrc = imageSrc.replace('dropbox.com', 'dl.dropboxusercontent.com');
					}
					return imageSrc || '../../../../styles/media/holder-1x1.png';
				}

				window.navigateToSettings = () => {
					buildfire.navigation.navigateToTab(
						{
							tabTitle: 'Settings',
						},
						(err) => {
							if (err) return console.error(err); // `Content` tab was not found

							console.log('NAVIGATION FINISHED');
						}
					);
				};

				// handle getting more categories on scroll
				$scope.handleListScroll = () => {
					const sortableListContainer = $scope.mediaList.selector.querySelector('.sortable-list-container');
					if (sortableListContainer) {
						sortableListContainer.addEventListener('scroll', (e) => {
							const { scrollTop, clientHeight, scrollHeight } = sortableListContainer;

							if (!$scope.noMore && scrollTop + clientHeight > scrollHeight * 0.8) {
								$scope.getMore();
							}
						});
					}
				};

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

								CategoryContent.delete(item.id).then(() => {
									$scope.isBusy = false;
									$scope.items = $scope.items.filter((_item) => _item.id !== item.id);
									$scope.buildList();
								}).catch((err) => {
									$scope.isBusy = false;
									return console.error(err);
								});
							}
						}
					);
				};

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
						Analytics.showReports({ eventKey: item.id + '_videoPlayCount' });
					} else if (item.audioUrl) {
						Analytics.showReports({ eventKey: item.id + '_audioPlayCount' });
					} else {
						Analytics.showReports({ eventKey: item.id + '_articleOpenCount' });
					}
				};

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

				$scope.initBulkActions = () => {
					const addButton = $scope.mediaList.selector.querySelector('.sortable-list-add-button');
					const parent = addButton.parentNode;
          
					const bulkActionTemplate = document.getElementById('bulkActionTemplate');
					const bulkActionContainer = bulkActionTemplate.content.cloneNode(true);

					const dropdownMenu = bulkActionContainer.querySelector('.dropdown');

					const dropdownBtn = bulkActionContainer.querySelector('.dropdown-toggle');
					const exportBtn = bulkActionContainer.querySelector('.export-csv');
					const importBtn = bulkActionContainer.querySelector('.import-csv');
					const getTemplateBtn = bulkActionContainer.querySelector('.get-csv-template');
          
					dropdownBtn.onclick = () => dropdownMenu.classList.toggle('open');
					exportBtn.onclick = () => {
						$scope.exportCSV();
						dropdownMenu.classList.toggle('open');
					};
					importBtn.onclick = () => {
						$scope.openImportCSVDialog();
						dropdownMenu.classList.toggle('open');
					};
					getTemplateBtn.onclick = () => {
						$scope.getTemplate();
						dropdownMenu.classList.toggle('open');
					};

					parent.insertBefore(bulkActionContainer, addButton);
				};

				$scope.initList('#categoriesList');

				// CSV Handlers
				const header = {
					icon: 'Icon image',
					name: 'Name',
					subcategories: 'Subcategories',
				};
				const headerRow = ['icon', 'name', 'subcategories'];

				/**
                 * $scope.getTemplate() used to download csv template
                 */
				$scope.getTemplate = function () {
					const templateData = [{
						icon: '',
						name: '',
						subcategories: [],
					}];
					const csv = $csv.jsonToCsv(angular.toJson(templateData), { header });
					$csv.download(csv, 'Template.csv');
				};

				/**
                 * getRecords function get the  all items from DB
                 * @param searchOption
                 * @param records
                 * @param callback
                 */
				function getRecords(searchOption, records, callback) {
					CategoryContent.find({...searchOption, recordCount: true}).then(function (res) {
						const result = res.result;
						if (result && result.length) {
							records = records.concat(result);
						}

						if (!res || !res.totalRecord || records.length === res.totalRecord) {// to indicate there are more
							return callback(records);
						} else {
							searchOption.skip = searchOption.skip + searchOption.limit;
							return getRecords(searchOption, records, callback);
						}
					}, function (error) {
						throw (error);
					});
				}

				/**
                 * $scope.exportCSV() used to export people list data to CSV
                 */
				$scope.exportCSV = function () {
					var search = angular.copy(searchOptions);
					search.skip = 0;
					getRecords(search,
						[]
						, function (data) {
							if (data && data.length) {
								var persons = [];
								angular.forEach(angular.copy(data), function (value) {
									delete value.data.createdBy;
									delete value.data.createdOn;
									delete value.data.deletedBy;
									delete value.data.deletedOn;
									delete value.data.id;
									delete value.data.lastUpdatedBy;
									delete value.data.lastUpdatedOn;
									delete value.data.sortBy;
									delete value.data.rank;
									delete value.data.sortByValue;
									delete value.data.titleIndex;
									if (value.data.subcategories && value.data.subcategories.length) {
										value.data.subcategories = value.data.subcategories.map(function (subcategory) {
											return subcategory.name;
										});
										value.data.subcategories = value.data.subcategories.join(',');
									}
									persons.push(value.data);
								});
								var csv = $csv.jsonToCsv(angular.toJson(persons), {
									header: header
								});
								$csv.download(csv, 'Export.csv');
							}
							else {
								$scope.getTemplate();
							}
						});
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

				/**
                 * method to open the importCSV Dialog
                 */
				$scope.openImportCSVDialog = function () {
					$csv.import(headerRow).then(function (rows) {
						$rootScope.loading = true;
						if (rows && rows.length > 1) {

							var columns = rows.shift();

							for (var _index = 0; _index < headerRow.length; _index++) {
								if (header[headerRow[_index]] != columns[headerRow[_index]]) {
									$rootScope.loading = false;
									$csv.showInvalidCSV();
									break;
								}
							}

							if (!$rootScope.loading)
								return;

							let rank = 10;
							for (var index = 0; index < rows.length; index++) {
								rank += 10;
								rows[index].createdOn = new Date().getTime();
								let subcategories = [];
								if (rows[index].subcategories && rows[index].subcategories.length) {
									rows[index].subcategories.split(',');
									let subRank = 0;
									subcategories = subcategories.map(function (subcategory, subcategoryIndex) {
										subRank += 10;
										return {
											name: subcategory,
											rank: subRank,
											createdOn: new Date().getTime(),
											lastUpdatedOn: '',
											lastUpdatedBy: '',
											deletedOn: '',
											deletedBy: '',
										};
									});
								}
								rows[index].rank = rank;
								rows[index].subcategories = subcategories;
								rows[index].titleIndex = rows[index].name.toLowerCase();
								rows[index].createdBy = '';
								rows[index].lastUpdatedBy = '';
								rows[index].deletedBy = '';
								rows[index].deletedOn = '';
								rows[index].lastUpdatedOn = '';
								rows[index].sortBy = SubcategoryOrders.ordersMap.Newest;

							}
							if (validateCsv(rows)) {
								CategoryContent.insert(rows).then(function (data) {
									$rootScope.loading = false;
									$scope.isBusy = false;
									$scope.items = [];
									searchOptions.skip = 0;
									$scope.noMore = false;
									$scope.getMore();
								}, function errorHandler(error) {
									console.error(error);
									$rootScope.loading = false;
									$scope.$apply();
								});
							} else {
								$rootScope.loading = false;
								$csv.showInvalidCSV();
							}
						}
						else {
							$rootScope.loading = false;
							$csv.showInvalidCSV();
							$scope.$apply();
						}
					}, function (error) {
						$rootScope.loading = false;
						$scope.$apply();
					});
				};

			},
		])
		.filter('cropImg', function () {
			return function (url) {
				if (!url) return;
				return buildfire.imageLib.cropImage(url, { size: 'xs', aspect: '1:1' });
			};
		});
})(window.angular);
