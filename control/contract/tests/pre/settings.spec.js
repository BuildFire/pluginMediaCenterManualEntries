// settings: the plugin's one settings record, holding its content, behavior and design settings.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

// Calls the contract makes after saving that nothing here answers (the widget refresh messages, the filter page's deep
// link): spies stand in for them.
const standIn = (owner, method) => {
  if (owner && typeof owner[method] === 'function') {
    spyOn(owner, method).and.callFake((...args) => {
      const callback = args.find((arg) => typeof arg === 'function');
      if (callback) callback(null, {});
    });
  }
};
const standInForSideEffects = () => {
  standIn(buildfire.messaging, 'sendMessageToWidget');
  standIn(buildfire.deeplink, 'registerDeeplink');
};
const allSettings = jasmine.objectContaining({ content: jasmine.any(Object), design: jasmine.any(Object) });

contract.describe('getSettings', () => {
  it('shows the content, behavior and design settings', async () => {
    expect(await call('getSettings', {})).toEqual(allSettings);
  });
});

contract.describe('updateSettings', () => {
  beforeEach(standInForSideEffects);

  it('changes one setting', async () => {
    expect(await call('updateSettings', { allowSharing: false })).toEqual(allSettings);
  });

  it('changes every setting', async () => {
    expect(await call('updateSettings', {
      description: '<p>Pre welcome</p>',
      carouselImages: [{ title: 'Pre slide', iconUrl: 'https://example.com/pre-slide.png', action: 'noAction' }],
      mediaSortOrder: 'Media Title A-Z',
      categorySortOrder: 'Category Title A-Z',
      allowSharing: true,
      allowFavorites: false,
      allowNotes: false,
      showMediaSource: true,
      allowOfflineAccess: true,
      enableFiltering: false,
      showViewCount: true,
      highlightPlayedItems: true,
      useGlobalPlaylist: true,
      showAddAllToPlaylistButton: true,
      showPlaylistButton: true,
      continuousPlayback: true,
      autoplayDelay: 2,
      shuffleList: true,
      autoAddAudioToPlaylist: false,
      resumePlayback: false,
      bypassInfoPage: true
    })).toEqual(allSettings);
  });
});

contract.describe('updateDesign', () => {
  beforeEach(standInForSideEffects);

  it('changes the list layout', async () => {
    expect(await call('updateDesign', { listLayout: 'list-2' })).toEqual(allSettings);
  });

  it('changes the layouts and the background picture', async () => {
    expect(await call('updateDesign', { listLayout: 'list-3', itemLayout: 'item-2', backgroundImage: ['https://example.com/pre-background.png'] })).toEqual(allSettings);
  });
});
