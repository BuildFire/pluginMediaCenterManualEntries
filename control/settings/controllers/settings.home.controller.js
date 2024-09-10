/* eslint-disable linebreak-style */
(function (angular, window) {
	'use strict';
	angular
		.module('mediaCenterDesign')
		.controller('SettingsCtrl', ['$scope', 'COLLECTIONS', 'PLAYLISTINSTANCES', 'DB', 'Messaging', function ($scope, COLLECTIONS, PLAYLISTINSTANCES, DB, Messaging) {
			var Settings = this;
			Settings.data = {};
			$scope.inputs = {};
			Settings.autoPlayDelayOptions = [
				{ label: 'Off', value: 0 },
				{ label: '1s', value: 1 },
				{ label: '2s', value: 2 },
				{ label: '3s', value: 3 },
				{ label: '5s', value: 5 },
			];
			var MediaCenter = new DB(COLLECTIONS.MediaCenter);

			MediaCenter.get().then((getData) => {
				Settings.data = getData.data;
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

				$scope.setupSettingsWatch();
			}, (err) => {
				console.error(err);
			});

			Settings.setSettings = () => {
				MediaCenter.save(Settings.data).then(() => {
					Messaging.sendMessageToWidget({ cmd: 'settings', data: Settings.data });
				}).catch((err) => {
					// TODO: handle error
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
								message: 'Please select the correct paylist plugin',
								type: 'warning',
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
				}

				if (Settings.data.content.autoPlay) {
					Settings.data.content.skipMediaPage = true;
				}

				if (!Settings.data.content.globalPlaylist || !Settings.data.content.globalPlaylistPlugin || !Settings.data.content.globalPlaylistPlugin.title) {
					Settings.data.content.showGlobalAddAllToPlaylistButton = false;
					Settings.data.content.showGlobalPlaylistNavButton = false;
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

				if ($scope.saveTimer) clearTimeout($scope.saveTimer);
				$scope.saveTimer = setTimeout(() => {
					Settings.setSettings();
				}, 500);
			};

			$scope.setupSettingsWatch = () => {
				$scope.$watch(function () {
					return Settings.data;
				}, $scope.formatSettingsAndSave, true);
			};
		}]);
})(window.angular, window);
