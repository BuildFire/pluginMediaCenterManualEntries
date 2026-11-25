// mediaItems: every operation on media items, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// How a call was refused: its code (ContractOperationInvokeError.CODES) and its reason; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => { fail('expected the call to be refused'); return {}; },
  (error) => ({ code: (error && error.code) || 'unknown', reason: reason(error) }));
// What a refusal is expected to be: its code, and a reason naming the text given.
const refused = (code, text) => ({ code, reason: jasmine.stringContaining(text) });
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const SLOW = 120000;
const MISSING_ID = '000000000000000000000000';

// The item as the contract's own read finds it by its title.
const found = (title) => call('getMediaItem', { title });
// Whether the contract's own read still finds an item by that title.
const exists = (title) => found(title).then(() => true, (error) => (error && error.code === 'notFound' ? false : Promise.reject(error)));
const create = async (label, extra) => {
  const title = unique(label);
  const item = await call('createMediaItem', Object.assign({ title }, extra || {}));
  return { title, id: item.id };
};

// Calls nothing here answers, which the operations start without waiting for (the refresh message, deep links, analytics,
// the contract events): spies stand in for them, and Jasmine removes them after each spec.
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
const events = () => buildfire.services.contract.events.send;

// Only the control panel adds media items and categories, and its run comes first: it makes these once, and the app's run
// finds them through the contract's own reads.
const shared = {
  category: 'Post shared media category for the app',
  subcategory: 'Post shared media subcategory for the app',
  inside: 'Post shared media for the app',
  outside: 'Post shared media outside for the app',
  twin: 'Post shared media twin for the app'
};
let madeShared;
const makeShared = async () => {
  const category = await call('createCategory', { name: shared.category });
  const subcategory = await call('createSubcategory', { categoryName: shared.category, name: shared.subcategory });
  const inside = await call('createMediaItem', { title: shared.inside, summary: 'Shown to the app' });
  await call('updateMediaItemCategory', { title: shared.inside, categoryName: shared.category, subcategoryName: shared.subcategory, included: true });
  const outside = await call('createMediaItem', { title: shared.outside });
  await call('createMediaItem', { title: shared.twin });
  await call('createMediaItem', { title: shared.twin });
  return { categoryId: category.id, subcategoryId: subcategory.id, insideId: inside.id, outsideId: outside.id };
};
const findShared = async () => {
  const [category] = (await call('searchCategories', { name: shared.category })).categories;
  if (!category) throw new Error(`no category named "${shared.category}": the control run makes it`);
  const inside = await call('getMediaItem', { title: shared.inside });
  const outside = await call('getMediaItem', { title: shared.outside });
  return { categoryId: category.id, subcategoryId: category.subcategories[0].id, insideId: inside.id, outsideId: outside.id };
};
const sharedForTheApp = () => {
  madeShared = madeShared || (contract.host === 'control' ? makeShared() : findShared());
  return madeShared;
};

// The category and subcategory a control spec puts its items in.
const makeCategory = async (label) => {
  const name = unique(label);
  const category = await call('createCategory', { name });
  const subcategory = await call('createSubcategory', { categoryName: name, name: `${name} sub` });
  return { name, id: category.id, subcategoryName: `${name} sub`, subcategoryId: subcategory.id };
};

contract.describe('searchMediaItems', () => {
  beforeEach(standIns);

  it('finds media items whose title contains the text, with their details', async () => {
    const { insideId } = await sharedForTheApp();
    const result = await call('searchMediaItems', { title: 'shared media for the' });
    expect(result).toEqual(jasmine.objectContaining({ mediaItems: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.mediaItems).toContain(jasmine.objectContaining({ id: insideId, title: shared.inside, summary: 'Shown to the app', categoryIds: jasmine.any(Array) }));
    expect(result.mediaItems.map((item) => item.title)).not.toContain(shared.outside);
  });

  it('matches the title whatever its case', async () => {
    const { insideId } = await sharedForTheApp();
    const { mediaItems } = await call('searchMediaItems', { title: shared.inside.toUpperCase() });
    expect(mediaItems.map((item) => item.id)).toContain(insideId);
  });

  it('narrows to a category, and to one of its subcategories', async () => {
    const { insideId, outsideId } = await sharedForTheApp();
    const inCategory = (await call('searchMediaItems', { title: 'Post shared media', categoryName: shared.category })).mediaItems.map((item) => item.id);
    expect(inCategory).toContain(insideId);
    expect(inCategory).not.toContain(outsideId);
    const inSubcategory = (await call('searchMediaItems', { title: 'Post shared media', categoryName: shared.category, subcategoryName: shared.subcategory })).mediaItems;
    expect(inSubcategory).toEqual([jasmine.objectContaining({ id: insideId })]);
  });

  it('shows every category when none is given', async () => {
    const { insideId, outsideId } = await sharedForTheApp();
    const ids = (await call('searchMediaItems', { title: 'Post shared media' })).mediaItems.map((item) => item.id);
    expect(ids).toEqual(jasmine.arrayContaining([insideId, outsideId]));
  });

  it('pages the results, saying whether there are more', async () => {
    await sharedForTheApp();
    const first = await call('searchMediaItems', { title: 'Post shared media', pageSize: 2 });
    expect(first.mediaItems.length).toBe(2);
    expect(first.total).toBeGreaterThanOrEqual(4);
    expect(first.hasMore).toBe(true);
    const last = await call('searchMediaItems', { title: 'Post shared media', page: 1, pageSize: 2 });
    expect(last.page).toBe(1);
    expect(last.mediaItems.length).toBeGreaterThanOrEqual(1);
    expect(last.total).toBe(first.total);
  });

  it('finds nothing for a title no item has', async () => {
    expect(await call('searchMediaItems', { title: unique('nothing') })).toEqual(jasmine.objectContaining({ mediaItems: [], total: 0, hasMore: false }));
  });

  describe('refuses', () => {
    it('a category no one has', async () => {
      const name = unique('no such category');
      expect(await refusal(call('searchMediaItems', { categoryName: name }))).toEqual(refused('notFound', name));
    });

    it('a subcategory without its category', async () => {
      expect(await refusal(call('searchMediaItems', { subcategoryName: 'Anything' }))).toEqual(refused('validation', 'subcategoryName'));
    });

    it('a subcategory its category does not have', async () => {
      await sharedForTheApp();
      const name = unique('no such subcategory');
      expect(await refusal(call('searchMediaItems', { categoryName: shared.category, subcategoryName: name }))).toEqual(refused('notFound', name));
    });

    it('a page size above 50, or below 1', async () => {
      expect(await refusal(call('searchMediaItems', { pageSize: 51 }))).toEqual(refused('validation', 'pageSize'));
      expect(await refusal(call('searchMediaItems', { pageSize: 0 }))).toEqual(refused('validation', 'pageSize'));
    });

    it('a page below 0', async () => {
      expect(await refusal(call('searchMediaItems', { page: -1 }))).toEqual(refused('validation', 'page'));
    });

    it('an empty title', async () => {
      expect(await refusal(call('searchMediaItems', { title: '' }))).toEqual(refused('validation', 'title'));
    });
  });
});

contract.describe('getMediaItem', () => {
  beforeEach(standIns);

  it('shows the item with that exact title, and everything on its page', async () => {
    const { insideId, categoryId, subcategoryId } = await sharedForTheApp();
    expect(await call('getMediaItem', { title: shared.inside })).toEqual(jasmine.objectContaining({
      id: insideId,
      title: shared.inside,
      summary: 'Shown to the app',
      actionLinks: jasmine.any(Array),
      categoryIds: [categoryId],
      subcategoryIds: [subcategoryId],
      rank: jasmine.any(Number),
      createdOn: jasmine.any(String),
      mediaDate: jasmine.any(String)
    }));
  });

  describe('refuses', () => {
    it('a title no item has', async () => {
      const title = unique('missing');
      expect(await refusal(call('getMediaItem', { title }))).toEqual(refused('notFound', title));
    });

    it('a title two items share, saying how many', async () => {
      await sharedForTheApp();
      const { code, reason: why } = await refusal(call('getMediaItem', { title: shared.twin }));
      expect(code).toBe('conflict');
      expect(why.replace(shared.twin, '')).toContain('2');
    });

    it('without a title, or with an empty one', async () => {
      expect(await refusal(call('getMediaItem', {}))).toEqual(refused('validation', 'title'));
      expect(await refusal(call('getMediaItem', { title: null }))).toEqual(refused('validation', 'title'));
      expect(await refusal(call('getMediaItem', { title: '' }))).toEqual(refused('validation', 'title'));
    });

    it('a title that is not text', async () => {
      expect(await refusal(call('getMediaItem', { title: 42 }))).toEqual(refused('validation', 'title'));
    });
  });
});

contract.describe('getMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('shows the item with that id', async () => {
    const { insideId } = await sharedForTheApp();
    expect(await call('getMediaItemAdvanced', { mediaItemId: insideId })).toEqual(jasmine.objectContaining({ id: insideId, title: shared.inside }));
  });

  describe('refuses', () => {
    it('an id no item has', async () => {
      expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: MISSING_ID }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without an id', async () => {
      expect(await refusal(call('getMediaItemAdvanced', {}))).toEqual(refused('validation', 'mediaItemId'));
      expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: '' }))).toEqual(refused('validation', 'mediaItemId'));
    });
  });
});

contract.describe('createMediaItem', () => {
  beforeEach(standIns);

  it('adds an item from its title, and returns it', async () => {
    const title = unique('create');
    const created = await call('createMediaItem', { title });
    expect(created).toEqual(jasmine.objectContaining({
      id: jasmine.any(String), title, actionLinks: [], categoryIds: [], subcategoryIds: [], rank: jasmine.any(Number),
      mediaDate: jasmine.any(String), createdOn: jasmine.any(String)
    }));
    expect(await found(title)).toEqual(jasmine.objectContaining({ id: created.id, title }));
  });

  it('keeps every detail it is given', async () => {
    const title = unique('full');
    const links = [{ title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' }];
    const details = {
      summary: 'A short summary',
      body: '<p>The body</p>',
      sourceUrl: 'https://example.com/source',
      videoUrl: 'https://example.com/video.mp4',
      audioTitle: 'The song',
      artists: 'The band',
      audioUrl: 'https://example.com/song.mp3'
    };
    await call('createMediaItem', Object.assign({
      title,
      thumbnailImage: ['https://example.com/thumb.png'],
      audioImage: ['https://example.com/audio.png'],
      audioBackgroundImage: ['https://example.com/background.png'],
      mediaDate: '2026-01-15',
      actionLinks: links
    }, details));
    expect(await found(title)).toEqual(jasmine.objectContaining(Object.assign({
      title,
      thumbnailImage: 'https://example.com/thumb.png',
      audioImage: 'https://example.com/audio.png',
      audioBackgroundImage: 'https://example.com/background.png',
      actionLinks: links
    }, details)));
    expect((await found(title)).mediaDate.slice(0, 10)).toBe('2026-01-15');
  });

  it('takes a single image or action, sent without a list, as a list of one', async () => {
    const title = unique('single values');
    const link = { title: 'Call us', action: 'callNumber', phoneNumber: '+15550100' };
    await call('createMediaItem', { title, thumbnailImage: 'https://example.com/single.png', actionLinks: link });
    expect(await found(title)).toEqual(jasmine.objectContaining({ thumbnailImage: 'https://example.com/single.png', actionLinks: [link] }));
  });

  it('announces the new item', async () => {
    const title = unique('announced');
    const { id } = await call('createMediaItem', { title, summary: 'News' });
    expect(events()).toHaveBeenCalledTimes(1);
    expect(events().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemCreated', jasmine.objectContaining({ mediaItemId: id, title, summary: 'News' })]);
  });

  describe('refuses, stores nothing and announces nothing', () => {
    it('without a title, or with an empty one', async () => {
      expect(await refusal(call('createMediaItem', {}))).toEqual(refused('validation', 'title'));
      expect(await refusal(call('createMediaItem', { title: null }))).toEqual(refused('validation', 'title'));
      expect(await refusal(call('createMediaItem', { title: '' }))).toEqual(refused('validation', 'title'));
      expect(events()).not.toHaveBeenCalled();
    });

    it('a title longer than 70 characters', async () => {
      const title = `${unique('long')} ${'x'.repeat(70)}`;
      expect(await refusal(call('createMediaItem', { title }))).toEqual(refused('validation', 'title'));
      expect(await exists(title)).toBe(false);
    });

    it('a summary longer than 250 characters', async () => {
      const title = unique('long summary');
      expect(await refusal(call('createMediaItem', { title, summary: 'x'.repeat(251) }))).toEqual(refused('validation', 'summary'));
      expect(await exists(title)).toBe(false);
    });

    it('more than one thumbnail', async () => {
      const title = unique('two thumbnails');
      const thumbnailImage = ['https://example.com/a.png', 'https://example.com/b.png'];
      expect(await refusal(call('createMediaItem', { title, thumbnailImage }))).toEqual(refused('validation', 'thumbnailImage'));
      expect(await exists(title)).toBe(false);
      expect(events()).not.toHaveBeenCalled();
    });

    it('an action that is not an action item', async () => {
      const title = unique('bad action');
      expect(await refusal(call('createMediaItem', { title, actionLinks: [{ title: 'Nothing' }] }))).toEqual(refused('validation', 'actionLinks'));
      expect(await exists(title)).toBe(false);
    });

    it('a date that is not a date', async () => {
      const title = unique('bad date');
      expect(await refusal(call('createMediaItem', { title, mediaDate: 'someday' }))).toEqual(refused('validation', 'mediaDate'));
      expect(await exists(title)).toBe(false);
    });

    it('a summary that is not text', async () => {
      const title = unique('number summary');
      expect(await refusal(call('createMediaItem', { title, summary: 12 }))).toEqual(refused('validation', 'summary'));
      expect(await exists(title)).toBe(false);
    });
  });
});

contract.describe('createMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('adds every item, and reports each', async () => {
    const titles = [unique('batch one'), unique('batch two')];
    const result = await call('createMediaItemsAdvanced', { mediaItems: [{ title: titles[0] }, { title: titles[1], summary: 'Second' }] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })],
      succeeded: 2,
      failed: 0
    }));
    expect(await found(titles[0])).toEqual(jasmine.objectContaining({ id: result.mediaItems[0].id, title: titles[0] }));
    expect(await found(titles[1])).toEqual(jasmine.objectContaining({ id: result.mediaItems[1].id, summary: 'Second' }));
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: [{ title: valid }, { summary: 'No title' }] }))).toEqual(refused('validation', 'title'));
      expect(await exists(valid)).toBe(false);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: [] }))).toEqual(refused('validation', 'mediaItems'));
    });

    it('when it is left out', async () => {
      expect(await refusal(call('createMediaItemsAdvanced', {}))).toEqual(refused('validation', 'mediaItems'));
    });

    it('when it holds more than 50 entries', async () => {
      const mediaItems = Array.from({ length: 51 }, (value, index) => ({ title: unique(`entry ${index}`) }));
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems }))).toEqual(refused('validation', 'mediaItems'));
      expect(await exists(mediaItems[0].title)).toBe(false);
    });
  });
});

contract.describe('updateMediaItem', () => {
  beforeEach(standIns);

  it('changes only the details it is given, and returns the item', async () => {
    const { title, id } = await create('update', { summary: 'First', artists: 'The band' });
    expect(await call('updateMediaItem', { title, newSummary: 'Second' })).toEqual(jasmine.objectContaining({ id, title, summary: 'Second', artists: 'The band' }));
    expect(await found(title)).toEqual(jasmine.objectContaining({ id, summary: 'Second', artists: 'The band' }));
  });

  it('renames the item', async () => {
    const { title, id } = await create('rename');
    const newTitle = unique('renamed');
    await call('updateMediaItem', { title, newTitle });
    expect(await exists(title)).toBe(false);
    expect(await found(newTitle)).toEqual(jasmine.objectContaining({ id }));
  });

  it('clears a text with null, and with an empty text', async () => {
    const { title } = await create('clear text', { summary: 'Something', audioTitle: 'Song' });
    await call('updateMediaItem', { title, newSummary: null, newAudioTitle: '' });
    expect(await found(title)).toEqual(jasmine.objectContaining({ summary: null, audioTitle: '' }));
  });

  it('replaces the pictures, and removes them with an empty list or null', async () => {
    const { title } = await create('pictures', { thumbnailImage: ['https://example.com/old.png'], audioImage: ['https://example.com/old-audio.png'] });
    await call('updateMediaItem', { title, newThumbnailImage: ['https://example.com/new.png'] });
    expect(await found(title)).toEqual(jasmine.objectContaining({ thumbnailImage: 'https://example.com/new.png', audioImage: 'https://example.com/old-audio.png' }));
    await call('updateMediaItem', { title, newThumbnailImage: [], newAudioImage: null });
    expect(await found(title)).toEqual(jasmine.objectContaining({ thumbnailImage: '', audioImage: '' }));
  });

  it('replaces the actions with the ones given, and removes them all with an empty list', async () => {
    const first = { title: 'First', action: 'linkToWeb', url: 'https://example.com/first' };
    const second = { title: 'Second', action: 'linkToWeb', url: 'https://example.com/second' };
    const { title } = await create('actions', { actionLinks: [first] });
    await call('updateMediaItem', { title, newActionLinks: [second] });
    expect((await found(title)).actionLinks).toEqual([second]);
    await call('updateMediaItem', { title, newActionLinks: [] });
    expect((await found(title)).actionLinks).toEqual([]);
  });

  it('changes the date and the formatted content', async () => {
    const { title } = await create('date');
    await call('updateMediaItem', { title, newMediaDate: '2026-03-01', newBody: '<p>New body</p>' });
    const item = await found(title);
    expect(item.mediaDate.slice(0, 10)).toBe('2026-03-01');
    expect(item.body).toBe('<p>New body</p>');
  });

  it('announces the change, with the title it had before', async () => {
    const { title, id } = await create('announce update');
    const newTitle = unique('announced update');
    events().calls.reset();
    await call('updateMediaItem', { title, newTitle });
    expect(events().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemUpdated', jasmine.objectContaining({ mediaItemId: id, title: newTitle, previousTitle: title })]);
  });

  describe('refuses, changes nothing and announces nothing', () => {
    it('a title no item has', async () => {
      const title = unique('missing');
      events().calls.reset();
      expect(await refusal(call('updateMediaItem', { title, newSummary: 'x' }))).toEqual(refused('notFound', title));
      expect(events()).not.toHaveBeenCalled();
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createMediaItem', { title, summary: 'One' });
      await call('createMediaItem', { title, summary: 'Two' });
      events().calls.reset();
      const { code, reason: why } = await refusal(call('updateMediaItem', { title, newSummary: 'x' }));
      expect(code).toBe('conflict');
      expect(why.replace(title, '')).toContain('2');
      const summaries = (await call('searchMediaItems', { title })).mediaItems.map((item) => item.summary);
      expect(summaries.sort()).toEqual(['One', 'Two']);
      expect(events()).not.toHaveBeenCalled();
    });

    it('removing the title', async () => {
      const { title } = await create('keep title');
      expect(await refusal(call('updateMediaItem', { title, newTitle: null }))).toEqual(refused('validation', 'newTitle'));
      expect(await refusal(call('updateMediaItem', { title, newTitle: '' }))).toEqual(refused('validation', 'newTitle'));
      expect(await found(title)).toEqual(jasmine.objectContaining({ title }));
    });

    it('a call that changes nothing', async () => {
      const { title } = await create('nothing');
      expect((await refusal(call('updateMediaItem', { title }))).code).toBe('validation');
    });

    it('without a title', async () => {
      expect(await refusal(call('updateMediaItem', { newSummary: 'x' }))).toEqual(refused('validation', 'title'));
      expect(await refusal(call('updateMediaItem', { title: '', newSummary: 'x' }))).toEqual(refused('validation', 'title'));
    });

    it('a date that is not a date', async () => {
      const { title } = await create('bad new date', { mediaDate: '2026-01-15' });
      expect(await refusal(call('updateMediaItem', { title, newMediaDate: 'someday' }))).toEqual(refused('validation', 'newMediaDate'));
      expect((await found(title)).mediaDate.slice(0, 10)).toBe('2026-01-15');
    });

    it('a view-count choice that is not true or false', async () => {
      const { title } = await create('bad reset', { summary: 'Kept' });
      expect(await refusal(call('updateMediaItem', { title, newSummary: 'x', resetViews: 'yes' }))).toEqual(refused('validation', 'resetViews'));
      expect((await found(title)).summary).toBe('Kept');
    });

    it('more than one thumbnail', async () => {
      const { title } = await create('two new thumbnails', { thumbnailImage: ['https://example.com/kept.png'] });
      const newThumbnailImage = ['https://example.com/a.png', 'https://example.com/b.png'];
      expect(await refusal(call('updateMediaItem', { title, newThumbnailImage }))).toEqual(refused('validation', 'newThumbnailImage'));
      expect((await found(title)).thumbnailImage).toBe('https://example.com/kept.png');
    });
  });
});

contract.describe('updateMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('changes the item with that id', async () => {
    const { title, id } = await create('update by id', { summary: 'First' });
    expect(await call('updateMediaItemAdvanced', { mediaItemId: id, newSummary: 'Second' })).toEqual(jasmine.objectContaining({ id, title, summary: 'Second' }));
    expect((await found(title)).summary).toBe('Second');
  });

  it('clears a nullable detail', async () => {
    const { title, id } = await create('clear by id', { sourceUrl: 'https://example.com/source' });
    await call('updateMediaItemAdvanced', { mediaItemId: id, newSourceUrl: null });
    expect((await found(title)).sourceUrl).toBeNull();
  });

  describe('refuses, and changes nothing', () => {
    it('an id no item has', async () => {
      expect(await refusal(call('updateMediaItemAdvanced', { mediaItemId: MISSING_ID, newSummary: 'x' }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without an id', async () => {
      expect(await refusal(call('updateMediaItemAdvanced', { newSummary: 'x' }))).toEqual(refused('validation', 'mediaItemId'));
    });

    it('a call that changes nothing', async () => {
      const { id } = await create('nothing by id');
      expect((await refusal(call('updateMediaItemAdvanced', { mediaItemId: id }))).code).toBe('validation');
    });

    it('removing the title', async () => {
      const { title, id } = await create('keep title by id');
      expect(await refusal(call('updateMediaItemAdvanced', { mediaItemId: id, newTitle: null }))).toEqual(refused('validation', 'newTitle'));
      expect(await found(title)).toEqual(jasmine.objectContaining({ id }));
    });
  });
});

contract.describe('updateMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('changes every item, and reports each', async () => {
    const one = await create('batch update one', { summary: 'Before' });
    const two = await create('batch update two', { summary: 'Before' });
    const result = await call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: one.id, newSummary: 'After one' }, { mediaItemId: two.id, newSummary: null }] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect((await found(one.title)).summary).toBe('After one');
    expect((await found(two.title)).summary).toBeNull();
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches no item', async () => {
      const kept = await create('batch kept', { summary: 'Before' });
      const mediaItems = [{ mediaItemId: kept.id, newSummary: 'After' }, { mediaItemId: MISSING_ID, newSummary: 'After' }];
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems }))).toEqual(refused('notFound', MISSING_ID));
      expect((await found(kept.title)).summary).toBe('Before');
    });

    it('when the same item is listed twice', async () => {
      const kept = await create('batch twice', { summary: 'Before' });
      const mediaItems = [{ mediaItemId: kept.id, newSummary: 'One' }, { mediaItemId: kept.id, newSummary: 'Two' }];
      expect((await refusal(call('updateMediaItemsAdvanced', { mediaItems }))).code).toBe('validation');
      expect((await found(kept.title)).summary).toBe('Before');
    });

    it('when one entry is invalid', async () => {
      const kept = await create('batch invalid', { summary: 'Before' });
      const mediaItems = [{ mediaItemId: kept.id, newSummary: 'After' }, { mediaItemId: kept.id.split('').reverse().join(''), newTitle: null }];
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems }))).toEqual(refused('validation', 'newTitle'));
      expect((await found(kept.title)).summary).toBe('Before');
    });

    it('when it is empty', async () => {
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems: [] }))).toEqual(refused('validation', 'mediaItems'));
    });
  });
});

contract.describe('deleteMediaItem', () => {
  beforeEach(standIns);

  it('removes the item with that title, and announces it', async () => {
    const { title, id } = await create('delete');
    events().calls.reset();
    expect(await call('deleteMediaItem', { title })).toEqual(jasmine.objectContaining({ id, title, deleted: true }));
    expect(await exists(title)).toBe(false);
    expect(events().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemDeleted', jasmine.objectContaining({ mediaItemId: id, title })]);
  });

  it('leaves every other item alone', async () => {
    const kept = await create('kept');
    const { title } = await create('deleted');
    await call('deleteMediaItem', { title });
    expect(await found(kept.title)).toEqual(jasmine.objectContaining({ id: kept.id }));
  });

  describe('refuses, removes nothing and announces nothing', () => {
    it('a title no item has', async () => {
      const title = unique('missing');
      events().calls.reset();
      expect(await refusal(call('deleteMediaItem', { title }))).toEqual(refused('notFound', title));
      expect(events()).not.toHaveBeenCalled();
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared delete');
      await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      events().calls.reset();
      const { code, reason: why } = await refusal(call('deleteMediaItem', { title }));
      expect(code).toBe('conflict');
      expect(why.replace(title, '')).toContain('2');
      expect((await call('searchMediaItems', { title })).mediaItems.length).toBe(2);
      expect(events()).not.toHaveBeenCalled();
    });

    it('without a title', async () => {
      expect(await refusal(call('deleteMediaItem', {}))).toEqual(refused('validation', 'title'));
      expect(await refusal(call('deleteMediaItem', { title: '' }))).toEqual(refused('validation', 'title'));
    });
  });
});

contract.describe('deleteMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('removes the item with that id', async () => {
    const { title, id } = await create('delete by id');
    expect(await call('deleteMediaItemAdvanced', { mediaItemId: id })).toEqual(jasmine.objectContaining({ id, title, deleted: true }));
    expect(await exists(title)).toBe(false);
  });

  describe('refuses', () => {
    it('an id no item has', async () => {
      expect(await refusal(call('deleteMediaItemAdvanced', { mediaItemId: MISSING_ID }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without an id', async () => {
      expect(await refusal(call('deleteMediaItemAdvanced', {}))).toEqual(refused('validation', 'mediaItemId'));
    });
  });
});

contract.describe('deleteMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('removes every item, and reports each', async () => {
    const one = await create('batch delete one');
    const two = await create('batch delete two');
    expect(await call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: one.id }, { mediaItemId: two.id }] })).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect(await exists(one.title)).toBe(false);
    expect(await exists(two.title)).toBe(false);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one id matches no item', async () => {
      const kept = await create('batch delete kept');
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: kept.id }, { mediaItemId: MISSING_ID }] }))).toEqual(refused('notFound', MISSING_ID));
      expect(await exists(kept.title)).toBe(true);
    });

    it('when the same item is listed twice', async () => {
      const kept = await create('batch delete twice');
      expect((await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: kept.id }, { mediaItemId: kept.id }] }))).code).toBe('validation');
      expect(await exists(kept.title)).toBe(true);
    });

    it('when an entry has no id', async () => {
      const kept = await create('batch delete no id');
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: kept.id }, {}] }))).toEqual(refused('validation', 'mediaItemId'));
      expect(await exists(kept.title)).toBe(true);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [] }))).toEqual(refused('validation', 'mediaItems'));
    });
  });
});

contract.describe('updateMediaItemOrder', () => {
  beforeEach(standIns);

  it('moves the item to the first place of the manual order', async () => {
    const { title, id } = await create('first place');
    expect(await call('updateMediaItemOrder', { title, position: 1 })).toEqual(jasmine.objectContaining({ id, title, rank: 1 }));
    expect((await found(title)).rank).toBe(1);
  }, SLOW);

  it('moves the item behind the one in first place', async () => {
    const first = await create('order first');
    const second = await create('order second');
    await call('updateMediaItemOrder', { title: first.title, position: 1 });
    await call('updateMediaItemOrder', { title: second.title, position: 2 });
    expect((await found(first.title)).rank).toBe(1);
    expect((await found(second.title)).rank).toBe(2);
  }, SLOW);

  describe('refuses, and moves nothing', () => {
    it('a place before the first', async () => {
      const { title } = await create('place zero');
      expect(await refusal(call('updateMediaItemOrder', { title, position: 0 }))).toEqual(refused('validation', 'position'));
    });

    it('a place past the last item', async () => {
      const { title } = await create('place past');
      const { rank } = await found(title);
      expect(await refusal(call('updateMediaItemOrder', { title, position: 100000 }))).toEqual(refused('validation', 'position'));
      expect((await found(title)).rank).toBe(rank);
    }, SLOW);

    it('a place that is not a whole number', async () => {
      const { title } = await create('place text');
      expect(await refusal(call('updateMediaItemOrder', { title, position: '1' }))).toEqual(refused('validation', 'position'));
    });

    it('a title no item has', async () => {
      const title = unique('missing');
      expect(await refusal(call('updateMediaItemOrder', { title, position: 1 }))).toEqual(refused('notFound', title));
    });

    it('without a title', async () => {
      expect(await refusal(call('updateMediaItemOrder', { position: 1 }))).toEqual(refused('validation', 'title'));
    });
  });
});

contract.describe('updateMediaItemOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves the item with that id to the first place', async () => {
    const { title, id } = await create('first place by id');
    expect(await call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 1 })).toEqual(jasmine.objectContaining({ id, rank: 1 }));
    expect((await found(title)).rank).toBe(1);
  }, SLOW);

  describe('refuses', () => {
    it('an id no item has', async () => {
      expect(await refusal(call('updateMediaItemOrderAdvanced', { mediaItemId: MISSING_ID, position: 1 }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without an id', async () => {
      expect(await refusal(call('updateMediaItemOrderAdvanced', { position: 1 }))).toEqual(refused('validation', 'mediaItemId'));
    });

    it('a place before the first', async () => {
      const { id } = await create('place zero by id');
      expect(await refusal(call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 0 }))).toEqual(refused('validation', 'position'));
    });
  });
});

contract.describe('updateMediaItemCategory', () => {
  beforeEach(standIns);

  it('puts the item in a category, and takes it out', async () => {
    const category = await makeCategory('item category');
    const { title } = await create('in category');
    expect(await call('updateMediaItemCategory', { title, categoryName: category.name, included: true })).toEqual(jasmine.objectContaining({ title, categoryIds: [category.id] }));
    expect((await call('searchMediaItems', { title, categoryName: category.name })).mediaItems).toEqual([jasmine.objectContaining({ title })]);
    await call('updateMediaItemCategory', { title, categoryName: category.name, included: false });
    expect((await found(title)).categoryIds).toEqual([]);
  });

  it('puts the item in a subcategory, and taking it out of the category takes it out of the subcategory too', async () => {
    const category = await makeCategory('item subcategory');
    const { title } = await create('in subcategory');
    await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: category.subcategoryName, included: true });
    expect(await found(title)).toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [category.subcategoryId] }));
    await call('updateMediaItemCategory', { title, categoryName: category.name, included: false });
    expect(await found(title)).toEqual(jasmine.objectContaining({ categoryIds: [], subcategoryIds: [] }));
  });

  it('takes the item out of a subcategory only', async () => {
    const category = await makeCategory('out of subcategory');
    const { title } = await create('out of sub');
    await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: category.subcategoryName, included: true });
    await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: category.subcategoryName, included: false });
    expect(await found(title)).toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [] }));
  });

  describe('refuses, and changes nothing', () => {
    it('without saying whether to put it in or take it out', async () => {
      const category = await makeCategory('no included');
      const { title } = await create('no included');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name }))).toEqual(refused('validation', 'included'));
      expect((await found(title)).categoryIds).toEqual([]);
    });

    it('a category no one has', async () => {
      const { title } = await create('no category');
      const categoryName = unique('no such category');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName, included: true }))).toEqual(refused('notFound', categoryName));
    });

    it('a subcategory its category does not have', async () => {
      const category = await makeCategory('no subcategory');
      const { title } = await create('no subcategory');
      const subcategoryName = unique('no such subcategory');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName, included: true }))).toEqual(refused('notFound', subcategoryName));
      expect((await found(title)).categoryIds).toEqual([]);
    });

    it('a title no item has', async () => {
      const category = await makeCategory('no item');
      const title = unique('missing');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name, included: true }))).toEqual(refused('notFound', title));
    });

    it('without a category', async () => {
      const { title } = await create('without category');
      expect(await refusal(call('updateMediaItemCategory', { title, included: true }))).toEqual(refused('validation', 'categoryName'));
    });
  });
});

contract.describe('updateMediaItemCategoryAdvanced', () => {
  beforeEach(standIns);

  it('puts the item in a subcategory, using their ids', async () => {
    const category = await makeCategory('ids category');
    const { title, id } = await create('in by ids');
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, subcategoryId: category.subcategoryId, included: true }))
      .toEqual(jasmine.objectContaining({ id, categoryIds: [category.id], subcategoryIds: [category.subcategoryId] }));
    expect(await found(title)).toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [category.subcategoryId] }));
  });

  describe('refuses, and changes nothing', () => {
    it('an item id no item has', async () => {
      const category = await makeCategory('ids no item');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: MISSING_ID, categoryId: category.id, included: true }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('a category id no category has', async () => {
      const { title, id } = await create('ids no category');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: MISSING_ID, included: true }))).toEqual(refused('notFound', MISSING_ID));
      expect((await found(title)).categoryIds).toEqual([]);
    });

    it('a subcategory id its category does not have', async () => {
      const category = await makeCategory('ids no subcategory');
      const { title, id } = await create('ids no subcategory');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, subcategoryId: 'no-such-subcategory', included: true })))
        .toEqual(refused('notFound', 'no-such-subcategory'));
      expect((await found(title)).categoryIds).toEqual([]);
    });

    it('without saying whether to put it in or take it out', async () => {
      const category = await makeCategory('ids no included');
      const { id } = await create('ids no included');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id }))).toEqual(refused('validation', 'included'));
    });
  });
});

contract.describe('updateMediaItemsCategoryAdvanced', () => {
  beforeEach(standIns);

  it('applies every change, and reports each', async () => {
    const category = await makeCategory('batch category');
    const one = await create('batch category one');
    const two = await create('batch category two');
    const result = await call('updateMediaItemsCategoryAdvanced', { mediaItems: [
      { mediaItemId: one.id, categoryId: category.id, included: true },
      { mediaItemId: two.id, categoryId: category.id, subcategoryId: category.subcategoryId, included: true }
    ] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect((await found(one.title)).categoryIds).toEqual([category.id]);
    expect((await found(two.title)).subcategoryIds).toEqual([category.subcategoryId]);
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches nothing', async () => {
      const category = await makeCategory('batch category missing');
      const kept = await create('batch category kept');
      const mediaItems = [{ mediaItemId: kept.id, categoryId: category.id, included: true }, { mediaItemId: MISSING_ID, categoryId: category.id, included: true }];
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems }))).toEqual(refused('notFound', MISSING_ID));
      expect((await found(kept.title)).categoryIds).toEqual([]);
    });

    it('when the same change is listed twice', async () => {
      const category = await makeCategory('batch category twice');
      const kept = await create('batch category twice');
      const entry = { mediaItemId: kept.id, categoryId: category.id, included: true };
      expect((await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems: [entry, entry] }))).code).toBe('validation');
      expect((await found(kept.title)).categoryIds).toEqual([]);
    });

    it('when an entry does not say whether to put it in or take it out', async () => {
      const category = await makeCategory('batch category invalid');
      const kept = await create('batch category invalid');
      const mediaItems = [{ mediaItemId: kept.id, categoryId: category.id, included: true }, { mediaItemId: kept.id, categoryId: category.id, subcategoryId: category.subcategoryId }];
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems }))).toEqual(refused('validation', 'included'));
      expect((await found(kept.title)).categoryIds).toEqual([]);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems: [] }))).toEqual(refused('validation', 'mediaItems'));
    });
  });
});
