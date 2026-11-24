// mediaItems: every operation on media items, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

// Calls the contract makes that nothing here answers (the widget refresh message, deep links, analytics counters, the
// contract events): each is stood in for where the frame has it.
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
  standIn(buildfire.deeplink, 'unregisterDeeplink');
  standIn(buildfire.analytics, 'bulkRegisterEvents');
  standIn(buildfire.analytics, 'bulkUnregisterEvents');
  standIn(buildfire.services.contract.events, 'send');
};
const mediaItem = jasmine.objectContaining({ id: jasmine.any(String), title: jasmine.any(String) });
const batchResult = (count) => jasmine.objectContaining({ mediaItems: jasmine.any(Array), succeeded: count, failed: 0 });

// Only the control panel adds media items and categories, and its run comes first: it makes these once, and the app's run finds them.
const forTheApp = 'Pre media item for the app';
const categoryForTheApp = 'Pre media category for the app';
const subcategoryForTheApp = 'Pre media subcategory for the app';
let madeForTheApp;
const itemForTheApp = () => {
  madeForTheApp = madeForTheApp || (contract.host === 'control'
    ? (async () => {
      const item = await call('createMediaItem', { title: forTheApp, summary: 'Made by the control run' });
      await call('createCategory', { name: categoryForTheApp });
      await call('createSubcategory', { categoryName: categoryForTheApp, name: subcategoryForTheApp });
      await call('updateMediaItemCategory', { title: forTheApp, categoryName: categoryForTheApp, subcategoryName: subcategoryForTheApp, included: true });
      return item;
    })()
    : call('searchMediaItems', { title: forTheApp }).then(({ mediaItems }) => mediaItems.find((item) => item.title === forTheApp)
      || Promise.reject(new Error(`no media item titled "${forTheApp}": the control run makes it`))));
  return madeForTheApp;
};

contract.describe('searchMediaItems', () => {
  beforeEach(standInForSideEffects);

  it('finds media items by part of their title', async () => {
    const item = await itemForTheApp();
    expect(await call('searchMediaItems', { title: 'media item for the app' })).toEqual(jasmine.objectContaining({
      mediaItems: jasmine.arrayContaining([jasmine.objectContaining({ id: item.id, title: forTheApp })])
    }));
  });

  it('finds media items in a category and subcategory, a page at a time', async () => {
    const item = await itemForTheApp();
    expect(await call('searchMediaItems', { title: forTheApp, categoryName: categoryForTheApp, subcategoryName: subcategoryForTheApp, page: 0, pageSize: 10 }))
      .toEqual(jasmine.objectContaining({ mediaItems: jasmine.arrayContaining([jasmine.objectContaining({ id: item.id })]), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
  });
});

contract.describe('getMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('finds a media item by its title', async () => {
    const item = await itemForTheApp();
    expect(await call('getMediaItem', { title: forTheApp })).toEqual(jasmine.objectContaining({ id: item.id, title: forTheApp }));
  });
});

contract.describe('getMediaItemAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('finds a media item by its id', async () => {
    const item = await itemForTheApp();
    expect(await call('getMediaItemAdvanced', { mediaItemId: item.id })).toEqual(jasmine.objectContaining({ id: item.id, title: forTheApp }));
  });
});

contract.describe('createMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('adds a media item from its title', async () => {
    const title = `Pre media item (${contract.host})`;
    expect(await call('createMediaItem', { title })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title }));
  });

  it('adds a media item with every detail', async () => {
    const title = `Pre full media item (${contract.host})`;
    expect(await call('createMediaItem', {
      title,
      summary: 'A short summary',
      body: '<p>The item content</p>',
      sourceUrl: 'https://example.com/pre-source',
      videoUrl: 'https://example.com/pre-video.mp4',
      audioTitle: 'Pre episode',
      artists: 'Pre artists',
      audioUrl: 'https://example.com/pre-audio.mp3',
      thumbnailImage: ['https://example.com/pre-thumbnail.png'],
      audioImage: ['https://example.com/pre-audio.png'],
      audioBackgroundImage: ['https://example.com/pre-background.png'],
      mediaDate: '2026-01-15',
      actionLinks: [{ title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' }]
    })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title, summary: 'A short summary' }));
  });
});

contract.describe('createMediaItemsAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds several media items at once', async () => {
    const mediaItems = [{ title: `Pre batch media item one (${contract.host})` }, { title: `Pre batch media item two (${contract.host})`, summary: 'Second', thumbnailImage: ['https://example.com/pre-batch.png'] }];
    expect(await call('createMediaItemsAdvanced', { mediaItems })).toEqual(batchResult(2));
  });
});

contract.describe('updateMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('changes a media item\'s summary, naming it by its title', async () => {
    const title = `Pre media item to update (${contract.host})`;
    await call('createMediaItem', { title, summary: 'Before' });
    expect(await call('updateMediaItem', { title, newSummary: 'Updated before the next contract' })).toEqual(mediaItem);
  });

  it('changes every detail of a media item', async () => {
    const title = `Pre media item to change fully (${contract.host})`;
    await call('createMediaItem', { title, summary: 'Before', audioImage: ['https://example.com/pre-old.png'] });
    expect(await call('updateMediaItem', {
      title,
      newTitle: `Pre media item changed fully (${contract.host})`,
      newSummary: 'New summary',
      newBody: '<p>New content</p>',
      newSourceUrl: 'https://example.com/pre-new-source',
      newVideoUrl: 'https://example.com/pre-new-video.mp4',
      newAudioTitle: 'New episode',
      newArtists: 'New artists',
      newAudioUrl: 'https://example.com/pre-new-audio.mp3',
      newThumbnailImage: ['https://example.com/pre-new-thumbnail.png'],
      newAudioImage: [],
      newAudioBackgroundImage: ['https://example.com/pre-new-background.png'],
      newMediaDate: '2026-02-01',
      newActionLinks: [{ title: 'Email us', action: 'sendEmail', email: 'team@example.com' }],
      resetViews: false
    })).toEqual(mediaItem);
  });
});

contract.describe('updateMediaItemAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes a media item, naming it by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to update by id (${contract.host})`, artists: 'Before' });
    expect(await call('updateMediaItemAdvanced', { mediaItemId: id, newArtists: null, newSummary: 'Updated by id' })).toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('updateMediaItemsAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes several media items at once', async () => {
    const one = await call('createMediaItem', { title: `Pre batch media item to update one (${contract.host})` });
    const two = await call('createMediaItem', { title: `Pre batch media item to update two (${contract.host})`, summary: 'Before' });
    expect(await call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: one.id, newSummary: 'Batch one' }, { mediaItemId: two.id, newSummary: null }] }))
      .toEqual(batchResult(2));
  });
});

contract.describe('deleteMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('removes a media item, naming it by its title', async () => {
    const title = `Pre media item to delete (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('deleteMediaItem', { title })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteMediaItemAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes a media item, naming it by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to delete by id (${contract.host})` });
    expect(await call('deleteMediaItemAdvanced', { mediaItemId: id })).toEqual(jasmine.objectContaining({ id, deleted: true }));
  });
});

contract.describe('deleteMediaItemsAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes several media items at once', async () => {
    const one = await call('createMediaItem', { title: `Pre batch media item to delete one (${contract.host})` });
    const two = await call('createMediaItem', { title: `Pre batch media item to delete two (${contract.host})` });
    expect(await call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: one.id }, { mediaItemId: two.id }] })).toEqual(batchResult(2));
  });
});

contract.describe('updateMediaItemOrder', () => {
  beforeEach(standInForSideEffects);

  it('moves a media item to the first place, naming it by its title', async () => {
    const title = `Pre media item to move (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemOrder', { title, position: 1 })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title }));
  }, 120000);
});

contract.describe('updateMediaItemOrderAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('moves a media item to the second place, naming it by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to move by id (${contract.host})` });
    expect(await call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 2 })).toEqual(jasmine.objectContaining({ id }));
  }, 120000);
});

contract.describe('updateMediaItemCategory', () => {
  beforeEach(standInForSideEffects);

  it('puts a media item in a category', async () => {
    const title = `Pre media item to categorize (${contract.host})`;
    const categoryName = `Pre category for a media item (${contract.host})`;
    await call('createMediaItem', { title });
    await call('createCategory', { name: categoryName });
    expect(await call('updateMediaItemCategory', { title, categoryName, included: true })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), title }));
  });

  it('puts a media item in a subcategory', async () => {
    const title = `Pre media item to subcategorize (${contract.host})`;
    const categoryName = `Pre category with a subcategory (${contract.host})`;
    await call('createMediaItem', { title });
    await call('createCategory', { name: categoryName });
    await call('createSubcategory', { categoryName, name: 'Pre subcategory' });
    expect(await call('updateMediaItemCategory', { title, categoryName, subcategoryName: 'Pre subcategory', included: true }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), title }));
  });
});

contract.describe('updateMediaItemCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('puts a media item in a category, by their ids', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to categorize by id (${contract.host})` });
    const category = await call('createCategory', { name: `Pre category by id for a media item (${contract.host})` });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, included: true })).toEqual(jasmine.objectContaining({ id }));
  });

  it('puts a media item in a subcategory, by their ids', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to subcategorize by id (${contract.host})` });
    const categoryName = `Pre category by id with a subcategory (${contract.host})`;
    await call('createCategory', { name: categoryName });
    const subcategory = await call('createSubcategory', { categoryName, name: 'Pre subcategory by id' });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: subcategory.category.id, subcategoryId: subcategory.id, included: true }))
      .toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('updateMediaItemsCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('puts several media items in a category at once', async () => {
    const one = await call('createMediaItem', { title: `Pre batch media item to categorize one (${contract.host})` });
    const two = await call('createMediaItem', { title: `Pre batch media item to categorize two (${contract.host})` });
    const categoryName = `Pre category for a batch (${contract.host})`;
    await call('createCategory', { name: categoryName });
    const subcategory = await call('createSubcategory', { categoryName, name: 'Pre batch subcategory' });
    expect(await call('updateMediaItemsCategoryAdvanced', { mediaItems: [
      { mediaItemId: one.id, categoryId: subcategory.category.id, included: true },
      { mediaItemId: two.id, categoryId: subcategory.category.id, subcategoryId: subcategory.id, included: true }
    ] })).toEqual(batchResult(2));
  });
});
