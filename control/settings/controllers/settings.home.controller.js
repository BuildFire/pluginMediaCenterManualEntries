/* eslint-disable linebreak-style */
(function (angular, window) {
	'use strict';
	angular
		.module('mediaCenterDesign')
		.controller('SettingsCtrl', ['$scope', 'COLLECTIONS', 'EVENTS', 'PLAYLISTINSTANCES', 'DB', 'Messaging', function ($scope, COLLECTIONS, EVENTS, PLAYLISTINSTANCES, DB, Messaging) {
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
				if (typeof (Settings.data.content.indicatePlayedItems ) === 'undefined') {
					Settings.data.content.indicatePlayedItems  = false;
				}
				if (typeof (Settings.data.content.startWithAutoJumpByDefault  ) === 'undefined') {
					Settings.data.content.startWithAutoJumpByDefault   = false;
				}

				if (!$scope.$$phase) {
					$scope.$apply();
					$scope.$digest();
				}

				$scope.setupSettingsWatch();
			}, (err) => {
				console.error(err);
			});

			Settings.setAutoPlayDelay = (option) => {
				if (option.value != Settings.data.content.autoPlayDelay.value) {
					Settings.data.content.autoPlayDelay = option;
				}
			};

			Settings.setSettings = () => {
				const isUnchanged = angular.equals(Settings.lastSavedContent, Settings.data);
				if (isUnchanged) return;

				MediaCenter.save(Settings.data).then(() => {
					Settings.lastSavedContent = angular.copy(Settings.data);
					Messaging.sendMessageToWidget({ cmd: 'settings', data: Settings.data });
				}).catch((err) => {
					console.error(err);
				});
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
			};

			$scope.saveTimer = null;
			$scope.formatSettingsAndSave = () => {
				if (!Settings.data || !Settings.data.content) return;
                
				if (Settings.data.content.forceAutoPlay) {
					Settings.data.content.autoPlay = false;
					Settings.data.content.globalPlaylist = false;
				}

				if (Settings.data.content.autoPlay) {
					Settings.data.design.skipMediaPage = true;
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

				$scope.syncWithWidget();

				if ($scope.saveTimer) clearTimeout($scope.saveTimer);
				$scope.saveTimer = setTimeout(() => {
					Settings.setSettings();
				}, 500);
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
		}])
		.filter('cropImg', function () {
			return function (url) {
				if (!url) return;
				return buildfire.imageLib.cropImage(url, { size: 'xs', aspect: '1:1' });
			};
		});
})(window.angular, window);
