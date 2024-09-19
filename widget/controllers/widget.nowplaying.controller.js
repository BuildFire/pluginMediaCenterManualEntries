/* eslint-disable no-case-declarations */
/* eslint-disable linebreak-style */
(function (angular) {
	angular
		.module('mediaCenterWidget')
		.controller('NowPlayingCtrl', ['$scope', 'Messaging', 'EVENTS', 'PATHS', 'media', 'Location', 'Buildfire', 'Modals', 'COLLECTIONS', '$rootScope', 'openedMediaHandler', 'DropboxLinksManager',
			function ($scope, Messaging, EVENTS, PATHS, media, Location, Buildfire, Modals, COLLECTIONS, $rootScope, openedMediaHandler, DropboxLinksManager) {

				$rootScope.blackBackground = true;
				$rootScope.showFeed = false;
				var audioPlayer = Buildfire.services.media.audioPlayer;
				var NowPlaying = this;
				NowPlaying.swiped = [];
				NowPlaying.currentTime = 0;

				$rootScope.deepLinkNavigate = null;
				NowPlaying.isOnline = window.navigator.onLine;
				NowPlaying.isAudioInitialized = false;

				NowPlaying.item = media;
				NowPlaying.track = media.data.audioUrl;
				NowPlaying.finished = false;

				document.documentElement.style.setProperty('--played-tracker-percentage', '0%');
				const playbackSpeedOptions = [
					{
						text: '<div class="bodyTextTheme">0.5x</div>',
						displayText: '0.5x',
						value: 0.5,
						default: false
					},
					{
						text: '<div class="bodyTextTheme">1.0x</div>',
						displayText: '1.0x',
						value: 1,
						default: true
					},
					{
						text: '<div class="bodyTextTheme">1.5x</div>',
						displayText: '1.5x',
						value: 1.5,
						default: false
					},
					{
						text: '<div class="bodyTextTheme">2.0x</div>',
						displayText: '2.0x',
						value: 2,
						default: false
					},
				];
				// Define the initial values
				const initialSettings = {
					autoPlayNext: false,
					loopPlaylist: false,
					autoJumpToLastPosition: false,
					shufflePlaylist: false,
					playbackSpeed: 1,
					shufflePluginList: false,
				};
				NowPlaying.settings = new AudioSettings(initialSettings);

				NowPlaying.forceAutoPlayer = function () {
					const pluginItems = $rootScope.myItems || [];

					pluginItems.forEach((_pluginItem) => {
						if (!_pluginItem.data.audioUrl) return;

						_pluginItem.data.audioUrl = DropboxLinksManager.convertDropbox(_pluginItem.data.audioUrl || '');
						_pluginItem.data.topImage = DropboxLinksManager.convertDropbox(_pluginItem.data.topImage || '');
						_pluginItem.data.image = DropboxLinksManager.convertDropbox(_pluginItem.data.image || '');

						const index = $rootScope.playListItems.findIndex((el) => (el.url === _pluginItem.data.audioUrl && el.plugin === buildfire.context.instanceId));
						if (index >= 0 && !$rootScope.forceAutoPlay) {
							audioPlayer.removeFromPlaylist(index);
							$rootScope.playListItems.splice(index, 1);
						} else if (index < 0 && $rootScope.forceAutoPlay) {
							const transferTrack = new Track({ ..._pluginItem.data, id: _pluginItem.id }, 0);
							transferTrack.plugin = buildfire.context.instanceId;
							transferTrack.isAudioFromPluginList = false;

							audioPlayer.addToPlaylist(transferTrack);
						}
					});
				};

				NowPlaying.bookmark = function ($event) {
					$event.stopImmediatePropagation();
					var isBookmarked = NowPlaying.item.data.bookmarked ? true : false;
					if (isBookmarked) {
						bookmarks.delete($scope, NowPlaying.item);
					} else {
						bookmarks.add($scope, NowPlaying.item);
					}
				};

				NowPlaying.addNote = function () {
					var options = {
						itemId: NowPlaying.item.id,
						title: NowPlaying.item.data.title,
						imageUrl: NowPlaying.item.data.topImage
					};

					options.timeIndex = NowPlaying.currentTime;

					var callback = function (err, data) {
						if (err) throw err;
						console.log(data);
					};
					buildfire.notes.openDialog(options, callback);
				};

				NowPlaying.share = function ($event) {
					$event.stopImmediatePropagation();

					var link = {};
					link.title = NowPlaying.item.data.title;
					link.type = 'website';
					link.description = NowPlaying.item.data.summary ? NowPlaying.item.data.summary : '';
					link.data = {
						'mediaId': NowPlaying.item.id
					};

					buildfire.deeplink.generateUrl(link, function (err, result) {
						if (err) {
							console.error(err);
						} else {
							buildfire.device.share({
								subject: link.title,
								text: link.description,
								image: link.imageUrl,
								link: result.url
							}, function (err, result) { });

						}
					});
				};

				/**
				 * audioPlayer.onEvent callback calls when audioPlayer event fires.
				 */
				if ($rootScope.activePlayerEvents) {
					// Prevent the repetition of events by clearing all previous occurrences, as repeated events tend to occur when the user plays multiple audio files.
					$rootScope.activePlayerEvents.clear();
				}
				$rootScope.activePlayerEvents = audioPlayer.onEvent(function (e) {
					switch (e.event) {
					case 'play':
					case 'resume':
						NowPlaying.shouldPlayTrackAgain = false;
						buildfire.spinner.show();
						$rootScope.isPlayerReady = true;

						NowPlaying.currentTrack = e.data.track;
						setTrackImages();

						NowPlaying.playing = true;
						if (!NowPlaying.currentTrack.isAudioFromPluginList) {
							updatePlaylistUI();
						}
						break;
					case 'timeUpdate':
						buildfire.spinner.hide();
						audioPlayer.getCurrentTrack((track) => {
							if (track && Math.abs(e.data.currentTime - $rootScope.lastUpdatedPosition) > 5) {
								updateAudioLastPosition(track.id, e.data.currentTime);
							}
							if (track && NowPlaying.currentTrack && track.url === NowPlaying.currentTrack.url && track.id === NowPlaying.currentTrack.id) {
								if (e.data.duration) {
									NowPlaying.currentTime = e.data.currentTime;
									NowPlaying.duration = e.data.duration;
								}
								audioPlayer.isPaused((err, isPaused) => {
									if (err) console.error(err);
									NowPlaying.playing = !isPaused;
								});
							} else {
								NowPlaying.playing = false;
							}
						});
						break;
					case 'audioEnded':
						if (e.data.id && e.data.isAudioFromPluginList) {
							updateAudioLastPosition(e.data.id, 0);
						}
						NowPlaying.playing = false;
						if (!e.data.isAudioFromPluginList) {
							return updatePlaylistUI();
						} else if ($rootScope.autoPlay) {
							audioPlayer.pause();
							$rootScope.playNextItem(false, NowPlaying.settings.shufflePluginList);
						}
						break;
					case 'pause':
						NowPlaying.playing = false;
						audioPlayer.getCurrentTrack((track) => {
							if (track && track.isAudioFromPluginList && track.lastPosition) {
								updateAudioLastPosition(track.id, track.lastPosition);
							}
						});
						updatePlaylistUI();
						break;
					case 'removeFromPlaylist':
					case 'addToPlaylist':
						$rootScope.playListItems = e.data.newPlaylist.tracks.map((el) => ({ ...el, title: el.title || getString('mediaPlayer.unknownTrack') })) || [];
						updatePlaylistUI();
						break;
					}
					if (!$scope.$$phase) {
						$scope.$digest();
					}
				});
				function updatePlaylistUI() {
					audioPlayer.isPaused((err, isPaused) => {
						if (err) console.error(err);

						NowPlaying.getPlaylistData().then(() => {
							audioPlayer.getCurrentTrack((track) => {
								$rootScope.playListItems.forEach((element, index) => {
									const isAudioPlaying = (track && track.url === element.url && track.id === element.id && !isPaused && !track.isAudioFromPluginList && $rootScope.playlistTrackIndex === index);
									element.playing = isAudioPlaying;
								});
								if (!$scope.$$phase) {
									$scope.$digest();
								}
							});
						});
					});
				}
				function initAudio(cpSync = false) {
					if (!cpSync) NowPlaying.currentTrack = new Track({ ...media.data, id: media.id }, 0);
					else NowPlaying.currentTrack = new Track(NowPlaying.currentTrack, 0);
					
					NowPlaying.currentTrack.url = DropboxLinksManager.convertDropbox(NowPlaying.currentTrack.url);
					NowPlaying.currentTrack.topImage = DropboxLinksManager.convertDropbox(NowPlaying.currentTrack.topImage);
					NowPlaying.currentTrack.image = DropboxLinksManager.convertDropbox(NowPlaying.currentTrack.image);

					setTrackImages();

					audioPlayer.getCurrentTrack((track) => {
						NowPlaying.currentTrack.isAudioFromPluginList = true;
						if (NowPlaying.isOnline) {
							if ($rootScope.seekTime) {
								NowPlaying.currentTime = $rootScope.seekTime;
							} else if (track && !track.isAudioFromPluginList && track.url === NowPlaying.currentTrack.url && track.id === NowPlaying.currentTrack.id) {
								NowPlaying.currentTime = $rootScope.playListItems[$rootScope.playlistTrackIndex].lastPosition;
								NowPlaying.audioFromPlayList = $rootScope.playlistTrackIndex;
								NowPlaying.currentTrack.isAudioFromPluginList = false;
							} else if ($rootScope.forceAutoPlay) {
								NowPlaying.currentTrack.isAudioFromPluginList = false;
								if ($rootScope.playListItems.length) NowPlaying.audioFromPlayList = $rootScope.playListItems.findIndex((el) => el.url === NowPlaying.currentTrack.url);
								else NowPlaying.audioFromPlayList = -1;
	
								if (NowPlaying.audioFromPlayList > -1 && NowPlaying.settings.autoJumpToLastPosition) {
									NowPlaying.currentTime = $rootScope.playListItems[NowPlaying.audioFromPlayList].lastPosition;
								} else {
									NowPlaying.currentTime = 0;
								}
							} else if (NowPlaying.lastSavedPosition && (NowPlaying.settings.autoJumpToLastPosition || (track && track.url === NowPlaying.currentTrack.url && track.id === NowPlaying.currentTrack.id))) {
								NowPlaying.currentTime = NowPlaying.lastSavedPosition;
							} else {
								NowPlaying.currentTime = 0;
							}
						} else {
							NowPlaying.currentTime = 0;
						}

						NowPlaying.currentTrack.startAt = NowPlaying.currentTime;
						$rootScope.lastUpdatedPosition = NowPlaying.currentTime;
						NowPlaying.isAudioInitialized = true;

						updatePlaylistUI();

						if ($rootScope.autoPlay) {
							NowPlaying.playTrack();
						}

						if (!$scope.$$phase) {
							$scope.$digest();
							$scope.$apply();
						}
					});
				}

				function updateAudioLastPosition(mediaId, trackLastPosition) {
					if (!NowPlaying.isOnline) return;
					$rootScope.lastUpdatedPosition = trackLastPosition;
					let searchFilter = null;
					if ($rootScope && $rootScope.user) {
						searchFilter = getIndexedFilter(mediaId, $rootScope.user._id);
					} else if (Buildfire.context.deviceId) {
						searchFilter = getIndexedFilter(mediaId, Buildfire.context.deviceId);
					}
					if (searchFilter) {
						buildfire.publicData.searchAndUpdate(
							searchFilter,
							{ $set: { lastPosition: trackLastPosition, duration: NowPlaying.duration } },
							COLLECTIONS.MediaCount,
							(err, result) => {
								if (err) return console.error(err);
							}
						);
					}
				}

				function sendAnalytics(NowPlaying) {
					Analytics.trackAction(`${NowPlaying.item.id}_audioPlayCount`);
					Analytics.trackAction('allAudios_count');
					Analytics.trackAction('allMediaTypes_count');
				}

				function sendContinuesAnalytics(NowPlaying) {
					Analytics.trackAction(`${NowPlaying.item.id}_continuesAudioPlayCount`);
					Analytics.trackAction('allAudios_continuesCount');
					Analytics.trackAction('allMediaTypes_continuesCount');
				}

				function getIndexedFilter(mediaId, userId) {
					let filter = {};

					if ($rootScope.indexingUpdateDoneV2) {
						filter = {
							'_buildfire.index.array1.string1': 'mediaCount-' + mediaId + '-' + userId + '-AUDIO-true'
						};
					} else {
						filter = {
							'_buildfire.index.text': mediaId + '-' + userId + '-AUDIO-true'
						};
					}

					return filter;
				}
				/**
				 * Player related method and variables
				 */
				NowPlaying.playTrack = function () {
					NowPlaying.playing = true;
					audioPlayer.settings.set(NowPlaying.settings);
					if (!NowPlaying.isOnline && (!NowPlaying.item.data.hasDownloadedAudio || !$rootScope.allowOfflineDownload)) {
						NowPlaying.playing = false;
						return buildfire.dialog.show(
							{
								title: 'Audio not available offline',
								message: 'The Audio you are trying to play has not been downloaded.',
								isMessageHTML: true,
								actionButtons: [
									{
										text: 'Ok',
										type: 'primary',
										action: () => {
										},
									},
								],
							}, (err, actionButton) => { }
						);
					}

					if (!NowPlaying.isAudioPlayed && NowPlaying.isOnline) {
						NowPlaying.markAudioAsPlayed();
					}

					if (!NowPlaying.currentTrack.isAudioFromPluginList) {
						if (NowPlaying.audioFromPlayList === $rootScope.playlistTrackIndex && $rootScope.isPlayerReady && !NowPlaying.shouldPlayTrackAgain) {
							audioPlayer.pause();
							audioPlayer.play();
						} else {
							audioPlayer.pause();
							audioPlayer.play(NowPlaying.audioFromPlayList);
						}
					} else {
						audioPlayer.getCurrentTrack((track) => {
							if (track && track.url === NowPlaying.currentTrack.url && track.id === NowPlaying.currentTrack.id && $rootScope.isPlayerReady && !NowPlaying.shouldPlayTrackAgain) {
								audioPlayer.pause();
								audioPlayer.play();
							} else {
								const _track = { ...NowPlaying.currentTrack, isAudioFromPluginList: true };
								delete _track.lastPosition;
								audioPlayer.pause();
								audioPlayer.play(_track);
							}
						});
					}
				};

				NowPlaying.markAudioAsPlayed = function () {
					openedMediaHandler.add(NowPlaying.item, 'Audio', $rootScope.user?.userId);
					$rootScope.markItemAsOpened(NowPlaying.item.id);

					NowPlaying.isAudioPlayed = true;
					sendContinuesAnalytics(NowPlaying);

					
					const userId = $rootScope.user ? $rootScope.user._id : Buildfire.context.deviceId;
					if (userId) {
						const data = {
							userId,
							mediaId: NowPlaying.item.id,
							mediaType: 'AUDIO',
							isActive: true,
							lastPosition: 0,
							duration: NowPlaying.duration ? NowPlaying.duration : 0,
							_buildfire: {
								index: {
									string1: NowPlaying.item.id + '-true',
									array1: [{ string1: 'mediaCount-' + NowPlaying.item.id + '-' + userId + '-AUDIO-true' }]
								},
							},
						};
						if (!$rootScope.indexingUpdateDoneV2) {
							data._buildfire.index.text = NowPlaying.item.id + '-' + userId + '-AUDIO-true';
						}

						buildfire.publicData.insert(data, COLLECTIONS.MediaCount, false, function (err, res) {
							if (err) return console.error(err);
							sendAnalytics(NowPlaying);
						});
					} else {
						let lastTimeWatched = localStorage.getItem(`${NowPlaying.item.id}_audioPlayCount`);
						if (!lastTimeWatched) {
							localStorage.setItem(`${NowPlaying.item.id}_audioPlayCount`, new Date().getTime());
							sendAnalytics(NowPlaying);
						}
					}
				};

				NowPlaying.pauseTrack = function () {
					NowPlaying.playing = false;
					NowPlaying.currentTrack.lastPosition = NowPlaying.currentTime;
					audioPlayer.pause();
					if (!$scope.$$phase) {
						$scope.$digest();
					}
				};

				NowPlaying.forward = function () {
					audioPlayer.getCurrentTrack((track) => {
						const _currentTime = parseInt(NowPlaying.currentTime);
						if (_currentTime + 5 > NowPlaying.currentTrack.duration) {
							NowPlaying.currentTime = NowPlaying.currentTrack.duration;
						} else {
							NowPlaying.currentTime = _currentTime + 5;
						}
						if (track && track.url === NowPlaying.currentTrack.url && track.id === NowPlaying.currentTrack.id && $rootScope.isPlayerReady) {
							audioPlayer.setTime(NowPlaying.currentTime);
						} else {
							NowPlaying.currentTrack.startAt = NowPlaying.currentTime;
						}
						if (!$scope.$$phase) {
							$scope.$apply();
							$scope.$digest();
						}
					});
				};

				NowPlaying.backward = function () {
					audioPlayer.getCurrentTrack((track) => {
						const _currentTime = parseInt(NowPlaying.currentTime);
						if (_currentTime > 5) {
							NowPlaying.currentTime = _currentTime - 5;
						} else {
							NowPlaying.currentTime = 0;
						}
						if (track && track.url === NowPlaying.currentTrack.url && track.id === NowPlaying.currentTrack.id && $rootScope.isPlayerReady) {
							audioPlayer.setTime(NowPlaying.currentTime);
						} else {
							NowPlaying.currentTrack.startAt = NowPlaying.currentTime;
						}
						if (!$scope.$$phase) {
							$scope.$apply();
							$scope.$digest();
						}
					});
				};

				NowPlaying.next = function () {
					if (!NowPlaying.currentTrack.isAudioFromPluginList) {
						audioPlayer.next();
					} else {
						$rootScope.playNextItem(true, NowPlaying.settings.shufflePluginList);
					}
				};

				NowPlaying.prev = function () {
					if (!NowPlaying.currentTrack.isAudioFromPluginList) {
						audioPlayer.previous();
					} else {
						$rootScope.playPrevItem();
					}
				};

				NowPlaying.shufflePlaylist = function () {
					let toastMessage;
					if (!NowPlaying.currentTrack.isAudioFromPluginList) {
						NowPlaying.settings.shufflePlaylist = !NowPlaying.settings.shufflePlaylist;
						toastMessage = NowPlaying.settings.shufflePlaylist ? getString('mediaPlayer.shufflePlaylistItemsConfirmation') : getString('mediaPlayer.shuffleOffConfirmation');
					} else {
						NowPlaying.settings.shufflePluginList = !NowPlaying.settings.shufflePluginList;
						toastMessage = NowPlaying.settings.shufflePluginList ? getString('mediaPlayer.shuffleAllItemsConfirmation') : getString('mediaPlayer.shuffleOffConfirmation');
					}
					audioPlayer.settings.set(NowPlaying.settings);
					buildfire.dialog.toast({ message: toastMessage, type: 'info' });

					if (!$scope.$$phase) {
						$scope.$digest();
					}
				};

				NowPlaying.loopPlaylist = function () {
					NowPlaying.settings.loopPlaylist = !NowPlaying.settings.loopPlaylist;
					if (NowPlaying.settings.loopPlaylist) NowPlaying.settings.autoPlayNext = true;

					audioPlayer.settings.set(NowPlaying.settings);
				};
				NowPlaying.addToPlaylist = function (track) {
					buildfire.dialog.toast({
						message: NowPlaying.playListStrings.addedPlaylist
					});
					NowPlaying.isExistInPlaylist = true;
					audioPlayer.addToPlaylist({ ...track, isAudioFromPluginList: false });
					if (!$scope.$$phase) {
						$scope.$digest();
					}
				};
				NowPlaying.removeFromPlaylist = function (track) {
					Modals.removeTrackModal().then(function (data) {
						buildfire.dialog.toast({
							message: NowPlaying.playListStrings.removedFromPlaylist
						});
						if ($rootScope.playListItems && $rootScope.playListItems.length) {
							const index = $rootScope.playListItems.findIndex((el) => el.url === track.url);
							$rootScope.playListItems.filter((val, _index) => index !== _index);
							audioPlayer.removeFromPlaylist(index);
							if (track.url === NowPlaying.currentTrack.url) {
								NowPlaying.isExistInPlaylist = false;
							}
							if (!$scope.$$phase) {
								$scope.$digest();
							}
						}
					}, (err) => console.error(err));
				};

				NowPlaying.showPlaylistPage = function () {
					NowPlaying.openMoreInfo = false;
					$rootScope.showPlaylist = true;
				};
				NowPlaying.getPlaylistData = function () {
					return new Promise((resolve, reject) => {
						audioPlayer.getPlaylist(function (err, data) {
							if (err) return reject(err);
							$rootScope.playlistTrackIndex = data.lastIndex;
							if (data && data.tracks) {
								$rootScope.playListItems = data.tracks.map((el) => ({ ...el, title: el.title || getString('mediaPlayer.unknownTrack') })) || [];
							}
							resolve();
						});
					});
				};
				NowPlaying.changeTime = function (time) {
					if (typeof time !== 'number') time = parseInt(time);
					audioPlayer.getCurrentTrack((track) => {
						if (track && track.url === NowPlaying.currentTrack.url && track.id === NowPlaying.currentTrack.id && $rootScope.isPlayerReady) {
							audioPlayer.setTime(time);
						} else {
							NowPlaying.currentTime = time;
							NowPlaying.currentTrack.startAt = time;
						}
						if (!$scope.$$phase) {
							$scope.$digest();
						}
					});
				};
				NowPlaying.getSettings = function () {
					NowPlaying.openSettings = true;
					audioPlayer.settings.get(function (err, data) {
						if (data) {
							NowPlaying.settings = new AudioSettings(data);
							if (!$scope.$$phase) {
								$scope.$digest();
							}
						}
					});
				};
				NowPlaying.showShufflePlaylistToast = function () {
					if (NowPlaying.settings.shufflePlaylist) {
						buildfire.dialog.toast({ message: getString('mediaPlayer.shufflePlaylistItemsConfirmation'), type: 'info' });
					} else if (!NowPlaying.settings.shufflePlaylist) {
						buildfire.dialog.toast({ message: getString('mediaPlayer.shuffleOffConfirmation'), type: 'info' });
					}
				};

				NowPlaying.setSettings = function (settings) {
					if (!settings.autoPlayNext && $rootScope.forceAutoPlay) {
						settings.autoPlayNext = true;
					}

					audioPlayer.settings.set(new AudioSettings(settings));

					if (!$scope.$$phase) {
						$scope.$digest();
					}
				};

				NowPlaying.openMoreInfoOverlay = function () {
					NowPlaying.openMoreInfo = true;
				};
				NowPlaying.closeSettingsOverlay = function () {
					NowPlaying.openSettings = false;
				};
				NowPlaying.closePlayListOverlay = function () {
					$rootScope.showPlaylist = false;
				};
				NowPlaying.closeMoreInfoOverlay = function () {
					NowPlaying.openMoreInfo = false;
				};
				NowPlaying.resizeImage = function (url) {
					if (!url) return;
					return buildfire.imageLib.resizeImage(url, { size: '1080', aspect: '16:9' });
				};
				NowPlaying.addEvents = function (e, i, toggle, track) {
					toggle ? track.swiped = true : track.swiped = false;
				};

				/**
				 * Track Smaple
				 * @param title
				 * @param url
				 * @param image
				 * @param album
				 * @param artists
				 * @constructor
				 */

				function Track(track, lastPosition) {
					this.lastPosition = lastPosition;
					this.title = track.title || getString('mediaPlayer.unknownTrack');
					this.url = track.audioUrl || track.url;
					this.image = track.image;
					this.topImage = track.topImage;
					this.album = track.title;
					this.artists = track.artists;
					this.startAt = 0; // where to begin playing
					this.isAudioPlayed = !!NowPlaying.isAudioPlayed;
					this.id = track.id;
					if (track.backgroundImage) {
						this.backgroundImage = track.backgroundImage;
					} else if (track.image) {
						this.backgroundImage = track.image;
					} else if (track.topImage) {
						this.backgroundImage = track.topImage;
					}
					this.instanceId = Buildfire.context.instanceId;
					this.deepLinkData = {
						pluginInstanceId: Buildfire.context.instanceId,
						payload: {
							id: track.id,
							type: 'audio',
						}
					};
				}

				/**
				 * AudioSettings sample
				 * @param autoPlayNext
				 * @param loopPlaylist
				 * @param autoJumpToLastPosition
				 * @param shufflePlaylist
				 * @param shufflePluginList
				 * @param playbackSpeed
				 * @constructor
				 */
				function AudioSettings(settings) {
					this.autoPlayNext = settings.autoPlayNext || initialSettings.autoPlayNext; // once a track is finished playing go to the next track in the play list and play it
					this.loopPlaylist = settings.loopPlaylist || initialSettings.loopPlaylist; // once the end of the playlist has been reached start over again
					this.autoJumpToLastPosition = settings.autoJumpToLastPosition || initialSettings.autoJumpToLastPosition; //If a track has [lastPosition] use it to start playing the audio from there
					this.shufflePlaylist = settings.shufflePlaylist || initialSettings.shufflePlaylist;// shuffle the playlist
					this.shufflePluginList = (settings.shufflePluginList && $rootScope.autoPlay);
					this.playbackSpeed = settings.playbackSpeed || initialSettings.playbackSpeed;// Track playback speed rate
				}

				/**
				 * track play pause from playlist
				 */

				NowPlaying.playlistPlayPause = function (track, index) {
					if (!NowPlaying.isOnline && track.url.indexOf('http') === 0) {
						return buildfire.dialog.show(
							{
								title: 'Audio not available offline',
								message: 'The Audio you are trying to play has not been downloaded.',
								isMessageHTML: true,
								actionButtons: [
									{
										text: 'Ok',
										type: 'primary',
										action: () => {
										},
									},
								],
							}, (err, actionButton) => { }
						);
					}

					if (NowPlaying.settings) {
						audioPlayer.settings.set(NowPlaying.settings);
					}

					if (track.playing) {
						NowPlaying.playing = false;
						audioPlayer.pause();
					} else {
						NowPlaying.playing = true;
						NowPlaying.audioFromPlayList = index;
						
						audioPlayer.getCurrentTrack((currentTrack) => {
							if (currentTrack.url === track.url && currentTrack.id === track.id && $rootScope.isPlayerReady && !NowPlaying.shouldPlayTrackAgain && !NowPlaying.currentTrack.isAudioFromPluginList) {
								audioPlayer.pause();
								audioPlayer.play();
							} else {
								audioPlayer.pause();
								audioPlayer.play(index);
							}
						});
					}
					updatePlaylistUI();

					if (!$scope.$$phase) {
						$scope.$digest();
					}
				};

				//! --------------------------- Playback options --------------------------------------
				NowPlaying.openPlaybackDrawer = function () {
					buildfire.components.drawer.open(
						{
							content: `<b class="ellipsis" style="display:block;">${getString('playlist.playbackSpeed')}</b>`,
							enableFilter: false,
							listItems: playbackSpeedOptions,
						},
						(err, result) => {
							if (err) return console.error(err);
							setPlaybackSpeed(result.value);
							buildfire.components.drawer.closeDrawer();
						}
					);
				};

				const setPlaybackSpeed = function (value) {
					if (value) {
						NowPlaying.settings.playbackSpeed = value;
						NowPlaying.setSettings(NowPlaying.settings);
						$scope.$digest();
					}
				};
				//! --------------------------- End : Playback options --------------------------------------

				/**
				 * progress bar style
				 * @param {Number} value
				 */
				NowPlaying.progressBarStyle = function (value = NowPlaying.currentTime) {
					if (!NowPlaying.duration) return;
					const percentage = Math.round(((value / NowPlaying.duration) * 100));

					document.documentElement.style.setProperty('--played-tracker-percentage', `${percentage}%`);
				};

				const initStrings = () => {
					const playListArrayOfStrings = [
						{ key: 'addedPlaylist', text: 'Added to playlist' },
						{ key: 'removedFromPlaylist', text: 'Removed from playlist' },
						{ key: 'goToPlaylist', text: 'Go to Playlist' },
						{ key: 'addToPlaylist', text: 'Add to Playlist' },
						{ key: 'removeFromPlaylist', text: 'Remove from Playlist' },
						{ key: 'cancelPlaylist', text: 'Cancel' },
						{ key: 'removePlayListButton', text: 'Remove' },
						{ key: 'emptyPlaylist', text: 'Playlist Is Empty Text' },
						{ key: 'donePlaylist', text: 'Done' }
					];

					const settingsArrayOfStrings = [
						{ key: 'automaticallyPlayNextTrack', text: 'Automatically play next track' },
						{ key: 'loopPlaylist', text: 'Loop playlist' },
						{ key: 'autoJumpToLastPositon', text: 'Auto Jump To LastPosition' },
						{ key: 'shufflePlaylist', text: 'Shuffle Playlist' },
						{ key: 'settingsDone', text: 'Done' }
					];

					NowPlaying.playListStrings = {};
					NowPlaying.settingsStrings = {};
					playListArrayOfStrings.forEach(function (el) {
						NowPlaying.playListStrings[el.key] = getString('playlist.' + el.key) ? getString('playlist.' + el.key) : el.text;
					});

					settingsArrayOfStrings.forEach(function (el) {
						NowPlaying.settingsStrings[el.key] = getString('settings.' + el.key) ? getString('settings.' + el.key) : el.text;
					});
				};

				function unescapeCssString(str) {
					return str.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (match, hex) => {
						return String.fromCharCode(parseInt(hex, 16));
					}).replace(/\\(.)/g, '$1');
				}

				const setTrackImages = () => {
					if (!NowPlaying.isOnline) {
						NowPlaying.currentTrack.image = './assets/images/now-playing.png';
						NowPlaying.currentTrack.topImage = './assets/images/now-playing.png';
						NowPlaying.currentTrack.backgroundImage = './assets/images/now-playing.png';
						return;
					}
					let backgroundImage;
					if (NowPlaying.currentTrack && NowPlaying.currentTrack.backgroundImage) {
						backgroundImage = unescapeCssString(NowPlaying.currentTrack.backgroundImage);
						if (backgroundImage.indexOf('/https://') === -1) {
							backgroundImage = NowPlaying.resizeImage(backgroundImage);
						}
					} else if (NowPlaying.currentTrack && NowPlaying.currentTrack.image) {
						backgroundImage = NowPlaying.resizeImage(NowPlaying.currentTrack.image);
					} else if (NowPlaying.currentTrack && NowPlaying.currentTrack.topImage) {
						backgroundImage = NowPlaying.resizeImage(NowPlaying.currentTrack.topImage);
					} else {
						backgroundImage = './assets/images/now-playing.png';
					}

					NowPlaying.currentTrack.backgroundImage = CSS.escape(backgroundImage);
				};

				const initNowPlaying = (cpSync = false) => {
					if (!cpSync) {
						NowPlaying.currentTrack = new Track({ ...media.data, id: media.id }, 0);
						setTrackImages();
					}
					NowPlaying.shuffleAllItemsIndicator = getString('mediaPlayer.shuffleAllItemsIndicator') ? getString('mediaPlayer.shuffleAllItemsIndicator') : 'A';
					NowPlaying.shufflePlaylistItemsIndicator = getString('mediaPlayer.shufflePlaylistItemsIndicator') ? getString('mediaPlayer.shufflePlaylistItemsIndicator') : 'P';

					buildfire.appearance.navbar.hide();
					initStrings();

					bookmarks.sync($scope);
					audioPlayer.isPaused((err, isPaused) => {
						if (err) return console.err(err);
						NowPlaying.playing = !isPaused;
					});
					audioPlayer.settings.get(function (err, setting) {
						if (err) console.error(err);

						NowPlaying.settings = new AudioSettings(setting);
						NowPlaying.getPlaylistData().then(() => {
							NowPlaying.forceAutoPlayer();
						});

						if ($rootScope.forceAutoPlay) {
							NowPlaying.settings.autoPlayNext = true;
							NowPlaying.settings.autoJumpToLastPosition = $rootScope.autoJumpToLastPosition;

							audioPlayer.settings.set(NowPlaying.settings);
						}

						if (!NowPlaying.isOnline || (!$rootScope.user && !Buildfire.context.deviceId)) {
							initAudio(cpSync);
						} else if ($rootScope.user || Buildfire.context.deviceId) {
							const userCheckViewFilter = {
								filter: getIndexedFilter(media.id, $rootScope.user ? $rootScope.user.userId : Buildfire.context.deviceId)
							};
							buildfire.publicData.search(userCheckViewFilter, COLLECTIONS.MediaCount, function (err, res) {
								if (res && res.length > 0) {
									NowPlaying.isAudioPlayed = true;
									if (res[0].data.duration) NowPlaying.duration = res[0].data.duration;
	
									if (res[0].data.lastPosition) {
										NowPlaying.lastSavedPosition = res[0].data.lastPosition;
										NowPlaying.currentTime = res[0].data.lastPosition;
										initAudio(cpSync);
									} else {
										initAudio(cpSync);
									}
								} else {
									NowPlaying.isAudioPlayed = false;
									initAudio(cpSync);
								}
							});
						}
					});
				};

				initNowPlaying();

				Messaging.onReceivedMessage = (event) => {
					if (event.message && event.message.path == 'MEDIA') {
						Location.go('#/media/' + event.message.id, true);
					} else if (event.name === EVENTS.ITEMS_CHANGE) {
						if (event.message.itemUpdatedData.id !== NowPlaying.currentTrack.id || !event.message.itemUpdatedData.data.audioUrl) {
							Location.go('#/media/' + event.message.itemUpdatedData.id, true);
						} else {
							NowPlaying.currentTrack = {...NowPlaying.currentTrack, ...event.message.itemUpdatedData.data};
							if (event.message.itemUpdatedData.data.title) {
								NowPlaying.currentTrack.audioTitle = event.message.itemUpdatedData.data.title;
							}

							NowPlaying.shouldPlayTrackAgain = true;
							initNowPlaying(true);
						}
					} else if (event.name === EVENTS.ROUTE_CHANGE) {
						Location.goToHome();
					} else {
						initNowPlaying(true);
					}

					if (!$scope.$$phase) {
						$scope.$apply();
						$scope.$digest();
					}
				};

				$scope.$on('$destroy', function () {
					buildfire.appearance.navbar.show();
					$rootScope.blackBackground = false;
				});

				$scope.$watch(function () {
					return NowPlaying.currentTime;
				}, NowPlaying.progressBarStyle, true);

				$scope.$watch(function () {
					return NowPlaying.currentTrack;
				}, () => {
					if (!NowPlaying.currentTrack) return;

					audioPlayer.isTrackInPlaylist(NowPlaying.currentTrack, (err, result) => {
						if (err) return console.error(err);
						NowPlaying.isExistInPlaylist = result;
					});
					
					if (NowPlaying.currentTrack.id && NowPlaying.currentTrack.id !== 'mockId' && NowPlaying.currentTrack.instanceId === Buildfire.context.instanceId) {
						Messaging.sendMessageToControl({
							name: EVENTS.ROUTE_CHANGE,
							message: {
								path: PATHS.MEDIA,
								id: NowPlaying.currentTrack.id || null
							}
						});
					}
				}, true);
			}
		]);
})(window.angular);
