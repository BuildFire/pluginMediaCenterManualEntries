/* eslint-disable linebreak-style */
(function (angular, window) {
	'use strict';
	angular
		.module('mediaCenterDesign')
		.controller('SettingsCtrl', ['$scope', 'COLLECTIONS', 'EVENTS', 'PLAYLISTINSTANCES', 'DB', 'Messaging', 'utils', function ($scope, COLLECTIONS, EVENTS, PLAYLISTINSTANCES, DB, Messaging, utils) {
			const Settings = this;
			Settings.data = {};
			Settings.lastSavedContent = {};
			$scope.inputs = {};
			Settings.autoPlayDelayOptions = [
				{ label: 'Off', value: 0 },
				{ label: '1s', value: 1 },
				{ label: '2s', value: 2 },
				{ label: '3s', value: 3 },
				{ label: '5s', value: 5 },
			];
			const MediaCenter = new DB(COLLECTIONS.MediaCenter);

			MediaCenter.get().then((getData) => {
				Settings.data = getData.data;
				Settings.lastSavedContent = angular.copy(Settings.data);

				if (typeof (Settings.data.content.allowShare) == 'undefined')
					Settings.data.content.allowShare = true;
				if (typeof (Settings.data.content.allowFavorites) == 'undefined')
					Settings.data.content.allowFavorites = true;
				if (typeof (Settings.data.content.allowAddingNotes) == 'undefined')
					Settings.data.content.allowAddingNotes = true;
				if (typeof (Settings.data.content.allowSource) == 'undefined')
					Settings.data.content.allowSource = true;
				if (typeof (Settings.data.content.forceAutoPlay) == 'undefined')
					Settings.data.content.forceAutoPlay = false;
				if (typeof (Settings.data.design.skipMediaPage) == 'undefined')
					Settings.data.design.skipMediaPage = false;
				if (typeof (Settings.data.content.autoPlay) == 'undefined')
					Settings.data.content.autoPlay = false;
				if (typeof (Settings.data.content.shuffleAudioListItems) == 'undefined')
					Settings.data.content.shuffleAudioListItems = false;
				if (typeof (Settings.data.content.autoPlayDelay) == 'undefined')
					Settings.data.content.autoPlayDelay = { label: 'Off', value: 0 };
				if (typeof (Settings.data.content.globalPlaylist) == 'undefined')
					Settings.data.content.globalPlaylist = false;
				if (typeof (Settings.data.content.showGlobalPlaylistNavButton) == 'undefined')
					Settings.data.content.showGlobalPlaylistNavButton = false;
				if (typeof (Settings.data.content.showGlobalAddAllToPlaylistButton) == 'undefined')
					Settings.data.content.showGlobalAddAllToPlaylistButton = false;
				if (typeof (Settings.data.content.globalPlaylistPlugin) == 'undefined') {
					Settings.data.content.globalPlaylistPlugin = false;
				}
				if (typeof (Settings.data.content.allowOfflineDownload) == 'undefined') {
					Settings.data.content.allowOfflineDownload = false;
				}
				if (typeof (Settings.data.content.enableFiltering) == 'undefined') {
					Settings.data.content.enableFiltering = false;
				}
				if (typeof (Settings.data.content.showViewCount) == 'undefined') {
					Settings.data.content.showViewCount = false;
				}
				if (typeof (Settings.data.content.indicatePlayedItems) === 'undefined') {
					Settings.data.content.indicatePlayedItems = false;
				}
				if (typeof (Settings.data.content.startWithAutoJumpByDefault) === 'undefined') {
					Settings.data.content.startWithAutoJumpByDefault = false;
				}
				if (typeof (Settings.data.content.comments) === 'undefined') {
					Settings.data.content.comments = {
						value: 'none',
						tags: [],
					};
				}
				if (typeof (Settings.data.content.reactions) === 'undefined') {
					Settings.data.content.reactions = {
						value: 'none',
						tags: [],
					};
				}

				if (!$scope.$$phase) {
					$scope.$apply();
					$scope.$digest();
				}

				$scope.setupSettingsWatch();

				initTagsSelectors('#commentsHandlingTagsInput', 'content.comments');
				initTagsSelectors('#reactionsHandlingTagsInput', 'content.reactions');

				const reactionsSelector = new buildfire.components.control.reactionGroupPicker('#reactionsGroupPicker', {
					placeholder: 'Select Reactions',
					groupName: Settings.data.content.reactions.groupName
				});
				reactionsSelector.onUpdate = (group) => {
					Settings.data.content.reactions.groupName = group?.name || '';
					$scope.formatSettingsAndSave();
				};

			}, (err) => {
				console.error(err);
			});

			Settings.setSettings = () => {
				const isUnchanged = angular.equals(Settings.lastSavedContent, Settings.data);
				if (isUnchanged) return;
				Settings.lastSavedContent = angular.copy(Settings.data);

				$scope.syncWithWidget();

				MediaCenter.save(Settings.data).then(() => {
					Messaging.sendMessageToWidget({ cmd: 'settings', data: Settings.data });
				}).catch((err) => {
					console.error(err);
				});
			};

			Settings.setAutoPlayDelay = (option) => {
				if (option.value != Settings.data.content.autoPlayDelay.value) {
					Settings.data.content.autoPlayDelay = option;

					if (!$scope.$$phase) {
						$scope.$apply();
						$scope.$digest();
					}
				}
			};

			Settings.showPluginsDialog = () => {
				// MCM Playlist plugin unique Id
				buildfire.pluginInstance.showDialog({}, (err, instances) => {
					if (err) {
						return buildfire.dialog.toast({
							message: 'Error occured',
							type: 'danger',
						});
					}
					if (instances && instances.length > 0) {
						if (instances[0].pluginTypeId === PLAYLISTINSTANCES.DEV || instances[0].pluginTypeId === PLAYLISTINSTANCES.QA || instances[0].pluginTypeId === PLAYLISTINSTANCES.PROD) {
							Settings.data.content.globalPlaylistPlugin = instances[0];

							if (!$scope.$$phase) {
								$scope.$apply();
								$scope.$digest();
							}
						} else {
							buildfire.dialog.toast({
								message: 'Please select the correct playlist plugin',
								type: 'danger',
							});
						}
					}
				});
			};

			Settings.deleteActionItem = () => {
				Settings.data.content.globalPlaylistPlugin = null;

				if (!$scope.$$phase) {
					$scope.$apply();
					$scope.$digest();
				}
			};

			$scope.saveTimer = null;
			$scope.formatSettingsAndSave = () => {
				if (!Settings.data || !Settings.data.content) return;

				if (!Settings.data.content.autoPlay) {
					Settings.data.content.shuffleAudioListItems = false;
				}

				if (Settings.data.content.forceAutoPlay) {
					Settings.data.content.autoPlay = false;
					Settings.data.content.shuffleAudioListItems = false;
					Settings.data.content.globalPlaylist = false;
				} else {
					Settings.data.content.startWithAutoJumpByDefault = false;
				}

				const actionItemAddBtn = document.getElementById('actionItemAddBtn');
				const actionItemAddRow = document.getElementById('actionItemAddRow');

				if (Settings.data.content &&
					Settings.data.content.globalPlaylistPlugin &&
					Settings.data.content.globalPlaylistPlugin.title &&
					Settings.data.content.globalPlaylistPlugin.instanceId) {
					actionItemAddRow.classList.remove('hidden');
					actionItemAddBtn.classList.add('hidden');
				} else {
					actionItemAddRow.classList.add('hidden');
					actionItemAddBtn.classList.remove('hidden');
				}

				if (Settings.data.content.enableFiltering && !Settings.data.content.filterPageDeeplink) {
					const instanceId = buildfire.getContext().instanceId;
					Settings.data.content.filterPageDeeplink = `${instanceId}_filterScreen`;
					buildfire.deeplink.registerDeeplink(
						{
							id: Settings.data.content.filterPageDeeplink,
							name: 'Filter Screen',
							deeplinkData: { screen: 'filterScreen' },
						},
						(err, result) => {
							if (err) return console.log(err);
						}
					);
				}

				if (!$scope.$$phase) {
					$scope.$apply();
					$scope.$digest();
				}

				if ($scope.saveTimer) clearTimeout($scope.saveTimer);
				$scope.saveTimer = setTimeout(() => {
					Settings.setSettings();
				}, 300);
			};

			$scope.syncWithWidget = () => {
				Messaging.sendMessageToWidget({
					name: EVENTS.SETTINGS_CHANGE,
					message: {
						itemUpdatedData: Settings.data.content
					}
				});
			};

			$scope.setupSettingsWatch = () => {
				$scope.$watch(function () {
					return Settings.data;
				}, $scope.formatSettingsAndSave, true);
			};

			function getDeepSettingValue(settingKey) {
				const keys = settingKey.split('.');
				let settingValue = Settings.data;
				for (let key of keys) {
					if (settingValue[key] !== undefined) {
						settingValue = settingValue[key];
					} else {
						break;
					}
				}
				return settingValue;
			}

			function updateDeepSettingValue(settingKey, value) {
				const keys = settingKey.split('.');
				let current = Settings.data;

				for (let i = 0; i < keys.length - 1; i++) {
					const key = keys[i];
					current = current[key];
				}

				const isEquals = utils.checkEquality(current[keys[keys.length - 1]], value);
				if (!isEquals) {
					current[keys[keys.length - 1]] = value;
					$scope.formatSettingsAndSave();
				}
			}

			function initTagsSelectors(selector, settingKey) {
				const settingValue = getDeepSettingValue(settingKey);

				const tagsInput = new buildfire.components.control.userTagsInput(selector, {
					languageSettings: {
						placeholder: 'User Tags',
					},
				});

				tagsInput.onUpdate = (data) => {
					const updatedTags = data.tags.map((tag) => ({
						tagName: tag.tagName,
						value: tag.value,
					}));
					updateDeepSettingValue(`${settingKey}.tags`, updatedTags);
				};
				if (settingValue.tags && settingValue.tags.length) {
					tagsInput.set(settingValue.tags);
				}
			}
		}])
		.filter('cropImg', function () {
			return function (url) {
				if (!url) return;
				return buildfire.imageLib.cropImage(url, { size: 'xs', aspect: '1:1' });
			};
		});
})(window.angular, window);
