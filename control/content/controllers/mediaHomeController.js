/* eslint-disable linebreak-style */
(function (angular) {
	'use strict';
	angular
		.module('mediaCenterContent')
		.controller('ContentMediaHomeListCtrl', [
			'$scope',
			'$rootScope',
			'Orders',
			'DB',
			'Location',
			'Messaging',
			'EVENTS',
			'PATHS',
			'SearchEngine',
			'COLLECTIONS',
			'AppConfig',
			'$csv',
			function ($scope, $rootScope, Orders, DB, Location, Messaging, EVENTS, PATHS, SearchEngine, COLLECTIONS, AppConfig, $csv) {
				const MediaContent = new DB(COLLECTIONS.MediaContent);
				const MediaCenter = new DB(COLLECTIONS.MediaCenter);
				const SearchEngineService = new SearchEngine(COLLECTIONS.MediaContent);

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
						title: 'Media Content',
						addButtonText: 'Add Media Item',
						addButtonStyle: 'filled',
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
								{ imageKey: 'topImage' },
								{ titleKey: 'title' },
							],
						},
					},
					sortOptions: Orders.options.map((option) => ({ ...option, title: option.name, sortKey: option.key, default: option.value === mediaCenterData.content.sortBy })),
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

					$scope.mediaList.onItemRender = $scope.onItemRender;
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
					const itemsEmptyContainer = document.getElementById('mediaItemsEmptyState');
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
					MediaCenter.save({ $set: { 'content.sortBy': option.value, 'content.sortByValue': option.value } }).then(() => {
						AppConfig.setSettings({ ...mediaCenterData, content: { ...mediaCenterData.content, sortBy: option.value, sortByValue: option.value } });
						$scope.sortOption = option;
						searchOptions.skip = 0;
						searchOptions.sort = { [option.key]: option.order };

						$scope.noMore = false;
						$scope.items = [];
						$scope.toggleLoadingState(true);
						$scope.getMore();

						Messaging.sendMessageToWidget({
							name: EVENTS.ROUTE_CHANGE,
							message: {
								path: PATHS.HOME,
							}
						});
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

					if (!searchOptions.sort.rank) {
						searchOptions.sort.rank = 1;
					}
					MediaContent.find(searchOptions).then((result) => {
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
							topImage: getImageUrl(item.data.topImage),
							image: getImageUrl(item.data.topImage),
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
					searchOptions.filter = { '$json.title': { $regex: value, $options: 'i' } };
					$scope.toggleLoadingState(true);
					$scope.getMore();
				};

				$scope.updateSearchOptions = function () {
					mediaCenterData = AppConfig.getSettings();
					const sortOrder = Orders.options.find((option) => (mediaCenterData.content && option.value === mediaCenterData.content.sortByValue));
					if (sortOrder && sortOrder.key) {
						searchOptions.sort = { [sortOrder.key]: sortOrder.order };
					} else {
						// default sort by createdOn
						searchOptions.sort = { createdOn: -1 };
					}
				};

				$scope.onItemRender = (event) => {
					const actions = [{ actionId: 'analytics', icon: 'chart', theme: 'primary' }];

					return { actions };
				};

				$scope.deleteMediaItem = function (item) {
					buildfire.dialog.confirm(
						{
							title: 'Delete Item',
							message: `Are you sure you want to delete the ${item.title} item?`,
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
										$scope.isBusy = false;
										return console.error(err);
									}

									MediaContent.delete(item.id).then(() => {
										$scope.isBusy = false;
										$scope.items = $scope.items.filter((_item) => _item.id !== item.id);
										$scope.buildList();
									}).catch((err) => {
										$scope.isBusy = false;
										return console.error(err);
									});
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

						MediaContent.bulkUpdateItems(mediaItemsToUpdate, (err, result) => {
							if (err) return console.error(err);

							$scope.items = event.items.map((mediaItem, index) => ({ ...mediaItem, rank: index + 1 }));
							$scope.buildList();

							Messaging.sendMessageToWidget({
								name: EVENTS.ROUTE_CHANGE,
								message: {
									path: PATHS.HOME,
								}
							});
						});
					}, 300);
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

				$scope.editMediaItem = function (itemId) {
					let newPath = '#/media';
					if (itemId) {
						newPath += `/${itemId}`;
					}

					Location.go(newPath);
					Messaging.sendMessageToWidget({
						name: EVENTS.ROUTE_CHANGE,
						message: {
							path: PATHS.MEDIA,
							id: itemId || 'mockId',
						}
					});
				};

				$scope.initList('#mediaList');

				function isValidItem(item, index, array) {
					return item.title || item.summary;
				}

				function validateCsv(items) {
					if (!Array.isArray(items) || !items.length) {
						return false;
					}
					return items.every(isValidItem);
				}

				$scope.registerAnalyticsEvent = function (records) {
					return new Promise((resolve, reject) => {
						mediaCenterData = AppConfig.getSettings();
						let analyticsEvents = [];
						records.forEach((record) => {
							if (record.data.videoUrl) {
								analyticsEvents = analyticsEvents.concat([{
									title: record.data.title + ' Video Play Count',
									key: record.id + '_videoPlayCount',
									description: 'Video Play Count',
								}, {
									title: record.data.title + ' Continues Video Play Count',
									key: record.id + '_continuesVideoPlayCount',
									description: 'Continues Video Play Count',
								}]);

								if (mediaCenterData && mediaCenterData.content.allowOfflineDownload) {
									analyticsEvents.push({
										title: record.data.title + ' Video Downloads',
										key: record.id + '_downloads',
										description: 'Video Downloads',
									});
								}
							}
							if (record.data.audioUrl) {
								analyticsEvents = analyticsEvents.concat([{
									title: record.data.title + ' Audio Play Count',
									key: record.id + '_audioPlayCount',
									description: 'Audio Play Count',
								}, {
									title: record.data.title + ' Continues Audio Play Count',
									key: record.id + '_continuesAudioPlayCount',
									description: 'Continues Audio Play Count',
								}]);

								if (mediaCenterData && mediaCenterData.content.allowOfflineDownload) {
									analyticsEvents.push({
										title: record.data.title + ' Audio Downloads',
										key: record.id + '_downloads',
										description: 'Audio Downloads',
									});
								}
							}
							if (!record.data.videoUrl && !record.data.audioUrl) {
								analyticsEvents = analyticsEvents.concat([{
									title: record.data.title + ' Article Open Count',
									key: record.id + '_articleOpenCount',
									description: 'Article Open Count',
								}, {
									title: record.data.title + ' Continues Article Open Count',
									key: record.id + '_continuesArticleOpenCount',
									description: 'Continues Article Open Count',
								}]);
							}
						});
						Analytics.bulkRegisterEvents(analyticsEvents, { silentNotification: true }).then(() => {
							resolve();
						}).catch((err) => {
							reject(err);
						});
					});
				};

				$scope.setDeeplinks = function () {
					const date = new Date();
					date.setHours(date.getHours() - 1);

					const searchOptions = {
						filter: { '$json._buildfire.index.date1': { $gte: date } },
						limit: 50, skip: 0, recordCount: true, sort:{rank: -1}
					};
					getRecords(searchOptions, [], function (records) {
						$scope.registerAnalyticsEvent(records);
						records.forEach(function (record) {
							record.data.deepLinkUrl = buildfire.deeplink.createLink({ id: record.id });
							SearchEngineService.insert({ ...record.data, id: record.id });

							new Deeplink({
								deeplinkId: record.id,
								name: record.data.title,
								deeplinkData: { id: record.id },
								imageUrl: (record.data.topImage) ? record.data.topImage : null
							}).save();
						});
					});
				};

				// CSV Handlers
				const header = {
					topImage: 'Media Thumbnail',
					title: 'Title',
					artists: 'Album Artists',
					summary: 'Summary',
					bodyHTML: 'Media Content',
					srcUrl: 'Source URL',
					audioTitle: 'Audio Title',
					audioUrl: 'Audio URL',
					videoUrl: 'Video URL',
					image: 'Audio Image',
					backgroundImage: 'Audio Background',
				};
				const headerRow = ['topImage', 'title', 'artists', 'summary', 'bodyHTML', 'srcUrl', 'audioTitle', 'audioUrl', 'videoUrl', 'image', 'backgroundImage'];
				/**
				 * $scope.getTemplate() used to download csv template
				 */
				$scope.getTemplate = function () {
					const templateData = [{
						topImage: '',
						title: '',
						summary: '',
						bodyHTML: '',
						srcUrl: '',
						audioUrl: '',
						videoUrl: '',
						image: '',
						backgroundImage: ''
					}];
					const csv = $csv.jsonToCsv(angular.toJson(templateData), { header });
					$csv.download(csv, 'Template.csv');
				};

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
									$rootScope.loading = false
									$csv.showInvalidCSV();
									break;
								}
							}

							if (!$rootScope.loading)
								return;
							MediaContent.find({sort:{rank: -1}, limit:1, skip: 0}).then(function (res) {
								const result = res.result;
								// var rank = ContentHome.info.data.content.rankOfLastItem || 0;
								let rank = 0;
								if (result && result.length) {
									rank = result[0].rank;
								}
								for (var index = 0; index < rows.length; index++) {
									rank += 10;
									rows[index].dateCreated = new Date().getTime();
									rows[index].links = [];
									rows[index].rank = rank;
									rows[index].body = rows[index].bodyHTML;
									rows[index].titleIndex = rows[index].title ? rows[index].titleIndex = rows[index].title.toLowerCase() : '';
									//MEDIA DATE INDEX
									var setMediaDateIndex = new Date().getTime();
									if (rows[index].mediaDateIndex) {
										setMediaDateIndex = rows[index].mediaDateIndex;
									} else if (rows[index].mediaDate) {
										setMediaDateIndex = new Date(rows[index].mediaDate).getTime();
									} else if (rows[index].dateCreated) {
										setMediaDateIndex = new Date(rows[index].dateCreated).getTime();
									}
									rows[index].mediaDateIndex = setMediaDateIndex;
									rows[index]._buildfire = {
										index: {
											date1: new Date(),
										}
									};
								}
								if (validateCsv(rows)) {
									MediaContent.insert(rows).then(function (data) {
										$rootScope.loading = false;
										$scope.isBusy = false;
										$scope.items = [];
										$scope.searchListItem();
										$scope.setDeeplinks();
									}, function errorHandler(error) {
										console.error(error);
										$rootScope.loading = false;
										$scope.$apply();
									});
								} else {
									$rootScope.loading = false;
									$csv.showInvalidCSV();
								}
							})

						} else {
							$rootScope.loading = false;
							$csv.showInvalidCSV();
							$scope.$apply();
						}
					}, function (error) {
						$rootScope.loading = false;
						$scope.$apply();
					});
				};

				/**
				 * getRecords function get the  all items from DB
				 * @param searchOption
				 * @param records
				 * @param callback
				 */
				function getRecords(searchOption, records, callback) {
					MediaContent.find({ ...searchOption, recordCount: true }).then(function (res) {
						const result = res.result;
						records = result && result.length ? records.concat(result) : records;
						if (!res || !res.totalRecord || records.length === res.totalRecord) {// to indicate there are more
							return callback(records);
						} else {
							searchOption.skip = searchOption.skip + searchOption.limit;
							return getRecords(searchOption, records, callback);
						}
					}).catch(function (err) {
						console.error('Error In Fetching Records:', err);
						return callback(null);
					});
				}
				/**
				 * $scope.exportCSV() used to export people list data to CSV
				 */
				$scope.exportCSV = function () {
					const search = angular.copy(searchOptions);
					search.skip = 0;
					search.limit = 50;
					getRecords(search, [], function (data) {
						if (data && data.length) {
							const items = [];
							angular.forEach(angular.copy(data), function (value) {
								delete value.data.dateCreated;
								delete value.data.links;
								delete value.data.rank;
								delete value.data.body;
								delete value.data.mediaDateIndex;
								items.push(value.data);
							});
							const csv = $csv.jsonToCsv(angular.toJson(items), {
								header: header
							});
							$csv.download(csv, 'Export.csv');
						}
						else {
							$scope.getTemplate();
						}
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
