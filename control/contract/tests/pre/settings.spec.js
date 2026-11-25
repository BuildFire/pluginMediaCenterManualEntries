// settings: the plugin's one settings record, holding its content, behavior and design settings.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const saved = () => jasmine.objectContaining({ content: jasmine.any(Object), design: jasmine.any(Object) });

// The refresh messages to the widget, which nothing here answers: spies stand in for them.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
  if (buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
    spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, done) => done && done(null, {}));
  }
};

contract.describe('getSettings', () => {
  beforeEach(standIns);

  it('shows the settings', async () => {
    expect(await call('getSettings', {})).toEqual(saved());
  });
});

contract.describe('updateSettings', () => {
  beforeEach(standIns);

  it('changes one setting', async () => {
    expect(await call('updateSettings', { allowSharing: false })).toEqual(saved());
  });

  it('changes every setting', async () => {
    expect(await call('updateSettings', {
      description: '<p>Pre welcome</p>',
      carouselImages: [{ title: 'Pre slide', iconUrl: 'https://example.com/pre-slide.png', action: 'noAction' }],
      mediaSortOrder: 'Media Title A-Z',
      categorySortOrder: 'Category Title A-Z',
      allowSharing: true,
      allowFavorites: true,
      allowNotes: false,
      showMediaSource: true,
      allowOfflineAccess: false,
      enableFiltering: false,
      showViewCount: true,
      highlightPlayedItems: true,
      useGlobalPlaylist: true,
      showAddAllToPlaylistButton: true,
      showPlaylistButton: true,
      continuousPlayback: true,
      autoplayDelay: 3,
      shuffleList: true,
      autoAddAudioToPlaylist: false,
      resumePlayback: false,
      bypassInfoPage: false
    })).toEqual(jasmine.objectContaining({ content: jasmine.objectContaining({ sortBy: 'Media Title A-Z', allowShare: true }) }));
  });
});

contract.describe('updateDesign', () => {
  beforeEach(standIns);

  it('changes the list layout', async () => {
    expect(await call('updateDesign', { listLayout: 'list-2' })).toEqual(jasmine.objectContaining({ design: jasmine.objectContaining({ listLayout: 'list-2' }) }));
  });

  it('changes both layouts and the background picture', async () => {
    expect(await call('updateDesign', { listLayout: 'list-3', itemLayout: 'item-2', backgroundImage: ['https://example.com/pre-background.png'] }))
      .toEqual(jasmine.objectContaining({ design: jasmine.objectContaining({ listLayout: 'list-3', itemLayout: 'item-2', backgroundImage: 'https://example.com/pre-background.png' }) }));
  });
});
