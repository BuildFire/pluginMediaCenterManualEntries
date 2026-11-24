// categories: every operation on categories and the subcategories inside them, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}`;
const NO_SUCH_ID = '000000000000000000000000';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// The refresh message the contract sends the widget after a change: nothing here answers it, and the contract does not
// promise it, so a spy only stands in for it.
const standInForSideEffects = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};

// What the contract's own read finds by that exact name.
const found = async (name) => (await call('searchCategories', { name, pageSize: 50 })).categories.filter((category) => category.name === name);
const create = async (label, fields) => call('createCategory', Object.assign({ name: unique(label) }, fields || {}));
// A category of the spec's own, holding subcategories with these names, in this order.
const withSubcategories = async (label, names) => {
  const category = await create(label);
  const subcategories = [];
  for (const name of names) subcategories.push(await call('createSubcategoryAdvanced', { categoryId: category.id, name }));
  return { category, subcategories };
};
const subcategoryNames = async (name) => (await found(name))[0].subcategories.map((subcategory) => subcategory.name);

// Only the control panel adds categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Post category for the app';
const subcategoryForTheApp = 'Post subcategory for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? call('createCategory', { name: forTheApp, icon: ['https://example.com/for-the-app.png'] })
      .then(() => call('createSubcategory', { categoryName: forTheApp, name: subcategoryForTheApp }))
      .then((subcategory) => subcategory.category)
    : found(forTheApp).then(([category]) => category || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`))));
  return madeCategory;
};

contract.describe('searchCategories', () => {
  beforeEach(standInForSideEffects);

  it('finds categories whose name contains the text, whatever its case, with their subcategories', async () => {
    const category = await categoryForTheApp();
    const result = await call('searchCategories', { name: 'CATEGORY FOR THE APP' });
    expect(result).toEqual(jasmine.objectContaining({ categories: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.categories).toContain(jasmine.objectContaining({
      id: category.id, name: forTheApp, icon: 'https://example.com/for-the-app.png', subcategorySortOrder: jasmine.any(String),
      rank: jasmine.any(Number), createdOn: jasmine.stringMatching(ISO),
      subcategories: [jasmine.objectContaining({ id: jasmine.any(String), name: subcategoryForTheApp, rank: jasmine.any(Number) })]
    }));
  });

  it('shows 20 categories a page when no page size is given', async () => {
    await categoryForTheApp();
    if (contract.host === 'control') {
      // More categories than a page, made through the contract's batch operation.
      const stamp = Date.now();
      const categories = Array.from({ length: 21 }, (value, index) => ({ name: `Post page category ${index} ${stamp}` }));
      expect(await call('createCategoriesAdvanced', { categories })).toEqual(jasmine.objectContaining({ succeeded: 21 }));
    }
    const result = await call('searchCategories', {});
    expect(result.total).toBeGreaterThan(20);
    expect(result.categories.length).toBe(20);
    expect(result.hasMore).toBe(true);
  }, 120000);

  it('walks the pages with a page size', async () => {
    await categoryForTheApp();
    const first = await call('searchCategories', { page: 0, pageSize: 1 });
    const second = await call('searchCategories', { page: 1, pageSize: 1 });
    expect(first.categories.length).toBe(1);
    expect(second.categories.length).toBe(1);
    expect(second.page).toBe(1);
    expect(second.categories[0].id).not.toBe(first.categories[0].id);
  });

  it('finds nothing for a name no category has', async () => {
    expect(await call('searchCategories', { name: unique('no such category') })).toEqual(jasmine.objectContaining({ categories: [], total: 0, hasMore: false }));
  });

  if (contract.host === 'control') {
    it('lists the newest first while the order is left as it is', async () => {
      const stamp = `${Date.now()}`;
      const older = await call('createCategory', { name: `Post older ${stamp}` });
      const newer = await call('createCategory', { name: `Post newer ${stamp}` });
      expect((await call('searchCategories', { name: stamp })).categories.map((category) => category.id)).toEqual([newer.id, older.id]);
    });
  }

  describe('refuses', () => {
    it('a page size over 50, or under 1', async () => {
      expect(await refusal(call('searchCategories', { pageSize: 51 }))).toContain('pageSize');
      expect(await refusal(call('searchCategories', { pageSize: 0 }))).toContain('pageSize');
    });

    it('a page that is not a whole number of 0 or more', async () => {
      expect(await refusal(call('searchCategories', { page: -1 }))).toContain('page');
      expect(await refusal(call('searchCategories', { page: 'next' }))).toContain('page');
    });

    it('an empty name, or one that is not text', async () => {
      expect(await refusal(call('searchCategories', { name: '' }))).toContain('name');
      expect(await refusal(call('searchCategories', { name: 42 }))).toContain('name');
    });
  });
});

// controlBackground only: categories are the owner's content.
contract.describe('createCategory', () => {
  beforeEach(standInForSideEffects);

  it('adds a category from its name, and returns it with the form\'s defaults', async () => {
    const name = unique('category');
    const created = await call('createCategory', { name });
    expect(created).toEqual(jasmine.objectContaining({
      id: jasmine.any(String), name, icon: '', subcategorySortOrder: 'Newest', rank: 0, subcategories: [],
      createdOn: jasmine.stringMatching(ISO), lastUpdatedOn: jasmine.stringMatching(ISO)
    }));
    expect(await found(name)).toEqual([jasmine.objectContaining({ id: created.id, name, subcategories: [] })]);
  });

  it('keeps its icon as a single link, and its subcategory order', async () => {
    const name = unique('with icon');
    const created = await call('createCategory', { name, icon: ['https://example.com/icon.png'], subcategorySortOrder: 'Subcategory Title A-Z' });
    expect(created).toEqual(jasmine.objectContaining({ icon: 'https://example.com/icon.png', subcategorySortOrder: 'Subcategory Title A-Z' }));
    expect(await found(name)).toEqual([jasmine.objectContaining({ icon: 'https://example.com/icon.png', subcategorySortOrder: 'Subcategory Title A-Z' })]);
  });

  it('takes one of BuildFire\'s icons, or a single picture on its own', async () => {
    expect((await create('icon class', { icon: ['glyphicon glyphicon-star'] })).icon).toBe('glyphicon glyphicon-star');
    expect((await create('bare icon', { icon: 'https://example.com/bare.png' })).icon).toBe('https://example.com/bare.png');
  });

  describe('refuses, and stores nothing', () => {
    it('without a name', async () => {
      expect(await refusal(call('createCategory', {}))).toContain('name');
      expect(await refusal(call('createCategory', { name: '' }))).toContain('name');
      expect(await refusal(call('createCategory', { name: null }))).toContain('name');
    });

    it('with a name that is not text', async () => {
      expect(await refusal(call('createCategory', { name: 42 }))).toContain('name');
    });

    it('with more than one icon', async () => {
      const name = unique('two icons');
      expect(await refusal(call('createCategory', { name, icon: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('icon');
      expect(await found(name)).toEqual([]);
    });

    it('with a subcategory order it does not offer', async () => {
      const name = unique('bad order');
      expect(await refusal(call('createCategory', { name, subcategorySortOrder: 'Random' }))).toContain('subcategorySortOrder');
      expect(await found(name)).toEqual([]);
    });
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds every category, and reports each', async () => {
    const names = [unique('batch one'), unique('batch two')];
    const result = await call('createCategoriesAdvanced', { categories: [{ name: names[0] }, { name: names[1], subcategorySortOrder: 'Oldest' }] });
    expect(result).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })],
      succeeded: 2,
      failed: 0
    }));
    expect(await found(names[0])).toEqual([jasmine.objectContaining({ id: result.categories[0].id })]);
    expect(await found(names[1])).toEqual([jasmine.objectContaining({ id: result.categories[1].id, subcategorySortOrder: 'Oldest' })]);
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createCategoriesAdvanced', { categories: [{ name: valid }, { name: '' }] }))).toContain('entry 1');
      expect(await found(valid)).toEqual([]);
    });

    it('when it is empty, or left out', async () => {
      expect(await refusal(call('createCategoriesAdvanced', { categories: [] }))).toContain('categories');
      expect(await refusal(call('createCategoriesAdvanced', {}))).toContain('categories');
    });

    it('when it holds more than 50 entries', async () => {
      const categories = Array.from({ length: 51 }, (value, index) => ({ name: unique(`entry ${index}`) }));
      expect(await refusal(call('createCategoriesAdvanced', { categories }))).toContain('categories');
      expect(await found(categories[0].name)).toEqual([]);
    });
  });
});

contract.describe('updateCategory', () => {
  beforeEach(standInForSideEffects);

  it('changes only what it is given, and returns the category', async () => {
    const category = await create('update', { icon: ['https://example.com/kept.png'] });
    const newName = `${category.name} new`;
    expect(await call('updateCategory', { name: category.name, newName })).toEqual(jasmine.objectContaining({ id: category.id, name: newName, icon: 'https://example.com/kept.png' }));
    expect(await found(category.name)).toEqual([]);
    expect(await found(newName)).toEqual([jasmine.objectContaining({ id: category.id, icon: 'https://example.com/kept.png' })]);
  });

  it('sets the icon, and removes it with an empty list or null', async () => {
    const category = await create('icon');
    await call('updateCategory', { name: category.name, newIcon: ['https://example.com/new.png'] });
    expect((await found(category.name))[0].icon).toBe('https://example.com/new.png');
    await call('updateCategory', { name: category.name, newIcon: [] });
    expect((await found(category.name))[0].icon).toBe('');
    await call('updateCategory', { name: category.name, newIcon: ['https://example.com/again.png'] });
    await call('updateCategory', { name: category.name, newIcon: null });
    expect((await found(category.name))[0].icon).toBe('');
  });

  it('sorts its subcategories again when their order changes', async () => {
    const { category } = await withSubcategories('sorted', ['Bravo', 'Alpha', 'Charlie']);
    await call('updateCategory', { name: category.name, newSubcategorySortOrder: 'Subcategory Title A-Z' });
    expect(await found(category.name)).toEqual([jasmine.objectContaining({ subcategorySortOrder: 'Subcategory Title A-Z' })]);
    expect(await subcategoryNames(category.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    await call('updateCategory', { name: category.name, newSubcategorySortOrder: 'Subcategory Title Z-A' });
    expect(await subcategoryNames(category.name)).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  describe('refuses, and changes nothing', () => {
    it('a name no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategory', { name, newIcon: [] }))).toContain(name);
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared');
      await call('createCategory', { name, icon: ['https://example.com/one.png'] });
      await call('createCategory', { name, icon: ['https://example.com/one.png'] });
      expect((await refusal(call('updateCategory', { name, newIcon: [] }))).replace(name, '')).toContain('2');
      expect((await found(name)).map((category) => category.icon)).toEqual(['https://example.com/one.png', 'https://example.com/one.png']);
    });

    it('removing the name', async () => {
      const category = await create('keep name');
      expect(await refusal(call('updateCategory', { name: category.name, newName: null }))).toContain('newName');
      expect(await refusal(call('updateCategory', { name: category.name, newName: '' }))).toContain('newName');
      expect(await found(category.name)).toEqual([jasmine.objectContaining({ id: category.id })]);
    });

    it('a subcategory order it does not offer', async () => {
      const category = await create('bad order');
      expect(await refusal(call('updateCategory', { name: category.name, newSubcategorySortOrder: 'Random' }))).toContain('newSubcategorySortOrder');
      expect((await found(category.name))[0].subcategorySortOrder).toBe('Newest');
    });

    it('more than one icon', async () => {
      const category = await create('two icons');
      expect(await refusal(call('updateCategory', { name: category.name, newIcon: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('newIcon');
      expect((await found(category.name))[0].icon).toBe('');
    });

    it('a call that changes nothing', async () => {
      const category = await create('nothing');
      await expectAsync(call('updateCategory', { name: category.name })).toBeRejected();
    });

    it('without a name', async () => {
      expect(await refusal(call('updateCategory', { newIcon: [] }))).toContain('name');
      expect(await refusal(call('updateCategory', { name: '', newIcon: [] }))).toContain('name');
      expect(await refusal(call('updateCategory', { name: null, newIcon: [] }))).toContain('name');
    });
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes the category with that id', async () => {
    const category = await create('by id');
    const newName = `${category.name} new`;
    expect(await call('updateCategoryAdvanced', { categoryId: category.id, newName, newSubcategorySortOrder: 'Manually' }))
      .toEqual(jasmine.objectContaining({ id: category.id, name: newName, subcategorySortOrder: 'Manually' }));
    expect(await found(newName)).toEqual([jasmine.objectContaining({ id: category.id, subcategorySortOrder: 'Manually' })]);
  });

  it('refuses an id that matches nothing', async () => {
    await expectAsync(call('updateCategoryAdvanced', { categoryId: NO_SUCH_ID, newIcon: [] })).toBeRejected();
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('updateCategoryAdvanced', { newIcon: [] }))).toContain('categoryId');
    expect(await refusal(call('updateCategoryAdvanced', { categoryId: '', newIcon: [] }))).toContain('categoryId');
  });

  it('refuses a call that changes nothing', async () => {
    const category = await create('nothing by id');
    await expectAsync(call('updateCategoryAdvanced', { categoryId: category.id })).toBeRejected();
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes every category, and reports each', async () => {
    const one = await create('batch update one');
    const two = await create('batch update two', { icon: ['https://example.com/two.png'] });
    const result = await call('updateCategoriesAdvanced', { categories: [{ categoryId: one.id, newIcon: ['https://example.com/one.png'] }, { categoryId: two.id, newIcon: null }] });
    expect(result).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect((await found(one.name))[0].icon).toBe('https://example.com/one.png');
    expect((await found(two.name))[0].icon).toBe('');
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches nothing', async () => {
      const category = await create('batch known');
      await expectAsync(call('updateCategoriesAdvanced', { categories: [{ categoryId: category.id, newIcon: ['https://example.com/x.png'] }, { categoryId: NO_SUCH_ID, newIcon: [] }] })).toBeRejected();
      expect((await found(category.name))[0].icon).toBe('');
    });

    it('when the same category is listed twice', async () => {
      const category = await create('batch twice');
      await expectAsync(call('updateCategoriesAdvanced', { categories: [{ categoryId: category.id, newIcon: ['https://example.com/x.png'] }, { categoryId: category.id, newIcon: [] }] })).toBeRejected();
      expect((await found(category.name))[0].icon).toBe('');
    });

    it('when one entry is invalid', async () => {
      const category = await create('batch invalid');
      const other = await create('batch other');
      expect(await refusal(call('updateCategoriesAdvanced', { categories: [{ categoryId: category.id, newIcon: ['https://example.com/x.png'] }, { categoryId: other.id, newName: null }] }))).toContain('entry 1');
      expect((await found(category.name))[0].icon).toBe('');
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('updateCategoriesAdvanced', { categories: [] })).toBeRejected();
      expect(await refusal(call('updateCategoriesAdvanced', { categories: Array.from({ length: 51 }, () => ({ categoryId: NO_SUCH_ID, newIcon: [] })) }))).toContain('categories');
    });
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(standInForSideEffects);

  it('removes the category with that name, with its subcategories', async () => {
    const { category } = await withSubcategories('delete', ['Gone']);
    expect(await call('deleteCategory', { name: category.name })).toEqual(jasmine.objectContaining({ id: category.id, name: category.name, deleted: true }));
    expect(await found(category.name)).toEqual([]);
  });

  it('leaves every other category alone', async () => {
    const kept = await create('kept');
    const deleted = await create('deleted');
    await call('deleteCategory', { name: deleted.name });
    expect(await found(kept.name)).toEqual([jasmine.objectContaining({ id: kept.id })]);
  });

  describe('refuses, and removes nothing', () => {
    it('a name no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('deleteCategory', { name }))).toContain(name);
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared');
      await call('createCategory', { name });
      await call('createCategory', { name });
      expect((await refusal(call('deleteCategory', { name }))).replace(name, '')).toContain('2');
      expect((await found(name)).length).toBe(2);
    });

    it('without a name', async () => {
      expect(await refusal(call('deleteCategory', {}))).toContain('name');
      expect(await refusal(call('deleteCategory', { name: '' }))).toContain('name');
      expect(await refusal(call('deleteCategory', { name: null }))).toContain('name');
    });
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes the category with that id', async () => {
    const category = await create('delete by id');
    expect(await call('deleteCategoryAdvanced', { categoryId: category.id })).toEqual(jasmine.objectContaining({ id: category.id, name: category.name, deleted: true }));
    expect(await found(category.name)).toEqual([]);
  });

  it('refuses an id that matches nothing', async () => {
    expect(await refusal(call('deleteCategoryAdvanced', { categoryId: NO_SUCH_ID }))).toContain(NO_SUCH_ID);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('deleteCategoryAdvanced', {}))).toContain('categoryId');
    expect(await refusal(call('deleteCategoryAdvanced', { categoryId: '' }))).toContain('categoryId');
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes every category, and reports each', async () => {
    const one = await create('batch delete one');
    const two = await create('batch delete two');
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: one.id }, { categoryId: two.id }] })).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })],
      succeeded: 2,
      failed: 0
    }));
    expect(await found(one.name)).toEqual([]);
    expect(await found(two.name)).toEqual([]);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one id matches nothing', async () => {
      const category = await create('batch keep');
      await expectAsync(call('deleteCategoriesAdvanced', { categories: [{ categoryId: category.id }, { categoryId: NO_SUCH_ID }] })).toBeRejected();
      expect(await found(category.name)).toEqual([jasmine.objectContaining({ id: category.id })]);
    });

    it('when the same category is listed twice', async () => {
      const category = await create('batch twice');
      await expectAsync(call('deleteCategoriesAdvanced', { categories: [{ categoryId: category.id }, { categoryId: category.id }] })).toBeRejected();
      expect(await found(category.name)).toEqual([jasmine.objectContaining({ id: category.id })]);
    });

    it('when an entry has no id', async () => {
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: [{}] }))).toContain('categoryId');
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('deleteCategoriesAdvanced', { categories: [] })).toBeRejected();
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: Array.from({ length: 51 }, () => ({ categoryId: NO_SUCH_ID })) }))).toContain('categories');
    });
  });
});

contract.describe('updateCategoryOrder', () => {
  beforeEach(standInForSideEffects);

  it('moves a category to a place in the manual order, and the others make room', async () => {
    const first = await create('order one');
    const second = await create('order two');
    expect(await call('updateCategoryOrder', { name: first.name, position: 1 })).toEqual(jasmine.objectContaining({ id: first.id, name: first.name, rank: 1 }));
    expect((await found(first.name))[0].rank).toBe(1);
    await call('updateCategoryOrder', { name: second.name, position: 1 });
    expect((await found(second.name))[0].rank).toBe(1);
    expect((await found(first.name))[0].rank).toBe(2);
  }, 120000);

  describe('refuses, and moves nothing', () => {
    it('a name no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategoryOrder', { name, position: 1 }))).toContain(name);
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared order');
      await call('createCategory', { name });
      await call('createCategory', { name });
      expect((await refusal(call('updateCategoryOrder', { name, position: 1 }))).replace(name, '')).toContain('2');
    });

    it('a place past the end of the list', async () => {
      const category = await create('far');
      const { rank } = (await found(category.name))[0];
      expect(await refusal(call('updateCategoryOrder', { name: category.name, position: 100000 }))).toContain('position');
      expect((await found(category.name))[0].rank).toBe(rank);
    }, 120000);

    it('a place that is not a whole number of 1 or more', async () => {
      const category = await create('bad place');
      expect(await refusal(call('updateCategoryOrder', { name: category.name, position: 0 }))).toContain('position');
      expect(await refusal(call('updateCategoryOrder', { name: category.name, position: 2.5 }))).toContain('position');
      expect(await refusal(call('updateCategoryOrder', { name: category.name }))).toContain('position');
    });

    it('without a name', async () => {
      expect(await refusal(call('updateCategoryOrder', { position: 1 }))).toContain('name');
      expect(await refusal(call('updateCategoryOrder', { name: '', position: 1 }))).toContain('name');
    });
  });
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('moves the category with that id to a place in the manual order', async () => {
    const category = await create('order by id');
    expect(await call('updateCategoryOrderAdvanced', { categoryId: category.id, position: 1 })).toEqual(jasmine.objectContaining({ id: category.id, rank: 1 }));
    expect((await found(category.name))[0].rank).toBe(1);
  }, 120000);

  it('refuses an id that matches nothing', async () => {
    await expectAsync(call('updateCategoryOrderAdvanced', { categoryId: NO_SUCH_ID, position: 1 })).toBeRejected();
  });

  it('refuses without an id, or without a place', async () => {
    expect(await refusal(call('updateCategoryOrderAdvanced', { position: 1 }))).toContain('categoryId');
    const category = await create('no place');
    expect(await refusal(call('updateCategoryOrderAdvanced', { categoryId: category.id }))).toContain('position');
    expect((await found(category.name))[0].rank).toBe(0);
  });
});

contract.describe('createSubcategory', () => {
  beforeEach(standInForSideEffects);

  it('adds a subcategory at the end of a category, and returns it with its category', async () => {
    const category = await create('with subs');
    const first = await call('createSubcategory', { categoryName: category.name, name: 'First' });
    expect(first).toEqual(jasmine.objectContaining({
      id: jasmine.any(String), name: 'First', rank: 1,
      category: jasmine.objectContaining({ id: category.id, subcategories: [jasmine.objectContaining({ id: first.id, name: 'First' })] })
    }));
    const second = await call('createSubcategory', { categoryName: category.name, name: 'Second' });
    expect(second.rank).toBe(2);
    expect(await subcategoryNames(category.name)).toEqual(['First', 'Second']);
  });

  describe('refuses, and adds nothing', () => {
    it('a category no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('createSubcategory', { categoryName: name, name: 'Orphan' }))).toContain(name);
    });

    it('without a name', async () => {
      const category = await create('no sub name');
      expect(await refusal(call('createSubcategory', { categoryName: category.name }))).toContain('name');
      expect(await refusal(call('createSubcategory', { categoryName: category.name, name: '' }))).toContain('name');
      expect(await refusal(call('createSubcategory', { categoryName: category.name, name: null }))).toContain('name');
      expect(await refusal(call('createSubcategory', { categoryName: category.name, name: 42 }))).toContain('name');
      expect(await subcategoryNames(category.name)).toEqual([]);
    });

    it('without a category', async () => {
      expect(await refusal(call('createSubcategory', { name: 'Orphan' }))).toContain('categoryName');
      expect(await refusal(call('createSubcategory', { categoryName: '', name: 'Orphan' }))).toContain('categoryName');
    });
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds a subcategory to the category with that id', async () => {
    const category = await create('subs by id');
    const subcategory = await call('createSubcategoryAdvanced', { categoryId: category.id, name: 'By id' });
    expect(subcategory).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'By id', rank: 1, category: jasmine.objectContaining({ id: category.id }) }));
    expect(await subcategoryNames(category.name)).toEqual(['By id']);
  });

  it('refuses an id that matches nothing', async () => {
    await expectAsync(call('createSubcategoryAdvanced', { categoryId: NO_SUCH_ID, name: 'Orphan' })).toBeRejected();
  });

  it('refuses without an id or a name', async () => {
    expect(await refusal(call('createSubcategoryAdvanced', { name: 'Orphan' }))).toContain('categoryId');
    const category = await create('no name by id');
    expect(await refusal(call('createSubcategoryAdvanced', { categoryId: category.id }))).toContain('name');
    expect(await subcategoryNames(category.name)).toEqual([]);
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds every subcategory, and reports each', async () => {
    const category = await create('batch subs');
    const result = await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, name: 'One' }, { categoryId: category.id, name: 'Two' }] });
    expect(result).toEqual(jasmine.objectContaining({
      subcategories: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })],
      succeeded: 2,
      failed: 0
    }));
    expect(await subcategoryNames(category.name)).toEqual(['One', 'Two']);
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one category id matches nothing', async () => {
      const category = await create('batch unknown');
      await expectAsync(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, name: 'One' }, { categoryId: NO_SUCH_ID, name: 'Two' }] })).toBeRejected();
      expect(await subcategoryNames(category.name)).toEqual([]);
    });

    it('when one entry is invalid', async () => {
      const category = await create('batch invalid');
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, name: 'One' }, { categoryId: category.id }] }))).toContain('entry 1');
      expect(await subcategoryNames(category.name)).toEqual([]);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('createSubcategoriesAdvanced', { subcategories: [] })).toBeRejected();
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: Array.from({ length: 51 }, () => ({ categoryId: NO_SUCH_ID, name: 'x' })) }))).toContain('subcategories');
    });
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(standInForSideEffects);

  it('renames a subcategory, and returns it with its category', async () => {
    const { category, subcategories } = await withSubcategories('rename subs', ['Old', 'Other']);
    expect(await call('updateSubcategory', { categoryName: category.name, subcategoryName: 'Old', newName: 'New' })).toEqual(jasmine.objectContaining({
      id: subcategories[0].id, name: 'New', category: jasmine.objectContaining({ id: category.id })
    }));
    expect(await subcategoryNames(category.name)).toEqual(['New', 'Other']);
  });

  describe('refuses, and changes nothing', () => {
    it('a subcategory the category does not have, naming it', async () => {
      const { category } = await withSubcategories('no such sub', ['Kept']);
      expect(await refusal(call('updateSubcategory', { categoryName: category.name, subcategoryName: 'Missing', newName: 'New' }))).toContain('Missing');
      expect(await subcategoryNames(category.name)).toEqual(['Kept']);
    });

    it('a name two subcategories share, saying how many', async () => {
      const { category } = await withSubcategories('shared subs', ['Twin', 'Twin']);
      expect((await refusal(call('updateSubcategory', { categoryName: category.name, subcategoryName: 'Twin', newName: 'New' }))).replace(category.name, '')).toContain('2');
      expect(await subcategoryNames(category.name)).toEqual(['Twin', 'Twin']);
    });

    it('a category no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateSubcategory', { categoryName: name, subcategoryName: 'Any', newName: 'New' }))).toContain(name);
    });

    it('removing the name', async () => {
      const { category } = await withSubcategories('keep sub name', ['Kept']);
      expect(await refusal(call('updateSubcategory', { categoryName: category.name, subcategoryName: 'Kept' }))).toContain('newName');
      expect(await refusal(call('updateSubcategory', { categoryName: category.name, subcategoryName: 'Kept', newName: '' }))).toContain('newName');
      expect(await refusal(call('updateSubcategory', { categoryName: category.name, subcategoryName: 'Kept', newName: null }))).toContain('newName');
      expect(await subcategoryNames(category.name)).toEqual(['Kept']);
    });

    it('without a category or a subcategory', async () => {
      expect(await refusal(call('updateSubcategory', { subcategoryName: 'Any', newName: 'New' }))).toContain('categoryName');
      expect(await refusal(call('updateSubcategory', { categoryName: 'Any', newName: 'New' }))).toContain('subcategoryName');
    });
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('renames the subcategory with that id', async () => {
    const { category, subcategories } = await withSubcategories('rename by id', ['Old']);
    expect(await call('updateSubcategoryAdvanced', { categoryId: category.id, subcategoryId: subcategories[0].id, newName: 'New' }))
      .toEqual(jasmine.objectContaining({ id: subcategories[0].id, name: 'New' }));
    expect(await subcategoryNames(category.name)).toEqual(['New']);
  });

  it('refuses a subcategory id the category does not have', async () => {
    const { category } = await withSubcategories('no sub id', ['Kept']);
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: category.id, subcategoryId: 'no-such-subcategory', newName: 'New' }))).toContain('no-such-subcategory');
    expect(await subcategoryNames(category.name)).toEqual(['Kept']);
  });

  it('refuses a category id that matches nothing', async () => {
    await expectAsync(call('updateSubcategoryAdvanced', { categoryId: NO_SUCH_ID, subcategoryId: 'any', newName: 'New' })).toBeRejected();
  });

  it('refuses without its ids or a new name', async () => {
    expect(await refusal(call('updateSubcategoryAdvanced', { subcategoryId: 'any', newName: 'New' }))).toContain('categoryId');
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: NO_SUCH_ID, newName: 'New' }))).toContain('subcategoryId');
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: NO_SUCH_ID, subcategoryId: 'any' }))).toContain('newName');
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('renames every subcategory, and reports each', async () => {
    const { category, subcategories } = await withSubcategories('batch rename', ['One', 'Two']);
    const result = await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: category.id, subcategoryId: subcategories[0].id, newName: 'Uno' },
      { categoryId: category.id, subcategoryId: subcategories[1].id, newName: 'Dos' }
    ] });
    expect(result).toEqual(jasmine.objectContaining({
      subcategories: [jasmine.objectContaining({ index: 0, id: subcategories[0].id }), jasmine.objectContaining({ index: 1, id: subcategories[1].id })],
      succeeded: 2,
      failed: 0
    }));
    expect(await subcategoryNames(category.name)).toEqual(['Uno', 'Dos']);
  });

  describe('refuses the whole list, and renames none of it', () => {
    it('when one subcategory id matches nothing', async () => {
      const { category, subcategories } = await withSubcategories('batch unknown', ['One']);
      await expectAsync(call('updateSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: subcategories[0].id, newName: 'Uno' },
        { categoryId: category.id, subcategoryId: 'no-such-subcategory', newName: 'Dos' }
      ] })).toBeRejected();
      expect(await subcategoryNames(category.name)).toEqual(['One']);
    });

    it('when the same subcategory is listed twice', async () => {
      const { category, subcategories } = await withSubcategories('batch twice', ['One']);
      await expectAsync(call('updateSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: subcategories[0].id, newName: 'Uno' },
        { categoryId: category.id, subcategoryId: subcategories[0].id, newName: 'Dos' }
      ] })).toBeRejected();
      expect(await subcategoryNames(category.name)).toEqual(['One']);
    });

    it('when one entry has no new name', async () => {
      const { category, subcategories } = await withSubcategories('batch no name', ['One', 'Two']);
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: subcategories[0].id, newName: 'Uno' },
        { categoryId: category.id, subcategoryId: subcategories[1].id }
      ] }))).toContain('entry 1');
      expect(await subcategoryNames(category.name)).toEqual(['One', 'Two']);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('updateSubcategoriesAdvanced', { subcategories: [] })).toBeRejected();
      const subcategories = Array.from({ length: 51 }, (value, index) => ({ categoryId: NO_SUCH_ID, subcategoryId: `${index}`, newName: 'x' }));
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories }))).toContain('subcategories');
    });
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(standInForSideEffects);

  it('removes the subcategory with that name from its category', async () => {
    const { category, subcategories } = await withSubcategories('delete subs', ['Gone', 'Kept']);
    const result = await call('deleteSubcategory', { categoryName: category.name, subcategoryName: 'Gone' });
    expect(result).toEqual(jasmine.objectContaining({
      id: subcategories[0].id, name: 'Gone', deleted: true,
      category: jasmine.objectContaining({ id: category.id, subcategories: [jasmine.objectContaining({ name: 'Kept' })] })
    }));
    expect(await subcategoryNames(category.name)).toEqual(['Kept']);
  });

  describe('refuses, and removes nothing', () => {
    it('a subcategory the category does not have, naming it', async () => {
      const { category } = await withSubcategories('delete missing', ['Kept']);
      expect(await refusal(call('deleteSubcategory', { categoryName: category.name, subcategoryName: 'Missing' }))).toContain('Missing');
      expect(await subcategoryNames(category.name)).toEqual(['Kept']);
    });

    it('a name two subcategories share, saying how many', async () => {
      const { category } = await withSubcategories('delete shared', ['Twin', 'Twin']);
      expect((await refusal(call('deleteSubcategory', { categoryName: category.name, subcategoryName: 'Twin' }))).replace(category.name, '')).toContain('2');
      expect(await subcategoryNames(category.name)).toEqual(['Twin', 'Twin']);
    });

    it('a category no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('deleteSubcategory', { categoryName: name, subcategoryName: 'Any' }))).toContain(name);
    });

    it('without a category or a subcategory', async () => {
      expect(await refusal(call('deleteSubcategory', { subcategoryName: 'Any' }))).toContain('categoryName');
      expect(await refusal(call('deleteSubcategory', { categoryName: 'Any' }))).toContain('subcategoryName');
      expect(await refusal(call('deleteSubcategory', { categoryName: 'Any', subcategoryName: '' }))).toContain('subcategoryName');
    });
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes the subcategory with that id', async () => {
    const { category, subcategories } = await withSubcategories('delete by id', ['Gone']);
    expect(await call('deleteSubcategoryAdvanced', { categoryId: category.id, subcategoryId: subcategories[0].id }))
      .toEqual(jasmine.objectContaining({ id: subcategories[0].id, name: 'Gone', deleted: true }));
    expect(await subcategoryNames(category.name)).toEqual([]);
  });

  it('refuses a subcategory id the category does not have', async () => {
    const { category } = await withSubcategories('delete no id', ['Kept']);
    expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: category.id, subcategoryId: 'no-such-subcategory' }))).toContain('no-such-subcategory');
    expect(await subcategoryNames(category.name)).toEqual(['Kept']);
  });

  it('refuses a category id that matches nothing', async () => {
    await expectAsync(call('deleteSubcategoryAdvanced', { categoryId: NO_SUCH_ID, subcategoryId: 'any' })).toBeRejected();
  });

  it('refuses without its ids', async () => {
    expect(await refusal(call('deleteSubcategoryAdvanced', { subcategoryId: 'any' }))).toContain('categoryId');
    expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: NO_SUCH_ID }))).toContain('subcategoryId');
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes every subcategory, and reports each', async () => {
    const { category, subcategories } = await withSubcategories('batch delete', ['One', 'Two', 'Kept']);
    const result = await call('deleteSubcategoriesAdvanced', { subcategories: [
      { categoryId: category.id, subcategoryId: subcategories[0].id },
      { categoryId: category.id, subcategoryId: subcategories[1].id }
    ] });
    expect(result).toEqual(jasmine.objectContaining({
      subcategories: [jasmine.objectContaining({ index: 0, id: subcategories[0].id }), jasmine.objectContaining({ index: 1, id: subcategories[1].id })],
      succeeded: 2,
      failed: 0
    }));
    expect(await subcategoryNames(category.name)).toEqual(['Kept']);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one subcategory id matches nothing', async () => {
      const { category, subcategories } = await withSubcategories('batch keep', ['One']);
      await expectAsync(call('deleteSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: subcategories[0].id },
        { categoryId: category.id, subcategoryId: 'no-such-subcategory' }
      ] })).toBeRejected();
      expect(await subcategoryNames(category.name)).toEqual(['One']);
    });

    it('when the same subcategory is listed twice', async () => {
      const { category, subcategories } = await withSubcategories('batch twice', ['One']);
      const entry = { categoryId: category.id, subcategoryId: subcategories[0].id };
      await expectAsync(call('deleteSubcategoriesAdvanced', { subcategories: [entry, entry] })).toBeRejected();
      expect(await subcategoryNames(category.name)).toEqual(['One']);
    });

    it('when an entry has no subcategory id', async () => {
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: NO_SUCH_ID }] }))).toContain('subcategoryId');
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      await expectAsync(call('deleteSubcategoriesAdvanced', { subcategories: [] })).toBeRejected();
      const subcategories = Array.from({ length: 51 }, (value, index) => ({ categoryId: NO_SUCH_ID, subcategoryId: `${index}` }));
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories }))).toContain('subcategories');
    });
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(standInForSideEffects);

  it('moves a subcategory to a place in its category\'s list, and ranks them all by their place', async () => {
    const { category } = await withSubcategories('order subs', ['Alpha', 'Bravo', 'Charlie']);
    const result = await call('updateSubcategoryOrder', { categoryName: category.name, subcategoryName: 'Charlie', position: 1 });
    expect(result).toEqual(jasmine.objectContaining({ id: category.id }));
    expect(result.subcategories.map((subcategory) => [subcategory.name, subcategory.rank])).toEqual([['Charlie', 0], ['Alpha', 1], ['Bravo', 2]]);
    expect(await subcategoryNames(category.name)).toEqual(['Charlie', 'Alpha', 'Bravo']);
  });

  describe('refuses, and moves nothing', () => {
    it('a place past the end of the list', async () => {
      const { category } = await withSubcategories('order far', ['Alpha', 'Bravo']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: category.name, subcategoryName: 'Alpha', position: 3 }))).toContain('position');
      expect(await subcategoryNames(category.name)).toEqual(['Alpha', 'Bravo']);
    });

    it('a place that is not a whole number of 1 or more', async () => {
      const { category } = await withSubcategories('order bad', ['Alpha', 'Bravo']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: category.name, subcategoryName: 'Bravo', position: 0 }))).toContain('position');
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: category.name, subcategoryName: 'Bravo' }))).toContain('position');
      expect(await subcategoryNames(category.name)).toEqual(['Alpha', 'Bravo']);
    });

    it('a subcategory the category does not have, naming it', async () => {
      const { category } = await withSubcategories('order missing', ['Alpha']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: category.name, subcategoryName: 'Missing', position: 1 }))).toContain('Missing');
    });

    it('without a category or a subcategory', async () => {
      expect(await refusal(call('updateSubcategoryOrder', { subcategoryName: 'Any', position: 1 }))).toContain('categoryName');
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: 'Any', position: 1 }))).toContain('subcategoryName');
    });
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('moves the subcategory with that id to a place in its category\'s list', async () => {
    const { category, subcategories } = await withSubcategories('order by id', ['Alpha', 'Bravo']);
    const result = await call('updateSubcategoryOrderAdvanced', { categoryId: category.id, subcategoryId: subcategories[1].id, position: 1 });
    expect(result.subcategories.map((subcategory) => subcategory.id)).toEqual([subcategories[1].id, subcategories[0].id]);
    expect(await subcategoryNames(category.name)).toEqual(['Bravo', 'Alpha']);
  });

  it('refuses a subcategory id the category does not have', async () => {
    const { category } = await withSubcategories('order no id', ['Alpha']);
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: category.id, subcategoryId: 'no-such-subcategory', position: 1 }))).toContain('no-such-subcategory');
  });

  it('refuses a category id that matches nothing', async () => {
    await expectAsync(call('updateSubcategoryOrderAdvanced', { categoryId: NO_SUCH_ID, subcategoryId: 'any', position: 1 })).toBeRejected();
  });

  it('refuses without its ids or a place', async () => {
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { subcategoryId: 'any', position: 1 }))).toContain('categoryId');
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: NO_SUCH_ID, position: 1 }))).toContain('subcategoryId');
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: NO_SUCH_ID, subcategoryId: 'any' }))).toContain('position');
  });
});
