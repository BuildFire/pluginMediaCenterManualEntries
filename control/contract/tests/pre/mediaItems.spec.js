// mediaItems: every operation on media items, their order and their categories, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const host = contract.host;
const action = { title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' };
const holding = (title) => jasmine.arrayContaining([jasmine.objectContaining({ title })]);
// Calls nothing here answers: the plugin's own bookkeeping and the contract events. The spies only answer.
const standIns = () => {
  [[buildfire.messaging, 'sendMessageToWidget'], [buildfire.analytics, 'bulkRegisterEvents'], [buildfire.analytics, 'bulkUnregisterEvents'],
    [buildfire.deeplink, 'registerDeeplink'], [buildfire.deeplink, 'unregisterDeeplink']].forEach(([target, method]) => {
    if (target && typeof target[method] === 'function') {
      spyOn(target, method).and.callFake((...args) => {
        const done = args.find((arg) => typeof arg === 'function');
        if (done) done(null, {});
      });
    }
  });
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, done) => done && done(null, []));
};
const created = (title) => jasmine.objectContaining({ id: jasmine.any(String), title });
// Only the control panel makes media items and categories, and its run comes first: it makes these once, and the app's run finds them.
const appTitle = 'Pre media for the app';
const appCategory = 'Pre media category for the app';
const appSubcategory = 'Pre media subcategory for the app';
let madeForTheApp;
const forTheApp = () => {
  madeForTheApp = madeForTheApp || (host === 'control'
    ? (async () => {
      standIns();
      await call('createCategory', { name: appCategory });
      await call('createSubcategory', { categoryName: appCategory, name: appSubcategory });
      await call('createMediaItem', { title: appTitle, summary: 'Made for the app' });
      return call('updateMediaItemCategory', { title: appTitle, categoryName: appCategory, subcategoryName: appSubcategory, included: true });
    })()
    : call('getMediaItem', { title: appTitle }));
  return madeForTheApp;
};
// A category with one subcategory, for the category changes of one spec.
const categoryFor = async (name) => {
  await call('createCategory', { name });
  await call('createSubcategory', { categoryName: name, name: `${name} subcategory` });
  return (await call('searchCategories', { name })).categories.find((found) => found.name === name);
};

contract.describe('searchMediaItems', () => {
  it('finds an item by its title', async () => {
    await forTheApp();
    expect(await call('searchMediaItems', { title: appTitle })).toEqual(jasmine.objectContaining({ mediaItems: holding(appTitle), total: jasmine.any(Number) }));
  });

  it('finds an item by its title, category and subcategory, a page at a time', async () => {
    await forTheApp();
    expect(await call('searchMediaItems', { title: appTitle, categoryName: appCategory, subcategoryName: appSubcategory, page: 0, pageSize: 10 }))
      .toEqual(jasmine.objectContaining({ mediaItems: holding(appTitle), page: 0, hasMore: jasmine.any(Boolean) }));
  });
});

contract.describe('getMediaItem', () => {
  it('finds an item by its title', async () => {
    await forTheApp();
    expect(await call('getMediaItem', { title: appTitle })).toEqual(created(appTitle));
  });
});

contract.describe('getMediaItemAdvanced', () => {
  it('finds an item by its id', async () => {
    const { id } = await forTheApp();
    expect(await call('getMediaItemAdvanced', { mediaItemId: id })).toEqual(jasmine.objectContaining({ id, title: appTitle }));
  });
});

contract.describe('createMediaItem', () => {
  beforeEach(standIns);

  it('adds an item from its title', async () => {
    const title = `Pre media item (${host})`;
    expect(await call('createMediaItem', { title })).toEqual(created(title));
  });

  it('adds an item with every detail', async () => {
    const title = `Pre full media item (${host})`;
    expect(await call('createMediaItem', {
      title,
      summary: 'Pre summary',
      body: '<p>Pre body</p>',
      sourceUrl: 'https://example.com/pre-source',
      videoUrl: 'https://example.com/pre-video.mp4',
      audioTitle: 'Pre audio title',
      artists: 'Pre artists',
      audioUrl: 'https://example.com/pre-audio.mp3',
      thumbnailImage: ['https://example.com/pre-thumb.png'],
      audioImage: ['https://example.com/pre-audio.png'],
      audioBackgroundImage: ['https://example.com/pre-background.png'],
      mediaDate: '2026-01-15',
      actionLinks: [action]
    })).toEqual(created(title));
  });
});

contract.describe('createMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('adds several items at once', async () => {
    const mediaItems = [{ title: `Pre batch media one (${host})` }, { title: `Pre batch media two (${host})`, audioUrl: 'https://example.com/pre-batch.mp3', mediaDate: '2026-01-15' }];
    expect(await call('createMediaItemsAdvanced', { mediaItems })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateMediaItem', () => {
  beforeEach(standIns);

  it("changes an item's summary, naming the item by its title", async () => {
    const title = `Pre media item to update (${host})`;
    await call('createMediaItem', { title, summary: 'Before' });
    expect(await call('updateMediaItem', { title, newSummary: 'Updated before the next contract' })).toEqual(created(title));
  });

  it('changes every detail of an item', async () => {
    const title = `Pre media item to change fully (${host})`;
    const newTitle = `Pre media item changed fully (${host})`;
    await call('createMediaItem', { title, summary: 'Before', thumbnailImage: ['https://example.com/pre-old.png'] });
    expect(await call('updateMediaItem', {
      title,
      newTitle,
      newSummary: null,
      newBody: '<p>Pre new body</p>',
      newSourceUrl: '',
      newVideoUrl: 'https://example.com/pre-new-video.mp4',
      newAudioTitle: 'Pre new audio title',
      newArtists: 'Pre new artists',
      newAudioUrl: 'https://example.com/pre-new-audio.mp3',
      newThumbnailImage: [],
      newAudioImage: ['https://example.com/pre-new-audio.png'],
      newAudioBackgroundImage: null,
      newMediaDate: '2026-02-01',
      newActionLinks: [action],
      resetViews: false
    })).toEqual(created(newTitle));
  });
});

contract.describe('updateMediaItemAdvanced', () => {
  beforeEach(standIns);

  it("changes an item's summary, naming the item by its id", async () => {
    const title = `Pre media item to update by id (${host})`;
    const { id } = await call('createMediaItem', { title });
    expect(await call('updateMediaItemAdvanced', { mediaItemId: id, newSummary: 'Updated by id' })).toEqual(jasmine.objectContaining({ id }));
  });

  it('changes every detail of an item, by its id', async () => {
    const title = `Pre media item to change by id (${host})`;
    const { id } = await call('createMediaItem', { title });
    expect(await call('updateMediaItemAdvanced', {
      mediaItemId: id,
      newTitle: `Pre media item changed by id (${host})`,
      newSummary: 'Pre summary by id',
      newBody: null,
      newSourceUrl: 'https://example.com/pre-source-by-id',
      newVideoUrl: null,
      newAudioTitle: '',
      newArtists: null,
      newAudioUrl: 'https://example.com/pre-audio-by-id.mp3',
      newThumbnailImage: ['https://example.com/pre-thumb-by-id.png'],
      newAudioImage: [],
      newAudioBackgroundImage: ['https://example.com/pre-background-by-id.png'],
      newMediaDate: '2026-03-01',
      newActionLinks: [],
      resetViews: true
    })).toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('updateMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('changes several items at once', async () => {
    const first = await call('createMediaItem', { title: `Pre batch media to update one (${host})` });
    const second = await call('createMediaItem', { title: `Pre batch media to update two (${host})` });
    expect(await call('updateMediaItemsAdvanced', { mediaItems: [
      { mediaItemId: first.id, newSummary: 'Pre batch summary' },
      { mediaItemId: second.id, newArtists: 'Pre batch artists', newMediaDate: '2026-01-20', resetViews: false }
    ] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('deleteMediaItem', () => {
  beforeEach(standIns);

  it('deletes an item by its title', async () => {
    const title = `Pre media item to delete (${host})`;
    await call('createMediaItem', { title });
    expect(await call('deleteMediaItem', { title })).toEqual(jasmine.objectContaining({ deleted: true }));
  });
});

contract.describe('deleteMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('deletes an item by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to delete by id (${host})` });
    expect(await call('deleteMediaItemAdvanced', { mediaItemId: id })).toEqual(jasmine.objectContaining({ id, deleted: true }));
  });
});

contract.describe('deleteMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('deletes several items at once', async () => {
    const first = await call('createMediaItem', { title: `Pre batch media to delete one (${host})` });
    const second = await call('createMediaItem', { title: `Pre batch media to delete two (${host})` });
    expect(await call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: first.id }, { mediaItemId: second.id }] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateMediaItemOrder', () => {
  beforeEach(standIns);

  it('moves an item to the first place, naming it by its title', async () => {
    const title = `Pre media item to move (${host})`;
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemOrder', { title, position: 1 })).toEqual(created(title));
  }, 120000);
});

contract.describe('updateMediaItemOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves an item to the first place, naming it by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to move by id (${host})` });
    expect(await call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 1 })).toEqual(jasmine.objectContaining({ id }));
  }, 120000);
});

contract.describe('updateMediaItemCategory', () => {
  beforeEach(standIns);

  it('puts an item in a category', async () => {
    const name = `Pre category for an item (${host})`;
    const title = `Pre media item in a category (${host})`;
    await call('createCategory', { name });
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemCategory', { title, categoryName: name, included: true })).toEqual(created(title));
  });

  it('puts an item in a subcategory', async () => {
    const name = `Pre category for a subcategory item (${host})`;
    const title = `Pre media item in a subcategory (${host})`;
    await categoryFor(name);
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemCategory', { title, categoryName: name, subcategoryName: `${name} subcategory`, included: true })).toEqual(created(title));
  });
});

contract.describe('updateMediaItemCategoryAdvanced', () => {
  beforeEach(standIns);

  it('puts an item in a category, by their ids', async () => {
    const category = await categoryFor(`Pre category by id (${host})`);
    const { id } = await call('createMediaItem', { title: `Pre media item in a category by id (${host})` });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, included: true })).toEqual(jasmine.objectContaining({ id }));
  });

  it('puts an item in a subcategory, by their ids', async () => {
    const category = await categoryFor(`Pre category for an item subcategory by id (${host})`);
    const { id } = await call('createMediaItem', { title: `Pre media item in a subcategory by id (${host})` });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, subcategoryId: category.subcategories[0].id, included: true }))
      .toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('updateMediaItemsCategoryAdvanced', () => {
  beforeEach(standIns);

  it('puts several items in categories at once', async () => {
    const category = await categoryFor(`Pre category for a batch (${host})`);
    const first = await call('createMediaItem', { title: `Pre batch media in a category one (${host})` });
    const second = await call('createMediaItem', { title: `Pre batch media in a category two (${host})` });
    expect(await call('updateMediaItemsCategoryAdvanced', { mediaItems: [
      { mediaItemId: first.id, categoryId: category.id, included: true },
      { mediaItemId: second.id, categoryId: category.id, subcategoryId: category.subcategories[0].id, included: true }
    ] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});
