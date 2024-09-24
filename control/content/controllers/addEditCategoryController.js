/* eslint-disable linebreak-style */
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
		.controller('ContentCategoryCtrl', ['$scope', 'Buildfire', 'DB', 'COLLECTIONS', 'Location', 'category', 'Messaging', 'EVENTS', 'AppConfig', 'Orders', 'SubcategoryOrders', 'CategoryOrders', '$csv', 'nanoid',
			function ($scope, Buildfire, DB, COLLECTIONS, Location, category, Messaging, EVENTS, AppConfig, Orders, SubcategoryOrders, CategoryOrders, $csv, nanoid) {
				/**
         * Using Control as syntax this
         */
				let ContentCategory = this;
				ContentCategory.subcategoryTitle = '';
				ContentCategory.searchText = '';
				ContentCategory.saving = false;
				/**
         * Create instance of MediaContent, db collection
         * @type {DB}
         */
				let CategoryContent = new DB(COLLECTIONS.CategoryContent);
				let CategoryAccess = new Categories({
					db: CategoryContent
				});
				
				$scope.subcategoriesListOptions = {
					appearance: {
						title: 'Subcategories',
						addButtonText: 'Add Subcategory',
						addButtonStyle: 'outlined',
						info: 'Use subcategories within your parent category to get even more specific about the media.'
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
								{ titleKey: 'name' },
							],
						},
					},
					sortOptions: SubcategoryOrders.options.map((option) => ({ ...option, title: option.name, sortKey: option.key,  })),
				};

				if (!AppConfig.getSettings()) {
					AppConfig.setSettings({
						content: {
							images: [],
							descriptionHTML: '',
							description: '',
							sortCategoriesBy: CategoryOrders.ordersMap.Newest,
							rankOfLastItem: 0,
							allowShare: true,
							allowAddingNotes: true,
							allowSource: true,
							allowOfflineDownload: false,
							enableFiltering: false,
							forceAutoPlay: false,
							dateIndexed: true,
							dateCreatedIndexed: true
						},
						design: {
							listLayout: 'list-1',
							itemLayout: 'item-1',
							backgroundImage: '',
							skipMediaPage: false
						}
					});
				}

				function init() {
					ContentCategory.isBusy = true;
					Buildfire.auth.getCurrentUser((err, user) => {
						if (err) {
							ContentCategory.saving = false;
							return;
						}
						let data = {
							name: '',
							icon: '',
							subcategories: [],
							sortBy: SubcategoryOrders.ordersMap.Newest, // to sort subcategories
							rank: 0,
							createdOn: '',
							createdBy: '',
							lastUpdatedOn: '',
							lastUpdatedBy: '',
							deletedOn: '',
							deletedBy: '',
							titleIndex:'',
						};

						ContentCategory.sortOptions = SubcategoryOrders.options;
						if (user) ContentCategory.user = user;

						/**
             * if controller is for opened in edit mode, Load media data
             * else init it with bootstrap data
             */
						if (category) {
							ContentCategory.item = category;
							ContentCategory.mode = 'edit';
							ContentCategory.title = 'Edit Category';
							ContentCategory.displayedSubcategories = ContentCategory.item.data.subcategories; // used to display searched subcategories
						}
						else {
							ContentCategory.item = { data: data };
							ContentCategory.mode = 'add';
							ContentCategory.title = 'Add Category';
							ContentCategory.displayedSubcategories = ContentCategory.item.data.subcategories;
						}

						ContentCategory.isBusy = false;
						$scope.initList();
					});
				}

				$scope.initList = () => {
					$scope.subcategoriesList = new buildfire.components.control.listView('#subCategoriesList', $scope.subcategoriesListOptions);

					$scope.initBulkActions();

					$scope.subcategoriesList.onItemActionClick = (event) => $scope.onItemActionClick(event);
					$scope.subcategoriesList.onAddButtonClick = () => $scope.showSubcategoryModal();
					$scope.subcategoriesList.onSearchInput = (searchValue) => ContentCategory.searchSubcategories(searchValue);
					$scope.subcategoriesList.onOrderChange = (event) => $scope.onOrderChange(event);
					$scope.subcategoriesList.onSortOptionChange = (event) => $scope.toggleSortOrder(event.value);

					$scope.buildList();
				};

				$scope.buildList = () => {
					if ($scope.subcategoriesList) {
						$scope.toggleLoadingState();
						$scope.subcategoriesList.clear();
						$scope.subcategoriesList.append(ContentCategory.displayedSubcategories);

						if (!$scope.$$phase) {
							$scope.$apply();
							$scope.$digest();
						}
					}
				};

				$scope.onItemActionClick = (event) => {
					switch (event.actionId) {
					case 'edit':
						$scope.showSubcategoryModal(event.item);
						break;
					case 'delete':
					default:
						ContentCategory.removeSubcategory(event.item);
						break;
					}
				};

				$scope.toggleLoadingState = (loading) => {
					const itemsEmptyContainer = document.getElementById('categoriesEmptyState');
					if (!itemsEmptyContainer) return;
					if (loading) {
						$scope.subcategoriesList.selector.classList.add('hide-list');
						itemsEmptyContainer.classList.remove('hidden');
						itemsEmptyContainer.innerHTML = '<h5>Loading ...</h5>';
					} else if (ContentCategory.displayedSubcategories.length == 0) {
						$scope.subcategoriesList.selector.classList.add('hide-list');
						itemsEmptyContainer.classList.remove('hidden');
						if ($scope.searchValue) {
							itemsEmptyContainer.innerHTML = '<h5>You haven\'t added anything else</h5>';
						} else {
							itemsEmptyContainer.innerHTML = '<h5>You haven\'t added anything yet</h5>';
						}
					} else {
						$scope.subcategoriesList.selector.classList.remove('hide-list');
						itemsEmptyContainer.classList.add('hidden');
					}
				};

				$scope.onOrderChange = (event) => {
					const newIndex = event.newIndex;
					const oldIndex = event.oldIndex;
          
					ContentCategory.item.data.subcategories.splice(newIndex, 0, ContentCategory.displayedSubcategories.splice(oldIndex, 1)[0]);
					ContentCategory.item.data.subcategories.forEach((subcategory, index) => {
						subcategory.rank = index;
					});
					ContentCategory.searchSubcategories();
				};

				init();

				ContentCategory.addIcon = function () {
					buildfire.imageLib.showDialog({ showIcons: true, multiSelection: false }, (error, result) => {
						if (error) {
							console.error('Error:', error);
						} else {
							ContentCategory.item.data.icon = result && result.selectedFiles && result.selectedFiles[0] || result && result.selectedIcons && result.selectedIcons[0] || '';
							if (!$scope.$$phase) $scope.$digest();
						}
					});
				};

				ContentCategory.removeIcon = function () {
					ContentCategory.item.data.icon = '';
				};

				//To render icon whether it is an image or icon
				ContentCategory.isIcon = function (icon) {
					if (icon) {
						return icon.indexOf('http') != 0;
					}
					return ContentCategory.item.data.icon && ContentCategory.item.data.icon.indexOf('http') === -1;
				};

				ContentCategory.updateItem = function () {
					if (!ContentCategory.item.data.name) return $scope.titleRequired = true;
					ContentCategory.saving = true;
					ContentCategory.item.data.name = ContentCategory.item.data.name.trim();
					ContentCategory.item.data.titleIndex = ContentCategory.item.data.name.toLowerCase();
					if (ContentCategory.item.id) {
						//then we are editing the item
						ContentCategory.item.data.id = ContentCategory.item.id;
						ContentCategory.item.data.lastUpdatedOn = new Date();
						ContentCategory.item.data.lastUpdatedBy = ContentCategory.user;
						CategoryAccess.updateCategory(ContentCategory.item, function (err, result) {
							ContentCategory.saving = false;
							if (err) return console.error('Error saving data: ', err);
              
							ContentCategory.item = result;
							Messaging.sendMessageToWidget({
								name: EVENTS.CATEGORIES_CHANGE,
								message: {}
							});
							ContentCategory.done();
						});
					} else {
						//then we are adding the item
						ContentCategory.item.data.createdOn = new Date();
						ContentCategory.item.data.createdBy = ContentCategory.user;

						ContentCategory.addItem((err, result) => {
							ContentCategory.saving = false;
							if (err) return console.log('Error saving data: ', err);

							Messaging.sendMessageToWidget({
								name: EVENTS.CATEGORIES_CHANGE,
								message: {}
							});
							ContentCategory.done();
						});
						return;
					}
				};

				ContentCategory.addItem = function (cb) {
					CategoryAccess.addCategory(ContentCategory.item.data, function (err, result) {
						if (err) {
							console.error('Error saving data: ', err);
							return cb('Error saving data');
						}
						else {
							ContentCategory.item = result;
							cb(null, result);
						}
					});
				};

				ContentCategory.done = function () {
					setTimeout(() => {
						Location.go('#/');
					}, 0);
				};

				$scope.showSubcategoryModal = function (editedSubcategory) {
					const subcategoryDialog = new DialogComponent('dialogComponent', 'subcategoryDialogTemplate');

					const dialogContainer = document.getElementById('dialogComponent');
					const subcategoryNameInput = dialogContainer.querySelector('#subcategoryNameInput');
					const subcategoryNameInputError = dialogContainer.querySelector('#subcategoryNameInputError');

					if (editedSubcategory) {
						subcategoryNameInput.value = editedSubcategory.name;
					}

					subcategoryDialog.showDialog(
						{
						  title: !editedSubcategory ? 'Add Subcategory' : 'Edit Subcategory',
						  saveText: 'Save',
						  hideDelete: false,
						},
						(e) => {
							e.preventDefault();
							if (!subcategoryNameInput.value) {
								subcategoryNameInputError.classList.remove('hidden');
								subcategoryNameInput.classList.add('border-danger');
								return;
							}

							if (editedSubcategory) {
								const itemIndex = ContentCategory.item.data.subcategories.indexOf(editedSubcategory);
								ContentCategory.item.data.subcategories[itemIndex].name = subcategoryNameInput.value;
							} else {
								ContentCategory.item.data.subcategories.push({
									name: subcategoryNameInput.value,
									id: nanoid(),
									rank: ContentCategory.item.data.subcategories.length + 1,
									createdBy: ContentCategory.user || '',
								});
							}

							subcategoryNameInput.value = '';
							subcategoryNameInputError.classList.add('hidden');
							subcategoryNameInput.classList.remove('border-danger');
							subcategoryDialog.close();

							ContentCategory.searchSubcategories();
						});
				};

				ContentCategory.removeSubcategory = function (subcategory) {
					buildfire.dialog.confirm(
						{
							title: 'Delete Subcategory',
							confirmButton: {
								type: 'danger',
								text: 'Delete'
							},
							message: 'Are you sure you want to delete this subcategory? This action is not reversible.',
						},
						(err, isConfirmed) => {
							if (err) console.error(err);

							if (isConfirmed) {
								let itemIndex = ContentCategory.item.data.subcategories.indexOf(subcategory);
								ContentCategory.item.data.subcategories.splice(itemIndex, 1);
								ContentCategory.searchSubcategories();
							}
						}
					);
				};

				$scope.toggleSortOrder = function (name) {
					let sortOrder = SubcategoryOrders.getOrder(name || SubcategoryOrders.ordersMap.Default);
					ContentCategory.item.data.sortBy = name;
					ContentCategory.item.data.sortByValue = sortOrder.value;
					ContentCategory.sort();
				};

				ContentCategory.sort = function () {
					if (ContentCategory.item.data.sortBy === 'Subcategory Title A-Z') {
						ContentCategory.item.data.subcategories.sort(function (a, b) {
							return a.name.localeCompare(b.name);
						});
					}

					if (ContentCategory.item.data.sortBy === 'Subcategory Title Z-A') {
						ContentCategory.item.data.subcategories.sort(function (a, b) {
							return b.name.localeCompare(a.name);
						});
					}

					if (ContentCategory.item.data.sortBy === 'Manually') {
						ContentCategory.item.data.subcategories.sort(function (a, b) {
							return a.rank - b.rank;
						});
					}

					if (ContentCategory.item.data.sortBy === 'Newest') {
						ContentCategory.item.data.subcategories.sort(function (a, b) {
							return (new Date(b.createdOn) - new Date(a.createdOn));
						});
					}

					if (ContentCategory.item.data.sortBy === 'Oldest') {
						ContentCategory.item.data.subcategories.sort(function (a, b) {
							return (new Date(a.createdOn) - new Date(b.createdOn));
						});
					}
				};

				ContentCategory.searchSubcategories = function (searchText = ContentCategory.searchText) {
					ContentCategory.searchText = searchText;
					if (!searchText || searchText == '') {
						ContentCategory.displayedSubcategories = ContentCategory.item.data.subcategories;
					} else {
						searchText = searchText.toLowerCase();
						ContentCategory.displayedSubcategories = ContentCategory.item.data.subcategories.filter((subcategory) => subcategory.name.toLowerCase().includes(searchText.toLowerCase()));
					}
					if (!$scope.$$phase) {
						$scope.$apply();
						$scope.$digest();
					}
				};


				let header = {
					name: 'Subcategory name',
				};
				let headerRow = ['name'];

				ContentCategory.getTemplate = function () {
					let templateData = [{
						name: '',
					}];
					let csv = $csv.jsonToCsv(angular.toJson(templateData), {
						header: header
					});
					$csv.download(csv, 'Template.csv');
				};

				ContentCategory.exportCSV = function () {
					if (ContentCategory.item.data.subcategories && ContentCategory.item.data.subcategories.length) {
						let persons = ContentCategory.item.data.subcategories.map(function (subcategory) {
							return { name: subcategory.name };
						});
						let csv = $csv.jsonToCsv(angular.toJson(persons), {
							header: header
						});
						$csv.download(csv, 'Export.csv');
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

							let columns = rows.shift();

							for (let _index = 0; _index < headerRow.length; _index++) {
								if (header[headerRow[_index]] != columns[headerRow[_index]]) {
									ContentCategory.loading = false;
									ContentCategory.csvDataInvalid = true;
									break;
								}
							}

							if (!ContentCategory.loading)
								return;

							let rank = 0;
							for (let index = 0; index < rows.length; index++) {
								rank += 10;
								rows[index].createdOn = new Date().getTime();
								rows[index].createdBy = ContentCategory.user || '';
								rows[index].lastUpdatedOn = '';
								rows[index].lastUpdatedBy = '';
								rows[index].deletedOn = '';
								rows[index].deletedBy = '';
								rows[index].rank = rank;
								rows[index].id = nanoid();
							}
							if (validateCsv(rows)) {
								
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
						
							if (!$scope.$$phase) {
								$scope.$apply();
								$scope.$digest();
							}
						}
					}, function (error) {
						ContentCategory.loading = false;
						if (!$scope.$$phase) {
							$scope.$apply();
							$scope.$digest();
						}
					});
				};

				$scope.initBulkActions = () => {
					const addButton = $scope.subcategoriesList.selector.querySelector('.sortable-list-add-button');
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
						ContentCategory.exportCSV();
						dropdownMenu.classList.toggle('open');
					};
					importBtn.onclick = () => {
						ContentCategory.openImportCSVDialog();
						dropdownMenu.classList.toggle('open');
					};
					getTemplateBtn.onclick = () => {
						ContentCategory.getTemplate();
						dropdownMenu.classList.toggle('open');
					};

					parent.insertBefore(bulkActionContainer, addButton);
				};

				$scope.$watch(function () {
					return ContentCategory.displayedSubcategories;
				}, function() {
					if ($scope.subcategoriesList) {
						$scope.buildList();
					}
				}, true);
			}]);
})(window.angular, window.tinymce);