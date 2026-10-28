// settings: the media center's one settings record, with its design.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const BOOLEANS = ['allowShare', 'allowFavorites', 'allowAddingNotes', 'allowSource', 'allowOfflineDownload', 'enableFiltering', 'showViewCount',
  'indicatePlayedItems', 'globalPlaylist', 'showGlobalAddAllToPlaylistButton', 'showGlobalPlaylistNavButton', 'autoPlay', 'shuffleAudioListItems',
  'forceAutoPlay', 'startWithAutoJumpByDefault'];
// The refresh messages and the filter screen's link are the control panel's own bookkeeping: their spies only answer.
const quietWidget = () => {
  spyOn(buildfire.messaging, 'sendMessageToWidget');
  if (buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
    spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, callback) => callback && callback(null, { data: options }));
  }
};

// Runs on both sides; the app's side reads whatever the control panel's specs saved last, so it checks only what any saved state holds.
contract.describe('getSettings', () => {
  it('shows every setting, of its kind', async () => {
    const settings = await call('getSettings', {});
    BOOLEANS.forEach((name) => expect(typeof settings.content[name]).withContext(name).toBe('boolean'));
    expect(settings.content).toEqual(jasmine.objectContaining({
      descriptionHTML: jasmine.any(String), images: jasmine.any(Array), sortBy: jasmine.any(String), sortCategoriesBy: jasmine.any(String),
      autoPlayDelay: jasmine.objectContaining({ label: jasmine.any(String), value: jasmine.any(Number) })
    }));
    expect(['list-1', 'list-2', 'list-3', 'list-4']).toContain(settings.design.listLayout);
    expect(['item-1', 'item-2']).toContain(settings.design.itemLayout);
    expect(settings.design).toEqual(jasmine.objectContaining({ backgroundImage: jasmine.any(String), skipMediaPage: jasmine.any(Boolean) }));
  });

  it('changes nothing', async () => {
    expect(await call('getSettings', {})).toEqual(await call('getSettings', {}));
  });
});

// controlBackground only: this block runs in the control frame, where the settings can be saved.
contract.describe('updateSettings', () => {
  beforeEach(quietWidget);

  it('changes only the settings it is given, and returns them', async () => {
    await call('updateSettings', { listLayout: 'list-3', allowShare: false });
    const saved = await call('updateSettings', { itemLayout: 'item-2' });
    expect(saved.design).toEqual(jasmine.objectContaining({ listLayout: 'list-3', itemLayout: 'item-2' }));
    expect(saved.content.allowShare).toBe(false);
    expect(await call('getSettings', {})).toEqual(saved);
    await call('updateSettings', { listLayout: 'list-1', itemLayout: 'item-1', allowShare: true });
    expect((await call('getSettings', {})).design).toEqual(jasmine.objectContaining({ listLayout: 'list-1', itemLayout: 'item-1' }));
  });

  it('sets every switch it is given', async () => {
    const off = { allowFavorites: false, allowAddingNotes: false, allowSource: false, allowOfflineDownload: true, showViewCount: true, indicatePlayedItems: true,
      showGlobalAddAllToPlaylistButton: true, showGlobalPlaylistNavButton: true, skipMediaPage: true };
    const saved = await call('updateSettings', off);
    expect(saved.content).toEqual(jasmine.objectContaining({ allowFavorites: false, allowAddingNotes: false, allowSource: false, allowOfflineDownload: true,
      showViewCount: true, indicatePlayedItems: true, showGlobalAddAllToPlaylistButton: true, showGlobalPlaylistNavButton: true }));
    expect(saved.design.skipMediaPage).toBe(true);
    const back = await call('updateSettings', { allowFavorites: true, allowAddingNotes: true, allowSource: true, allowOfflineDownload: false, showViewCount: false,
      indicatePlayedItems: false, showGlobalAddAllToPlaylistButton: false, showGlobalPlaylistNavButton: false, skipMediaPage: false });
    expect(back.content).toEqual(jasmine.objectContaining({ allowFavorites: true, showViewCount: false }));
    expect((await call('getSettings', {})).design.skipMediaPage).toBe(false);
  });

  it('turns filtering on and off', async () => {
    expect((await call('updateSettings', { enableFiltering: true })).content.enableFiltering).toBe(true);
    expect((await call('updateSettings', { enableFiltering: false })).content.enableFiltering).toBe(false);
  });

  it('sets the description, and empties it with null or an empty text', async () => {
    expect((await call('updateSettings', { description: '<p>Welcome to the media center</p>' })).content.descriptionHTML).toBe('<p>Welcome to the media center</p>');
    expect((await call('getSettings', {})).content.descriptionHTML).toBe('<p>Welcome to the media center</p>');
    expect((await call('updateSettings', { description: null })).content.descriptionHTML).toBe('');
    await call('updateSettings', { description: '<p>Again</p>' });
    expect((await call('updateSettings', { description: '' })).content.descriptionHTML).toBe('');
  });

  it('replaces the carousel, and empties it', async () => {
    const slide = (name) => ({ title: name, action: 'linkToWeb', url: `https://example.com/${name}`, iconUrl: `https://example.com/${name}.png` });
    expect((await call('updateSettings', { carouselImages: [slide('one'), slide('two')] })).content.images).toEqual([slide('one'), slide('two')]);
    expect((await call('updateSettings', { carouselImages: [slide('three')] })).content.images).toEqual([slide('three')]);
    expect((await call('getSettings', {})).content.images).toEqual([slide('three')]);
    expect((await call('updateSettings', { carouselImages: [] })).content.images).toEqual([]);
    await call('updateSettings', { carouselImages: [slide('four')] });
    expect((await call('updateSettings', { carouselImages: null })).content.images).toEqual([]);
  });

  it('keeps the background image as a single image, and removes it', async () => {
    expect((await call('updateSettings', { backgroundImage: ['https://example.com/background.png'] })).design.backgroundImage).toBe('https://example.com/background.png');
    expect((await call('getSettings', {})).design.backgroundImage).toBe('https://example.com/background.png');
    expect((await call('updateSettings', { backgroundImage: [] })).design.backgroundImage).toBe('');
    await call('updateSettings', { backgroundImage: ['https://example.com/again.png'] });
    expect((await call('updateSettings', { backgroundImage: null })).design.backgroundImage).toBe('');
  });

  it('sets the media and category orders', async () => {
    const saved = await call('updateSettings', { mediaSortOrder: 'Media Title A-Z', categorySortOrder: 'Oldest' });
    expect(saved.content).toEqual(jasmine.objectContaining({ sortBy: 'Media Title A-Z', sortCategoriesBy: 'Oldest' }));
    expect((await call('updateSettings', { mediaSortOrder: 'Newest', categorySortOrder: 'Newest' })).content.sortBy).toBe('Newest');
  });

  it('sets the autoplay delay', async () => {
    expect((await call('updateSettings', { autoPlay: true, autoPlayDelay: 3 })).content.autoPlayDelay).toEqual({ label: '3s', value: 3 });
    expect((await call('updateSettings', { autoPlayDelay: 0 })).content.autoPlayDelay).toEqual({ label: 'Off', value: 0 });
  });

  it('keeps continuous playback, shuffle and the playlist off while auto-add all audio is on', async () => {
    const forced = await call('updateSettings', { forceAutoPlay: true, autoPlay: true, shuffleAudioListItems: true, globalPlaylist: true, startWithAutoJumpByDefault: true });
    expect(forced.content).toEqual(jasmine.objectContaining({ forceAutoPlay: true, autoPlay: false, shuffleAudioListItems: false, globalPlaylist: false, startWithAutoJumpByDefault: true }));
    const free = await call('updateSettings', { forceAutoPlay: false, autoPlay: true, shuffleAudioListItems: true, globalPlaylist: true });
    expect(free.content).toEqual(jasmine.objectContaining({ forceAutoPlay: false, autoPlay: true, shuffleAudioListItems: true, globalPlaylist: true, startWithAutoJumpByDefault: false }));
  });

  it('keeps shuffle off while continuous playback is off', async () => {
    expect((await call('updateSettings', { forceAutoPlay: false, autoPlay: false, shuffleAudioListItems: true })).content.shuffleAudioListItems).toBe(false);
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => { before = await call('getSettings', {}); });
    afterEach(async () => { expect(await call('getSettings', {})).toEqual(before); });

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
    });

    it('a layout it does not offer', async () => {
      expect(await refusal(call('updateSettings', { listLayout: 'grid' }))).toContain('listLayout');
      expect(await refusal(call('updateSettings', { itemLayout: 'item-3' }))).toContain('itemLayout');
    });

    it('an order it does not offer', async () => {
      expect(await refusal(call('updateSettings', { mediaSortOrder: 'Random' }))).toContain('mediaSortOrder');
      expect(await refusal(call('updateSettings', { categorySortOrder: 'Media Title A-Z' }))).toContain('categorySortOrder');
    });

    it('an autoplay delay it does not offer', async () => {
      expect(await refusal(call('updateSettings', { autoPlayDelay: 4 }))).toContain('autoPlayDelay');
      expect(await refusal(call('updateSettings', { autoPlayDelay: '2' }))).toContain('autoPlayDelay');
    });

    it('a switch that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { allowShare: 'yes' }))).toContain('allowShare');
      expect(await refusal(call('updateSettings', { skipMediaPage: null }))).toContain('skipMediaPage');
    });

    it('a background image that is not a list, or more than one', async () => {
      expect(await refusal(call('updateSettings', { backgroundImage: 'https://example.com/x.png' }))).toContain('backgroundImage');
      expect(await refusal(call('updateSettings', { backgroundImage: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('backgroundImage');
    });

    it('a carousel image that is not an action item with an image', async () => {
      expect(await refusal(call('updateSettings', { carouselImages: [{ title: 'No action', iconUrl: 'https://example.com/x.png' }] }))).toContain('carouselImages');
      expect(await refusal(call('updateSettings', { carouselImages: { action: 'linkToWeb' } }))).toContain('carouselImages');
    });

    it('a description that is not text', async () => {
      expect(await refusal(call('updateSettings', { description: 12 }))).toContain('description');
    });

    it('one bad setting among good ones', async () => {
      expect(await refusal(call('updateSettings', { listLayout: 'list-4', allowShare: 'no' }))).toContain('allowShare');
    });
  });
});
