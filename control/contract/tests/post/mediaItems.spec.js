// mediaItems: every operation on media items, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const NO_SUCH_ID = '000000000000000000000000';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Calls the contract makes that nothing here answers (the widget refresh message, deep links, analytics counters, the
// contract events): each is stood in for where the frame has it, and only the events are part of the contract.
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
  spyOn(buildfire.services.contract.events, 'send').and.callFake((eventName, data, callback) => callback && callback(null, []));
};
// The data of every event of that name sent since the spy was set or reset.
const sent = (eventName) => buildfire.services.contract.events.send.calls.allArgs()
  .filter(([name]) => name === eventName).map(([, data]) => data);

// What the contract's own reads find.
const listed = async (title) => (await call('searchMediaItems', { title, pageSize: 50 })).mediaItems.filter((item) => item.title === title);
const byId = (mediaItemId) => call('getMediaItemAdvanced', { mediaItemId });
const create = (label, fields) => call('createMediaItem', Object.assign({ title: unique(label) }, fields || {}));

// Only the control panel adds media items and categories, and its run comes first: it makes these once, and the app's run finds them.
const forTheApp = 'Post media item for the app';
const categoryForTheApp = 'Post media category for the app';
const subcategoryForTheApp = 'Post media subcategory for the app';
let madeForTheApp;
const itemForTheApp = () => {
  madeForTheApp = madeForTheApp || (contract.host === 'control'
    ? (async () => {
      const item = await call('createMediaItem', { title: forTheApp, summary: 'Made by the control run', videoUrl: 'https://example.com/for-the-app.mp4' });
      await call('createCategory', { name: categoryForTheApp });
      const subcategory = await call('createSubcategory', { categoryName: categoryForTheApp, name: subcategoryForTheApp });
      await call('updateMediaItemCategory', { title: forTheApp, categoryName: categoryForTheApp, subcategoryName: subcategoryForTheApp, included: true });
      return { item, category: subcategory.category, subcategory };
    })()
    : (async () => {
      const [item] = await listed(forTheApp);
      const { categories } = await call('searchCategories', { name: categoryForTheApp });
      const category = categories.find((found) => found.name === categoryForTheApp);
      if (!item || !category) throw new Error(`no media item titled "${forTheApp}": the control run makes it`);
      return { item, category, subcategory: category.subcategories.find((found) => found.name === subcategoryForTheApp) };
    })());
  return madeForTheApp;
};

// controlBackground only: the app's datastore is read-only, so only the control panel adds media items.
contract.describe('createMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('adds a media item from its title, and returns it with the form\'s defaults', async () => {
    const title = unique('item');
    const created = await call('createMediaItem', { title });
    expect(created).toEqual(jasmine.objectContaining({
      id: jasmine.any(String), title, summary: '', body: '', sourceUrl: '', videoUrl: '', audioUrl: '',
      thumbnailImage: '', audioImage: '', actionLinks: [], categoryIds: [], subcategoryIds: [],
      rank: jasmine.any(Number), mediaDate: jasmine.stringMatching(ISO), createdOn: jasmine.stringMatching(ISO)
    }));
    expect(await listed(title)).toEqual([jasmine.objectContaining({ id: created.id, title })]);
  });

  it('keeps every optional field as given, each picture as a single link', async () => {
    const title = unique('full item');
    const fields = {
      title,
      summary: 'A short summary',
      body: '<p>The item\'s content</p>',
      sourceUrl: 'https://example.com/source',
      videoUrl: 'https://example.com/video.mp4',
      audioTitle: 'Episode one',
      artists: 'The Testers',
      audioUrl: 'https://example.com/audio.mp3',
      thumbnailImage: ['https://example.com/thumbnail.png'],
      audioImage: ['https://example.com/audio.png'],
      audioBackgroundImage: ['https://example.com/background.png'],
      mediaDate: '2026-01-15',
      actionLinks: [{ title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' }]
    };
    const expected = {
      title, summary: 'A short summary', body: '<p>The item\'s content</p>', sourceUrl: 'https://example.com/source',
      videoUrl: 'https://example.com/video.mp4', audioTitle: 'Episode one', artists: 'The Testers', audioUrl: 'https://example.com/audio.mp3',
      thumbnailImage: 'https://example.com/thumbnail.png', audioImage: 'https://example.com/audio.png',
      audioBackgroundImage: 'https://example.com/background.png', mediaDate: '2026-01-15T00:00:00.000Z',
      actionLinks: [jasmine.objectContaining({ title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' })]
    };
    const created = await call('createMediaItem', fields);
    expect(created).toEqual(jasmine.objectContaining(expected));
    expect(await byId(created.id)).toEqual(jasmine.objectContaining(expected));
  });

  it('takes a single picture or action on its own as a list of one', async () => {
    const created = await create('single values', {
      thumbnailImage: 'https://example.com/single.png',
      actionLinks: { title: 'Call us', action: 'callNumber', phoneNumber: '+15550100' }
    });
    expect(created.thumbnailImage).toBe('https://example.com/single.png');
    expect(created.actionLinks).toEqual([jasmine.objectContaining({ action: 'callNumber', phoneNumber: '+15550100' })]);
  });

  it('announces the new item', async () => {
    const title = unique('announced');
    const created = await call('createMediaItem', { title, summary: 'Announced', videoUrl: 'https://example.com/announced.mp4' });
    expect(sent('mediaItemCreated')).toEqual([jasmine.objectContaining({
      mediaItemId: created.id, title, summary: 'Announced', videoUrl: 'https://example.com/announced.mp4',
      mediaDate: jasmine.stringMatching(ISO), createdAt: jasmine.stringMatching(ISO)
    })]);
  });

  describe('refuses, stores nothing and announces nothing', () => {
    const refusedWith = async (fields, named, title) => {
      expect(await refusal(call('createMediaItem', fields))).toContain(named);
      if (title) expect(await listed(title)).toEqual([]);
      expect(sent('mediaItemCreated')).toEqual([]);
    };

    it('without a title', async () => {
      await refusedWith({ summary: 'No title' }, 'title');
    });

    it('with an empty title', async () => {
      await refusedWith({ title: '' }, 'title');
    });

    it('with a title of null', async () => {
      await refusedWith({ title: null }, 'title');
    });

    it('with a title that is not text', async () => {
      await refusedWith({ title: 42 }, 'title');
    });

    it('with a title over 70 characters', async () => {
      await refusedWith({ title: 'x'.repeat(71) }, 'title');
    });

    it('with a summary over 250 characters', async () => {
      const title = unique('long summary');
      await refusedWith({ title, summary: 'x'.repeat(251) }, 'summary', title);
    });

    it('with an audio title over 70 characters', async () => {
      const title = unique('long audio title');
      await refusedWith({ title, audioTitle: 'x'.repeat(71) }, 'audioTitle', title);
    });

    it('with more than one thumbnail', async () => {
      const title = unique('two thumbnails');
      await refusedWith({ title, thumbnailImage: ['https://example.com/a.png', 'https://example.com/b.png'] }, 'thumbnailImage', title);
    });

    it('with a thumbnail that is not a picture', async () => {
      const title = unique('bad thumbnail');
      await refusedWith({ title, thumbnailImage: [42] }, 'thumbnailImage', title);
    });

    it('with an action that names no action', async () => {
      const title = unique('bad action');
      await refusedWith({ title, actionLinks: [{ title: 'Nothing' }] }, 'actionLinks', title);
    });

    it('with a media date that is not a date', async () => {
      const title = unique('bad date');
      await refusedWith({ title, mediaDate: 'someday' }, 'mediaDate', title);
    });

    it('with content that is not text', async () => {
      const title = unique('bad body');
      await refusedWith({ title, body: 42 }, 'body', title);
    });
  });
});

contract.describe('updateMediaItemOrder', () => {
  beforeEach(standInForSideEffects);

  it('moves an item to a place in the manual order, and the others make room', async () => {
    const first = await create('order one');
    const second = await create('order two');
    expect(await call('updateMediaItemOrder', { title: first.title, position: 1 })).toEqual(jasmine.objectContaining({ id: first.id, title: first.title, rank: 1 }));
    expect((await byId(first.id)).rank).toBe(1);
    await call('updateMediaItemOrder', { title: second.title, position: 1 });
    expect((await byId(second.id)).rank).toBe(1);
    expect((await byId(first.id)).rank).toBe(2);
  }, 120000);

  describe('refuses, and moves nothing', () => {
    it('a title no item has', async () => {
      const title = unique('missing');
      expect(await refusal(call('updateMediaItemOrder', { title, position: 1 }))).toContain(title);
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared order');
      const one = await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      const rank = (await byId(one.id)).rank;
      expect((await refusal(call('updateMediaItemOrder', { title, position: 1 }))).replace(title, '')).toContain('2');
      expect((await byId(one.id)).rank).toBe(rank);
    });

    it('a place past the end of the list', async () => {
      const item = await create('far');
      const rank = (await byId(item.id)).rank;
      expect(await refusal(call('updateMediaItemOrder', { title: item.title, position: 100000 }))).toContain('position');
      expect((await byId(item.id)).rank).toBe(rank);
    }, 120000);

    it('a place of 0', async () => {
      const item = await create('zero');
      expect(await refusal(call('updateMediaItemOrder', { title: item.title, position: 0 }))).toContain('position');
    });

    it('a place that is not a whole number', async () => {
      const item = await create('fraction');
      expect(await refusal(call('updateMediaItemOrder', { title: item.title, position: 1.5 }))).toContain('position');
      expect(await refusal(call('updateMediaItemOrder', { title: item.title, position: 'first' }))).toContain('position');
    });

    it('without a place', async () => {
      const item = await create('no place');
      expect(await refusal(call('updateMediaItemOrder', { title: item.title }))).toContain('position');
    });

    it('without a title', async () => {
      expect(await refusal(call('updateMediaItemOrder', { position: 1 }))).toContain('title');
      expect(await refusal(call('updateMediaItemOrder', { title: '', position: 1 }))).toContain('title');
      expect(await refusal(call('updateMediaItemOrder', { title: null, position: 1 }))).toContain('title');
    });
  });
});

contract.describe('updateMediaItemOrderAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('moves the item with that id to a place in the manual order', async () => {
    const item = await create('order by id');
    expect(await call('updateMediaItemOrderAdvanced', { mediaItemId: item.id, position: 1 })).toEqual(jasmine.objectContaining({ id: item.id, rank: 1 }));
    expect((await byId(item.id)).rank).toBe(1);
  }, 120000);

  it('refuses an id that matches nothing', async () => {
    await expectAsync(call('updateMediaItemOrderAdvanced', { mediaItemId: NO_SUCH_ID, position: 1 })).toBeRejected();
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('updateMediaItemOrderAdvanced', { position: 1 }))).toContain('mediaItemId');
    expect(await refusal(call('updateMediaItemOrderAdvanced', { mediaItemId: '', position: 1 }))).toContain('mediaItemId');
  });

  it('refuses a place that is not a whole number of 1 or more, and moves nothing', async () => {
    const item = await create('bad place');
    const rank = (await byId(item.id)).rank;
    expect(await refusal(call('updateMediaItemOrderAdvanced', { mediaItemId: item.id, position: -1 }))).toContain('position');
    expect(await refusal(call('updateMediaItemOrderAdvanced', { mediaItemId: item.id }))).toContain('position');
    expect((await byId(item.id)).rank).toBe(rank);
  });
});

contract.describe('getMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('finds a media item by its exact title, with its details', async () => {
    const { item } = await itemForTheApp();
    expect(await call('getMediaItem', { title: forTheApp })).toEqual(jasmine.objectContaining({
      id: item.id, title: forTheApp, summary: 'Made by the control run', videoUrl: 'https://example.com/for-the-app.mp4',
      categoryIds: jasmine.any(Array), subcategoryIds: jasmine.any(Array), rank: jasmine.any(Number), createdOn: jasmine.stringMatching(ISO)
    }));
  });

  it('refuses a title no item has, naming it', async () => {
    const title = unique('missing');
    expect(await refusal(call('getMediaItem', { title }))).toContain(title);
  });

  it('refuses part of a title', async () => {
    await itemForTheApp();
    await expectAsync(call('getMediaItem', { title: 'Post media item for the' })).toBeRejected();
  });

  if (contract.host === 'control') {
    it('refuses a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      expect((await refusal(call('getMediaItem', { title }))).replace(title, '')).toContain('2');
    });
  }

  it('refuses without a title', async () => {
    expect(await refusal(call('getMediaItem', {}))).toContain('title');
    expect(await refusal(call('getMediaItem', { title: '' }))).toContain('title');
    expect(await refusal(call('getMediaItem', { title: null }))).toContain('title');
    expect(await refusal(call('getMediaItem', { title: 42 }))).toContain('title');
  });
});

contract.describe('getMediaItemAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('finds the media item with that id, with its details', async () => {
    const { item, category } = await itemForTheApp();
    expect(await call('getMediaItemAdvanced', { mediaItemId: item.id })).toEqual(jasmine.objectContaining({
      id: item.id, title: forTheApp, videoUrl: 'https://example.com/for-the-app.mp4', categoryIds: jasmine.arrayContaining([category.id])
    }));
  });

  it('refuses an id that matches nothing', async () => {
    expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: NO_SUCH_ID }))).toContain(NO_SUCH_ID);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('getMediaItemAdvanced', {}))).toContain('mediaItemId');
    expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: '' }))).toContain('mediaItemId');
    expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: null }))).toContain('mediaItemId');
  });
});

contract.describe('searchMediaItems', () => {
  beforeEach(standInForSideEffects);

  it('finds items whose title contains the text, whatever its case, with their details', async () => {
    const { item } = await itemForTheApp();
    const result = await call('searchMediaItems', { title: 'MEDIA ITEM FOR THE APP' });
    expect(result).toEqual(jasmine.objectContaining({ mediaItems: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.mediaItems).toContain(jasmine.objectContaining({
      id: item.id, title: forTheApp, summary: 'Made by the control run', videoUrl: 'https://example.com/for-the-app.mp4'
    }));
  });

  it('narrows to a category, and to one of its subcategories', async () => {
    const { item, category, subcategory } = await itemForTheApp();
    const inCategory = (await call('searchMediaItems', { categoryName: categoryForTheApp, pageSize: 50 })).mediaItems;
    expect(inCategory).toContain(jasmine.objectContaining({ id: item.id }));
    inCategory.forEach((found) => expect(found.categoryIds).toContain(category.id));
    const inSubcategory = (await call('searchMediaItems', { categoryName: categoryForTheApp, subcategoryName: subcategoryForTheApp, pageSize: 50 })).mediaItems;
    expect(inSubcategory).toContain(jasmine.objectContaining({ id: item.id }));
    inSubcategory.forEach((found) => expect(found.subcategoryIds).toContain(subcategory.id));
  });

  it('shows 20 items a page when no page size is given', async () => {
    if (contract.host === 'control') {
      // More items than a page, made through the contract's batch operation.
      const stamp = Date.now();
      const mediaItems = Array.from({ length: 21 }, (value, index) => ({ title: `Post page item ${index} ${stamp}` }));
      expect(await call('createMediaItemsAdvanced', { mediaItems })).toEqual(jasmine.objectContaining({ succeeded: 21 }));
    }
    const result = await call('searchMediaItems', {});
    expect(result.total).toBeGreaterThan(20);
    expect(result.mediaItems.length).toBe(20);
    expect(result.hasMore).toBe(true);
  }, 120000);

  it('walks the pages with a page size', async () => {
    await itemForTheApp();
    const first = await call('searchMediaItems', { page: 0, pageSize: 1 });
    const second = await call('searchMediaItems', { page: 1, pageSize: 1 });
    expect(first.mediaItems.length).toBe(1);
    expect(second.mediaItems.length).toBe(1);
    expect(second.page).toBe(1);
    expect(second.mediaItems[0].id).not.toBe(first.mediaItems[0].id);
    expect(second.total).toBe(first.total);
  });

  if (contract.host === 'control') {
    it('lists the newest first while the order is left as it is', async () => {
      const stamp = `${Date.now()}`;
      const older = await call('createMediaItem', { title: `Post older ${stamp}` });
      const newer = await call('createMediaItem', { title: `Post newer ${stamp}` });
      expect((await call('searchMediaItems', { title: stamp })).mediaItems.map((found) => found.id)).toEqual([newer.id, older.id]);
    });

    it('finds nothing in a category with no items', async () => {
      const name = unique('empty cat');
      await call('createCategory', { name });
      expect(await call('searchMediaItems', { categoryName: name })).toEqual(jasmine.objectContaining({ mediaItems: [], total: 0, hasMore: false }));
    });
  }

  describe('refuses', () => {
    it('a category no category has, naming it', async () => {
      const name = unique('no such category');
      expect(await refusal(call('searchMediaItems', { categoryName: name }))).toContain(name);
    });

    it('a subcategory without its category', async () => {
      expect(await refusal(call('searchMediaItems', { subcategoryName: subcategoryForTheApp }))).toContain('categoryName');
    });

    it('a subcategory the category does not have, naming it', async () => {
      await itemForTheApp();
      const name = unique('no such subcategory');
      expect(await refusal(call('searchMediaItems', { categoryName: categoryForTheApp, subcategoryName: name }))).toContain(name);
    });

    it('a page size over 50, or under 1', async () => {
      expect(await refusal(call('searchMediaItems', { pageSize: 51 }))).toContain('pageSize');
      expect(await refusal(call('searchMediaItems', { pageSize: 0 }))).toContain('pageSize');
    });

    it('a page that is not a whole number of 0 or more', async () => {
      expect(await refusal(call('searchMediaItems', { page: -1 }))).toContain('page');
      expect(await refusal(call('searchMediaItems', { page: 1.5 }))).toContain('page');
    });

    it('an empty title, or one that is not text', async () => {
      expect(await refusal(call('searchMediaItems', { title: '' }))).toContain('title');
      expect(await refusal(call('searchMediaItems', { title: 42 }))).toContain('title');
    });
  });
});

contract.describe('createMediaItemsAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds every item, reports each and announces each', async () => {
    const titles = [unique('batch one'), unique('batch two')];
    const result = await call('createMediaItemsAdvanced', { mediaItems: [{ title: titles[0], summary: 'First' }, { title: titles[1], thumbnailImage: ['https://example.com/batch.png'] }] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })],
      succeeded: 2,
      failed: 0
    }));
    expect(await listed(titles[0])).toEqual([jasmine.objectContaining({ id: result.mediaItems[0].id, summary: 'First' })]);
    expect(await listed(titles[1])).toEqual([jasmine.objectContaining({ id: result.mediaItems[1].id, thumbnailImage: 'https://example.com/batch.png' })]);
    expect(sent('mediaItemCreated').map((data) => data.mediaItemId)).toEqual([result.mediaItems[0].id, result.mediaItems[1].id]);
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: [{ title: valid }, { summary: 'No title' }] }))).toContain('entry 1');
      expect(await listed(valid)).toEqual([]);
      expect(sent('mediaItemCreated')).toEqual([]);
    });

    it('when an entry is not an item', async () => {
      const valid = unique('valid beside');
      await expectAsync(call('createMediaItemsAdvanced', { mediaItems: [{ title: valid }, 'not an item'] })).toBeRejected();
      expect(await listed(valid)).toEqual([]);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: [] }))).toContain('mediaItems');
    });

    it('when it is left out', async () => {
      expect(await refusal(call('createMediaItemsAdvanced', {}))).toContain('mediaItems');
    });

    it('when it holds more than 50 entries', async () => {
      const mediaItems = Array.from({ length: 51 }, (value, index) => ({ title: unique(`entry ${index}`) }));
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems }))).toContain('mediaItems');
      expect(await listed(mediaItems[0].title)).toEqual([]);
    });
  });
});

contract.describe('updateMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('changes only the fields it is given, and returns the item', async () => {
    const item = await create('update', { summary: 'First', artists: 'Kept' });
    const updated = await call('updateMediaItem', { title: item.title, newSummary: 'Second', newVideoUrl: 'https://example.com/new.mp4', newMediaDate: '2026-02-01' });
    const expected = { id: item.id, title: item.title, summary: 'Second', artists: 'Kept', videoUrl: 'https://example.com/new.mp4', mediaDate: '2026-02-01T00:00:00.000Z' };
    expect(updated).toEqual(jasmine.objectContaining(expected));
    expect(await byId(item.id)).toEqual(jasmine.objectContaining(expected));
  });

  it('sets every field it can change', async () => {
    const item = await create('every field');
    const newTitle = `${item.title} new`;
    await call('updateMediaItem', {
      title: item.title, newTitle, newSummary: 'Summary', newBody: '<p>Body</p>', newSourceUrl: 'https://example.com/src',
      newVideoUrl: 'https://example.com/v.mp4', newAudioTitle: 'Audio', newArtists: 'Artists', newAudioUrl: 'https://example.com/a.mp3',
      newThumbnailImage: ['https://example.com/t.png'], newAudioImage: ['https://example.com/ai.png'], newAudioBackgroundImage: ['https://example.com/ab.png'],
      newMediaDate: '2026-03-01', newActionLinks: [{ title: 'Email us', action: 'sendEmail', email: 'team@example.com' }], resetViews: false
    });
    expect(await byId(item.id)).toEqual(jasmine.objectContaining({
      title: newTitle, summary: 'Summary', body: '<p>Body</p>', sourceUrl: 'https://example.com/src', videoUrl: 'https://example.com/v.mp4',
      audioTitle: 'Audio', artists: 'Artists', audioUrl: 'https://example.com/a.mp3', thumbnailImage: 'https://example.com/t.png',
      audioImage: 'https://example.com/ai.png', audioBackgroundImage: 'https://example.com/ab.png', mediaDate: '2026-03-01T00:00:00.000Z',
      actionLinks: [jasmine.objectContaining({ action: 'sendEmail', email: 'team@example.com' })]
    }));
  });

  it('renames the item', async () => {
    const item = await create('rename');
    await call('updateMediaItem', { title: item.title, newTitle: `${item.title} renamed` });
    expect(await listed(item.title)).toEqual([]);
    expect(await listed(`${item.title} renamed`)).toEqual([jasmine.objectContaining({ id: item.id })]);
  });

  it('clears a text with null, and with an empty text', async () => {
    const item = await create('clear', { summary: 'Something', artists: 'Someone' });
    await call('updateMediaItem', { title: item.title, newSummary: null });
    expect((await byId(item.id)).summary).toBeNull();
    await call('updateMediaItem', { title: item.title, newArtists: '' });
    expect((await byId(item.id)).artists).toBe('');
  });

  it('removes a picture with an empty list, and with null', async () => {
    const item = await create('pictures', { thumbnailImage: ['https://example.com/t.png'], audioImage: ['https://example.com/a.png'] });
    await call('updateMediaItem', { title: item.title, newThumbnailImage: [] });
    expect((await byId(item.id)).thumbnailImage).toBe('');
    await call('updateMediaItem', { title: item.title, newAudioImage: null });
    expect((await byId(item.id)).audioImage).toBe('');
  });

  it('replaces the actions with the ones given, and removes them with an empty list or null', async () => {
    const item = await create('actions', { actionLinks: [{ title: 'One', action: 'linkToWeb', url: 'https://example.com/1' }, { title: 'Two', action: 'linkToWeb', url: 'https://example.com/2' }] });
    await call('updateMediaItem', { title: item.title, newActionLinks: [{ title: 'Three', action: 'linkToWeb', url: 'https://example.com/3' }] });
    expect((await byId(item.id)).actionLinks).toEqual([jasmine.objectContaining({ title: 'Three' })]);
    await call('updateMediaItem', { title: item.title, newActionLinks: [] });
    expect((await byId(item.id)).actionLinks).toEqual([]);
    await call('updateMediaItem', { title: item.title, newActionLinks: [{ title: 'Four', action: 'linkToWeb', url: 'https://example.com/4' }] });
    await call('updateMediaItem', { title: item.title, newActionLinks: null });
    expect((await byId(item.id)).actionLinks).toEqual([]);
  });

  it('announces the change, with the title it had', async () => {
    const item = await create('announce');
    buildfire.services.contract.events.send.calls.reset();
    await call('updateMediaItem', { title: item.title, newTitle: `${item.title} after` });
    expect(sent('mediaItemUpdated')).toEqual([jasmine.objectContaining({ mediaItemId: item.id, title: `${item.title} after`, previousTitle: item.title })]);
  });

  describe('refuses, changes nothing and announces nothing', () => {
    const unchanged = async (item) => {
      expect(await byId(item.id)).toEqual(jasmine.objectContaining({ title: item.title, summary: item.summary }));
      expect(sent('mediaItemUpdated')).toEqual([]);
    };

    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('updateMediaItem', { title, newSummary: 'x' }))).toContain(title);
      expect(sent('mediaItemUpdated')).toEqual([]);
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared');
      const one = await call('createMediaItem', { title, summary: 'One' });
      const two = await call('createMediaItem', { title, summary: 'Two' });
      expect((await refusal(call('updateMediaItem', { title, newSummary: 'x' }))).replace(title, '')).toContain('2');
      expect((await byId(one.id)).summary).toBe('One');
      expect((await byId(two.id)).summary).toBe('Two');
    });

    it('removing the title', async () => {
      const item = await create('keep title', { summary: 'Kept' });
      buildfire.services.contract.events.send.calls.reset();
      expect(await refusal(call('updateMediaItem', { title: item.title, newTitle: null }))).toContain('newTitle');
      expect(await refusal(call('updateMediaItem', { title: item.title, newTitle: '' }))).toContain('newTitle');
      await unchanged(item);
    });

    it('removing the media date', async () => {
      const item = await create('keep date', { summary: 'Kept' });
      buildfire.services.contract.events.send.calls.reset();
      expect(await refusal(call('updateMediaItem', { title: item.title, newMediaDate: null }))).toContain('newMediaDate');
      await unchanged(item);
    });

    it('a summary over 250 characters', async () => {
      const item = await create('long', { summary: 'Kept' });
      buildfire.services.contract.events.send.calls.reset();
      expect(await refusal(call('updateMediaItem', { title: item.title, newSummary: 'x'.repeat(251) }))).toContain('newSummary');
      await unchanged(item);
    });

    it('two thumbnails', async () => {
      const item = await create('two', { summary: 'Kept' });
      buildfire.services.contract.events.send.calls.reset();
      expect(await refusal(call('updateMediaItem', { title: item.title, newThumbnailImage: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('newThumbnailImage');
      await unchanged(item);
    });

    it('a view-count choice that is not true or false', async () => {
      const item = await create('views', { summary: 'Kept' });
      buildfire.services.contract.events.send.calls.reset();
      expect(await refusal(call('updateMediaItem', { title: item.title, newVideoUrl: 'https://example.com/x.mp4', resetViews: 'yes' }))).toContain('resetViews');
      await unchanged(item);
    });

    it('a call that changes nothing', async () => {
      const item = await create('nothing', { summary: 'Kept' });
      buildfire.services.contract.events.send.calls.reset();
      await expectAsync(call('updateMediaItem', { title: item.title })).toBeRejected();
      await unchanged(item);
    });

    it('without a title', async () => {
      expect(await refusal(call('updateMediaItem', { newSummary: 'x' }))).toContain('title');
      expect(await refusal(call('updateMediaItem', { title: '', newSummary: 'x' }))).toContain('title');
      expect(await refusal(call('updateMediaItem', { title: null, newSummary: 'x' }))).toContain('title');
    });
  });
});

contract.describe('updateMediaItemAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes the item with that id, only the fields it is given', async () => {
    const item = await create('by id', { summary: 'First', audioTitle: 'Kept' });
    const updated = await call('updateMediaItemAdvanced', { mediaItemId: item.id, newSummary: 'Second' });
    expect(updated).toEqual(jasmine.objectContaining({ id: item.id, title: item.title, summary: 'Second', audioTitle: 'Kept' }));
    expect(await byId(item.id)).toEqual(jasmine.objectContaining({ summary: 'Second', audioTitle: 'Kept' }));
    expect(sent('mediaItemUpdated')).toContain(jasmine.objectContaining({ mediaItemId: item.id, summary: 'Second' }));
  });

  it('clears a text with null', async () => {
    const item = await create('clear by id', { sourceUrl: 'https://example.com/src' });
    await call('updateMediaItemAdvanced', { mediaItemId: item.id, newSourceUrl: null });
    expect((await byId(item.id)).sourceUrl).toBeNull();
  });

  it('refuses an id that matches nothing', async () => {
    await expectAsync(call('updateMediaItemAdvanced', { mediaItemId: NO_SUCH_ID, newSummary: 'x' })).toBeRejected();
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('updateMediaItemAdvanced', { newSummary: 'x' }))).toContain('mediaItemId');
    expect(await refusal(call('updateMediaItemAdvanced', { mediaItemId: '', newSummary: 'x' }))).toContain('mediaItemId');
  });

  it('refuses a call that changes nothing, or removes the title', async () => {
    const item = await create('nothing by id');
    await expectAsync(call('updateMediaItemAdvanced', { mediaItemId: item.id })).toBeRejected();
    expect(await refusal(call('updateMediaItemAdvanced', { mediaItemId: item.id, newTitle: null }))).toContain('newTitle');
    expect((await byId(item.id)).title).toBe(item.title);
  });
});

contract.describe('updateMediaItemsAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes every item, and reports each', async () => {
    const one = await create('batch update one');
    const two = await create('batch update two', { summary: 'Two' });
    const result = await call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: one.id, newSummary: 'One changed' }, { mediaItemId: two.id, newSummary: null }] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect((await byId(one.id)).summary).toBe('One changed');
    expect((await byId(two.id)).summary).toBeNull();
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches nothing', async () => {
      const item = await create('batch known', { summary: 'Kept' });
      await expectAsync(call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: item.id, newSummary: 'x' }, { mediaItemId: NO_SUCH_ID, newSummary: 'x' }] })).toBeRejected();
      expect((await byId(item.id)).summary).toBe('Kept');
    });

    it('when the same item is listed twice', async () => {
      const item = await create('batch twice', { summary: 'Kept' });
      await expectAsync(call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: item.id, newSummary: 'x' }, { mediaItemId: item.id, newSummary: 'y' }] })).toBeRejected();
      expect((await byId(item.id)).summary).toBe('Kept');
    });

    it('when one entry is invalid', async () => {
      const item = await create('batch invalid', { summary: 'Kept' });
      const other = await create('batch other');
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: item.id, newSummary: 'x' }, { mediaItemId: other.id, newTitle: null }] }))).toContain('entry 1');
      expect((await byId(item.id)).summary).toBe('Kept');
    });

    it('when an entry has no id', async () => {
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems: [{ newSummary: 'x' }] }))).toContain('mediaItemId');
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('updateMediaItemsAdvanced', { mediaItems: [] })).toBeRejected();
      const mediaItems = Array.from({ length: 51 }, () => ({ mediaItemId: NO_SUCH_ID, newSummary: 'x' }));
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems }))).toContain('mediaItems');
    });
  });
});

contract.describe('deleteMediaItem', () => {
  beforeEach(standInForSideEffects);

  it('removes the item with that title, and announces it', async () => {
    const item = await create('delete');
    expect(await call('deleteMediaItem', { title: item.title })).toEqual(jasmine.objectContaining({ id: item.id, title: item.title, deleted: true }));
    expect(await listed(item.title)).toEqual([]);
    await expectAsync(call('getMediaItemAdvanced', { mediaItemId: item.id })).toBeRejected();
    expect(sent('mediaItemDeleted')).toEqual([jasmine.objectContaining({ mediaItemId: item.id, title: item.title })]);
  });

  it('leaves every other item alone', async () => {
    const kept = await create('kept');
    const deleted = await create('deleted');
    await call('deleteMediaItem', { title: deleted.title });
    expect(await listed(kept.title)).toEqual([jasmine.objectContaining({ id: kept.id })]);
  });

  describe('refuses, removes nothing and announces nothing', () => {
    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('deleteMediaItem', { title }))).toContain(title);
      expect(sent('mediaItemDeleted')).toEqual([]);
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      expect((await refusal(call('deleteMediaItem', { title }))).replace(title, '')).toContain('2');
      expect((await listed(title)).length).toBe(2);
      expect(sent('mediaItemDeleted')).toEqual([]);
    });

    it('without a title', async () => {
      expect(await refusal(call('deleteMediaItem', {}))).toContain('title');
      expect(await refusal(call('deleteMediaItem', { title: '' }))).toContain('title');
      expect(await refusal(call('deleteMediaItem', { title: null }))).toContain('title');
    });
  });
});

contract.describe('deleteMediaItemAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes the item with that id, and announces it', async () => {
    const item = await create('delete by id');
    expect(await call('deleteMediaItemAdvanced', { mediaItemId: item.id })).toEqual(jasmine.objectContaining({ id: item.id, title: item.title, deleted: true }));
    expect(await listed(item.title)).toEqual([]);
    expect(sent('mediaItemDeleted')).toEqual([jasmine.objectContaining({ mediaItemId: item.id })]);
  });

  it('refuses an id that matches nothing, and announces nothing', async () => {
    await expectAsync(call('deleteMediaItemAdvanced', { mediaItemId: NO_SUCH_ID })).toBeRejected();
    expect(sent('mediaItemDeleted')).toEqual([]);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('deleteMediaItemAdvanced', {}))).toContain('mediaItemId');
    expect(await refusal(call('deleteMediaItemAdvanced', { mediaItemId: '' }))).toContain('mediaItemId');
  });
});

contract.describe('deleteMediaItemsAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes every item, and reports each', async () => {
    const one = await create('batch delete one');
    const two = await create('batch delete two');
    expect(await call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: one.id }, { mediaItemId: two.id }] })).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect(await listed(one.title)).toEqual([]);
    expect(await listed(two.title)).toEqual([]);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one id matches nothing', async () => {
      const item = await create('batch keep');
      await expectAsync(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: item.id }, { mediaItemId: NO_SUCH_ID }] })).toBeRejected();
      expect(await listed(item.title)).toEqual([jasmine.objectContaining({ id: item.id })]);
    });

    it('when the same item is listed twice', async () => {
      const item = await create('batch twice');
      await expectAsync(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: item.id }, { mediaItemId: item.id }] })).toBeRejected();
      expect(await listed(item.title)).toEqual([jasmine.objectContaining({ id: item.id })]);
    });

    it('when an entry has no id', async () => {
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [{}] }))).toContain('mediaItemId');
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('deleteMediaItemsAdvanced', { mediaItems: [] })).toBeRejected();
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: Array.from({ length: 51 }, () => ({ mediaItemId: NO_SUCH_ID })) }))).toContain('mediaItems');
    });
  });
});

contract.describe('updateMediaItemCategory', () => {
  beforeEach(standInForSideEffects);

  // A category of this spec's own, with one subcategory.
  const categoryWithSubcategory = async (label) => {
    const name = unique(label);
    await call('createCategory', { name });
    const subcategory = await call('createSubcategory', { categoryName: name, name: 'Sub one' });
    return { name, id: subcategory.category.id, subcategoryId: subcategory.id };
  };

  it('puts an item in a category, and the category\'s list then shows it', async () => {
    const item = await create('in category');
    const category = await categoryWithSubcategory('category');
    const updated = await call('updateMediaItemCategory', { title: item.title, categoryName: category.name, included: true });
    expect(updated).toEqual(jasmine.objectContaining({ id: item.id, categoryIds: [category.id], subcategoryIds: [] }));
    expect((await call('searchMediaItems', { categoryName: category.name })).mediaItems).toEqual([jasmine.objectContaining({ id: item.id })]);
  });

  it('puts an item in a subcategory and its category, and takes it out of each', async () => {
    const item = await create('in subcategory');
    const category = await categoryWithSubcategory('with sub');
    await call('updateMediaItemCategory', { title: item.title, categoryName: category.name, subcategoryName: 'Sub one', included: true });
    expect(await byId(item.id)).toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [category.subcategoryId] }));
    await call('updateMediaItemCategory', { title: item.title, categoryName: category.name, subcategoryName: 'Sub one', included: false });
    expect(await byId(item.id)).toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [] }));
    await call('updateMediaItemCategory', { title: item.title, categoryName: category.name, subcategoryName: 'Sub one', included: true });
    await call('updateMediaItemCategory', { title: item.title, categoryName: category.name, included: false });
    expect(await byId(item.id)).toEqual(jasmine.objectContaining({ categoryIds: [], subcategoryIds: [] }));
  }, 120000);

  it('puts an item in a category only once', async () => {
    const item = await create('once');
    const category = await categoryWithSubcategory('once');
    await call('updateMediaItemCategory', { title: item.title, categoryName: category.name, included: true });
    await call('updateMediaItemCategory', { title: item.title, categoryName: category.name, included: true });
    expect((await byId(item.id)).categoryIds).toEqual([category.id]);
  });

  describe('refuses, and changes nothing', () => {
    it('a category no category has, naming it', async () => {
      const item = await create('no category');
      const name = unique('missing cat');
      expect(await refusal(call('updateMediaItemCategory', { title: item.title, categoryName: name, included: true }))).toContain(name);
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('a subcategory the category does not have, naming it', async () => {
      const item = await create('no subcategory');
      const category = await categoryWithSubcategory('no sub');
      expect(await refusal(call('updateMediaItemCategory', { title: item.title, categoryName: category.name, subcategoryName: 'Sub two', included: true }))).toContain('Sub two');
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('an item title no item has, naming it', async () => {
      const category = await categoryWithSubcategory('no item');
      const title = unique('missing');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name, included: true }))).toContain(title);
    });

    it('without saying whether to put it in or take it out', async () => {
      const item = await create('no choice');
      const category = await categoryWithSubcategory('no choice');
      expect(await refusal(call('updateMediaItemCategory', { title: item.title, categoryName: category.name }))).toContain('included');
      expect(await refusal(call('updateMediaItemCategory', { title: item.title, categoryName: category.name, included: 'yes' }))).toContain('included');
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('without a title or a category', async () => {
      expect(await refusal(call('updateMediaItemCategory', { categoryName: 'Any', included: true }))).toContain('title');
      expect(await refusal(call('updateMediaItemCategory', { title: 'Any', included: true }))).toContain('categoryName');
      expect(await refusal(call('updateMediaItemCategory', { title: 'Any', categoryName: '', included: true }))).toContain('categoryName');
    });
  });
});

contract.describe('updateMediaItemCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('puts the item with that id in a category and a subcategory, by their ids', async () => {
    const item = await create('in category by id');
    const name = unique('category by id');
    await call('createCategory', { name });
    const subcategory = await call('createSubcategory', { categoryName: name, name: 'Sub one' });
    const updated = await call('updateMediaItemCategoryAdvanced', { mediaItemId: item.id, categoryId: subcategory.category.id, subcategoryId: subcategory.id, included: true });
    expect(updated).toEqual(jasmine.objectContaining({ id: item.id, categoryIds: [subcategory.category.id], subcategoryIds: [subcategory.id] }));
    expect(await byId(item.id)).toEqual(jasmine.objectContaining({ categoryIds: [subcategory.category.id], subcategoryIds: [subcategory.id] }));
  });

  describe('refuses, and changes nothing', () => {
    it('an item id that matches nothing', async () => {
      const category = await call('createCategory', { name: unique('category') });
      await expectAsync(call('updateMediaItemCategoryAdvanced', { mediaItemId: NO_SUCH_ID, categoryId: category.id, included: true })).toBeRejected();
    });

    it('a category id that matches nothing', async () => {
      const item = await create('no category id');
      await expectAsync(call('updateMediaItemCategoryAdvanced', { mediaItemId: item.id, categoryId: NO_SUCH_ID, included: true })).toBeRejected();
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('a subcategory id the category does not have', async () => {
      const item = await create('no subcategory id');
      const category = await call('createCategory', { name: unique('category') });
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: item.id, categoryId: category.id, subcategoryId: 'no-such-subcategory', included: true }))).toContain('no-such-subcategory');
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('without its ids, or without saying whether to put it in', async () => {
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { categoryId: NO_SUCH_ID, included: true }))).toContain('mediaItemId');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: NO_SUCH_ID, included: true }))).toContain('categoryId');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: NO_SUCH_ID, categoryId: NO_SUCH_ID }))).toContain('included');
    });
  });
});

contract.describe('updateMediaItemsCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('makes every change, and reports each', async () => {
    const item = await create('batch categories');
    const first = await call('createCategory', { name: unique('batch first') });
    const second = await call('createCategory', { name: unique('batch second') });
    const result = await call('updateMediaItemsCategoryAdvanced', { mediaItems: [
      { mediaItemId: item.id, categoryId: first.id, included: true },
      { mediaItemId: item.id, categoryId: second.id, included: true }
    ] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: item.id }), jasmine.objectContaining({ index: 1, id: item.id })],
      succeeded: 2,
      failed: 0
    }));
    expect((await byId(item.id)).categoryIds).toEqual([first.id, second.id]);
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches nothing', async () => {
      const item = await create('batch unknown');
      const category = await call('createCategory', { name: unique('batch known') });
      await expectAsync(call('updateMediaItemsCategoryAdvanced', { mediaItems: [
        { mediaItemId: item.id, categoryId: category.id, included: true },
        { mediaItemId: item.id, categoryId: NO_SUCH_ID, included: true }
      ] })).toBeRejected();
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('when the same change is listed twice', async () => {
      const item = await create('batch same');
      const category = await call('createCategory', { name: unique('batch same') });
      const entry = { mediaItemId: item.id, categoryId: category.id, included: true };
      await expectAsync(call('updateMediaItemsCategoryAdvanced', { mediaItems: [entry, entry] })).toBeRejected();
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('when one entry is invalid', async () => {
      const item = await create('batch no choice');
      const category = await call('createCategory', { name: unique('batch no choice') });
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems: [
        { mediaItemId: item.id, categoryId: category.id, included: true },
        { mediaItemId: item.id, categoryId: category.id }
      ] }))).toContain('included');
      expect((await byId(item.id)).categoryIds).toEqual([]);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('updateMediaItemsCategoryAdvanced', { mediaItems: [] })).toBeRejected();
      const mediaItems = Array.from({ length: 51 }, (value, index) => ({ mediaItemId: NO_SUCH_ID, categoryId: `${index}`, included: true }));
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems }))).toContain('mediaItems');
    });
  });
});
