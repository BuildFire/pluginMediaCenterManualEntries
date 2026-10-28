// settings: the media center's one settings record, with its design.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// The refresh messages are the control panel's own bookkeeping: the spy only answers them.
const quietWidget = () => spyOn(buildfire.messaging, 'sendMessageToWidget');

contract.describe('getSettings', () => {
  it('shows the settings and design', async () => {
    expect(await call('getSettings', {})).toEqual(jasmine.objectContaining({
      content: jasmine.objectContaining({ allowShare: jasmine.any(Boolean), sortBy: jasmine.any(String) }),
      design: jasmine.objectContaining({ listLayout: jasmine.any(String), itemLayout: jasmine.any(String) })
    }));
  });
});

contract.describe('updateSettings', () => {
  beforeEach(quietWidget);

  it('changes one setting', async () => {
    expect(await call('updateSettings', { listLayout: 'list-2' }))
      .toEqual(jasmine.objectContaining({ design: jasmine.objectContaining({ listLayout: 'list-2' }) }));
  });

  it('changes every setting at once', async () => {
    const saved = await call('updateSettings', {
      description: '<p>Pre media center</p>',
      carouselImages: [{ title: 'Pre slide', action: 'linkToWeb', url: 'https://example.com/pre', iconUrl: 'https://example.com/pre-slide.png' }],
      mediaSortOrder: 'Media Title A-Z',
      categorySortOrder: 'Category Title A-Z',
      allowShare: true,
      allowFavorites: true,
      allowAddingNotes: false,
      allowSource: true,
      allowOfflineDownload: false,
      enableFiltering: false,
      showViewCount: true,
      indicatePlayedItems: true,
      globalPlaylist: true,
      showGlobalAddAllToPlaylistButton: true,
      showGlobalPlaylistNavButton: true,
      autoPlay: true,
      autoPlayDelay: 2,
      shuffleAudioListItems: true,
      forceAutoPlay: false,
      startWithAutoJumpByDefault: false,
      skipMediaPage: false,
      listLayout: 'list-4',
      itemLayout: 'item-2',
      backgroundImage: ['https://example.com/pre-background.png']
    });
    expect(saved).toEqual(jasmine.objectContaining({
      content: jasmine.objectContaining({ descriptionHTML: '<p>Pre media center</p>', sortBy: 'Media Title A-Z', globalPlaylist: true, autoPlay: true }),
      design: jasmine.objectContaining({ listLayout: 'list-4', itemLayout: 'item-2', backgroundImage: 'https://example.com/pre-background.png' })
    }));
  });
});
