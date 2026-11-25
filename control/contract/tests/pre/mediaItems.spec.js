// mediaItems: every operation on media items, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const mediaItem = (fields) => jasmine.objectContaining(Object.assign({ id: jasmine.any(String) }, fields || {}));
const batch = (count) => jasmine.objectContaining({ succeeded: count, failed: 0 });

// Calls nothing here answers, which the operations start without waiting for: spies stand in for them.
const standIns = () => {
  const answer = (object, method) => {
    if (object && typeof object[method] === 'function') {
      spyOn(object, method).and.callFake((...args) => {
        const done = args.find((arg) => typeof arg === 'function');
        if (done) done(null, {});
      });
    }
  };
  answer(buildfire.messaging, 'sendMessageToWidget');
  answer(buildfire.deeplink, 'registerDeeplink');
  answer(buildfire.deeplink, 'unregisterDeeplink');
  answer(buildfire.analytics, 'bulkRegisterEvents');
  answer(buildfire.analytics, 'bulkUnregisterEvents');
  answer(buildfire.services.contract.events, 'send');
};

// Only the control panel adds media items and categories, and its run comes first: it makes these once, and the app's run
// finds them.
const forTheApp = {
  category: 'Pre media category for the app',
  subcategory: 'Pre media subcategory for the app',
  item: 'Pre media for the app'
};
let madeForTheApp;
const makeForTheApp = async () => {
  await call('createCategory', { name: forTheApp.category });
  await call('createSubcategory', { categoryName: forTheApp.category, name: forTheApp.subcategory });
  const item = await call('createMediaItem', { title: forTheApp.item, summary: 'Made for the app', mediaDate: '2026-01-15' });
  await call('updateMediaItemCategory', { title: forTheApp.item, categoryName: forTheApp.category, subcategoryName: forTheApp.subcategory, included: true });
  return item;
};
const mediaForTheApp = () => {
  madeForTheApp = madeForTheApp || (contract.host === 'control' ? makeForTheApp() : call('getMediaItem', { title: forTheApp.item }));
  return madeForTheApp;
};
// A category with one subcategory, for the control's own calls.
const makeCategory = async (name) => {
  const category = await call('createCategory', { name });
  const subcategory = await call('createSubcategory', { categoryName: name, name: `${name} sub` });
  return { id: category.id, subcategoryName: `${name} sub`, subcategoryId: subcategory.id };
};

contract.describe('searchMediaItems', () => {
  beforeEach(standIns);

  it('finds a media item by its title', async () => {
    await mediaForTheApp();
    const { mediaItems } = await call('searchMediaItems', { title: forTheApp.item });
    expect(mediaItems).toEqual(jasmine.arrayContaining([mediaItem({ title: forTheApp.item })]));
  });

  it('finds a media item by its title, category and subcategory, a page at a time', async () => {
    await mediaForTheApp();
    const result = await call('searchMediaItems', { title: forTheApp.item, categoryName: forTheApp.category, subcategoryName: forTheApp.subcategory, page: 0, pageSize: 10 });
    expect(result).toEqual(jasmine.objectContaining({ total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.mediaItems).toEqual(jasmine.arrayContaining([mediaItem({ title: forTheApp.item })]));
  });
});

contract.describe('getMediaItem', () => {
  beforeEach(standIns);

  it('shows a media item by its title', async () => {
    await mediaForTheApp();
    expect(await call('getMediaItem', { title: forTheApp.item })).toEqual(mediaItem({ title: forTheApp.item, summary: 'Made for the app' }));
  });
});

contract.describe('getMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('shows a media item by its id', async () => {
    const { id } = await mediaForTheApp();
    expect(await call('getMediaItemAdvanced', { mediaItemId: id })).toEqual(mediaItem({ id, title: forTheApp.item }));
  });
});

contract.describe('createMediaItem', () => {
  beforeEach(standIns);

  it('adds a media item from its title', async () => {
    const title = `Pre media item (${contract.host})`;
    expect(await call('createMediaItem', { title })).toEqual(mediaItem({ title }));
  });

  it('adds a media item with every detail', async () => {
    const title = `Pre full media item (${contract.host})`;
    expect(await call('createMediaItem', {
      title,
      summary: 'A short summary',
      body: '<p>The body</p>',
      sourceUrl: 'https://example.com/source',
      videoUrl: 'https://example.com/video.mp4',
      audioTitle: 'The song',
      artists: 'The band',
      audioUrl: 'https://example.com/song.mp3',
      thumbnailImage: ['https://example.com/pre-thumb.png'],
      audioImage: ['https://example.com/pre-audio.png'],
      audioBackgroundImage: ['https://example.com/pre-background.png'],
      mediaDate: '2026-01-15',
      actionLinks: [{ title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' }]
    })).toEqual(mediaItem({ title, summary: 'A short summary' }));
  });
});

contract.describe('createMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('adds several media items at once', async () => {
    const mediaItems = [{ title: `Pre batch media one (${contract.host})` }, { title: `Pre batch media two (${contract.host})`, summary: 'Second', mediaDate: '2026-01-15' }];
    expect(await call('createMediaItemsAdvanced', { mediaItems })).toEqual(batch(2));
  });
});

contract.describe('updateMediaItem', () => {
  beforeEach(standIns);

  it("changes a media item's summary, naming it by its title", async () => {
    const title = `Pre media item to update (${contract.host})`;
    await call('createMediaItem', { title, summary: 'Before' });
    expect(await call('updateMediaItem', { title, newSummary: 'After' })).toEqual(mediaItem({ title, summary: 'After' }));
  });

  it('changes every detail of a media item', async () => {
    const title = `Pre media item to change fully (${contract.host})`;
    await call('createMediaItem', { title, summary: 'Before', thumbnailImage: ['https://example.com/pre-old.png'] });
    expect(await call('updateMediaItem', {
      title,
      newTitle: `Pre media item changed fully (${contract.host})`,
      newSummary: null,
      newBody: '<p>New body</p>',
      newSourceUrl: 'https://example.com/new-source',
      newVideoUrl: 'https://example.com/new-video.mp4',
      newAudioTitle: 'New song',
      newArtists: 'New band',
      newAudioUrl: 'https://example.com/new-song.mp3',
      newThumbnailImage: [],
      newAudioImage: ['https://example.com/pre-new-audio.png'],
      newAudioBackgroundImage: ['https://example.com/pre-new-background.png'],
      newMediaDate: '2026-02-01',
      newActionLinks: [{ title: 'Call us', action: 'callNumber', phoneNumber: '+15550100' }],
      resetViews: false
    })).toEqual(mediaItem({ title: `Pre media item changed fully (${contract.host})` }));
  });
});

contract.describe('updateMediaItemAdvanced', () => {
  beforeEach(standIns);

  it("changes a media item's summary, naming it by its id", async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to update by id (${contract.host})`, summary: 'Before' });
    expect(await call('updateMediaItemAdvanced', { mediaItemId: id, newSummary: 'After' })).toEqual(mediaItem({ id, summary: 'After' }));
  });

  it('changes several details of a media item by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to change by id (${contract.host})` });
    expect(await call('updateMediaItemAdvanced', {
      mediaItemId: id,
      newTitle: `Pre media item changed by id (${contract.host})`,
      newArtists: 'New band',
      newMediaDate: '2026-02-01',
      resetViews: true
    })).toEqual(mediaItem({ id }));
  });
});

contract.describe('updateMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('changes several media items at once', async () => {
    const one = await call('createMediaItem', { title: `Pre batch media to update one (${contract.host})` });
    const two = await call('createMediaItem', { title: `Pre batch media to update two (${contract.host})` });
    expect(await call('updateMediaItemsAdvanced', { mediaItems: [
      { mediaItemId: one.id, newSummary: 'Batch one' },
      { mediaItemId: two.id, newArtists: 'Batch band', newThumbnailImage: ['https://example.com/pre-batch.png'] }
    ] })).toEqual(batch(2));
  });
});

contract.describe('deleteMediaItem', () => {
  beforeEach(standIns);

  it('removes a media item by its title', async () => {
    const title = `Pre media item to delete (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('deleteMediaItem', { title })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('removes a media item by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to delete by id (${contract.host})` });
    expect(await call('deleteMediaItemAdvanced', { mediaItemId: id })).toEqual(jasmine.objectContaining({ id, deleted: true }));
  });
});

contract.describe('deleteMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('removes several media items at once', async () => {
    const one = await call('createMediaItem', { title: `Pre batch media to delete one (${contract.host})` });
    const two = await call('createMediaItem', { title: `Pre batch media to delete two (${contract.host})` });
    expect(await call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: one.id }, { mediaItemId: two.id }] })).toEqual(batch(2));
  });
});

contract.describe('updateMediaItemOrder', () => {
  beforeEach(standIns);

  it('moves a media item to the first place, naming it by its title', async () => {
    const title = `Pre media item to move (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemOrder', { title, position: 1 })).toEqual(mediaItem({ title, rank: 1 }));
  }, 120000);
});

contract.describe('updateMediaItemOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves a media item to the first place, naming it by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to move by id (${contract.host})` });
    expect(await call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 1 })).toEqual(mediaItem({ id, rank: 1 }));
  }, 120000);
});

contract.describe('updateMediaItemCategory', () => {
  beforeEach(standIns);

  it('puts a media item in a category', async () => {
    const title = `Pre media item in a category (${contract.host})`;
    const name = `Pre category for an item (${contract.host})`;
    const category = await makeCategory(name);
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemCategory', { title, categoryName: name, included: true })).toEqual(mediaItem({ title, categoryIds: [category.id] }));
  });

  it('puts a media item in a subcategory', async () => {
    const title = `Pre media item in a subcategory (${contract.host})`;
    const name = `Pre category for a subcategory item (${contract.host})`;
    const category = await makeCategory(name);
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemCategory', { title, categoryName: name, subcategoryName: category.subcategoryName, included: true }))
      .toEqual(mediaItem({ title, subcategoryIds: [category.subcategoryId] }));
  });
});

contract.describe('updateMediaItemCategoryAdvanced', () => {
  beforeEach(standIns);

  it('puts a media item in a category, by their ids', async () => {
    const category = await makeCategory(`Pre category for an item by id (${contract.host})`);
    const { id } = await call('createMediaItem', { title: `Pre media item in a category by id (${contract.host})` });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, included: true })).toEqual(mediaItem({ id, categoryIds: [category.id] }));
  });

  it('puts a media item in a subcategory, by their ids', async () => {
    const category = await makeCategory(`Pre category for a subcategory item by id (${contract.host})`);
    const { id } = await call('createMediaItem', { title: `Pre media item in a subcategory by id (${contract.host})` });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, subcategoryId: category.subcategoryId, included: true }))
      .toEqual(mediaItem({ id, subcategoryIds: [category.subcategoryId] }));
  });
});

contract.describe('updateMediaItemsCategoryAdvanced', () => {
  beforeEach(standIns);

  it('puts several media items in categories at once', async () => {
    const category = await makeCategory(`Pre category for batch items (${contract.host})`);
    const one = await call('createMediaItem', { title: `Pre batch media in a category one (${contract.host})` });
    const two = await call('createMediaItem', { title: `Pre batch media in a category two (${contract.host})` });
    expect(await call('updateMediaItemsCategoryAdvanced', { mediaItems: [
      { mediaItemId: one.id, categoryId: category.id, included: true },
      { mediaItemId: two.id, categoryId: category.id, subcategoryId: category.subcategoryId, included: true }
    ] })).toEqual(batch(2));
  });
});
