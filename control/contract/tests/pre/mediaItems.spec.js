// mediaItems: every operation on media items, their manual order and their categories, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const action = { title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' };
// Calls nothing here answers. The plugin's own bookkeeping (analytics, deep links, the widget's refresh message) and the
// contract events: these spies only answer.
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
  const events = buildfire.services.contract && buildfire.services.contract.events;
  if (events && typeof events.send === 'function') spyOn(events, 'send').and.callFake((eventName, data, done) => done && done(null, []));
};
const madeItem = (title) => jasmine.objectContaining({ id: jasmine.any(String), title });
const batchShape = (count) => jasmine.objectContaining({ mediaItems: jasmine.any(Array), succeeded: count, failed: 0 });
// A category of this host's own, with one subcategory, for the blocks that file items into categories (control only).
const newCategory = async (name) => {
  const made = await call('createCategory', { name });
  const sub = await call('createSubcategory', { categoryName: name, name: 'Pre filing subcategory' });
  return { id: made.id, name, subcategoryId: sub.id };
};
// Only the control panel makes media items and categories, and its run comes first: it makes these once, and the app's run finds them.
const appTitle = 'Pre media for the app';
const appCategory = 'Pre media category for the app';
const appSubcategory = 'Pre media subcategory for the app';
let madeForTheApp;
const forTheApp = () => {
  madeForTheApp = madeForTheApp || (contract.host === 'control'
    ? (async () => {
      await call('createCategory', { name: appCategory });
      await call('createSubcategory', { categoryName: appCategory, name: appSubcategory });
      await call('createMediaItem', { title: appTitle, summary: 'Made by the control run', thumbnailImage: ['https://example.com/pre-app.png'] });
      return call('updateMediaItemCategory', { title: appTitle, categoryName: appCategory, subcategoryName: appSubcategory, included: true });
    })()
    : call('getMediaItem', { title: appTitle }));
  return madeForTheApp;
};

contract.describe('searchMediaItems', () => {
  beforeEach(standIns);

  it('finds the item the control panel made, by its title', async () => {
    await forTheApp();
    expect(await call('searchMediaItems', { title: appTitle })).toEqual(jasmine.objectContaining({
      mediaItems: jasmine.arrayContaining([madeItem(appTitle)])
    }));
  });

  it('finds it in its category and subcategory, with a page and a page size', async () => {
    await forTheApp();
    expect(await call('searchMediaItems', { title: appTitle, categoryName: appCategory, subcategoryName: appSubcategory, page: 0, pageSize: 20 }))
      .toEqual(jasmine.objectContaining({ mediaItems: jasmine.arrayContaining([madeItem(appTitle)]), page: 0 }));
  });
});

contract.describe('getMediaItem', () => {
  beforeEach(standIns);

  it('finds the item the control panel made, by its title', async () => {
    const made = await forTheApp();
    expect(await call('getMediaItem', { title: appTitle })).toEqual(jasmine.objectContaining({ id: made.id, title: appTitle }));
  });
});

contract.describe('getMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('finds the item the control panel made, by its id', async () => {
    const made = await forTheApp();
    expect(await call('getMediaItemAdvanced', { mediaItemId: made.id })).toEqual(jasmine.objectContaining({ id: made.id, title: appTitle }));
  });
});

contract.describe('createMediaItem', () => {
  beforeEach(standIns);

  it('adds an item from its title', async () => {
    const title = `Pre media item (${contract.host})`;
    expect(await call('createMediaItem', { title })).toEqual(madeItem(title));
  });

  it('adds an item with every detail', async () => {
    const title = `Pre media item with every detail (${contract.host})`;
    expect(await call('createMediaItem', {
      title,
      summary: 'A short summary',
      body: '<p>The body</p>',
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
    })).toEqual(madeItem(title));
  });
});

contract.describe('createMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('adds several items at once', async () => {
    expect(await call('createMediaItemsAdvanced', { mediaItems: [
      { title: `Pre batch media item one (${contract.host})` },
      { title: `Pre batch media item two (${contract.host})`, summary: 'Second', audioUrl: 'https://example.com/pre-batch.mp3', thumbnailImage: ['https://example.com/pre-batch.png'], mediaDate: '2026-01-16' }
    ] })).toEqual(batchShape(2));
  });
});

contract.describe('updateMediaItem', () => {
  beforeEach(standIns);

  it("changes an item's summary, naming the item by its title", async () => {
    const title = `Pre media item to update (${contract.host})`;
    await call('createMediaItem', { title, summary: 'First' });
    expect(await call('updateMediaItem', { title, newSummary: 'Updated before the next contract' })).toEqual(madeItem(title));
  });

  it('changes every detail of an item, renaming it', async () => {
    const title = `Pre media item to change fully (${contract.host})`;
    await call('createMediaItem', { title, videoUrl: 'https://example.com/pre-first.mp4' });
    const newTitle = `Pre media item changed fully (${contract.host})`;
    expect(await call('updateMediaItem', {
      title,
      newTitle,
      newSummary: 'New summary',
      newBody: '<p>New body</p>',
      newSourceUrl: 'https://example.com/pre-new-source',
      newVideoUrl: 'https://example.com/pre-new-video.mp4',
      newAudioTitle: 'New audio title',
      newArtists: 'New artists',
      newAudioUrl: 'https://example.com/pre-new-audio.mp3',
      newThumbnailImage: ['https://example.com/pre-new-thumb.png'],
      newAudioImage: ['https://example.com/pre-new-audio.png'],
      newAudioBackgroundImage: ['https://example.com/pre-new-background.png'],
      newMediaDate: '2026-02-01',
      newActionLinks: [action],
      resetViews: false
    })).toEqual(madeItem(newTitle));
  });
});

contract.describe('updateMediaItemAdvanced', () => {
  beforeEach(standIns);

  it("changes an item's summary by its id", async () => {
    const title = `Pre media item to update by id (${contract.host})`;
    const { id } = await call('createMediaItem', { title, summary: 'First' });
    expect(await call('updateMediaItemAdvanced', { mediaItemId: id, newSummary: 'Updated by id' })).toEqual(jasmine.objectContaining({ id, title }));
  });

  it('changes several details by its id, clearing some', async () => {
    const title = `Pre media item to change by id (${contract.host})`;
    const { id } = await call('createMediaItem', { title, artists: 'Someone', thumbnailImage: ['https://example.com/pre-old.png'] });
    expect(await call('updateMediaItemAdvanced', {
      mediaItemId: id, newArtists: null, newThumbnailImage: [], newAudioTitle: 'Pre audio by id', newMediaDate: '2026-03-01', newActionLinks: [action], resetViews: true
    })).toEqual(jasmine.objectContaining({ id, title }));
  });
});

contract.describe('updateMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('changes several items at once', async () => {
    const first = await call('createMediaItem', { title: `Pre batch media item to update one (${contract.host})`, summary: 'One' });
    const second = await call('createMediaItem', { title: `Pre batch media item to update two (${contract.host})`, summary: 'Two' });
    expect(await call('updateMediaItemsAdvanced', { mediaItems: [
      { mediaItemId: first.id, newSummary: 'One changed' },
      { mediaItemId: second.id, newSummary: null, newArtists: 'Pre batch artists' }
    ] })).toEqual(batchShape(2));
  });
});

contract.describe('deleteMediaItem', () => {
  beforeEach(standIns);

  it('deletes an item, naming it by its title', async () => {
    const title = `Pre media item to delete (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('deleteMediaItem', { title })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('deletes an item by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to delete by id (${contract.host})` });
    expect(await call('deleteMediaItemAdvanced', { mediaItemId: id })).toEqual(jasmine.objectContaining({ id, deleted: true }));
  });
});

contract.describe('deleteMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('deletes several items at once', async () => {
    const first = await call('createMediaItem', { title: `Pre batch media item to delete one (${contract.host})` });
    const second = await call('createMediaItem', { title: `Pre batch media item to delete two (${contract.host})` });
    expect(await call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: first.id }, { mediaItemId: second.id }] })).toEqual(batchShape(2));
  });
});

contract.describe('updateMediaItemOrder', () => {
  beforeEach(standIns);

  it('moves an item to the first place, naming it by its title', async () => {
    const title = `Pre media item to move (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemOrder', { title, position: 1 })).toEqual(madeItem(title));
  }, 180000);
});

contract.describe('updateMediaItemOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves an item to the first place by its id', async () => {
    const { id } = await call('createMediaItem', { title: `Pre media item to move by id (${contract.host})` });
    expect(await call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 1 })).toEqual(jasmine.objectContaining({ id }));
  }, 180000);
});

contract.describe('updateMediaItemCategory', () => {
  beforeEach(standIns);

  it('puts an item in a category, naming both', async () => {
    const category = await newCategory(`Pre filing category (${contract.host})`);
    const title = `Pre media item to file (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemCategory', { title, categoryName: category.name, included: true })).toEqual(madeItem(title));
  });

  it('puts an item in a subcategory, naming it', async () => {
    const category = await newCategory(`Pre filing category with a subcategory (${contract.host})`);
    const title = `Pre media item to file in a subcategory (${contract.host})`;
    await call('createMediaItem', { title });
    expect(await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: 'Pre filing subcategory', included: true }))
      .toEqual(madeItem(title));
  });
});

contract.describe('updateMediaItemCategoryAdvanced', () => {
  beforeEach(standIns);

  it('puts an item in a category by their ids', async () => {
    const category = await newCategory(`Pre filing category by id (${contract.host})`);
    const { id } = await call('createMediaItem', { title: `Pre media item to file by id (${contract.host})` });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, included: true })).toEqual(jasmine.objectContaining({ id }));
  });

  it('puts an item in a subcategory by their ids', async () => {
    const category = await newCategory(`Pre filing category with a subcategory by id (${contract.host})`);
    const { id } = await call('createMediaItem', { title: `Pre media item to file in a subcategory by id (${contract.host})` });
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, subcategoryId: category.subcategoryId, included: true }))
      .toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('updateMediaItemsCategoryAdvanced', () => {
  beforeEach(standIns);

  it('files several items at once', async () => {
    const category = await newCategory(`Pre batch filing category (${contract.host})`);
    const first = await call('createMediaItem', { title: `Pre batch media item to file one (${contract.host})` });
    const second = await call('createMediaItem', { title: `Pre batch media item to file two (${contract.host})` });
    expect(await call('updateMediaItemsCategoryAdvanced', { mediaItems: [
      { mediaItemId: first.id, categoryId: category.id, included: true },
      { mediaItemId: second.id, categoryId: category.id, subcategoryId: category.subcategoryId, included: true }
    ] })).toEqual(batchShape(2));
  });
});
