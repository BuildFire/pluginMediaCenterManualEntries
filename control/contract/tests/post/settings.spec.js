// settings: the plugin's one settings record (content, behavior and design), in the datastore.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const settings = () => call('getSettings', {});
const mediaOrders = ['Manually', 'Media Title A-Z', 'Media Title Z-A', 'Media Date Asc', 'Media Date Desc', 'Newest', 'Oldest', 'Most', 'Least'];
const categoryOrders = ['Manually', 'Category Title A-Z', 'Category Title Z-A', 'Newest', 'Oldest'];
const toggles = ['allowShare', 'allowFavorites', 'allowAddingNotes', 'allowSource', 'allowOfflineDownload', 'enableFiltering', 'showViewCount', 'indicatePlayedItems',
  'globalPlaylist', 'showGlobalAddAllToPlaylistButton', 'showGlobalPlaylistNavButton', 'autoPlay', 'shuffleAudioListItems', 'forceAutoPlay', 'startWithAutoJumpByDefault'];
// Calls nothing here answers. The widget's refresh message and the filter page's deep link are the plugin's own
// bookkeeping, not part of the contract: these spies only answer.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
  if (buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
    spyOn(buildfire.deeplink, 'registerDeeplink').and.callFake((options, done) => done && done(null, { data: options }));
  }
};
// Every setting, each of its kind or among its choices, whatever was saved last.
const wellFormed = ({ content, design }) => {
  toggles.forEach((name) => expect(typeof content[name]).withContext(name).toBe('boolean'));
  expect(mediaOrders).toContain(content.sortBy);
  expect(categoryOrders).toContain(content.sortCategoriesBy);
  expect(content.images).toEqual(jasmine.any(Array));
  expect(content.descriptionHTML === null || typeof content.descriptionHTML === 'string').withContext('descriptionHTML').toBe(true);
  expect(content.autoPlayDelay).toEqual(jasmine.objectContaining({ label: jasmine.any(String), value: jasmine.any(Number) }));
  expect([0, 1, 2, 3, 5]).toContain(content.autoPlayDelay.value);
  expect(['list-1', 'list-2', 'list-3', 'list-4']).toContain(design.listLayout);
  expect(['item-1', 'item-2']).toContain(design.itemLayout);
  expect(typeof design.backgroundImage).toBe('string');
  expect(typeof design.skipMediaPage).toBe('boolean');
};

contract.describe('getSettings', () => {
  beforeEach(standIns);

  // Every control spec that saves the settings runs before the app's, so the app finds whatever was saved last: only the
  // shape and the allowed values are checked there, never the values one spec saved.
  it('shows every setting, each of its kind or among its choices', async () => {
    wellFormed(await settings());
  });

  it('changes nothing by reading', async () => {
    expect(await settings()).toEqual(await settings());
  });

  if (contract.host === 'control') {
    it('shows what was saved last', async () => {
      await call('updateSettings', { allowFavorites: false, categorySortOrder: 'Oldest' });
      await call('updateDesign', { itemLayout: 'item-2' });
      expect(await settings()).toEqual({
        content: jasmine.objectContaining({ allowFavorites: false, sortCategoriesBy: 'Oldest' }),
        design: jasmine.objectContaining({ itemLayout: 'item-2' })
      });
      await call('updateSettings', { allowFavorites: true });
      expect((await settings()).content.allowFavorites).toBe(true);
    });
  }
});

// controlBackground only (with the server): the blocks from here on run in the control frame, where the datastore is writable.
contract.describe('updateSettings', () => {
  beforeEach(standIns);

  it('changes only the settings it is given', async () => {
    await call('updateSettings', { allowSharing: true, allowNotes: true });
    const result = await call('updateSettings', { allowSharing: false });
    wellFormed(result);
    expect(result.content).toEqual(jasmine.objectContaining({ allowShare: false, allowAddingNotes: true }));
    expect((await settings()).content).toEqual(jasmine.objectContaining({ allowShare: false, allowAddingNotes: true }));
  });

  it('changes every setting at once', async () => {
    const result = await call('updateSettings', {
      description: '<p>Welcome</p>',
      carouselImages: [{ title: 'Slide', iconUrl: 'https://example.com/slide.png', action: 'noAction' }],
      mediaSortOrder: 'Media Title A-Z',
      categorySortOrder: 'Category Title Z-A',
      allowSharing: false,
      allowFavorites: false,
      allowNotes: false,
      showMediaSource: false,
      allowOfflineAccess: true,
      enableFiltering: true,
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
      bypassInfoPage: true
    });
    const expected = {
      content: jasmine.objectContaining({
        descriptionHTML: '<p>Welcome</p>',
        images: [jasmine.objectContaining({ title: 'Slide', iconUrl: 'https://example.com/slide.png', action: 'noAction' })],
        sortBy: 'Media Title A-Z',
        sortCategoriesBy: 'Category Title Z-A',
        allowShare: false,
        allowFavorites: false,
        allowAddingNotes: false,
        allowSource: false,
        allowOfflineDownload: true,
        enableFiltering: true,
        showViewCount: true,
        indicatePlayedItems: true,
        globalPlaylist: true,
        showGlobalAddAllToPlaylistButton: true,
        showGlobalPlaylistNavButton: true,
        autoPlay: true,
        autoPlayDelay: jasmine.objectContaining({ label: '3s', value: 3 }),
        shuffleAudioListItems: true,
        forceAutoPlay: false,
        startWithAutoJumpByDefault: false
      }),
      design: jasmine.objectContaining({ skipMediaPage: true })
    };
    expect(result).toEqual(expected);
    expect(await settings()).toEqual(expected);
  });

  it('turns each switch back off, and picks each delay it offers', async () => {
    const result = await call('updateSettings', {
      allowSharing: true, allowOfflineAccess: false, enableFiltering: false, showViewCount: false, highlightPlayedItems: false,
      showAddAllToPlaylistButton: false, showPlaylistButton: false, bypassInfoPage: false, autoplayDelay: 0
    });
    expect(result).toEqual({
      content: jasmine.objectContaining({
        allowShare: true, allowOfflineDownload: false, enableFiltering: false, showViewCount: false, indicatePlayedItems: false,
        showGlobalAddAllToPlaylistButton: false, showGlobalPlaylistNavButton: false, autoPlayDelay: jasmine.objectContaining({ label: 'Off', value: 0 })
      }),
      design: jasmine.objectContaining({ skipMediaPage: false })
    });
    for (const [value, label] of [[1, '1s'], [2, '2s'], [5, '5s']]) {
      expect((await call('updateSettings', { autoplayDelay: value })).content.autoPlayDelay).toEqual(jasmine.objectContaining({ label, value }));
    }
  });

  describe('keeps the settings consistent, as the settings tab does', () => {
    it('auto-adding every audio item turns off continuous playback, shuffle and the global playlist', async () => {
      const result = await call('updateSettings', { autoAddAudioToPlaylist: true, continuousPlayback: true, shuffleList: true, useGlobalPlaylist: true, resumePlayback: true });
      expect(result.content).toEqual(jasmine.objectContaining({ forceAutoPlay: true, autoPlay: false, shuffleAudioListItems: false, globalPlaylist: false, startWithAutoJumpByDefault: true }));
      expect((await settings()).content).toEqual(jasmine.objectContaining({ forceAutoPlay: true, autoPlay: false, shuffleAudioListItems: false, globalPlaylist: false }));
    });

    it('resuming playback only stays on while every audio item is auto-added', async () => {
      const result = await call('updateSettings', { autoAddAudioToPlaylist: false, resumePlayback: true });
      expect(result.content).toEqual(jasmine.objectContaining({ forceAutoPlay: false, startWithAutoJumpByDefault: false }));
    });

    it('shuffle only stays on with continuous playback', async () => {
      await call('updateSettings', { autoAddAudioToPlaylist: false });
      expect((await call('updateSettings', { continuousPlayback: false, shuffleList: true })).content.shuffleAudioListItems).toBe(false);
      expect((await call('updateSettings', { continuousPlayback: true, shuffleList: true })).content).toEqual(jasmine.objectContaining({ autoPlay: true, shuffleAudioListItems: true }));
    });
  });

  it('removes the description with null, and with an empty text', async () => {
    await call('updateSettings', { description: '<p>Something</p>' });
    expect((await call('updateSettings', { description: null })).content.descriptionHTML).toBeNull();
    expect((await settings()).content.descriptionHTML).toBeNull();
    await call('updateSettings', { description: '<p>Something else</p>' });
    expect((await call('updateSettings', { description: '' })).content.descriptionHTML).toBe('');
    expect((await settings()).content.descriptionHTML).toBe('');
  });

  it('replaces the carousel with the images given, and removes them with an empty list and with null', async () => {
    const first = { title: 'First', iconUrl: 'https://example.com/first.png', action: 'noAction' };
    const second = { title: 'Second', iconUrl: 'https://example.com/second.png', action: 'linkToWeb', url: 'https://example.com' };
    await call('updateSettings', { carouselImages: [first] });
    expect((await call('updateSettings', { carouselImages: [second] })).content.images).toEqual([jasmine.objectContaining(second)]);
    expect((await settings()).content.images).toEqual([jasmine.objectContaining(second)]);
    expect((await call('updateSettings', { carouselImages: [] })).content.images).toEqual([]);
    await call('updateSettings', { carouselImages: [first, second] });
    expect((await call('updateSettings', { carouselImages: null })).content.images).toEqual([]);
  });

  it('takes a single carousel image given on its own, as a list holding one', async () => {
    const slide = { title: 'Only slide', iconUrl: 'https://example.com/only.png', action: 'noAction' };
    expect((await call('updateSettings', { carouselImages: slide })).content.images).toEqual([jasmine.objectContaining(slide)]);
    expect((await settings()).content.images).toEqual([jasmine.objectContaining(slide)]);
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      before = await settings();
    });
    const refuses = (what, parameters, named) => it(what, async () => {
      expect(await refusal(call('updateSettings', parameters))).toContain(named);
      expect(await settings()).toEqual(before);
    });

    refuses('a media order it does not offer', { mediaSortOrder: 'Random' }, 'mediaSortOrder');
    refuses('a category order it does not offer', { categorySortOrder: 'Random' }, 'categorySortOrder');
    refuses('an autoplay delay it does not offer', { autoplayDelay: 4 }, 'autoplayDelay');
    refuses('an autoplay delay given as text', { autoplayDelay: '2' }, 'autoplayDelay');
    refuses('a switch that is not true or false', { allowSharing: 'yes' }, 'allowSharing');
    refuses('a bypass choice that is not true or false', { bypassInfoPage: 1 }, 'bypassInfoPage');
    refuses('a description that is not text', { description: 42 }, 'description');
    refuses('carousel images that are not action items', { carouselImages: ['https://example.com/slide.png'] }, 'carouselImages');
    refuses('a carousel image without its action', { carouselImages: [{ title: 'Slide', iconUrl: 'https://example.com/slide.png' }] }, 'carouselImages');
    refuses('a valid change beside an invalid one', { allowSharing: true, mediaSortOrder: 'Random' }, 'mediaSortOrder');

    it('a call with no setting in it', async () => {
      await expectAsync(call('updateSettings', {})).toBeRejected();
      expect(await settings()).toEqual(before);
    });
  });
});

contract.describe('updateDesign', () => {
  beforeEach(standIns);

  it('changes only the layouts it is given', async () => {
    await call('updateDesign', { listLayout: 'list-1', itemLayout: 'item-1' });
    const result = await call('updateDesign', { listLayout: 'list-3' });
    wellFormed(result);
    expect(result.design).toEqual(jasmine.objectContaining({ listLayout: 'list-3', itemLayout: 'item-1' }));
    expect((await settings()).design).toEqual(jasmine.objectContaining({ listLayout: 'list-3', itemLayout: 'item-1' }));
  });

  it('keeps the content settings as they are', async () => {
    await call('updateSettings', { allowNotes: false });
    expect((await call('updateDesign', { listLayout: 'list-4' })).content.allowAddingNotes).toBe(false);
    expect((await settings()).content.allowAddingNotes).toBe(false);
  });

  it('sets the background as one link, and removes it with an empty list and with null', async () => {
    expect((await call('updateDesign', { listLayout: 'list-2', itemLayout: 'item-2', backgroundImage: ['https://example.com/background.png'] })).design)
      .toEqual(jasmine.objectContaining({ listLayout: 'list-2', itemLayout: 'item-2', backgroundImage: 'https://example.com/background.png' }));
    expect((await settings()).design.backgroundImage).toBe('https://example.com/background.png');
    expect((await call('updateDesign', { backgroundImage: [] })).design.backgroundImage).toBe('');
    await call('updateDesign', { backgroundImage: ['https://example.com/background.png'] });
    expect((await call('updateDesign', { backgroundImage: null })).design.backgroundImage).toBe('');
    expect((await settings()).design.backgroundImage).toBe('');
  });

  it('takes a single background given on its own, as a list holding one', async () => {
    expect((await call('updateDesign', { backgroundImage: 'https://example.com/single-background.png' })).design.backgroundImage).toBe('https://example.com/single-background.png');
    expect((await settings()).design.backgroundImage).toBe('https://example.com/single-background.png');
  });

  describe('refuses, and changes nothing', () => {
    let before;
    beforeEach(async () => {
      before = await settings();
    });
    const refuses = (what, parameters, named) => it(what, async () => {
      expect(await refusal(call('updateDesign', parameters))).toContain(named);
      expect(await settings()).toEqual(before);
    });

    refuses('a list layout it does not offer', { listLayout: 'list-9' }, 'listLayout');
    refuses('an item layout it does not offer', { itemLayout: 'item-3' }, 'itemLayout');
    refuses('an icon for a background, where only pictures are offered', { backgroundImage: ['glyphicon glyphicon-star'] }, 'backgroundImage');
    refuses('two backgrounds', { backgroundImage: ['https://example.com/a.png', 'https://example.com/b.png'] }, 'backgroundImage');
    refuses('a valid change beside an invalid one', { listLayout: 'list-1', itemLayout: 'item-3' }, 'itemLayout');

    it('a call with no change in it', async () => {
      await expectAsync(call('updateDesign', {})).toBeRejected();
      expect(await settings()).toEqual(before);
    });
  });
});
