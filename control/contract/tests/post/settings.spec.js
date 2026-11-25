// settings: the plugin's one settings record, holding its content, behavior and design settings.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// How a call was refused: its code (ContractOperationInvokeError.CODES) and its reason; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => { fail('expected the call to be refused'); return {}; },
  (error) => ({ code: (error && error.code) || 'unknown', reason: reason(error) }));
// What a refusal is expected to be: its code, and a reason naming the text given.
const refused = (code, text) => ({ code, reason: jasmine.stringContaining(text) });

const MEDIA_ORDERS = ['Manually', 'Media Title A-Z', 'Media Title Z-A', 'Media Date Asc', 'Media Date Desc', 'Newest', 'Oldest'];
const CATEGORY_ORDERS = ['Manually', 'Category Title A-Z', 'Category Title Z-A', 'Newest', 'Oldest'];
const DELAYS = [0, 1, 2, 3, 5];
const SWITCHES = ['allowShare', 'allowFavorites', 'allowAddingNotes', 'allowSource', 'allowOfflineDownload', 'enableFiltering', 'showViewCount',
  'indicatePlayedItems', 'globalPlaylist', 'showGlobalAddAllToPlaylistButton', 'showGlobalPlaylistNavButton', 'autoPlay', 'shuffleAudioListItems',
  'forceAutoPlay', 'startWithAutoJumpByDefault'];
const settings = () => call('getSettings', {});

// The refresh messages to the widget, which nothing here answers and the manifest does not promise: spies only answer them.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
  if (buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
    spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, done) => done && done(null, {}));
  }
};

contract.describe('getSettings', () => {
  beforeEach(standIns);

  it('shows every content, behavior and design setting, each of its kind', async () => {
    const { content, design } = await settings();
    SWITCHES.forEach((name) => expect(typeof content[name]).withContext(name).toBe('boolean'));
    expect(MEDIA_ORDERS).toContain(content.sortBy);
    expect(CATEGORY_ORDERS).toContain(content.sortCategoriesBy);
    expect(DELAYS).toContain(content.autoPlayDelay.value);
    expect(content.images).toEqual(jasmine.any(Array));
    expect(['list-1', 'list-2', 'list-3', 'list-4']).toContain(design.listLayout);
    expect(['item-1', 'item-2']).toContain(design.itemLayout);
    expect(typeof design.skipMediaPage).toBe('boolean');
    expect(typeof design.backgroundImage).toBe('string');
  });

  it('changes nothing by reading', async () => {
    const first = await settings();
    expect(await settings()).toEqual(first);
  });
});

// controlBackground and headlessSdk: this block runs in the control frame, where the settings can be saved.
contract.describe('updateSettings', () => {
  beforeEach(standIns);

  it('changes only the settings it is given, and returns them all', async () => {
    await call('updateSettings', { allowSharing: true, allowFavorites: true });
    const saved = await call('updateSettings', { allowSharing: false });
    expect(saved).toEqual(jasmine.objectContaining({ content: jasmine.objectContaining({ allowShare: false, allowFavorites: true }), design: jasmine.any(Object) }));
    expect((await settings()).content).toEqual(jasmine.objectContaining({ allowShare: false, allowFavorites: true }));
  });

  it('changes the orders and the delay to one of the offered choices', async () => {
    await call('updateSettings', { mediaSortOrder: 'Media Title A-Z', categorySortOrder: 'Category Title Z-A', autoplayDelay: 2 });
    expect((await settings()).content).toEqual(jasmine.objectContaining({
      sortBy: 'Media Title A-Z', sortCategoriesBy: 'Category Title Z-A', autoPlayDelay: jasmine.objectContaining({ value: 2 })
    }));
  });

  it('changes each switch', async () => {
    await call('updateSettings', { allowNotes: false, showMediaSource: false, allowOfflineAccess: true, showViewCount: true, highlightPlayedItems: true, bypassInfoPage: true });
    const { content, design } = await settings();
    expect(content).toEqual(jasmine.objectContaining({ allowAddingNotes: false, allowSource: false, allowOfflineDownload: true, showViewCount: true, indicatePlayedItems: true }));
    expect(design.skipMediaPage).toBe(true);
    await call('updateSettings', { allowNotes: true, bypassInfoPage: false });
    expect((await settings()).content.allowAddingNotes).toBe(true);
    expect((await settings()).design.skipMediaPage).toBe(false);
  });

  it('replaces the carousel, takes a single slide as a list of one, and empties it', async () => {
    const slides = [
      { title: 'First slide', iconUrl: 'https://example.com/one.png', action: 'noAction' },
      { title: 'Second slide', iconUrl: 'https://example.com/two.png', action: 'linkToWeb', url: 'https://example.com' }
    ];
    await call('updateSettings', { carouselImages: slides });
    expect((await settings()).content.images).toEqual(slides);
    await call('updateSettings', { carouselImages: slides[1] });
    expect((await settings()).content.images).toEqual([slides[1]]);
    await call('updateSettings', { carouselImages: [] });
    expect((await settings()).content.images).toEqual([]);
    await call('updateSettings', { carouselImages: slides });
    await call('updateSettings', { carouselImages: null });
    expect((await settings()).content.images).toEqual([]);
  });

  it('sets the text above the list, and clears it with null or an empty text', async () => {
    await call('updateSettings', { description: '<p>Welcome</p>' });
    expect((await settings()).content.descriptionHTML).toBe('<p>Welcome</p>');
    await call('updateSettings', { description: '' });
    expect((await settings()).content.descriptionHTML).toBe('');
    await call('updateSettings', { description: '<p>Again</p>' });
    await call('updateSettings', { description: null });
    expect((await settings()).content.descriptionHTML).toBeNull();
  });

  it('keeps shuffle on only with continuous playback', async () => {
    await call('updateSettings', { autoAddAudioToPlaylist: false, continuousPlayback: true, shuffleList: true });
    expect((await settings()).content).toEqual(jasmine.objectContaining({ autoPlay: true, shuffleAudioListItems: true }));
    await call('updateSettings', { continuousPlayback: false });
    expect((await settings()).content).toEqual(jasmine.objectContaining({ autoPlay: false, shuffleAudioListItems: false }));
  });

  it('turns continuous playback, shuffle and the global playlist off while every audio item is added to the playlist', async () => {
    await call('updateSettings', { autoAddAudioToPlaylist: false, continuousPlayback: true, shuffleList: true, useGlobalPlaylist: true });
    await call('updateSettings', { autoAddAudioToPlaylist: true, resumePlayback: true });
    expect((await settings()).content).toEqual(jasmine.objectContaining({
      forceAutoPlay: true, autoPlay: false, shuffleAudioListItems: false, globalPlaylist: false, startWithAutoJumpByDefault: true
    }));
    await call('updateSettings', { autoAddAudioToPlaylist: false });
    expect((await settings()).content).toEqual(jasmine.objectContaining({ forceAutoPlay: false, startWithAutoJumpByDefault: false }));
  });

  describe('refuses, and saves nothing', () => {
    beforeEach(async () => {
      await call('updateSettings', { mediaSortOrder: 'Newest', allowSharing: true, autoplayDelay: 0 });
    });

    it('an order it does not offer', async () => {
      expect(await refusal(call('updateSettings', { mediaSortOrder: 'Random' }))).toEqual(refused('validation', 'mediaSortOrder'));
      expect(await refusal(call('updateSettings', { categorySortOrder: 'Random' }))).toEqual(refused('validation', 'categorySortOrder'));
      expect((await settings()).content.sortBy).toBe('Newest');
    });

    it('a delay it does not offer', async () => {
      expect(await refusal(call('updateSettings', { autoplayDelay: 4 }))).toEqual(refused('validation', 'autoplayDelay'));
      expect((await settings()).content.autoPlayDelay.value).toBe(0);
    });

    it('a switch that is not on or off', async () => {
      expect(await refusal(call('updateSettings', { allowSharing: 'no', mediaSortOrder: 'Oldest' }))).toEqual(refused('validation', 'allowSharing'));
      expect((await settings()).content).toEqual(jasmine.objectContaining({ allowShare: true, sortBy: 'Newest' }));
    });

    it('a slide that is not an action item', async () => {
      expect(await refusal(call('updateSettings', { carouselImages: [{ title: 'No action' }] }))).toEqual(refused('validation', 'carouselImages'));
    });

    it('a text above the list that is not text', async () => {
      expect(await refusal(call('updateSettings', { description: 12 }))).toEqual(refused('validation', 'description'));
    });

    it('a call with no setting in it', async () => {
      expect((await refusal(call('updateSettings', {}))).code).toBe('validation');
    });
  });
});

// controlBackground and headlessSdk: this block runs in the control frame.
contract.describe('updateDesign', () => {
  beforeEach(standIns);

  it('changes only the layouts it is given, and returns the settings', async () => {
    await call('updateDesign', { listLayout: 'list-1', itemLayout: 'item-1' });
    expect(await call('updateDesign', { listLayout: 'list-3' })).toEqual(jasmine.objectContaining({
      design: jasmine.objectContaining({ listLayout: 'list-3', itemLayout: 'item-1' }), content: jasmine.any(Object)
    }));
    expect((await settings()).design).toEqual(jasmine.objectContaining({ listLayout: 'list-3', itemLayout: 'item-1' }));
  });

  it('sets the background picture, takes a single one sent without a list, and removes it', async () => {
    await call('updateDesign', { backgroundImage: ['https://example.com/background.png'] });
    expect((await settings()).design.backgroundImage).toBe('https://example.com/background.png');
    await call('updateDesign', { backgroundImage: 'https://example.com/single.png' });
    expect((await settings()).design.backgroundImage).toBe('https://example.com/single.png');
    await call('updateDesign', { backgroundImage: [] });
    expect((await settings()).design.backgroundImage).toBe('');
    await call('updateDesign', { backgroundImage: ['https://example.com/again.png'] });
    await call('updateDesign', { backgroundImage: null });
    expect((await settings()).design.backgroundImage).toBe('');
  });

  describe('refuses, and saves nothing', () => {
    beforeEach(async () => {
      await call('updateDesign', { listLayout: 'list-2', backgroundImage: ['https://example.com/kept.png'] });
    });

    it('a layout it does not offer', async () => {
      expect(await refusal(call('updateDesign', { listLayout: 'list-9' }))).toEqual(refused('validation', 'listLayout'));
      expect(await refusal(call('updateDesign', { itemLayout: 'item-9' }))).toEqual(refused('validation', 'itemLayout'));
      expect((await settings()).design.listLayout).toBe('list-2');
    });

    it('more than one background picture', async () => {
      const backgroundImage = ['https://example.com/a.png', 'https://example.com/b.png'];
      expect(await refusal(call('updateDesign', { backgroundImage }))).toEqual(refused('validation', 'backgroundImage'));
      expect((await settings()).design.backgroundImage).toBe('https://example.com/kept.png');
    });

    it('a call with nothing to change', async () => {
      expect((await refusal(call('updateDesign', {}))).code).toBe('validation');
    });
  });
});
