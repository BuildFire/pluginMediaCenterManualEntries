// settings: the plugin's one settings record (content, behavior and design), in the datastore.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// The widget's refresh message is the plugin's own bookkeeping: the spy only answers.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};
const shaped = jasmine.objectContaining({ content: jasmine.any(Object), design: jasmine.any(Object) });

contract.describe('getSettings', () => {
  it('shows the settings', async () => {
    expect(await call('getSettings', {})).toEqual(shaped);
  });
});

contract.describe('updateSettings', () => {
  beforeEach(standIns);

  it('changes one setting', async () => {
    expect(await call('updateSettings', { allowFavorites: false })).toEqual(jasmine.objectContaining({ content: jasmine.objectContaining({ allowFavorites: false }) }));
  });

  it('changes every setting', async () => {
    expect(await call('updateSettings', {
      description: '<p>Pre description</p>',
      carouselImages: [{ title: 'Pre slide', iconUrl: 'https://example.com/pre-slide.png', action: 'noAction' }],
      mediaSortOrder: 'Oldest',
      categorySortOrder: 'Category Title A-Z',
      allowSharing: true,
      allowFavorites: true,
      allowNotes: false,
      showMediaSource: true,
      allowOfflineAccess: false,
      enableFiltering: false,
      showViewCount: true,
      highlightPlayedItems: false,
      useGlobalPlaylist: true,
      showAddAllToPlaylistButton: false,
      showPlaylistButton: true,
      continuousPlayback: true,
      autoplayDelay: 2,
      shuffleList: true,
      autoAddAudioToPlaylist: false,
      resumePlayback: false,
      bypassInfoPage: false
    })).toEqual(shaped);
  });
});

contract.describe('updateDesign', () => {
  beforeEach(standIns);

  it('changes the list layout', async () => {
    expect(await call('updateDesign', { listLayout: 'list-2' })).toEqual(jasmine.objectContaining({ design: jasmine.objectContaining({ listLayout: 'list-2' }) }));
  });

  it('changes the layouts and the background', async () => {
    expect(await call('updateDesign', { listLayout: 'list-4', itemLayout: 'item-2', backgroundImage: ['https://example.com/pre-background.png'] }))
      .toEqual(jasmine.objectContaining({ design: jasmine.objectContaining({ listLayout: 'list-4', itemLayout: 'item-2' }) }));
  });
});
