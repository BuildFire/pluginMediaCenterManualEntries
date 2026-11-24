// settings: the plugin's one settings record, holding its content, behavior and design settings.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);

const MEDIA_SORT_ORDERS = ['Manually', 'Media Title A-Z', 'Media Title Z-A', 'Media Date Asc', 'Media Date Desc', 'Newest', 'Oldest'];
const CATEGORY_SORT_ORDERS = ['Manually', 'Category Title A-Z', 'Category Title Z-A', 'Newest', 'Oldest'];
const CONTENT_SWITCHES = ['allowShare', 'allowFavorites', 'allowAddingNotes', 'allowSource', 'allowOfflineDownload', 'enableFiltering', 'showViewCount',
  'indicatePlayedItems', 'globalPlaylist', 'showGlobalAddAllToPlaylistButton', 'showGlobalPlaylistNavButton', 'autoPlay', 'shuffleAudioListItems',
  'forceAutoPlay', 'startWithAutoJumpByDefault'];

// Calls the contract makes after saving that nothing here answers (the widget refresh messages, the filter page's deep
// link): the contract does not promise them, so spies only stand in for them.
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
const settings = () => call('getSettings', {});

contract.describe('getSettings', () => {
  it('shows every content, behavior and design setting', async () => {
    const { content, design } = await settings();
    CONTENT_SWITCHES.forEach((name) => expect(typeof content[name]).withContext(name).toBe('boolean'));
    expect(MEDIA_SORT_ORDERS).toContain(content.sortBy);
    expect(CATEGORY_SORT_ORDERS).toContain(content.sortCategoriesBy);
    expect(content.images).toEqual(jasmine.any(Array));
    expect(content.autoPlayDelay).toEqual(jasmine.objectContaining({ label: jasmine.any(String), value: jasmine.any(Number) }));
    expect(['list-1', 'list-2', 'list-3', 'list-4']).toContain(design.listLayout);
    expect(['item-1', 'item-2']).toContain(design.itemLayout);
    expect(typeof design.backgroundImage).toBe('string');
    expect(typeof design.skipMediaPage).toBe('boolean');
  });

  if (contract.host === 'control') {
    // The control run reaches this file last of all, and nothing before it saves the settings.
    it('gives the plugin\'s defaults while nothing is saved, and saves nothing', async () => {
      const defaults = {
        content: jasmine.objectContaining({
          images: [], descriptionHTML: '', sortBy: 'Newest', sortCategoriesBy: 'Newest', allowShare: true, allowFavorites: true,
          allowAddingNotes: true, allowSource: true, allowOfflineDownload: false, enableFiltering: false, showViewCount: false,
          indicatePlayedItems: false, globalPlaylist: false, showGlobalAddAllToPlaylistButton: false, showGlobalPlaylistNavButton: false,
          autoPlay: false, autoPlayDelay: { label: 'Off', value: 0 }, shuffleAudioListItems: false, forceAutoPlay: false, startWithAutoJumpByDefault: false
        }),
        design: jasmine.objectContaining({ listLayout: 'list-1', itemLayout: 'item-1', backgroundImage: '', skipMediaPage: false })
      };
      expect(await settings()).toEqual(jasmine.objectContaining(defaults));
      expect(await settings()).toEqual(jasmine.objectContaining(defaults));
    });
  }
});

// controlBackground only: the app's datastore is read-only, and the settings are the owner's.
contract.describe('updateSettings', () => {
  beforeEach(standInForSideEffects);

  it('changes only the settings it is given, and returns them all', async () => {
    await call('updateSettings', { allowSharing: false, mediaSortOrder: 'Media Title A-Z' });
    const result = await call('updateSettings', { allowFavorites: false });
    expect(result).toEqual({ content: jasmine.objectContaining({ allowShare: false, allowFavorites: false, sortBy: 'Media Title A-Z' }), design: jasmine.any(Object) });
    expect((await settings()).content).toEqual(jasmine.objectContaining({ allowShare: false, allowFavorites: false, sortBy: 'Media Title A-Z' }));
  });

  it('sets each switch', async () => {
    await call('updateSettings', {
      allowSharing: true, allowFavorites: true, allowNotes: false, showMediaSource: false, allowOfflineAccess: true, enableFiltering: true,
      showViewCount: true, highlightPlayedItems: true, showAddAllToPlaylistButton: true, showPlaylistButton: true, bypassInfoPage: true
    });
    const { content, design } = await settings();
    expect(content).toEqual(jasmine.objectContaining({
      allowShare: true, allowFavorites: true, allowAddingNotes: false, allowSource: false, allowOfflineDownload: true, enableFiltering: true,
      showViewCount: true, indicatePlayedItems: true, showGlobalAddAllToPlaylistButton: true, showGlobalPlaylistNavButton: true
    }));
    expect(design.skipMediaPage).toBe(true);
    await call('updateSettings', { allowNotes: true, enableFiltering: false, bypassInfoPage: false });
    expect(await settings()).toEqual(jasmine.objectContaining({
      content: jasmine.objectContaining({ allowAddingNotes: true, enableFiltering: false }), design: jasmine.objectContaining({ skipMediaPage: false })
    }));
  });

  it('keeps continuous playback, shuffle, the global playlist and resuming in step, as the settings tab does', async () => {
    await call('updateSettings', { autoAddAudioToPlaylist: false, continuousPlayback: true, shuffleList: true, useGlobalPlaylist: true, resumePlayback: true });
    expect((await settings()).content).toEqual(jasmine.objectContaining({
      forceAutoPlay: false, autoPlay: true, shuffleAudioListItems: true, globalPlaylist: true, startWithAutoJumpByDefault: false
    }));
    await call('updateSettings', { continuousPlayback: false });
    expect((await settings()).content).toEqual(jasmine.objectContaining({ autoPlay: false, shuffleAudioListItems: false }));
    await call('updateSettings', { continuousPlayback: true, useGlobalPlaylist: true });
    await call('updateSettings', { autoAddAudioToPlaylist: true, resumePlayback: true });
    expect((await settings()).content).toEqual(jasmine.objectContaining({
      forceAutoPlay: true, autoPlay: false, shuffleAudioListItems: false, globalPlaylist: false, startWithAutoJumpByDefault: true
    }));
    await call('updateSettings', { autoAddAudioToPlaylist: false });
  });

  it('sets how long to wait before the next item plays', async () => {
    await call('updateSettings', { autoplayDelay: 3 });
    expect((await settings()).content.autoPlayDelay).toEqual({ label: '3s', value: 3 });
    await call('updateSettings', { autoplayDelay: 0 });
    expect((await settings()).content.autoPlayDelay).toEqual({ label: 'Off', value: 0 });
  });

  it('sets the order of media items and of categories', async () => {
    await call('updateSettings', { mediaSortOrder: 'Media Date Desc', categorySortOrder: 'Category Title A-Z' });
    expect((await settings()).content).toEqual(jasmine.objectContaining({ sortBy: 'Media Date Desc', sortCategoriesBy: 'Category Title A-Z' }));
    await call('updateSettings', { mediaSortOrder: 'Newest', categorySortOrder: 'Newest' });
  });

  it('sets the text above the list, and removes it with null or an empty text', async () => {
    await call('updateSettings', { description: '<p>Welcome to the media center</p>' });
    expect((await settings()).content.descriptionHTML).toBe('<p>Welcome to the media center</p>');
    await call('updateSettings', { description: null });
    expect((await settings()).content.descriptionHTML).toBeNull();
    await call('updateSettings', { description: '<p>Again</p>' });
    await call('updateSettings', { description: '' });
    expect((await settings()).content.descriptionHTML).toBe('');
  });

  it('replaces the carousel images with the ones given, and removes them with an empty list or null', async () => {
    const slide = (name) => ({ title: name, iconUrl: `https://example.com/${name}.png`, action: 'noAction' });
    await call('updateSettings', { carouselImages: [slide('one'), slide('two')] });
    expect((await settings()).content.images).toEqual([jasmine.objectContaining({ title: 'one', iconUrl: 'https://example.com/one.png' }), jasmine.objectContaining({ title: 'two' })]);
    await call('updateSettings', { carouselImages: [slide('three')] });
    expect((await settings()).content.images).toEqual([jasmine.objectContaining({ title: 'three' })]);
    await call('updateSettings', { carouselImages: [] });
    expect((await settings()).content.images).toEqual([]);
    await call('updateSettings', { carouselImages: slide('four') });
    expect((await settings()).content.images).toEqual([jasmine.objectContaining({ title: 'four' })]);
    await call('updateSettings', { carouselImages: null });
    expect((await settings()).content.images).toEqual([]);
  }, 120000);

  describe('refuses, and changes nothing', () => {
    beforeEach(async () => {
      await call('updateSettings', { allowSharing: true, mediaSortOrder: 'Newest', autoplayDelay: 1, carouselImages: [] });
    });
    const unchanged = async () => {
      expect((await settings()).content).toEqual(jasmine.objectContaining({ allowShare: true, sortBy: 'Newest', autoPlayDelay: { label: '1s', value: 1 }, images: [] }));
    };

    it('a switch that is not true or false', async () => {
      expect(await refusal(call('updateSettings', { allowSharing: 'no' }))).toContain('allowSharing');
      expect(await refusal(call('updateSettings', { bypassInfoPage: 1 }))).toContain('bypassInfoPage');
      await unchanged();
    });

    it('a media order it does not offer', async () => {
      expect(await refusal(call('updateSettings', { mediaSortOrder: 'Most' }))).toContain('mediaSortOrder');
      await unchanged();
    });

    it('a category order it does not offer', async () => {
      expect(await refusal(call('updateSettings', { categorySortOrder: 'Media Title A-Z' }))).toContain('categorySortOrder');
      await unchanged();
    });

    it('a delay it does not offer', async () => {
      expect(await refusal(call('updateSettings', { autoplayDelay: 4 }))).toContain('autoplayDelay');
      expect(await refusal(call('updateSettings', { autoplayDelay: '1' }))).toContain('autoplayDelay');
      await unchanged();
    });

    it('a carousel image that names no action', async () => {
      expect(await refusal(call('updateSettings', { carouselImages: [{ title: 'No action', iconUrl: 'https://example.com/x.png' }] }))).toContain('carouselImages');
      await unchanged();
    });

    it('a text above the list that is not text', async () => {
      expect(await refusal(call('updateSettings', { description: 42 }))).toContain('description');
      await unchanged();
    });

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
      await unchanged();
    });
  });
});

// controlBackground only, like updateSettings.
contract.describe('updateDesign', () => {
  beforeEach(standInForSideEffects);

  it('changes only the layouts it is given, and returns every setting', async () => {
    await call('updateDesign', { listLayout: 'list-3', itemLayout: 'item-2' });
    const result = await call('updateDesign', { listLayout: 'list-2' });
    expect(result).toEqual({ content: jasmine.any(Object), design: jasmine.objectContaining({ listLayout: 'list-2', itemLayout: 'item-2' }) });
    expect((await settings()).design).toEqual(jasmine.objectContaining({ listLayout: 'list-2', itemLayout: 'item-2' }));
  });

  it('sets the background picture as a single link, and removes it with an empty list or null', async () => {
    await call('updateDesign', { backgroundImage: ['https://example.com/background.png'] });
    expect((await settings()).design.backgroundImage).toBe('https://example.com/background.png');
    await call('updateDesign', { backgroundImage: [] });
    expect((await settings()).design.backgroundImage).toBe('');
    await call('updateDesign', { backgroundImage: 'https://example.com/single.png' });
    expect((await settings()).design.backgroundImage).toBe('https://example.com/single.png');
    await call('updateDesign', { backgroundImage: null });
    expect((await settings()).design.backgroundImage).toBe('');
  });

  it('leaves the content and behavior settings alone', async () => {
    await call('updateSettings', { allowFavorites: true, mediaSortOrder: 'Oldest' });
    await call('updateDesign', { itemLayout: 'item-1' });
    expect((await settings()).content).toEqual(jasmine.objectContaining({ allowFavorites: true, sortBy: 'Oldest' }));
    await call('updateSettings', { mediaSortOrder: 'Newest' });
  });

  describe('refuses, and changes nothing', () => {
    beforeEach(async () => {
      await call('updateDesign', { listLayout: 'list-1', itemLayout: 'item-1', backgroundImage: [] });
    });
    const unchanged = async () => {
      expect((await settings()).design).toEqual(jasmine.objectContaining({ listLayout: 'list-1', itemLayout: 'item-1', backgroundImage: '' }));
    };

    it('a list layout it does not offer', async () => {
      expect(await refusal(call('updateDesign', { listLayout: 'list-9' }))).toContain('listLayout');
      await unchanged();
    });

    it('an item layout it does not offer', async () => {
      expect(await refusal(call('updateDesign', { itemLayout: 'item-3' }))).toContain('itemLayout');
      await unchanged();
    });

    it('more than one background picture', async () => {
      expect(await refusal(call('updateDesign', { backgroundImage: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('backgroundImage');
      await unchanged();
    });

    it('a background picture that is not a picture', async () => {
      expect(await refusal(call('updateDesign', { backgroundImage: [42] }))).toContain('backgroundImage');
      await unchanged();
    });

    it('a call with nothing to change', async () => {
      await expectAsync(call('updateDesign', {})).toBeRejected();
      await unchanged();
    });
  });
});
