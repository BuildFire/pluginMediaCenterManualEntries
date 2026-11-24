// mediaItems: every operation on media items, their manual order and their categories, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
let sequence = 0;
// Short labels: a media title holds at most 70 characters, and this adds about 30.
const unique = (label) => `${label} ${++sequence} (${contract.host}) ${Date.now()}`;
// One word, for the items a spec finds through the title search and expects to be the only ones holding it.
const stamp = (label) => `${label}${++sequence}${contract.host}${Date.now()}`;
const missingId = '000000000000000000000000';
const action = { title: 'Visit website', action: 'linkToWeb', url: 'https://example.com' };
// What the contract's own reads find.
const listed = async (title) => (await call('searchMediaItems', { title, pageSize: 50 })).mediaItems;
const item = (title) => call('getMediaItem', { title });
const create = (label, extra) => call('createMediaItem', Object.assign({ title: unique(label) }, extra || {}));
const newCategory = async (label, subcategoryNames) => {
  const made = await call('createCategory', { name: unique(label) });
  for (const name of subcategoryNames || []) {
    await call('createSubcategory', { categoryName: made.name, name });
  }
  return (await call('searchCategories', { name: made.name })).categories.find((record) => record.id === made.id);
};
// Calls nothing here answers. The plugin's own bookkeeping (analytics, deep links, the widget's refresh message) is not
// part of the contract: these spies only answer. The contract events are asserted where the manifest declares them.
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
const sent = () => buildfire.services.contract.events.send;
// Every required parameter left out, null and empty is refused, naming it, and nothing is written.
const refusesEachRequired = (operation, parameters, required, unchanged) => required.forEach((name) => {
  [['without', undefined], ['with a null', null], ['with an empty', '']].forEach(([how, value]) => {
    it(`${how} ${name}`, async () => {
      const given = Object.assign({}, await parameters());
      if (value === undefined) delete given[name];
      else given[name] = value;
      expect(await refusal(call(operation, given))).toContain(name);
      if (unchanged) await unchanged(given);
    });
  });
});
// Only the control panel makes media items and categories, and its run comes first: it makes these once, and the app's run finds them.
const appTitle = 'Media for the app';
const appCategory = 'Media category for the app';
const appSubcategory = 'Media subcategory for the app';
let madeForTheApp;
const forTheApp = () => {
  madeForTheApp = madeForTheApp || (contract.host === 'control'
    ? (async () => {
      await call('createCategory', { name: appCategory });
      await call('createSubcategory', { categoryName: appCategory, name: appSubcategory });
      await call('createMediaItem', { title: appTitle, summary: 'Made by the control run', thumbnailImage: ['https://example.com/app.png'], actionLinks: [action] });
      return call('updateMediaItemCategory', { title: appTitle, categoryName: appCategory, subcategoryName: appSubcategory, included: true });
    })()
    : call('getMediaItem', { title: appTitle }).catch((error) => Promise.reject(new Error(`no media item titled "${appTitle}": the control run makes it (${reason(error)})`))));
  return madeForTheApp;
};

contract.describe('searchMediaItems', () => {
  beforeEach(standIns);

  it('finds the item the control panel made, by part of its title, with its details', async () => {
    const made = await forTheApp();
    const result = await call('searchMediaItems', { title: 'media for the app' });
    expect(result).toEqual(jasmine.objectContaining({ mediaItems: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.mediaItems).toContain(jasmine.objectContaining({
      id: made.id, title: appTitle, summary: 'Made by the control run', thumbnailImage: 'https://example.com/app.png', actionLinks: [jasmine.objectContaining(action)],
      categoryIds: made.categoryIds, subcategoryIds: made.subcategoryIds, rank: jasmine.any(Number), createdOn: jasmine.any(String), mediaDate: jasmine.any(String)
    }));
  });

  it('narrows to a category and to one of its subcategories', async () => {
    const made = await forTheApp();
    const inCategory = await call('searchMediaItems', { title: appTitle, categoryName: appCategory });
    expect(inCategory.mediaItems.map((found) => found.id)).toEqual([made.id]);
    const inSubcategory = await call('searchMediaItems', { title: appTitle, categoryName: appCategory, subcategoryName: appSubcategory });
    expect(inSubcategory.mediaItems.map((found) => found.id)).toEqual([made.id]);
  });

  it('finds nothing for a title no item has', async () => {
    expect(await call('searchMediaItems', { title: stamp('nothing') })).toEqual(jasmine.objectContaining({ mediaItems: [], total: 0, page: 0, hasMore: false }));
  });

  it('shows every item when nothing narrows it, 20 a page', async () => {
    await forTheApp();
    const result = await call('searchMediaItems', {});
    expect(result.total).toBeGreaterThan(0);
    expect(result.mediaItems.length).toBe(Math.min(result.total, 20));
    expect(result.hasMore).toBe(result.total > 20);
  });

  if (contract.host === 'control') {
    it('shows 20 a page when no page size is given, and the rest on the next page', async () => {
      // More items than a page, made in one call to the contract's batch operation, given the time that takes.
      const word = stamp('paged');
      const made = await call('createMediaItemsAdvanced', { mediaItems: Array.from({ length: 21 }, (value, index) => ({ title: `${word} ${index}` })) });
      expect(made.succeeded).toBe(21);
      const first = await call('searchMediaItems', { title: word });
      expect(first).toEqual(jasmine.objectContaining({ total: 21, page: 0, hasMore: true }));
      expect(first.mediaItems.length).toBe(20);
      const second = await call('searchMediaItems', { title: word, page: 1 });
      expect(second).toEqual(jasmine.objectContaining({ total: 21, page: 1, hasMore: false }));
      expect(second.mediaItems.length).toBe(1);
      const small = await call('searchMediaItems', { title: word, pageSize: 5, page: 4 });
      expect(small.mediaItems.length).toBe(1);
    }, 180000);

    it('lists the items in the order the owner chose', async () => {
      const word = stamp('ordered');
      await call('createMediaItemsAdvanced', { mediaItems: ['Beta', 'Alpha', 'Gamma'].map((name) => ({ title: `${word} ${name}` })) });
      await call('updateSettings', { mediaSortOrder: 'Media Title A-Z' });
      expect((await call('searchMediaItems', { title: word })).mediaItems.map((found) => found.title))
        .toEqual([`${word} Alpha`, `${word} Beta`, `${word} Gamma`]);
      await call('updateSettings', { mediaSortOrder: 'Media Title Z-A' });
      expect((await call('searchMediaItems', { title: word })).mediaItems.map((found) => found.title))
        .toEqual([`${word} Gamma`, `${word} Beta`, `${word} Alpha`]);
    }, 120000);
  }

  describe('refuses', () => {
    it('a subcategory without its category', async () => {
      expect(await refusal(call('searchMediaItems', { subcategoryName: appSubcategory }))).toContain('subcategoryName');
    });

    it('a category nothing is named, naming it', async () => {
      const name = unique('no category');
      expect(await refusal(call('searchMediaItems', { categoryName: name }))).toContain(name);
    });

    it('a subcategory the category does not have, naming it', async () => {
      await forTheApp();
      expect(await refusal(call('searchMediaItems', { categoryName: appCategory, subcategoryName: 'No such subcategory' }))).toContain('No such subcategory');
    });

    it('a page size above 50 or below 1', async () => {
      expect(await refusal(call('searchMediaItems', { pageSize: 51 }))).toContain('pageSize');
      expect(await refusal(call('searchMediaItems', { pageSize: 0 }))).toContain('pageSize');
    });

    it('a page below 0, or one that is not a number', async () => {
      expect(await refusal(call('searchMediaItems', { page: -1 }))).toContain('page');
      expect(await refusal(call('searchMediaItems', { page: 'first' }))).toContain('page');
    });

    it('an empty title, or one that is not text', async () => {
      expect(await refusal(call('searchMediaItems', { title: '' }))).toContain('title');
      expect(await refusal(call('searchMediaItems', { title: 42 }))).toContain('title');
    });
  });
});

contract.describe('getMediaItem', () => {
  beforeEach(standIns);

  it('finds one item by its exact title, with everything on its page', async () => {
    const made = await forTheApp();
    expect(await call('getMediaItem', { title: appTitle })).toEqual(jasmine.objectContaining({
      id: made.id, title: appTitle, summary: 'Made by the control run', thumbnailImage: 'https://example.com/app.png', actionLinks: [jasmine.objectContaining(action)],
      categoryIds: made.categoryIds, subcategoryIds: made.subcategoryIds
    }));
  });

  it('refuses a title no item has, naming it', async () => {
    const title = unique('missing');
    expect(await refusal(call('getMediaItem', { title }))).toContain(title);
  });

  it('refuses without a title, or with a null or empty one', async () => {
    expect(await refusal(call('getMediaItem', {}))).toContain('title');
    expect(await refusal(call('getMediaItem', { title: null }))).toContain('title');
    expect(await refusal(call('getMediaItem', { title: '' }))).toContain('title');
  });

  if (contract.host === 'control') {
    it('refuses a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      expect((await refusal(call('getMediaItem', { title }))).replace(title, '')).toContain('2');
    });
  }
});

contract.describe('getMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('finds one item by its id', async () => {
    const made = await forTheApp();
    expect(await call('getMediaItemAdvanced', { mediaItemId: made.id })).toEqual(jasmine.objectContaining({
      id: made.id, title: appTitle, summary: 'Made by the control run', thumbnailImage: 'https://example.com/app.png'
    }));
  });

  it('refuses an id that matches nothing', async () => {
    expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: missingId }))).toContain(missingId);
  });

  it('refuses without an id, or with a null or empty one', async () => {
    expect(await refusal(call('getMediaItemAdvanced', {}))).toContain('mediaItemId');
    expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: null }))).toContain('mediaItemId');
    expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: '' }))).toContain('mediaItemId');
  });
});

// controlBackground only (with the server): the blocks from here on run in the control frame, where the datastore is writable.
contract.describe('createMediaItem', () => {
  beforeEach(standIns);

  it("adds an item from its title alone, with the form's defaults, and announces it", async () => {
    const title = unique('item');
    const made = await call('createMediaItem', { title });
    expect(made).toEqual(jasmine.objectContaining({
      id: jasmine.any(String), title, actionLinks: [], categoryIds: [], subcategoryIds: [], rank: jasmine.any(Number), createdOn: jasmine.any(String), mediaDate: jasmine.any(String)
    }));
    // Leaving the media date out dates the item today.
    expect(Math.abs(new Date(made.mediaDate).getTime() - Date.now())).toBeLessThan(10 * 60 * 1000);
    expect(await item(title)).toEqual(jasmine.objectContaining({ id: made.id, title }));
    expect(sent().calls.count()).toBe(1);
    expect(sent().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemCreated', {
      mediaItemId: made.id, title, summary: null, thumbnailImage: null, videoUrl: null, audioUrl: null, mediaDate: made.mediaDate, createdAt: made.createdOn
    }]);
  });

  it('adds an item with every detail, keeping each picture as one link', async () => {
    const title = unique('full');
    const details = {
      title,
      summary: 'A short summary',
      body: '<p>The body</p>',
      sourceUrl: 'https://example.com/source',
      videoUrl: 'https://example.com/video.mp4',
      audioTitle: 'Audio title',
      artists: 'Some artists',
      audioUrl: 'https://example.com/audio.mp3',
      thumbnailImage: ['https://example.com/thumb.png'],
      audioImage: ['https://example.com/audio.png'],
      audioBackgroundImage: ['https://example.com/background.png'],
      mediaDate: '2026-01-15',
      actionLinks: [action]
    };
    const expected = Object.assign({}, details, {
      thumbnailImage: 'https://example.com/thumb.png',
      audioImage: 'https://example.com/audio.png',
      audioBackgroundImage: 'https://example.com/background.png',
      mediaDate: '2026-01-15T00:00:00.000Z',
      actionLinks: [jasmine.objectContaining(action)]
    });
    expect(await call('createMediaItem', details)).toEqual(jasmine.objectContaining(expected));
    expect(await item(title)).toEqual(jasmine.objectContaining(expected));
    expect(sent().calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({
      title, summary: 'A short summary', thumbnailImage: 'https://example.com/thumb.png', videoUrl: 'https://example.com/video.mp4',
      audioUrl: 'https://example.com/audio.mp3', mediaDate: '2026-01-15T00:00:00.000Z'
    }));
  });

  it('takes a single picture or action given on its own, as a list holding one', async () => {
    const title = unique('single');
    const made = await call('createMediaItem', { title, thumbnailImage: 'https://example.com/single.png', actionLinks: action });
    expect(made).toEqual(jasmine.objectContaining({ thumbnailImage: 'https://example.com/single.png', actionLinks: [jasmine.objectContaining(action)] }));
    expect(await item(title)).toEqual(jasmine.objectContaining({ thumbnailImage: 'https://example.com/single.png', actionLinks: [jasmine.objectContaining(action)] }));
  });

  it('takes a title of exactly 70 characters', async () => {
    const base = unique('long');
    const title = `${base}${'x'.repeat(70 - base.length)}`;
    expect((await call('createMediaItem', { title })).title).toBe(title);
    expect((await item(title)).title).toBe(title);
  });

  describe('refuses, stores nothing and announces nothing', () => {
    const nothingStored = async (parameters) => {
      if (typeof parameters.title === 'string' && parameters.title) expect(await listed(parameters.title)).toEqual([]);
      expect(sent()).not.toHaveBeenCalled();
    };
    refusesEachRequired('createMediaItem', async () => ({ title: unique('required') }), ['title'], nothingStored);

    const refuses = (what, label, extra, named) => it(what, async () => {
      const parameters = Object.assign({ title: unique(label) }, extra);
      expect(await refusal(call('createMediaItem', parameters))).toContain(named);
      await nothingStored(parameters);
    });
    refuses('a title longer than 70 characters', 'long', { title: `long ${'x'.repeat(70)}` }, 'title');
    refuses('a title that is not text', 'title type', { title: 42 }, 'title');
    refuses('a summary longer than 250 characters', 'long summary', { summary: 'x'.repeat(251) }, 'summary');
    refuses('a summary that is not text', 'summary type', { summary: 42 }, 'summary');
    refuses('an audio title longer than 70 characters', 'long audio', { audioTitle: 'x'.repeat(71) }, 'audioTitle');
    refuses('artists longer than 70 characters', 'long artists', { artists: 'x'.repeat(71) }, 'artists');
    refuses('a body that is not text', 'body type', { body: { html: '<p>x</p>' } }, 'body');
    refuses('two thumbnails', 'two images', { thumbnailImage: ['https://example.com/a.png', 'https://example.com/b.png'] }, 'thumbnailImage');
    refuses('an icon for a thumbnail, where only pictures are offered', 'icon image', { thumbnailImage: ['glyphicon glyphicon-star'] }, 'thumbnailImage');
    refuses('an audio background that is not a link', 'bad background', { audioBackgroundImage: [42] }, 'audioBackgroundImage');
    refuses('a media date that is not a date', 'bad date', { mediaDate: 'yesterday' }, 'mediaDate');
    refuses('actions that are not action items', 'bad actions', { actionLinks: ['https://example.com'] }, 'actionLinks');
    refuses('an action without its action', 'bad action', { actionLinks: [{ title: 'Nothing' }] }, 'actionLinks');
  });
});

contract.describe('updateMediaItemOrder', () => {
  beforeEach(standIns);

  it('moves the item to the first place of the manual order', async () => {
    const { title, id } = await create('move first');
    expect(await call('updateMediaItemOrder', { title, position: 1 })).toEqual(jasmine.objectContaining({ id, title, rank: 1 }));
    expect((await item(title)).rank).toBe(1);
  }, 180000);

  it('moves the item to the second place, after the first', async () => {
    const first = await create('move one');
    const second = await create('move two');
    await call('updateMediaItemOrder', { title: first.title, position: 1 });
    await call('updateMediaItemOrder', { title: second.title, position: 2 });
    expect((await item(first.title)).rank).toBe(1);
    expect((await item(second.title)).rank).toBe(2);
  }, 180000);

  describe('refuses, and moves nothing', () => {
    it('a place past the end of the list', async () => {
      const { title } = await create('too far');
      const before = (await item(title)).rank;
      expect(await refusal(call('updateMediaItemOrder', { title, position: 100000 }))).toContain('position');
      expect((await item(title)).rank).toBe(before);
    }, 120000);

    it('a place below 1, one that is not a whole number, or none', async () => {
      const { title, rank } = await create('bad place');
      expect(await refusal(call('updateMediaItemOrder', { title, position: 0 }))).toContain('position');
      expect(await refusal(call('updateMediaItemOrder', { title, position: 1.5 }))).toContain('position');
      expect(await refusal(call('updateMediaItemOrder', { title, position: '1' }))).toContain('position');
      expect(await refusal(call('updateMediaItemOrder', { title }))).toContain('position');
      expect((await item(title)).rank).toBe(rank);
    });

    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('updateMediaItemOrder', { title, position: 1 }))).toContain(title);
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      expect((await refusal(call('updateMediaItemOrder', { title, position: 1 }))).replace(title, '')).toContain('2');
    });

    refusesEachRequired('updateMediaItemOrder', async () => ({ title: unique('no title'), position: 1 }), ['title']);
  });
});

contract.describe('updateMediaItemOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves the item with that id to the first place of the manual order', async () => {
    const { title, id } = await create('move by id');
    expect(await call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 1 })).toEqual(jasmine.objectContaining({ id, rank: 1 }));
    expect((await item(title)).rank).toBe(1);
  }, 180000);

  describe('refuses, and moves nothing', () => {
    it('an id that matches nothing', async () => {
      expect(await refusal(call('updateMediaItemOrderAdvanced', { mediaItemId: missingId, position: 1 }))).toContain(missingId);
    });

    it('a place below 1', async () => {
      const { title, id, rank } = await create('bad place by id');
      expect(await refusal(call('updateMediaItemOrderAdvanced', { mediaItemId: id, position: 0 }))).toContain('position');
      expect((await item(title)).rank).toBe(rank);
    });

    refusesEachRequired('updateMediaItemOrderAdvanced', async () => ({ mediaItemId: missingId, position: 1 }), ['mediaItemId']);
  });
});

contract.describe('createMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('adds every item, reports each, and announces each', async () => {
    const titles = [unique('batch one'), unique('batch two')];
    const result = await call('createMediaItemsAdvanced', { mediaItems: [{ title: titles[0] }, { title: titles[1], audioUrl: 'https://example.com/audio.mp3', thumbnailImage: ['https://example.com/thumb.png'] }] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: jasmine.any(String), error: null }), jasmine.objectContaining({ index: 1, id: jasmine.any(String), error: null })],
      succeeded: 2,
      failed: 0
    }));
    expect(await item(titles[0])).toEqual(jasmine.objectContaining({ id: result.mediaItems[0].id }));
    expect(await item(titles[1])).toEqual(jasmine.objectContaining({ id: result.mediaItems[1].id, audioUrl: 'https://example.com/audio.mp3', thumbnailImage: 'https://example.com/thumb.png' }));
    expect(sent().calls.allArgs().map((args) => [args[0], args[1].mediaItemId])).toEqual([
      ['mediaItemCreated', result.mediaItems[0].id], ['mediaItemCreated', result.mediaItems[1].id]
    ]);
  });

  describe('refuses the whole list, and writes none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: [{ title: valid }, { title: '' }] }))).toContain('title');
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: [{ title: valid }, { title: unique('bad image'), thumbnailImage: ['https://example.com/a.png', 'https://example.com/b.png'] }] }))).toContain('thumbnailImage');
      expect(await listed(valid)).toEqual([]);
      expect(sent()).not.toHaveBeenCalled();
    });

    it('when it is empty', async () => {
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: [] }))).toContain('mediaItems');
    });

    it('when it holds more than 50 entries', async () => {
      const word = stamp('toomany');
      const mediaItems = Array.from({ length: 51 }, (value, index) => ({ title: `${word} ${index}` }));
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems }))).toContain('mediaItems');
      expect(await listed(word)).toEqual([]);
      expect(sent()).not.toHaveBeenCalled();
    });

    it('when it is missing or not a list', async () => {
      expect(await refusal(call('createMediaItemsAdvanced', {}))).toContain('mediaItems');
      expect(await refusal(call('createMediaItemsAdvanced', { mediaItems: { title: unique('not a list') } }))).toContain('mediaItems');
    });
  });
});

contract.describe('updateMediaItem', () => {
  beforeEach(standIns);

  it('changes only the fields it is given, and announces the change', async () => {
    const { title, id } = await create('update', { summary: 'First', videoUrl: 'https://example.com/video.mp4' });
    sent().calls.reset();
    expect(await call('updateMediaItem', { title, newSummary: 'Second' })).toEqual(jasmine.objectContaining({ id, title, summary: 'Second', videoUrl: 'https://example.com/video.mp4' }));
    expect(await item(title)).toEqual(jasmine.objectContaining({ summary: 'Second', videoUrl: 'https://example.com/video.mp4' }));
    expect(sent().calls.count()).toBe(1);
    expect(sent().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemUpdated', jasmine.objectContaining({
      mediaItemId: id, title, summary: 'Second', videoUrl: 'https://example.com/video.mp4', previousTitle: title
    })]);
  });

  it('renames the item, telling the old title', async () => {
    const { title, id } = await create('rename');
    sent().calls.reset();
    const renamed = `${title} new`;
    expect((await call('updateMediaItem', { title, newTitle: renamed })).title).toBe(renamed);
    expect(await item(renamed)).toEqual(jasmine.objectContaining({ id }));
    expect(await refusal(item(title))).toContain(title);
    expect(sent().calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({ mediaItemId: id, title: renamed, previousTitle: title }));
  });

  it('changes every detail at once', async () => {
    const { title } = await create('everything');
    const changed = await call('updateMediaItem', {
      title,
      newSummary: 'New summary',
      newBody: '<p>New body</p>',
      newSourceUrl: 'https://example.com/new-source',
      newVideoUrl: 'https://example.com/new-video.mp4',
      newAudioTitle: 'New audio title',
      newArtists: 'New artists',
      newAudioUrl: 'https://example.com/new-audio.mp3',
      newThumbnailImage: ['https://example.com/new-thumb.png'],
      newAudioImage: ['https://example.com/new-audio.png'],
      newAudioBackgroundImage: ['https://example.com/new-background.png'],
      newMediaDate: '2026-02-01',
      newActionLinks: [action],
      resetViews: false
    });
    const expected = {
      title,
      summary: 'New summary', body: '<p>New body</p>', sourceUrl: 'https://example.com/new-source', videoUrl: 'https://example.com/new-video.mp4',
      audioTitle: 'New audio title', artists: 'New artists', audioUrl: 'https://example.com/new-audio.mp3',
      thumbnailImage: 'https://example.com/new-thumb.png', audioImage: 'https://example.com/new-audio.png',
      audioBackgroundImage: 'https://example.com/new-background.png', mediaDate: '2026-02-01T00:00:00.000Z', actionLinks: [jasmine.objectContaining(action)]
    };
    expect(changed).toEqual(jasmine.objectContaining(expected));
    expect(await item(title)).toEqual(jasmine.objectContaining(expected));
  });

  it('clears a text field with null, and with an empty text', async () => {
    const { title } = await create('clear', { summary: 'Something', artists: 'Someone', body: '<p>Body</p>' });
    await call('updateMediaItem', { title, newSummary: null });
    expect((await item(title)).summary).toBeNull();
    await call('updateMediaItem', { title, newArtists: '' });
    expect((await item(title)).artists).toBe('');
    await call('updateMediaItem', { title, newBody: '' });
    expect(await item(title)).toEqual(jasmine.objectContaining({ body: '', summary: null, artists: '' }));
  });

  it('removes a picture with an empty list, and with null', async () => {
    const { title } = await create('no picture', { thumbnailImage: ['https://example.com/a.png'], audioImage: ['https://example.com/b.png'] });
    await call('updateMediaItem', { title, newThumbnailImage: [] });
    await call('updateMediaItem', { title, newAudioImage: null });
    expect(await item(title)).toEqual(jasmine.objectContaining({ thumbnailImage: '', audioImage: '' }));
  });

  it('takes a single new picture given on its own, as a list holding one', async () => {
    const { title } = await create('single picture', { thumbnailImage: ['https://example.com/a.png'] });
    expect((await call('updateMediaItem', { title, newThumbnailImage: 'https://example.com/b.png' })).thumbnailImage).toBe('https://example.com/b.png');
    expect((await item(title)).thumbnailImage).toBe('https://example.com/b.png');
  });

  it('replaces the actions with the list given, and removes them with an empty list or null', async () => {
    const other = { title: 'Call us', action: 'callNumber', phoneNumber: '+15550100' };
    const { title } = await create('actions', { actionLinks: [action] });
    await call('updateMediaItem', { title, newActionLinks: [other] });
    expect((await item(title)).actionLinks).toEqual([jasmine.objectContaining(other)]);
    await call('updateMediaItem', { title, newActionLinks: [] });
    expect((await item(title)).actionLinks).toEqual([]);
    await call('updateMediaItem', { title, newActionLinks: [action] });
    await call('updateMediaItem', { title, newActionLinks: null });
    expect((await item(title)).actionLinks).toEqual([]);
  });

  it('takes a new video link with or without restarting the view count', async () => {
    const { title } = await create('new video', { videoUrl: 'https://example.com/first.mp4' });
    expect((await call('updateMediaItem', { title, newVideoUrl: 'https://example.com/second.mp4', resetViews: true })).videoUrl).toBe('https://example.com/second.mp4');
    expect((await call('updateMediaItem', { title, newVideoUrl: 'https://example.com/third.mp4' })).videoUrl).toBe('https://example.com/third.mp4');
    expect((await item(title)).videoUrl).toBe('https://example.com/third.mp4');
  });

  describe('refuses, changes nothing and announces nothing', () => {
    const unchanged = async (title, before) => {
      expect(await item(title)).toEqual(before);
      expect(sent()).not.toHaveBeenCalled();
    };

    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('updateMediaItem', { title, newSummary: 'x' }))).toContain(title);
      expect(sent()).not.toHaveBeenCalled();
    });

    it('a title two items share, saying how many', async () => {
      const title = unique('shared');
      await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      sent().calls.reset();
      expect((await refusal(call('updateMediaItem', { title, newSummary: 'x' }))).replace(title, '')).toContain('2');
      expect((await listed(title)).map((found) => found.summary)).not.toContain('x');
      expect(sent()).not.toHaveBeenCalled();
    });

    it('removing the title', async () => {
      const { title } = await create('keep title');
      const before = await item(title);
      sent().calls.reset();
      expect(await refusal(call('updateMediaItem', { title, newTitle: null }))).toContain('newTitle');
      expect(await refusal(call('updateMediaItem', { title, newTitle: '' }))).toContain('newTitle');
      await unchanged(title, before);
    });

    it('a call that changes nothing', async () => {
      const { title } = await create('nothing');
      const before = await item(title);
      sent().calls.reset();
      await expectAsync(call('updateMediaItem', { title })).toBeRejected();
      await expectAsync(call('updateMediaItem', { title, resetViews: true })).toBeRejected();
      await unchanged(title, before);
    });

    it('two pictures, or an icon for a picture', async () => {
      const { title } = await create('bad picture');
      const before = await item(title);
      sent().calls.reset();
      expect(await refusal(call('updateMediaItem', { title, newThumbnailImage: ['glyphicon glyphicon-star'] }))).toContain('newThumbnailImage');
      expect(await refusal(call('updateMediaItem', { title, newAudioImage: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('newAudioImage');
      await unchanged(title, before);
    });

    it('a media date that is not a date, a summary that is too long, a title over 70 characters, or a restart choice that is not true or false', async () => {
      const { title } = await create('bad values');
      const before = await item(title);
      sent().calls.reset();
      expect(await refusal(call('updateMediaItem', { title, newMediaDate: 'soon' }))).toContain('newMediaDate');
      expect(await refusal(call('updateMediaItem', { title, newMediaDate: null }))).toContain('newMediaDate');
      expect(await refusal(call('updateMediaItem', { title, newSummary: 'x'.repeat(251) }))).toContain('newSummary');
      expect(await refusal(call('updateMediaItem', { title, newTitle: 'x'.repeat(71) }))).toContain('newTitle');
      expect(await refusal(call('updateMediaItem', { title, newSummary: 'x', resetViews: 'yes' }))).toContain('resetViews');
      expect(await refusal(call('updateMediaItem', { title, newActionLinks: [{ title: 'Nothing' }] }))).toContain('newActionLinks');
      await unchanged(title, before);
    });

    refusesEachRequired('updateMediaItem', async () => ({ title: unique('no title'), newSummary: 'x' }), ['title']);
  });
});

contract.describe('updateMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('changes only the fields it is given, on the item with that id', async () => {
    const { title, id } = await create('by id', { summary: 'First', artists: 'Kept' });
    sent().calls.reset();
    expect(await call('updateMediaItemAdvanced', { mediaItemId: id, newSummary: 'Second' })).toEqual(jasmine.objectContaining({ id, title, summary: 'Second', artists: 'Kept' }));
    expect(await item(title)).toEqual(jasmine.objectContaining({ summary: 'Second', artists: 'Kept' }));
    expect(sent().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemUpdated', jasmine.objectContaining({ mediaItemId: id, title, summary: 'Second', previousTitle: title })]);
  });

  it('clears a field with null, and removes a picture with an empty list', async () => {
    const { title, id } = await create('clear by id', { audioTitle: 'Something', audioBackgroundImage: ['https://example.com/background.png'] });
    await call('updateMediaItemAdvanced', { mediaItemId: id, newAudioTitle: null, newAudioBackgroundImage: [] });
    expect(await item(title)).toEqual(jasmine.objectContaining({ audioTitle: null, audioBackgroundImage: '' }));
  });

  describe('refuses, changes nothing and announces nothing', () => {
    it('an id that matches nothing', async () => {
      expect(await refusal(call('updateMediaItemAdvanced', { mediaItemId: missingId, newSummary: 'x' }))).toContain(missingId);
      expect(sent()).not.toHaveBeenCalled();
    });

    it('a call that changes nothing, or removes the title', async () => {
      const { title, id } = await create('nothing by id');
      const before = await item(title);
      sent().calls.reset();
      await expectAsync(call('updateMediaItemAdvanced', { mediaItemId: id })).toBeRejected();
      expect(await refusal(call('updateMediaItemAdvanced', { mediaItemId: id, newTitle: '' }))).toContain('newTitle');
      expect(await item(title)).toEqual(before);
      expect(sent()).not.toHaveBeenCalled();
    });

    refusesEachRequired('updateMediaItemAdvanced', async () => ({ mediaItemId: missingId, newSummary: 'x' }), ['mediaItemId']);
  });
});

contract.describe('updateMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('changes every item, reports each, and announces each', async () => {
    const first = await create('batch update one', { summary: 'One' });
    const second = await create('batch update two', { summary: 'Two', artists: 'Kept' });
    sent().calls.reset();
    const result = await call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: first.id, newSummary: 'One changed' }, { mediaItemId: second.id, newSummary: null }] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: first.id, error: null }), jasmine.objectContaining({ index: 1, id: second.id, error: null })], succeeded: 2, failed: 0
    }));
    expect((await item(first.title)).summary).toBe('One changed');
    expect(await item(second.title)).toEqual(jasmine.objectContaining({ summary: null, artists: 'Kept' }));
    expect(sent().calls.allArgs().map((args) => [args[0], args[1].mediaItemId])).toEqual([['mediaItemUpdated', first.id], ['mediaItemUpdated', second.id]]);
  });

  describe('refuses the whole list, and writes none of it', () => {
    it('when one entry is invalid', async () => {
      const made = await create('batch invalid', { summary: 'Kept' });
      sent().calls.reset();
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: made.id, newSummary: 'x' }, { mediaItemId: made.id, newTitle: '' }] }))).toContain('newTitle');
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: made.id, newSummary: 'x' }, {}] }))).toContain('mediaItemId');
      expect((await item(made.title)).summary).toBe('Kept');
      expect(sent()).not.toHaveBeenCalled();
    });

    it('when an id matches nothing', async () => {
      const made = await create('batch unknown', { summary: 'Kept' });
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: made.id, newSummary: 'x' }, { mediaItemId: missingId, newSummary: 'x' }] }))).toContain(missingId);
      expect((await item(made.title)).summary).toBe('Kept');
    });

    it('when the same item is listed twice', async () => {
      const made = await create('batch twice', { summary: 'Kept' });
      await expectAsync(call('updateMediaItemsAdvanced', { mediaItems: [{ mediaItemId: made.id, newSummary: 'x' }, { mediaItemId: made.id, newSummary: 'y' }] })).toBeRejected();
      expect((await item(made.title)).summary).toBe('Kept');
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems: [] }))).toContain('mediaItems');
      const mediaItems = Array.from({ length: 51 }, () => ({ mediaItemId: missingId, newSummary: 'x' }));
      expect(await refusal(call('updateMediaItemsAdvanced', { mediaItems }))).toContain('mediaItems');
    });
  });
});

contract.describe('deleteMediaItem', () => {
  beforeEach(standIns);

  it('deletes the item with that title, and announces it', async () => {
    const { title, id } = await create('delete');
    sent().calls.reset();
    expect(await call('deleteMediaItem', { title })).toEqual(jasmine.objectContaining({ id, title, deleted: true }));
    expect(await listed(title)).toEqual([]);
    expect(sent().calls.count()).toBe(1);
    expect(sent().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemDeleted', { mediaItemId: id, title }]);
  });

  it('leaves every other item alone', async () => {
    const kept = await create('kept');
    const gone = await create('gone');
    await call('deleteMediaItem', { title: gone.title });
    expect(await item(kept.title)).toEqual(jasmine.objectContaining({ id: kept.id }));
  });

  describe('refuses, deletes nothing and announces nothing', () => {
    it('a title no item has, naming it', async () => {
      const title = unique('missing');
      expect(await refusal(call('deleteMediaItem', { title }))).toContain(title);
      expect(sent()).not.toHaveBeenCalled();
    });

    it('a title two items share, saying how many, and both stay', async () => {
      const title = unique('shared');
      await call('createMediaItem', { title });
      await call('createMediaItem', { title });
      sent().calls.reset();
      expect((await refusal(call('deleteMediaItem', { title }))).replace(title, '')).toContain('2');
      expect((await listed(title)).length).toBe(2);
      expect(sent()).not.toHaveBeenCalled();
    });

    refusesEachRequired('deleteMediaItem', async () => ({ title: unique('no title') }), ['title'], async () => expect(sent()).not.toHaveBeenCalled());
  });
});

contract.describe('deleteMediaItemAdvanced', () => {
  beforeEach(standIns);

  it('deletes the item with that id, and announces it', async () => {
    const { title, id } = await create('delete by id');
    sent().calls.reset();
    expect(await call('deleteMediaItemAdvanced', { mediaItemId: id })).toEqual(jasmine.objectContaining({ id, title, deleted: true }));
    expect(await listed(title)).toEqual([]);
    expect(await refusal(call('getMediaItemAdvanced', { mediaItemId: id }))).toContain(id);
    expect(sent().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemDeleted', { mediaItemId: id, title }]);
  });

  describe('refuses, and announces nothing', () => {
    it('an id that matches nothing', async () => {
      expect(await refusal(call('deleteMediaItemAdvanced', { mediaItemId: missingId }))).toContain(missingId);
      expect(sent()).not.toHaveBeenCalled();
    });

    refusesEachRequired('deleteMediaItemAdvanced', async () => ({ mediaItemId: missingId }), ['mediaItemId']);
  });
});

contract.describe('deleteMediaItemsAdvanced', () => {
  beforeEach(standIns);

  it('deletes every item, reports each, and announces each', async () => {
    const first = await create('batch delete one');
    const second = await create('batch delete two');
    sent().calls.reset();
    expect(await call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: first.id }, { mediaItemId: second.id }] })).toEqual(jasmine.objectContaining({
      mediaItems: [jasmine.objectContaining({ index: 0, id: first.id, error: null }), jasmine.objectContaining({ index: 1, id: second.id, error: null })], succeeded: 2, failed: 0
    }));
    expect(await listed(first.title)).toEqual([]);
    expect(await listed(second.title)).toEqual([]);
    expect(sent().calls.allArgs().map((args) => [args[0], args[1].mediaItemId])).toEqual([['mediaItemDeleted', first.id], ['mediaItemDeleted', second.id]]);
  });

  describe('refuses the whole list, and deletes none of it', () => {
    it('when an id matches nothing', async () => {
      const made = await create('batch delete kept');
      sent().calls.reset();
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: made.id }, { mediaItemId: missingId }] }))).toContain(missingId);
      expect(await item(made.title)).toEqual(jasmine.objectContaining({ id: made.id }));
      expect(sent()).not.toHaveBeenCalled();
    });

    it('when the same item is listed twice', async () => {
      const made = await create('batch delete twice');
      await expectAsync(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: made.id }, { mediaItemId: made.id }] })).toBeRejected();
      expect(await item(made.title)).toEqual(jasmine.objectContaining({ id: made.id }));
    });

    it('when an entry has no id', async () => {
      const made = await create('batch delete no id');
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [{ mediaItemId: made.id }, {}] }))).toContain('mediaItemId');
      expect(await item(made.title)).toEqual(jasmine.objectContaining({ id: made.id }));
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: [] }))).toContain('mediaItems');
      expect(await refusal(call('deleteMediaItemsAdvanced', { mediaItems: Array.from({ length: 51 }, () => ({ mediaItemId: missingId })) }))).toContain('mediaItems');
    });
  });
});

contract.describe('updateMediaItemCategory', () => {
  beforeEach(standIns);

  it('puts the item in a category, so a search of that category finds it, and announces the change', async () => {
    const category = await newCategory('category', []);
    const { title, id } = await create('in category');
    sent().calls.reset();
    expect(await call('updateMediaItemCategory', { title, categoryName: category.name, included: true })).toEqual(jasmine.objectContaining({ id, categoryIds: [category.id], subcategoryIds: [] }));
    expect((await call('searchMediaItems', { title, categoryName: category.name })).mediaItems.map((found) => found.id)).toEqual([id]);
    expect(sent().calls.argsFor(0).slice(0, 2)).toEqual(['mediaItemUpdated', jasmine.objectContaining({ mediaItemId: id, title })]);
  });

  it('puts the item in a subcategory, and its category', async () => {
    const category = await newCategory('with subcategories', ['First', 'Second']);
    const secondSub = category.subcategories[1];
    const { title } = await create('in subcategory');
    expect(await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: 'Second', included: true }))
      .toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [secondSub.id] }));
    expect((await call('searchMediaItems', { title, categoryName: category.name, subcategoryName: 'Second' })).total).toBe(1);
    expect((await call('searchMediaItems', { title, categoryName: category.name, subcategoryName: 'First' })).total).toBe(0);
  });

  it('puts the item in a category only once, however often it is asked', async () => {
    const category = await newCategory('twice', []);
    const { title } = await create('in twice');
    await call('updateMediaItemCategory', { title, categoryName: category.name, included: true });
    expect((await call('updateMediaItemCategory', { title, categoryName: category.name, included: true })).categoryIds).toEqual([category.id]);
  });

  it('takes the item out of one subcategory only, then out of the whole category', async () => {
    const category = await newCategory('take out', ['First', 'Second']);
    const { title } = await create('taken out');
    await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: 'First', included: true });
    await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: 'Second', included: true });
    expect(await call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: 'First', included: false }))
      .toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [category.subcategories[1].id] }));
    expect(await call('updateMediaItemCategory', { title, categoryName: category.name, included: false }))
      .toEqual(jasmine.objectContaining({ categoryIds: [], subcategoryIds: [] }));
    expect((await call('searchMediaItems', { title, categoryName: category.name })).total).toBe(0);
  }, 120000);

  describe('refuses, changes nothing and announces nothing', () => {
    it('a category nothing is named, naming it', async () => {
      const { title } = await create('no such category');
      sent().calls.reset();
      const name = unique('no category');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: name, included: true }))).toContain(name);
      expect((await item(title)).categoryIds).toEqual([]);
      expect(sent()).not.toHaveBeenCalled();
    });

    it('a subcategory the category does not have, naming it', async () => {
      const category = await newCategory('no such subcategory', ['Only']);
      const { title } = await create('bad subcategory');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name, subcategoryName: 'Other', included: true }))).toContain('Other');
      expect((await item(title)).categoryIds).toEqual([]);
    });

    it('without saying in or out, or with something other than true or false', async () => {
      const category = await newCategory('no choice', []);
      const { title } = await create('no choice');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name }))).toContain('included');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name, included: 'yes' }))).toContain('included');
      expect((await item(title)).categoryIds).toEqual([]);
    });

    it('a title no item has, naming it', async () => {
      const category = await newCategory('for missing', []);
      const title = unique('missing');
      expect(await refusal(call('updateMediaItemCategory', { title, categoryName: category.name, included: true }))).toContain(title);
    });

    refusesEachRequired('updateMediaItemCategory', async () => ({ title: unique('required'), categoryName: unique('category'), included: true }), ['title', 'categoryName']);
  });
});

contract.describe('updateMediaItemCategoryAdvanced', () => {
  beforeEach(standIns);

  it('puts the item in a subcategory by their ids, and takes it out again', async () => {
    const category = await newCategory('by ids', ['Sub']);
    const { title, id } = await create('by ids');
    const subcategoryId = category.subcategories[0].id;
    expect(await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, subcategoryId, included: true }))
      .toEqual(jasmine.objectContaining({ id, categoryIds: [category.id], subcategoryIds: [subcategoryId] }));
    expect((await call('searchMediaItems', { title, categoryName: category.name, subcategoryName: 'Sub' })).total).toBe(1);
    await call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, included: false });
    expect(await item(title)).toEqual(jasmine.objectContaining({ categoryIds: [], subcategoryIds: [] }));
  });

  describe('refuses, and changes nothing', () => {
    it('an item id that matches nothing', async () => {
      const category = await newCategory('unknown item', []);
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: missingId, categoryId: category.id, included: true }))).toContain(missingId);
    });

    it('a category id that matches nothing', async () => {
      const { title, id } = await create('unknown category');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: missingId, included: true }))).toContain(missingId);
      expect((await item(title)).categoryIds).toEqual([]);
    });

    it('a subcategory id the category does not have', async () => {
      const category = await newCategory('unknown subcategory', ['Sub']);
      const { title, id } = await create('unknown subcategory');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id, subcategoryId: 'nosuchsubcategory', included: true }))).toContain('nosuchsubcategory');
      expect((await item(title)).categoryIds).toEqual([]);
    });

    it('without saying in or out', async () => {
      const category = await newCategory('no choice by id', []);
      const { title, id } = await create('no choice by id');
      expect(await refusal(call('updateMediaItemCategoryAdvanced', { mediaItemId: id, categoryId: category.id }))).toContain('included');
      expect((await item(title)).categoryIds).toEqual([]);
    });

    refusesEachRequired('updateMediaItemCategoryAdvanced', async () => ({ mediaItemId: missingId, categoryId: missingId, included: true }), ['mediaItemId', 'categoryId']);
  });
});

contract.describe('updateMediaItemsCategoryAdvanced', () => {
  beforeEach(standIns);

  it('applies every change, several to one item, and reports each', async () => {
    const category = await newCategory('batch category', ['Sub']);
    const other = await newCategory('batch other category', []);
    const first = await create('batch category one');
    const second = await create('batch category two');
    const result = await call('updateMediaItemsCategoryAdvanced', { mediaItems: [
      { mediaItemId: first.id, categoryId: category.id, included: true },
      { mediaItemId: second.id, categoryId: category.id, subcategoryId: category.subcategories[0].id, included: true },
      { mediaItemId: first.id, categoryId: other.id, included: true }
    ] });
    expect(result).toEqual(jasmine.objectContaining({
      mediaItems: [
        jasmine.objectContaining({ index: 0, id: first.id, error: null }),
        jasmine.objectContaining({ index: 1, id: second.id, error: null }),
        jasmine.objectContaining({ index: 2, id: first.id, error: null })
      ],
      succeeded: 3,
      failed: 0
    }));
    expect((await item(first.title)).categoryIds).toEqual([category.id, other.id]);
    expect(await item(second.title)).toEqual(jasmine.objectContaining({ categoryIds: [category.id], subcategoryIds: [category.subcategories[0].id] }));
  }, 120000);

  describe('refuses the whole list, and changes none of it', () => {
    it('when an id matches nothing', async () => {
      const category = await newCategory('batch unknown', []);
      const made = await create('batch unknown');
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems: [
        { mediaItemId: made.id, categoryId: category.id, included: true },
        { mediaItemId: made.id, categoryId: missingId, included: true }
      ] }))).toContain(missingId);
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems: [
        { mediaItemId: made.id, categoryId: category.id, included: true },
        { mediaItemId: missingId, categoryId: category.id, included: true }
      ] }))).toContain(missingId);
      expect((await item(made.title)).categoryIds).toEqual([]);
    });

    it('when one entry is invalid', async () => {
      const category = await newCategory('batch invalid', []);
      const made = await create('batch invalid');
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems: [
        { mediaItemId: made.id, categoryId: category.id, included: true },
        { mediaItemId: made.id, categoryId: category.id }
      ] }))).toContain('included');
      expect((await item(made.title)).categoryIds).toEqual([]);
    });

    it('when the same change is listed twice', async () => {
      const category = await newCategory('batch twice', []);
      const made = await create('batch twice');
      await expectAsync(call('updateMediaItemsCategoryAdvanced', { mediaItems: [
        { mediaItemId: made.id, categoryId: category.id, included: true },
        { mediaItemId: made.id, categoryId: category.id, included: true }
      ] })).toBeRejected();
      expect((await item(made.title)).categoryIds).toEqual([]);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems: [] }))).toContain('mediaItems');
      const mediaItems = Array.from({ length: 51 }, () => ({ mediaItemId: missingId, categoryId: missingId, included: true }));
      expect(await refusal(call('updateMediaItemsCategoryAdvanced', { mediaItems }))).toContain('mediaItems');
    });
  });
});
