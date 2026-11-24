// settings: the plugin's one settings record (content, behavior and design), in the datastore.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// Calls nothing here answers. The widget's refresh message and the filter page's deep link are the plugin's own bookkeeping: these spies only answer.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
  if (buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
    spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, done) => done && done(null, { data: options }));
  }
};
const settingsShape = (content, design) => jasmine.objectContaining({
  content: content ? jasmine.objectContaining(content) : jasmine.any(Object),
  design: design ? jasmine.objectContaining(design) : jasmine.any(Object)
});

contract.describe('getSettings', () => {
  beforeEach(standIns);

  it('shows the settings and the design', async () => {
    expect(await call('getSettings', {})).toEqual(settingsShape());
  });
});

contract.describe('updateSettings', () => {
  beforeEach(standIns);

  it('changes one setting', async () => {
    expect(await call('updateSettings', { allowSharing: true })).toEqual(settingsShape({ allowShare: true }));
  });

  it('changes every setting', async () => {
    expect(await call('updateSettings', {
      description: '<p>Pre welcome</p>',
      carouselImages: [{ title: 'Pre slide', iconUrl: 'https://example.com/pre-slide.png', action: 'noAction' }],
      mediaSortOrder: 'Newest',
      categorySortOrder: 'Newest',
      allowSharing: true,
      allowFavorites: true,
      allowNotes: true,
      showMediaSource: true,
      allowOfflineAccess: false,
      enableFiltering: false,
      showViewCount: false,
      highlightPlayedItems: true,
      useGlobalPlaylist: false,
      showAddAllToPlaylistButton: false,
      showPlaylistButton: false,
      continuousPlayback: true,
      autoplayDelay: 2,
      shuffleList: false,
      autoAddAudioToPlaylist: false,
      resumePlayback: false,
      bypassInfoPage: false
    })).toEqual(settingsShape({ descriptionHTML: '<p>Pre welcome</p>', sortBy: 'Newest', sortCategoriesBy: 'Newest', indicatePlayedItems: true }));
  });
});

contract.describe('updateDesign', () => {
  beforeEach(standIns);

  it('changes the list layout', async () => {
    expect(await call('updateDesign', { listLayout: 'list-2' })).toEqual(settingsShape(null, { listLayout: 'list-2' }));
  });

  it('changes both layouts and the background', async () => {
    expect(await call('updateDesign', { listLayout: 'list-1', itemLayout: 'item-2', backgroundImage: ['https://example.com/pre-background.png'] }))
      .toEqual(settingsShape(null, { listLayout: 'list-1', itemLayout: 'item-2', backgroundImage: 'https://example.com/pre-background.png' }));
  });
});
