// categories: every operation on categories and the subcategories inside them, one block each, after the helpers they share.
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

// The categories with exactly that name, as the contract's own search finds them.
const named = async (name) => (await call('searchCategories', { name, pageSize: 50 })).categories.filter((category) => category.name === name);
// The one category with that name.
const theCategory = async (name) => {
  const [category] = await named(name);
  return category;
};
const subcategoryNames = (category) => category.subcategories.map((subcategory) => subcategory.name);
const create = async (label, extra) => {
  const name = unique(label);
  const category = await call('createCategory', Object.assign({ name }, extra || {}));
  return { name, id: category.id };
};
// A category holding subcategories with these names, in this order.
const withSubcategories = async (label, names) => {
  const category = await create(label);
  const ids = [];
  for (const name of names) ids.push((await call('createSubcategory', { categoryName: category.name, name })).id);
  return Object.assign(category, { subcategoryIds: ids });
};

// The refresh message to the widget, which nothing here answers: a spy stands in for it, and Jasmine removes it after each spec.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};

// Only the control panel adds categories, and its run comes first: it makes these once, and the app's run finds them.
const forTheApp = 'Post category for the app';
const pagedForTheApp = 'Post paged category for the app';
let madeForTheApp;
const makeForTheApp = async () => {
  const category = await call('createCategory', { name: forTheApp, subcategorySortOrder: 'Manually' });
  await call('createSubcategory', { categoryName: forTheApp, name: 'Post subcategory for the app' });
  await call('createCategoriesAdvanced', { categories: [1, 2, 3].map((index) => ({ name: `${pagedForTheApp} ${index}` })) });
  return category;
};
const findForTheApp = async () => {
  const category = await theCategory(forTheApp);
  return category || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`));
};
const categoryForTheApp = () => {
  madeForTheApp = madeForTheApp || (contract.host === 'control' ? makeForTheApp() : findForTheApp());
  return madeForTheApp;
};

contract.describe('searchCategories', () => {
  beforeEach(standIns);

  it('finds a category by its name, with its subcategories', async () => {
    const { id } = await categoryForTheApp();
    const result = await call('searchCategories', { name: forTheApp });
    expect(result).toEqual(jasmine.objectContaining({ categories: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.categories).toContain(jasmine.objectContaining({
      id,
      name: forTheApp,
      subcategorySortOrder: 'Manually',
      rank: jasmine.any(Number),
      subcategories: [jasmine.objectContaining({ id: jasmine.any(String), name: 'Post subcategory for the app' })]
    }));
  });

  it('finds categories whose name contains the text, whatever its case', async () => {
    const { id } = await categoryForTheApp();
    const ids = (await call('searchCategories', { name: 'CATEGORY FOR THE APP' })).categories.map((category) => category.id);
    expect(ids).toContain(id);
  });

  it('pages the results, saying whether there are more', async () => {
    await categoryForTheApp();
    const first = await call('searchCategories', { name: pagedForTheApp, pageSize: 2 });
    expect(first.categories.length).toBe(2);
    expect(first.total).toBeGreaterThanOrEqual(3);
    expect(first.hasMore).toBe(true);
    const last = await call('searchCategories', { name: pagedForTheApp, page: 1, pageSize: 2 });
    expect(last.page).toBe(1);
    expect(last.categories.length).toBeGreaterThanOrEqual(1);
  });

  it('finds nothing for a name no category has', async () => {
    expect(await call('searchCategories', { name: unique('nothing') })).toEqual(jasmine.objectContaining({ categories: [], total: 0, hasMore: false }));
  });

  describe('refuses', () => {
    it('a page size above 50, or below 1', async () => {
      expect(await refusal(call('searchCategories', { pageSize: 51 }))).toEqual(refused('validation', 'pageSize'));
      expect(await refusal(call('searchCategories', { pageSize: 0 }))).toEqual(refused('validation', 'pageSize'));
    });

    it('a page below 0', async () => {
      expect(await refusal(call('searchCategories', { page: -1 }))).toEqual(refused('validation', 'page'));
    });

    it('an empty name', async () => {
      expect(await refusal(call('searchCategories', { name: '' }))).toEqual(refused('validation', 'name'));
    });
  });
});

contract.describe('createCategory', () => {
  beforeEach(standIns);

  it('adds a category from its name, and returns it', async () => {
    const name = unique('category');
    const created = await call('createCategory', { name });
    expect(created).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name, icon: '', subcategorySortOrder: 'Newest', rank: jasmine.any(Number), subcategories: [] }));
    expect(await named(name)).toEqual([jasmine.objectContaining({ id: created.id, name, subcategories: [] })]);
  });

  it('keeps its picture and subcategory order', async () => {
    const name = unique('with icon');
    await call('createCategory', { name, icon: ['https://example.com/icon.png'], subcategorySortOrder: 'Subcategory Title A-Z' });
    expect(await theCategory(name)).toEqual(jasmine.objectContaining({ icon: 'https://example.com/icon.png', subcategorySortOrder: 'Subcategory Title A-Z' }));
  });

  it('takes an icon as well as a picture', async () => {
    const name = unique('with glyph');
    await call('createCategory', { name, icon: ['glyphicon glyphicon-star'] });
    expect((await theCategory(name)).icon).toBe('glyphicon glyphicon-star');
  });

  it('takes a single picture sent without a list as a list of one', async () => {
    const name = unique('single icon');
    await call('createCategory', { name, icon: 'https://example.com/single.png' });
    expect((await theCategory(name)).icon).toBe('https://example.com/single.png');
  });

  describe('refuses, and adds nothing', () => {
    it('without a name, or with an empty one', async () => {
      expect(await refusal(call('createCategory', {}))).toEqual(refused('validation', 'name'));
      expect(await refusal(call('createCategory', { name: null }))).toEqual(refused('validation', 'name'));
      expect(await refusal(call('createCategory', { name: '' }))).toEqual(refused('validation', 'name'));
    });

    it('a name that is not text', async () => {
      expect(await refusal(call('createCategory', { name: 7 }))).toEqual(refused('validation', 'name'));
    });

    it('a subcategory order it does not offer', async () => {
      const name = unique('bad order');
      expect(await refusal(call('createCategory', { name, subcategorySortOrder: 'Random' }))).toEqual(refused('validation', 'subcategorySortOrder'));
      expect(await named(name)).toEqual([]);
    });

    it('more than one picture', async () => {
      const name = unique('two icons');
      expect(await refusal(call('createCategory', { name, icon: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toEqual(refused('validation', 'icon'));
      expect(await named(name)).toEqual([]);
    });

    it('a picture that is not text', async () => {
      const name = unique('number icon');
      expect(await refusal(call('createCategory', { name, icon: [5] }))).toEqual(refused('validation', 'icon'));
      expect(await named(name)).toEqual([]);
    });
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds every category, and reports each', async () => {
    const names = [unique('batch one'), unique('batch two')];
    const result = await call('createCategoriesAdvanced', { categories: [{ name: names[0] }, { name: names[1], subcategorySortOrder: 'Oldest' }] });
    expect(result).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })],
      succeeded: 2,
      failed: 0
    }));
    expect(await theCategory(names[0])).toEqual(jasmine.objectContaining({ id: result.categories[0].id }));
    expect(await theCategory(names[1])).toEqual(jasmine.objectContaining({ id: result.categories[1].id, subcategorySortOrder: 'Oldest' }));
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createCategoriesAdvanced', { categories: [{ name: valid }, { name: '' }] }))).toEqual(refused('validation', 'name'));
      expect(await named(valid)).toEqual([]);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('createCategoriesAdvanced', { categories: [] }))).toEqual(refused('validation', 'categories'));
    });

    it('when it holds more than 50 entries', async () => {
      const categories = Array.from({ length: 51 }, (value, index) => ({ name: unique(`entry ${index}`) }));
      expect(await refusal(call('createCategoriesAdvanced', { categories }))).toEqual(refused('validation', 'categories'));
      expect(await named(categories[0].name)).toEqual([]);
    });
  });
});

contract.describe('updateCategory', () => {
  beforeEach(standIns);

  it('changes only what it is given, and returns the category', async () => {
    const { name, id } = await create('update', { icon: ['https://example.com/old.png'] });
    expect(await call('updateCategory', { name, newSubcategorySortOrder: 'Oldest' }))
      .toEqual(jasmine.objectContaining({ id, name, icon: 'https://example.com/old.png', subcategorySortOrder: 'Oldest' }));
    expect(await theCategory(name)).toEqual(jasmine.objectContaining({ id, icon: 'https://example.com/old.png', subcategorySortOrder: 'Oldest' }));
  });

  it('renames the category', async () => {
    const { name, id } = await create('rename');
    const newName = unique('renamed');
    await call('updateCategory', { name, newName });
    expect(await named(name)).toEqual([]);
    expect(await theCategory(newName)).toEqual(jasmine.objectContaining({ id }));
  });

  it('replaces the picture, and removes it with an empty list or null', async () => {
    const { name } = await create('icon', { icon: ['https://example.com/old.png'] });
    await call('updateCategory', { name, newIcon: ['https://example.com/new.png'] });
    expect((await theCategory(name)).icon).toBe('https://example.com/new.png');
    await call('updateCategory', { name, newIcon: [] });
    expect((await theCategory(name)).icon).toBe('');
    await call('updateCategory', { name, newIcon: ['https://example.com/again.png'] });
    await call('updateCategory', { name, newIcon: null });
    expect((await theCategory(name)).icon).toBe('');
  });

  it('sorts the subcategories by the new order', async () => {
    const { name } = await withSubcategories('sorted', ['Bravo', 'Alpha']);
    await call('updateCategory', { name, newSubcategorySortOrder: 'Subcategory Title A-Z' });
    expect(subcategoryNames(await theCategory(name))).toEqual(['Alpha', 'Bravo']);
  });

  describe('refuses, and changes nothing', () => {
    it('a name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategory', { name, newSubcategorySortOrder: 'Oldest' }))).toEqual(refused('notFound', name));
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared');
      await call('createCategory', { name });
      await call('createCategory', { name });
      const { code, reason: why } = await refusal(call('updateCategory', { name, newSubcategorySortOrder: 'Oldest' }));
      expect(code).toBe('conflict');
      expect(why.replace(name, '')).toContain('2');
      expect((await named(name)).map((category) => category.subcategorySortOrder)).toEqual(['Newest', 'Newest']);
    });

    it('removing the name', async () => {
      const { name } = await create('keep name');
      expect(await refusal(call('updateCategory', { name, newName: null }))).toEqual(refused('validation', 'newName'));
      expect(await refusal(call('updateCategory', { name, newName: '' }))).toEqual(refused('validation', 'newName'));
      expect(await named(name)).toEqual([jasmine.objectContaining({ name })]);
    });

    it('a subcategory order it does not offer', async () => {
      const { name } = await create('bad new order');
      expect(await refusal(call('updateCategory', { name, newSubcategorySortOrder: 'Random' }))).toEqual(refused('validation', 'newSubcategorySortOrder'));
      expect((await theCategory(name)).subcategorySortOrder).toBe('Newest');
    });

    it('a call that changes nothing', async () => {
      const { name } = await create('nothing');
      expect((await refusal(call('updateCategory', { name }))).code).toBe('validation');
    });

    it('without a name', async () => {
      expect(await refusal(call('updateCategory', { newSubcategorySortOrder: 'Oldest' }))).toEqual(refused('validation', 'name'));
    });
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(standIns);

  it('changes the category with that id', async () => {
    const { name, id } = await create('update by id');
    const newName = unique('renamed by id');
    expect(await call('updateCategoryAdvanced', { categoryId: id, newName })).toEqual(jasmine.objectContaining({ id, name: newName }));
    expect(await named(name)).toEqual([]);
    expect(await theCategory(newName)).toEqual(jasmine.objectContaining({ id }));
  });

  describe('refuses', () => {
    it('an id no category has', async () => {
      expect(await refusal(call('updateCategoryAdvanced', { categoryId: MISSING_ID, newName: 'x' }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without an id', async () => {
      expect(await refusal(call('updateCategoryAdvanced', { newName: 'x' }))).toEqual(refused('validation', 'categoryId'));
    });

    it('a call that changes nothing', async () => {
      const { id } = await create('nothing by id');
      expect((await refusal(call('updateCategoryAdvanced', { categoryId: id }))).code).toBe('validation');
    });
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('changes every category, and reports each', async () => {
    const one = await create('batch update one');
    const two = await create('batch update two');
    const result = await call('updateCategoriesAdvanced', { categories: [
      { categoryId: one.id, newSubcategorySortOrder: 'Oldest' },
      { categoryId: two.id, newIcon: ['https://example.com/batch.png'] }
    ] });
    expect(result).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect((await theCategory(one.name)).subcategorySortOrder).toBe('Oldest');
    expect((await theCategory(two.name)).icon).toBe('https://example.com/batch.png');
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches no category', async () => {
      const kept = await create('batch kept');
      const categories = [{ categoryId: kept.id, newSubcategorySortOrder: 'Oldest' }, { categoryId: MISSING_ID, newSubcategorySortOrder: 'Oldest' }];
      expect(await refusal(call('updateCategoriesAdvanced', { categories }))).toEqual(refused('notFound', MISSING_ID));
      expect((await theCategory(kept.name)).subcategorySortOrder).toBe('Newest');
    });

    it('when the same category is listed twice', async () => {
      const kept = await create('batch twice');
      const categories = [{ categoryId: kept.id, newSubcategorySortOrder: 'Oldest' }, { categoryId: kept.id, newSubcategorySortOrder: 'Manually' }];
      expect((await refusal(call('updateCategoriesAdvanced', { categories }))).code).toBe('validation');
      expect((await theCategory(kept.name)).subcategorySortOrder).toBe('Newest');
    });

    it('when one entry is invalid', async () => {
      const kept = await create('batch invalid');
      const categories = [{ categoryId: kept.id, newSubcategorySortOrder: 'Oldest' }, { categoryId: MISSING_ID, newSubcategorySortOrder: 'Random' }];
      expect(await refusal(call('updateCategoriesAdvanced', { categories }))).toEqual(refused('validation', 'newSubcategorySortOrder'));
      expect((await theCategory(kept.name)).subcategorySortOrder).toBe('Newest');
    });

    it('when it is empty', async () => {
      expect(await refusal(call('updateCategoriesAdvanced', { categories: [] }))).toEqual(refused('validation', 'categories'));
    });
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(standIns);

  it('removes the category with that name, with its subcategories', async () => {
    const { name, id } = await withSubcategories('delete', ['Inside']);
    expect(await call('deleteCategory', { name })).toEqual(jasmine.objectContaining({ id, name, deleted: true }));
    expect(await named(name)).toEqual([]);
  });

  it('leaves every other category alone', async () => {
    const kept = await create('kept');
    const { name } = await create('deleted');
    await call('deleteCategory', { name });
    expect(await named(kept.name)).toEqual([jasmine.objectContaining({ id: kept.id })]);
  });

  describe('refuses, and removes nothing', () => {
    it('a name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('deleteCategory', { name }))).toEqual(refused('notFound', name));
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared delete');
      await call('createCategory', { name });
      await call('createCategory', { name });
      const { code, reason: why } = await refusal(call('deleteCategory', { name }));
      expect(code).toBe('conflict');
      expect(why.replace(name, '')).toContain('2');
      expect((await named(name)).length).toBe(2);
    });

    it('without a name', async () => {
      expect(await refusal(call('deleteCategory', {}))).toEqual(refused('validation', 'name'));
    });
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(standIns);

  it('removes the category with that id', async () => {
    const { name, id } = await create('delete by id');
    expect(await call('deleteCategoryAdvanced', { categoryId: id })).toEqual(jasmine.objectContaining({ id, name, deleted: true }));
    expect(await named(name)).toEqual([]);
  });

  describe('refuses', () => {
    it('an id no category has', async () => {
      expect(await refusal(call('deleteCategoryAdvanced', { categoryId: MISSING_ID }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without an id', async () => {
      expect(await refusal(call('deleteCategoryAdvanced', {}))).toEqual(refused('validation', 'categoryId'));
    });
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('removes every category, and reports each', async () => {
    const one = await create('batch delete one');
    const two = await create('batch delete two');
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: one.id }, { categoryId: two.id }] })).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect(await named(one.name)).toEqual([]);
    expect(await named(two.name)).toEqual([]);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one id matches no category', async () => {
      const kept = await create('batch delete kept');
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: [{ categoryId: kept.id }, { categoryId: MISSING_ID }] }))).toEqual(refused('notFound', MISSING_ID));
      expect((await named(kept.name)).length).toBe(1);
    });

    it('when the same category is listed twice', async () => {
      const kept = await create('batch delete twice');
      expect((await refusal(call('deleteCategoriesAdvanced', { categories: [{ categoryId: kept.id }, { categoryId: kept.id }] }))).code).toBe('validation');
      expect((await named(kept.name)).length).toBe(1);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: [] }))).toEqual(refused('validation', 'categories'));
    });
  });
});

contract.describe('updateCategoryOrder', () => {
  beforeEach(standIns);

  it('moves the category to the first place of the manual order', async () => {
    const { name, id } = await create('first place');
    expect(await call('updateCategoryOrder', { name, position: 1 })).toEqual(jasmine.objectContaining({ id, name, rank: 1 }));
    expect((await theCategory(name)).rank).toBe(1);
  }, SLOW);

  it('moves the category behind the one in first place', async () => {
    const first = await create('order first');
    const second = await create('order second');
    await call('updateCategoryOrder', { name: first.name, position: 1 });
    await call('updateCategoryOrder', { name: second.name, position: 2 });
    expect((await theCategory(first.name)).rank).toBe(1);
    expect((await theCategory(second.name)).rank).toBe(2);
  }, SLOW);

  describe('refuses, and moves nothing', () => {
    it('a place before the first', async () => {
      const { name } = await create('place zero');
      expect(await refusal(call('updateCategoryOrder', { name, position: 0 }))).toEqual(refused('validation', 'position'));
    });

    it('a place past the last category', async () => {
      const { name } = await create('place past');
      const { rank } = await theCategory(name);
      expect(await refusal(call('updateCategoryOrder', { name, position: 100000 }))).toEqual(refused('validation', 'position'));
      expect((await theCategory(name)).rank).toBe(rank);
    }, SLOW);

    it('a name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategoryOrder', { name, position: 1 }))).toEqual(refused('notFound', name));
    });
  });
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves the category with that id to the first place', async () => {
    const { name, id } = await create('first place by id');
    expect(await call('updateCategoryOrderAdvanced', { categoryId: id, position: 1 })).toEqual(jasmine.objectContaining({ id, rank: 1 }));
    expect((await theCategory(name)).rank).toBe(1);
  }, SLOW);

  describe('refuses', () => {
    it('an id no category has', async () => {
      expect(await refusal(call('updateCategoryOrderAdvanced', { categoryId: MISSING_ID, position: 1 }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('a place that is not a whole number', async () => {
      const { id } = await create('place text by id');
      expect(await refusal(call('updateCategoryOrderAdvanced', { categoryId: id, position: 1.5 }))).toEqual(refused('validation', 'position'));
    });
  });
});

contract.describe('createSubcategory', () => {
  beforeEach(standIns);

  it('adds a subcategory at the end of the category, and returns it', async () => {
    const { name } = await withSubcategories('subcategory', ['First']);
    const created = await call('createSubcategory', { categoryName: name, name: 'Second' });
    expect(created).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Second', rank: 2, category: jasmine.objectContaining({ name }) }));
    expect((await theCategory(name)).subcategories).toEqual([
      jasmine.objectContaining({ name: 'First' }),
      jasmine.objectContaining({ id: created.id, name: 'Second', rank: 2 })
    ]);
  });

  describe('refuses, and adds nothing', () => {
    it('without a name', async () => {
      const { name } = await create('no subcategory name');
      expect(await refusal(call('createSubcategory', { categoryName: name }))).toEqual(refused('validation', 'name'));
      expect(await refusal(call('createSubcategory', { categoryName: name, name: '' }))).toEqual(refused('validation', 'name'));
      expect((await theCategory(name)).subcategories).toEqual([]);
    });

    it('without a category', async () => {
      expect(await refusal(call('createSubcategory', { name: 'Orphan' }))).toEqual(refused('validation', 'categoryName'));
    });

    it('a category no one has', async () => {
      const categoryName = unique('missing');
      expect(await refusal(call('createSubcategory', { categoryName, name: 'Lost' }))).toEqual(refused('notFound', categoryName));
    });
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('adds a subcategory to the category with that id', async () => {
    const { name, id } = await create('subcategory by id');
    const created = await call('createSubcategoryAdvanced', { categoryId: id, name: 'By id' });
    expect(created).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'By id', rank: 1 }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['By id']);
  });

  describe('refuses', () => {
    it('an id no category has', async () => {
      expect(await refusal(call('createSubcategoryAdvanced', { categoryId: MISSING_ID, name: 'Lost' }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without a name', async () => {
      const { id } = await create('no name by id');
      expect(await refusal(call('createSubcategoryAdvanced', { categoryId: id }))).toEqual(refused('validation', 'name'));
    });
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds every subcategory, and reports each', async () => {
    const { name, id } = await create('batch subcategories');
    const result = await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: id, name: 'One' }, { categoryId: id, name: 'Two' }] });
    expect(result).toEqual(jasmine.objectContaining({
      subcategories: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })],
      succeeded: 2,
      failed: 0
    }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['One', 'Two']);
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one category id matches nothing', async () => {
      const { name, id } = await create('batch subcategories missing');
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: id, name: 'One' }, { categoryId: MISSING_ID, name: 'Two' }] })))
        .toEqual(refused('notFound', MISSING_ID));
      expect((await theCategory(name)).subcategories).toEqual([]);
    });

    it('when one entry has no name', async () => {
      const { name, id } = await create('batch subcategories invalid');
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: id, name: 'One' }, { categoryId: id }] }))).toEqual(refused('validation', 'name'));
      expect((await theCategory(name)).subcategories).toEqual([]);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [] }))).toEqual(refused('validation', 'subcategories'));
    });
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(standIns);

  it('renames the subcategory, and returns it', async () => {
    const { name, subcategoryIds } = await withSubcategories('rename subcategory', ['Old', 'Other']);
    expect(await call('updateSubcategory', { categoryName: name, subcategoryName: 'Old', newName: 'New' }))
      .toEqual(jasmine.objectContaining({ id: subcategoryIds[0], name: 'New', category: jasmine.objectContaining({ name }) }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['New', 'Other']);
  });

  describe('refuses, and changes nothing', () => {
    it('a subcategory its category does not have', async () => {
      const { name } = await withSubcategories('no such subcategory', ['Kept']);
      expect(await refusal(call('updateSubcategory', { categoryName: name, subcategoryName: 'Missing', newName: 'New' }))).toEqual(refused('notFound', 'Missing'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
    });

    it('a name two subcategories share, saying how many', async () => {
      const { name } = await withSubcategories('twin subcategories', ['Twin', 'Twin']);
      const { code, reason: why } = await refusal(call('updateSubcategory', { categoryName: name, subcategoryName: 'Twin', newName: 'New' }));
      expect(code).toBe('conflict');
      expect(why.replace(name, '')).toContain('2');
      expect(subcategoryNames(await theCategory(name))).toEqual(['Twin', 'Twin']);
    });

    it('a category no one has', async () => {
      const categoryName = unique('missing');
      expect(await refusal(call('updateSubcategory', { categoryName, subcategoryName: 'Any', newName: 'New' }))).toEqual(refused('notFound', categoryName));
    });

    it('removing the name', async () => {
      const { name } = await withSubcategories('keep subcategory name', ['Kept']);
      expect(await refusal(call('updateSubcategory', { categoryName: name, subcategoryName: 'Kept' }))).toEqual(refused('validation', 'newName'));
      expect(await refusal(call('updateSubcategory', { categoryName: name, subcategoryName: 'Kept', newName: '' }))).toEqual(refused('validation', 'newName'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
    });

    it('without the subcategory', async () => {
      const { name } = await create('no subcategory given');
      expect(await refusal(call('updateSubcategory', { categoryName: name, newName: 'New' }))).toEqual(refused('validation', 'subcategoryName'));
    });
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('renames the subcategory with that id', async () => {
    const { name, id, subcategoryIds } = await withSubcategories('rename by id', ['Old']);
    expect(await call('updateSubcategoryAdvanced', { categoryId: id, subcategoryId: subcategoryIds[0], newName: 'New' })).toEqual(jasmine.objectContaining({ id: subcategoryIds[0], name: 'New' }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['New']);
  });

  describe('refuses', () => {
    it('a subcategory id its category does not have', async () => {
      const { name, id } = await withSubcategories('no subcategory id', ['Kept']);
      expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: id, subcategoryId: 'no-such-subcategory', newName: 'New' }))).toEqual(refused('notFound', 'no-such-subcategory'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
    });

    it('a category id no category has', async () => {
      expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: MISSING_ID, subcategoryId: 'any', newName: 'New' }))).toEqual(refused('notFound', MISSING_ID));
    });

    it('without a new name', async () => {
      const { id, subcategoryIds } = await withSubcategories('no new name by id', ['Kept']);
      expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: id, subcategoryId: subcategoryIds[0] }))).toEqual(refused('validation', 'newName'));
    });
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('renames every subcategory, and reports each', async () => {
    const { name, id, subcategoryIds } = await withSubcategories('batch rename', ['One', 'Two']);
    const result = await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: id, subcategoryId: subcategoryIds[0], newName: 'Uno' },
      { categoryId: id, subcategoryId: subcategoryIds[1], newName: 'Dos' }
    ] });
    expect(result).toEqual(jasmine.objectContaining({
      subcategories: [jasmine.objectContaining({ index: 0, id: subcategoryIds[0] }), jasmine.objectContaining({ index: 1, id: subcategoryIds[1] })],
      succeeded: 2,
      failed: 0
    }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['Uno', 'Dos']);
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one subcategory id matches nothing', async () => {
      const { name, id, subcategoryIds } = await withSubcategories('batch rename missing', ['One']);
      const subcategories = [{ categoryId: id, subcategoryId: subcategoryIds[0], newName: 'Uno' }, { categoryId: id, subcategoryId: 'no-such-subcategory', newName: 'Dos' }];
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories }))).toEqual(refused('notFound', 'no-such-subcategory'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['One']);
    });

    it('when the same subcategory is listed twice', async () => {
      const { name, id, subcategoryIds } = await withSubcategories('batch rename twice', ['One']);
      const subcategories = [{ categoryId: id, subcategoryId: subcategoryIds[0], newName: 'Uno' }, { categoryId: id, subcategoryId: subcategoryIds[0], newName: 'Dos' }];
      expect((await refusal(call('updateSubcategoriesAdvanced', { subcategories }))).code).toBe('validation');
      expect(subcategoryNames(await theCategory(name))).toEqual(['One']);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories: [] }))).toEqual(refused('validation', 'subcategories'));
    });
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(standIns);

  it('removes the subcategory, and leaves the others', async () => {
    const { name, subcategoryIds } = await withSubcategories('delete subcategory', ['Gone', 'Kept']);
    expect(await call('deleteSubcategory', { categoryName: name, subcategoryName: 'Gone' }))
      .toEqual(jasmine.objectContaining({ id: subcategoryIds[0], name: 'Gone', deleted: true, category: jasmine.objectContaining({ name }) }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
  });

  describe('refuses, and removes nothing', () => {
    it('a subcategory its category does not have', async () => {
      const { name } = await withSubcategories('delete missing subcategory', ['Kept']);
      expect(await refusal(call('deleteSubcategory', { categoryName: name, subcategoryName: 'Missing' }))).toEqual(refused('notFound', 'Missing'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
    });

    it('a name two subcategories share, saying how many', async () => {
      const { name } = await withSubcategories('delete twin subcategories', ['Twin', 'Twin']);
      const { code, reason: why } = await refusal(call('deleteSubcategory', { categoryName: name, subcategoryName: 'Twin' }));
      expect(code).toBe('conflict');
      expect(why.replace(name, '')).toContain('2');
      expect(subcategoryNames(await theCategory(name))).toEqual(['Twin', 'Twin']);
    });

    it('without the subcategory', async () => {
      const { name } = await create('delete no subcategory');
      expect(await refusal(call('deleteSubcategory', { categoryName: name }))).toEqual(refused('validation', 'subcategoryName'));
    });
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('removes the subcategory with that id', async () => {
    const { name, id, subcategoryIds } = await withSubcategories('delete by id', ['Gone']);
    expect(await call('deleteSubcategoryAdvanced', { categoryId: id, subcategoryId: subcategoryIds[0] })).toEqual(jasmine.objectContaining({ id: subcategoryIds[0], deleted: true }));
    expect((await theCategory(name)).subcategories).toEqual([]);
  });

  describe('refuses', () => {
    it('a subcategory id its category does not have', async () => {
      const { name, id } = await withSubcategories('delete missing id', ['Kept']);
      expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: id, subcategoryId: 'no-such-subcategory' }))).toEqual(refused('notFound', 'no-such-subcategory'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
    });

    it('a category id no category has', async () => {
      expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: MISSING_ID, subcategoryId: 'any' }))).toEqual(refused('notFound', MISSING_ID));
    });
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('removes every subcategory, and reports each', async () => {
    const { name, id, subcategoryIds } = await withSubcategories('batch delete subcategories', ['One', 'Two', 'Kept']);
    const result = await call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: id, subcategoryId: subcategoryIds[0] }, { categoryId: id, subcategoryId: subcategoryIds[1] }] });
    expect(result).toEqual(jasmine.objectContaining({
      subcategories: [jasmine.objectContaining({ index: 0, id: subcategoryIds[0] }), jasmine.objectContaining({ index: 1, id: subcategoryIds[1] })],
      succeeded: 2,
      failed: 0
    }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one subcategory id matches nothing', async () => {
      const { name, id, subcategoryIds } = await withSubcategories('batch delete missing', ['Kept']);
      const subcategories = [{ categoryId: id, subcategoryId: subcategoryIds[0] }, { categoryId: id, subcategoryId: 'no-such-subcategory' }];
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories }))).toEqual(refused('notFound', 'no-such-subcategory'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
    });

    it('when the same subcategory is listed twice', async () => {
      const { name, id, subcategoryIds } = await withSubcategories('batch delete twice', ['Kept']);
      const subcategories = [{ categoryId: id, subcategoryId: subcategoryIds[0] }, { categoryId: id, subcategoryId: subcategoryIds[0] }];
      expect((await refusal(call('deleteSubcategoriesAdvanced', { subcategories }))).code).toBe('validation');
      expect(subcategoryNames(await theCategory(name))).toEqual(['Kept']);
    });

    it('when it is empty', async () => {
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories: [] }))).toEqual(refused('validation', 'subcategories'));
    });
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(standIns);

  it('moves the subcategory to another place, ranking each by its place', async () => {
    const { name } = await withSubcategories('reorder', ['A', 'B', 'C']);
    const result = await call('updateSubcategoryOrder', { categoryName: name, subcategoryName: 'C', position: 1 });
    expect(result.subcategories).toEqual([
      jasmine.objectContaining({ name: 'C', rank: 0 }),
      jasmine.objectContaining({ name: 'A', rank: 1 }),
      jasmine.objectContaining({ name: 'B', rank: 2 })
    ]);
    expect(subcategoryNames(await theCategory(name))).toEqual(['C', 'A', 'B']);
  });

  describe('refuses, and moves nothing', () => {
    it('a place past the last subcategory', async () => {
      const { name } = await withSubcategories('reorder past', ['A', 'B']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: name, subcategoryName: 'A', position: 3 }))).toEqual(refused('validation', 'position'));
      expect(subcategoryNames(await theCategory(name))).toEqual(['A', 'B']);
    });

    it('a place before the first', async () => {
      const { name } = await withSubcategories('reorder zero', ['A']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: name, subcategoryName: 'A', position: 0 }))).toEqual(refused('validation', 'position'));
    });

    it('a subcategory its category does not have', async () => {
      const { name } = await withSubcategories('reorder missing', ['A']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: name, subcategoryName: 'Missing', position: 1 }))).toEqual(refused('notFound', 'Missing'));
    });
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves the subcategory with that id to another place', async () => {
    const { name, id, subcategoryIds } = await withSubcategories('reorder by id', ['A', 'B']);
    const result = await call('updateSubcategoryOrderAdvanced', { categoryId: id, subcategoryId: subcategoryIds[1], position: 1 });
    expect(result).toEqual(jasmine.objectContaining({ id, subcategories: [jasmine.objectContaining({ id: subcategoryIds[1], rank: 0 }), jasmine.objectContaining({ id: subcategoryIds[0], rank: 1 })] }));
    expect(subcategoryNames(await theCategory(name))).toEqual(['B', 'A']);
  });

  describe('refuses', () => {
    it('a subcategory id its category does not have', async () => {
      const { id } = await withSubcategories('reorder missing id', ['A']);
      expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: id, subcategoryId: 'no-such-subcategory', position: 1 }))).toEqual(refused('notFound', 'no-such-subcategory'));
    });

    it('a category id no category has', async () => {
      expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: MISSING_ID, subcategoryId: 'any', position: 1 }))).toEqual(refused('notFound', MISSING_ID));
    });
  });
});
