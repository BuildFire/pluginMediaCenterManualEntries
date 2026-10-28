// categories: media categories and the subcategories inside them, one block per operation, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
let made = 0;
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}-${++made}`;
const NO_ID = '000000000000000000000000';
// What the contract's own read finds by that exact name.
const named = async (name) => (await call('searchCategories', { name })).result;
const one = async (name) => (await named(name))[0];
const makeCategory = (label, extra) => call('createCategory', Object.assign({ name: unique(label) }, extra || {}));
const subNames = (record) => record.data.subcategories.map((sub) => sub.name);
// A category holding subcategories with these names, in this order, read back through the contract.
const categoryWith = async (label, names) => {
  const category = await makeCategory(label);
  for (const name of names) await call('createSubcategoryAdvanced', { categoryId: category.id, name });
  return one(category.data.name);
};
// The refresh message the control panel sends the widget is not a promise of the contract: the spy only answers it.
const quietWidget = () => spyOn(buildfire.messaging, 'sendMessageToWidget');
// Only the control panel makes categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Post category for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? call('createCategory', { name: forTheApp })
      .then((category) => call('createSubcategoryAdvanced', { categoryId: category.id, name: 'Post subcategory for the app' }))
      .then(() => one(forTheApp))
    : one(forTheApp).then((record) => record || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`))));
  return madeCategory;
};

contract.describe('updateCategoryOrder', () => {
  beforeEach(quietWidget);

  it('moves a category to the top of the manual order', async () => {
    const first = await makeCategory('order first');
    const second = await makeCategory('order second');
    const third = await makeCategory('order third');
    expect(await call('updateCategoryOrder', { categoryName: third.data.name, position: 1 })).toEqual({ id: third.id, rank: 1 });
    expect((await one(third.data.name)).data.rank).toBe(1);
    expect((await one(first.data.name)).data.rank).toBeGreaterThan(1);
    expect((await one(second.data.name)).data.rank).toBeGreaterThan(1);
  }, 120000);

  it('moves a category to a place further down', async () => {
    const category = await makeCategory('order down');
    expect(await call('updateCategoryOrder', { categoryName: category.data.name, position: 2 })).toEqual({ id: category.id, rank: 2 });
    expect((await one(category.data.name)).data.rank).toBe(2);
  }, 120000);

  describe('refuses, and moves nothing', () => {
    it('a name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategoryOrder', { categoryName: name, position: 1 }))).toContain(name);
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared order');
      await call('createCategory', { name });
      await call('createCategory', { name });
      expect((await refusal(call('updateCategoryOrder', { categoryName: name, position: 1 }))).replace(name, '')).toContain('2');
      expect((await named(name)).map((record) => record.data.rank)).toEqual([0, 0]);
    });

    it('a place past the end of the list', async () => {
      const category = await makeCategory('order past');
      expect(await refusal(call('updateCategoryOrder', { categoryName: category.data.name, position: 100000 }))).toContain('position');
      expect((await one(category.data.name)).data.rank).toBe(0);
    });

    it('a place below 1, or not a whole number', async () => {
      const category = await makeCategory('order zero');
      expect(await refusal(call('updateCategoryOrder', { categoryName: category.data.name, position: 0 }))).toContain('position');
      expect(await refusal(call('updateCategoryOrder', { categoryName: category.data.name, position: 1.5 }))).toContain('position');
      expect(await refusal(call('updateCategoryOrder', { categoryName: category.data.name, position: '1' }))).toContain('position');
      expect((await one(category.data.name)).data.rank).toBe(0);
    });

    it('without a place', async () => {
      const category = await makeCategory('order none');
      expect(await refusal(call('updateCategoryOrder', { categoryName: category.data.name }))).toContain('position');
    });

    it('without a name', async () => {
      expect(await refusal(call('updateCategoryOrder', { position: 1 }))).toContain('categoryName');
      expect(await refusal(call('updateCategoryOrder', { categoryName: null, position: 1 }))).toContain('categoryName');
      expect(await refusal(call('updateCategoryOrder', { categoryName: '', position: 1 }))).toContain('categoryName');
    });
  });
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(quietWidget);

  it('moves the category with that id to the top of the manual order', async () => {
    const category = await makeCategory('order by id');
    expect(await call('updateCategoryOrderAdvanced', { categoryId: category.id, position: 1 })).toEqual({ id: category.id, rank: 1 });
    expect((await one(category.data.name)).data.rank).toBe(1);
  }, 120000);

  it('refuses an id no category has', async () => {
    expect(await refusal(call('updateCategoryOrderAdvanced', { categoryId: NO_ID, position: 1 }))).toContain(NO_ID);
  });

  it('refuses without an id or a place', async () => {
    const category = await makeCategory('order by id none');
    expect(await refusal(call('updateCategoryOrderAdvanced', { position: 1 }))).toContain('categoryId');
    expect(await refusal(call('updateCategoryOrderAdvanced', { categoryId: '', position: 1 }))).toContain('categoryId');
    expect(await refusal(call('updateCategoryOrderAdvanced', { categoryId: category.id }))).toContain('position');
    expect((await one(category.data.name)).data.rank).toBe(0);
  });
});

contract.describe('createCategory', () => {
  beforeEach(quietWidget);

  it('adds a category from its name, and returns it', async () => {
    const name = unique('category');
    const created = await call('createCategory', { name });
    expect(created).toEqual(jasmine.objectContaining({
      id: jasmine.any(String),
      data: jasmine.objectContaining({ name, icon: '', subcategories: [], sortBy: 'Newest', rank: 0, createdOn: jasmine.anything(), lastUpdatedOn: jasmine.anything() })
    }));
    expect(await named(name)).toEqual([jasmine.objectContaining({ id: created.id, data: jasmine.objectContaining({ name, subcategories: [] }) })]);
  });

  it('keeps an icon as a single image', async () => {
    const name = unique('icon');
    const created = await call('createCategory', { name, icon: ['https://example.com/category.png'] });
    expect(created.data.icon).toBe('https://example.com/category.png');
    expect((await one(name)).data.icon).toBe('https://example.com/category.png');
  });

  it('takes an empty icon list as no icon', async () => {
    const name = unique('no icon');
    expect((await call('createCategory', { name, icon: [] })).data.icon).toBe('');
  });

  describe('refuses, and adds nothing', () => {
    it('without a name', async () => {
      expect(await refusal(call('createCategory', {}))).toContain('name');
      expect(await refusal(call('createCategory', { name: null }))).toContain('name');
      expect(await refusal(call('createCategory', { name: '' }))).toContain('name');
    });

    it('a name that is not text', async () => {
      expect(await refusal(call('createCategory', { name: 42 }))).toContain('name');
    });

    it('an icon that is not a list', async () => {
      const name = unique('bare icon');
      expect(await refusal(call('createCategory', { name, icon: 'https://example.com/category.png' }))).toContain('icon');
      expect(await named(name)).toEqual([]);
    });

    it('more than one icon', async () => {
      const name = unique('two icons');
      expect(await refusal(call('createCategory', { name, icon: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('icon');
      expect(await named(name)).toEqual([]);
    });
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('adds every category, and reports each', async () => {
    const names = [unique('batch one'), unique('batch two')];
    const result = await call('createCategoriesAdvanced', { categories: [{ name: names[0] }, { name: names[1], icon: ['https://example.com/batch.png'] }] });
    expect(result).toEqual({
      categories: [{ index: 0, id: jasmine.any(String), error: null }, { index: 1, id: jasmine.any(String), error: null }],
      succeeded: 2,
      failed: 0
    });
    expect((await one(names[0])).id).toBe(result.categories[0].id);
    expect((await one(names[1])).data.icon).toBe('https://example.com/batch.png');
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createCategoriesAdvanced', { categories: [{ name: valid }, { name: '' }] }))).toContain('name');
      expect(await named(valid)).toEqual([]);
    });

    it('when it is empty', async () => {
      await expectAsync(call('createCategoriesAdvanced', { categories: [] })).toBeRejected();
    });

    it('when it is left out', async () => {
      expect(await refusal(call('createCategoriesAdvanced', {}))).toContain('categories');
    });

    it('when it holds more than 50 entries', async () => {
      const categories = Array.from({ length: 51 }, (value, index) => ({ name: unique(`too many ${index}`) }));
      await expectAsync(call('createCategoriesAdvanced', { categories })).toBeRejected();
      expect(await named(categories[0].name)).toEqual([]);
    });
  });
});

contract.describe('updateCategory', () => {
  beforeEach(quietWidget);

  it('changes only what it is given, and returns the category', async () => {
    const category = await makeCategory('update', { icon: ['https://example.com/old.png'] });
    const newName = unique('updated');
    expect(await call('updateCategory', { categoryName: category.data.name, newName })).toEqual(jasmine.objectContaining({
      id: category.id, data: jasmine.objectContaining({ name: newName, icon: 'https://example.com/old.png', sortBy: 'Newest' })
    }));
    expect(await named(category.data.name)).toEqual([]);
    expect(await one(newName)).toEqual(jasmine.objectContaining({ id: category.id, data: jasmine.objectContaining({ name: newName, icon: 'https://example.com/old.png' }) }));
  });

  it('replaces the icon, and removes it with an empty list or null', async () => {
    const category = await makeCategory('icon change');
    const name = category.data.name;
    await call('updateCategory', { categoryName: name, newIcon: ['https://example.com/new.png'] });
    expect((await one(name)).data.icon).toBe('https://example.com/new.png');
    await call('updateCategory', { categoryName: name, newIcon: [] });
    expect((await one(name)).data.icon).toBe('');
    await call('updateCategory', { categoryName: name, newIcon: ['https://example.com/again.png'] });
    await call('updateCategory', { categoryName: name, newIcon: null });
    expect((await one(name)).data.icon).toBe('');
  });

  it('reorders the subcategories by the order it is given', async () => {
    const category = await categoryWith('sorted', ['Bravo', 'Alpha', 'Charlie']);
    const result = await call('updateCategory', { categoryName: category.data.name, newSubcategorySortBy: 'Subcategory Title A-Z' });
    expect(result.data.sortBy).toBe('Subcategory Title A-Z');
    expect(subNames(await one(category.data.name))).toEqual(['Alpha', 'Bravo', 'Charlie']);
    await call('updateCategory', { categoryName: category.data.name, newSubcategorySortBy: 'Subcategory Title Z-A' });
    expect(subNames(await one(category.data.name))).toEqual(['Charlie', 'Bravo', 'Alpha']);
  });

  describe('refuses, and changes nothing', () => {
    it('a name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategory', { categoryName: name, newName: unique('x') }))).toContain(name);
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared');
      await call('createCategory', { name });
      await call('createCategory', { name });
      expect((await refusal(call('updateCategory', { categoryName: name, newIcon: ['https://example.com/x.png'] }))).replace(name, '')).toContain('2');
      expect((await named(name)).map((record) => record.data.icon)).toEqual(['', '']);
    });

    it('removing the name', async () => {
      const category = await makeCategory('keep name');
      expect(await refusal(call('updateCategory', { categoryName: category.data.name, newName: null }))).toContain('newName');
      expect(await refusal(call('updateCategory', { categoryName: category.data.name, newName: '' }))).toContain('newName');
      expect((await one(category.data.name)).id).toBe(category.id);
    });

    it('a subcategory order it does not offer', async () => {
      const category = await makeCategory('bad order');
      expect(await refusal(call('updateCategory', { categoryName: category.data.name, newSubcategorySortBy: 'Random' }))).toContain('newSubcategorySortBy');
      expect((await one(category.data.name)).data.sortBy).toBe('Newest');
    });

    it('an icon that is not a list', async () => {
      const category = await makeCategory('bare new icon');
      expect(await refusal(call('updateCategory', { categoryName: category.data.name, newIcon: 'https://example.com/x.png' }))).toContain('newIcon');
      expect((await one(category.data.name)).data.icon).toBe('');
    });

    it('a call that changes nothing', async () => {
      const category = await makeCategory('nothing');
      await expectAsync(call('updateCategory', { categoryName: category.data.name })).toBeRejected();
    });

    it('without a name', async () => {
      expect(await refusal(call('updateCategory', { newName: unique('x') }))).toContain('categoryName');
      expect(await refusal(call('updateCategory', { categoryName: '', newName: unique('x') }))).toContain('categoryName');
    });
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('changes the category with that id', async () => {
    const category = await makeCategory('update by id');
    const newName = unique('updated by id');
    expect(await call('updateCategoryAdvanced', { categoryId: category.id, newName, newIcon: ['https://example.com/id.png'] }))
      .toEqual(jasmine.objectContaining({ id: category.id, data: jasmine.objectContaining({ name: newName, icon: 'https://example.com/id.png' }) }));
    expect((await one(newName)).id).toBe(category.id);
  });

  it('refuses an id no category has', async () => {
    expect(await refusal(call('updateCategoryAdvanced', { categoryId: NO_ID, newName: unique('x') }))).toContain(NO_ID);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('updateCategoryAdvanced', { newName: unique('x') }))).toContain('categoryId');
    expect(await refusal(call('updateCategoryAdvanced', { categoryId: null, newName: unique('x') }))).toContain('categoryId');
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('changes every category, and reports each', async () => {
    const first = await makeCategory('batch update one');
    const second = await makeCategory('batch update two');
    const firstName = unique('batch updated one');
    const result = await call('updateCategoriesAdvanced', { categories: [
      { categoryId: first.id, newName: firstName },
      { categoryId: second.id, newIcon: ['https://example.com/batch.png'] }
    ] });
    expect(result).toEqual({
      categories: [{ index: 0, id: first.id, error: null }, { index: 1, id: second.id, error: null }],
      succeeded: 2,
      failed: 0
    });
    expect((await one(firstName)).id).toBe(first.id);
    expect((await one(second.data.name)).data.icon).toBe('https://example.com/batch.png');
  });

  describe('refuses the whole list, and changes none of it', () => {
    it('when one id matches no category', async () => {
      const category = await makeCategory('batch unknown');
      await expectAsync(call('updateCategoriesAdvanced', { categories: [
        { categoryId: category.id, newIcon: ['https://example.com/x.png'] }, { categoryId: NO_ID, newName: unique('x') }
      ] })).toBeRejected();
      expect((await one(category.data.name)).data.icon).toBe('');
    });

    it('when one entry is invalid', async () => {
      const category = await makeCategory('batch invalid');
      expect(await refusal(call('updateCategoriesAdvanced', { categories: [
        { categoryId: category.id, newIcon: ['https://example.com/x.png'] }, { categoryId: category.id }
      ] }))).toContain('entry 1');
      expect((await one(category.data.name)).data.icon).toBe('');
    });

    it('when the same category is listed twice', async () => {
      const category = await makeCategory('batch twice');
      await expectAsync(call('updateCategoriesAdvanced', { categories: [
        { categoryId: category.id, newIcon: ['https://example.com/x.png'] }, { categoryId: category.id, newName: unique('x') }
      ] })).toBeRejected();
      expect((await one(category.data.name)).data.icon).toBe('');
    });

    it('when it is empty', async () => {
      await expectAsync(call('updateCategoriesAdvanced', { categories: [] })).toBeRejected();
    });
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(quietWidget);

  it('removes the category with that name', async () => {
    const category = await makeCategory('delete');
    expect(await call('deleteCategory', { categoryName: category.data.name })).toEqual({ id: category.id });
    expect(await named(category.data.name)).toEqual([]);
  });

  it('leaves every other category alone', async () => {
    const kept = await makeCategory('kept');
    const removed = await makeCategory('removed');
    await call('deleteCategory', { categoryName: removed.data.name });
    expect((await one(kept.data.name)).id).toBe(kept.id);
  });

  describe('refuses, and removes nothing', () => {
    it('a name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('deleteCategory', { categoryName: name }))).toContain(name);
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared delete');
      await call('createCategory', { name });
      await call('createCategory', { name });
      expect((await refusal(call('deleteCategory', { categoryName: name }))).replace(name, '')).toContain('2');
      expect((await named(name)).length).toBe(2);
    });

    it('without a name', async () => {
      expect(await refusal(call('deleteCategory', {}))).toContain('categoryName');
      expect(await refusal(call('deleteCategory', { categoryName: null }))).toContain('categoryName');
      expect(await refusal(call('deleteCategory', { categoryName: '' }))).toContain('categoryName');
    });
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('removes the category with that id', async () => {
    const category = await makeCategory('delete by id');
    expect(await call('deleteCategoryAdvanced', { categoryId: category.id })).toEqual({ id: category.id });
    expect(await named(category.data.name)).toEqual([]);
  });

  it('refuses an id no category has', async () => {
    expect(await refusal(call('deleteCategoryAdvanced', { categoryId: NO_ID }))).toContain(NO_ID);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('deleteCategoryAdvanced', {}))).toContain('categoryId');
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('removes every category, and reports each', async () => {
    const first = await makeCategory('batch delete one');
    const second = await makeCategory('batch delete two');
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: first.id }, { categoryId: second.id }] })).toEqual({
      categories: [{ index: 0, id: first.id, error: null }, { index: 1, id: second.id, error: null }],
      succeeded: 2,
      failed: 0
    });
    expect(await named(first.data.name)).toEqual([]);
    expect(await named(second.data.name)).toEqual([]);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one id matches no category', async () => {
      const category = await makeCategory('batch delete unknown');
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: [{ categoryId: category.id }, { categoryId: NO_ID }] }))).toContain(NO_ID);
      expect((await one(category.data.name)).id).toBe(category.id);
    });

    it('when the same category is listed twice', async () => {
      const category = await makeCategory('batch delete twice');
      await expectAsync(call('deleteCategoriesAdvanced', { categories: [{ categoryId: category.id }, { categoryId: category.id }] })).toBeRejected();
      expect((await one(category.data.name)).id).toBe(category.id);
    });

    it('when an entry has no id', async () => {
      const category = await makeCategory('batch delete no id');
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: [{ categoryId: category.id }, {}] }))).toContain('categoryId');
      expect((await one(category.data.name)).id).toBe(category.id);
    });

    it('when it is empty', async () => {
      await expectAsync(call('deleteCategoriesAdvanced', { categories: [] })).toBeRejected();
    });
  });
});

contract.describe('createSubcategory', () => {
  beforeEach(quietWidget);

  it('adds a subcategory at the end of the category, and returns it', async () => {
    const category = await makeCategory('with subcategories');
    const first = await call('createSubcategory', { categoryName: category.data.name, name: 'First' });
    expect(first).toEqual({ categoryId: category.id, id: jasmine.any(String), name: 'First', rank: 1 });
    expect(await call('createSubcategory', { categoryName: category.data.name, name: 'Second' }))
      .toEqual({ categoryId: category.id, id: jasmine.any(String), name: 'Second', rank: 2 });
    expect((await one(category.data.name)).data.subcategories).toEqual([
      jasmine.objectContaining({ id: first.id, name: 'First', rank: 1 }), jasmine.objectContaining({ name: 'Second', rank: 2 })
    ]);
  });

  describe('refuses, and adds nothing', () => {
    it('a category name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('createSubcategory', { categoryName: name, name: 'Orphan' }))).toContain(name);
    });

    it('without a subcategory name', async () => {
      const category = await makeCategory('no sub name');
      expect(await refusal(call('createSubcategory', { categoryName: category.data.name }))).toContain('name');
      expect(await refusal(call('createSubcategory', { categoryName: category.data.name, name: '' }))).toContain('name');
      expect(await refusal(call('createSubcategory', { categoryName: category.data.name, name: null }))).toContain('name');
      expect((await one(category.data.name)).data.subcategories).toEqual([]);
    });

    it('without a category name', async () => {
      expect(await refusal(call('createSubcategory', { name: 'Orphan' }))).toContain('categoryName');
    });
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('adds a subcategory to the category with that id', async () => {
    const category = await makeCategory('sub by id');
    const added = await call('createSubcategoryAdvanced', { categoryId: category.id, name: 'By id' });
    expect(added).toEqual({ categoryId: category.id, id: jasmine.any(String), name: 'By id', rank: 1 });
    expect((await one(category.data.name)).data.subcategories).toEqual([jasmine.objectContaining({ id: added.id, name: 'By id' })]);
  });

  it('refuses an id no category has', async () => {
    expect(await refusal(call('createSubcategoryAdvanced', { categoryId: NO_ID, name: 'Orphan' }))).toContain(NO_ID);
  });

  it('refuses without an id or a name', async () => {
    const category = await makeCategory('sub by id none');
    expect(await refusal(call('createSubcategoryAdvanced', { name: 'Orphan' }))).toContain('categoryId');
    expect(await refusal(call('createSubcategoryAdvanced', { categoryId: category.id }))).toContain('name');
    expect((await one(category.data.name)).data.subcategories).toEqual([]);
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('adds every subcategory, and reports each', async () => {
    const category = await makeCategory('sub batch');
    const result = await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, name: 'One' }, { categoryId: category.id, name: 'Two' }] });
    expect(result).toEqual({
      subcategories: [{ index: 0, id: jasmine.any(String), error: null }, { index: 1, id: jasmine.any(String), error: null }],
      succeeded: 2,
      failed: 0
    });
    expect(subNames(await one(category.data.name))).toEqual(['One', 'Two']);
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when one category id matches no category', async () => {
      const category = await makeCategory('sub batch unknown');
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, name: 'One' }, { categoryId: NO_ID, name: 'Two' }] })))
        .toContain(NO_ID);
      expect((await one(category.data.name)).data.subcategories).toEqual([]);
    });

    it('when one entry has no name', async () => {
      const category = await makeCategory('sub batch no name');
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, name: 'One' }, { categoryId: category.id }] })))
        .toContain('name');
      expect((await one(category.data.name)).data.subcategories).toEqual([]);
    });

    it('when it is empty', async () => {
      await expectAsync(call('createSubcategoriesAdvanced', { subcategories: [] })).toBeRejected();
    });
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(quietWidget);

  it('renames the subcategory, and returns it', async () => {
    const category = await categoryWith('rename sub', ['Old', 'Other']);
    const old = category.data.subcategories[0];
    expect(await call('updateSubcategory', { categoryName: category.data.name, subcategoryName: 'Old', newName: 'New' }))
      .toEqual({ categoryId: category.id, id: old.id, name: 'New', rank: old.rank });
    expect(subNames(await one(category.data.name))).toEqual(['New', 'Other']);
  });

  describe('refuses, and renames nothing', () => {
    it('a subcategory name the category does not have', async () => {
      const category = await categoryWith('rename missing', ['Kept']);
      expect(await refusal(call('updateSubcategory', { categoryName: category.data.name, subcategoryName: 'Nowhere', newName: 'New' }))).toContain('Nowhere');
      expect(subNames(await one(category.data.name))).toEqual(['Kept']);
    });

    it('a subcategory name two subcategories share, saying how many', async () => {
      const category = await categoryWith('rename shared', ['Twin', 'Twin']);
      expect((await refusal(call('updateSubcategory', { categoryName: category.data.name, subcategoryName: 'Twin', newName: 'New' }))).replace(category.data.name, ''))
        .toContain('2');
      expect(subNames(await one(category.data.name))).toEqual(['Twin', 'Twin']);
    });

    it('a category name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateSubcategory', { categoryName: name, subcategoryName: 'Any', newName: 'New' }))).toContain(name);
    });

    it('without a new name', async () => {
      const category = await categoryWith('rename empty', ['Kept']);
      expect(await refusal(call('updateSubcategory', { categoryName: category.data.name, subcategoryName: 'Kept' }))).toContain('newName');
      expect(await refusal(call('updateSubcategory', { categoryName: category.data.name, subcategoryName: 'Kept', newName: '' }))).toContain('newName');
      expect(await refusal(call('updateSubcategory', { categoryName: category.data.name, subcategoryName: 'Kept', newName: null }))).toContain('newName');
      expect(subNames(await one(category.data.name))).toEqual(['Kept']);
    });

    it('without a subcategory name', async () => {
      const category = await makeCategory('rename no sub');
      expect(await refusal(call('updateSubcategory', { categoryName: category.data.name, newName: 'New' }))).toContain('subcategoryName');
    });
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('renames the subcategory with that id', async () => {
    const category = await categoryWith('rename by id', ['Before']);
    const sub = category.data.subcategories[0];
    expect(await call('updateSubcategoryAdvanced', { categoryId: category.id, subcategoryId: sub.id, newName: 'After' }))
      .toEqual({ categoryId: category.id, id: sub.id, name: 'After', rank: sub.rank });
    expect(subNames(await one(category.data.name))).toEqual(['After']);
  });

  it('refuses a subcategory id the category does not have', async () => {
    const category = await categoryWith('rename by id missing', ['Kept']);
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: category.id, subcategoryId: 'no-such-subcategory', newName: 'New' })))
      .toContain('no-such-subcategory');
    expect(subNames(await one(category.data.name))).toEqual(['Kept']);
  });

  it('refuses a category id no category has', async () => {
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: NO_ID, subcategoryId: 'any', newName: 'New' }))).toContain(NO_ID);
  });

  it('refuses without the ids', async () => {
    expect(await refusal(call('updateSubcategoryAdvanced', { subcategoryId: 'any', newName: 'New' }))).toContain('categoryId');
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: NO_ID, newName: 'New' }))).toContain('subcategoryId');
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('renames every subcategory, and reports each', async () => {
    const category = await categoryWith('rename batch', ['A', 'B']);
    const [a, b] = category.data.subcategories;
    expect(await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: category.id, subcategoryId: a.id, newName: 'A2' }, { categoryId: category.id, subcategoryId: b.id, newName: 'B2' }
    ] })).toEqual({
      subcategories: [{ index: 0, id: a.id, error: null }, { index: 1, id: b.id, error: null }],
      succeeded: 2,
      failed: 0
    });
    expect(subNames(await one(category.data.name))).toEqual(['A2', 'B2']);
  });

  describe('refuses the whole list, and renames none of it', () => {
    it('when one subcategory id matches nothing', async () => {
      const category = await categoryWith('rename batch unknown', ['A']);
      const [a] = category.data.subcategories;
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: a.id, newName: 'A2' }, { categoryId: category.id, subcategoryId: 'no-such-subcategory', newName: 'X' }
      ] }))).toContain('no-such-subcategory');
      expect(subNames(await one(category.data.name))).toEqual(['A']);
    });

    it('when the same subcategory is listed twice', async () => {
      const category = await categoryWith('rename batch twice', ['A']);
      const [a] = category.data.subcategories;
      await expectAsync(call('updateSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: a.id, newName: 'A2' }, { categoryId: category.id, subcategoryId: a.id, newName: 'A3' }
      ] })).toBeRejected();
      expect(subNames(await one(category.data.name))).toEqual(['A']);
    });

    it('when it is empty', async () => {
      await expectAsync(call('updateSubcategoriesAdvanced', { subcategories: [] })).toBeRejected();
    });
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(quietWidget);

  it('removes the subcategory, and leaves the others', async () => {
    const category = await categoryWith('remove sub', ['Gone', 'Stays']);
    const gone = category.data.subcategories[0];
    expect(await call('deleteSubcategory', { categoryName: category.data.name, subcategoryName: 'Gone' })).toEqual({ categoryId: category.id, id: gone.id });
    expect(subNames(await one(category.data.name))).toEqual(['Stays']);
  });

  describe('refuses, and removes nothing', () => {
    it('a subcategory name the category does not have', async () => {
      const category = await categoryWith('remove missing', ['Stays']);
      expect(await refusal(call('deleteSubcategory', { categoryName: category.data.name, subcategoryName: 'Nowhere' }))).toContain('Nowhere');
      expect(subNames(await one(category.data.name))).toEqual(['Stays']);
    });

    it('a subcategory name two subcategories share, saying how many', async () => {
      const category = await categoryWith('remove shared', ['Twin', 'Twin']);
      expect((await refusal(call('deleteSubcategory', { categoryName: category.data.name, subcategoryName: 'Twin' }))).replace(category.data.name, '')).toContain('2');
      expect(subNames(await one(category.data.name))).toEqual(['Twin', 'Twin']);
    });

    it('without the names', async () => {
      expect(await refusal(call('deleteSubcategory', { subcategoryName: 'Any' }))).toContain('categoryName');
      expect(await refusal(call('deleteSubcategory', { categoryName: unique('x') }))).toContain('subcategoryName');
    });
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('removes the subcategory with that id', async () => {
    const category = await categoryWith('remove by id', ['Gone', 'Stays']);
    const gone = category.data.subcategories[0];
    expect(await call('deleteSubcategoryAdvanced', { categoryId: category.id, subcategoryId: gone.id })).toEqual({ categoryId: category.id, id: gone.id });
    expect(subNames(await one(category.data.name))).toEqual(['Stays']);
  });

  it('refuses a subcategory id the category does not have', async () => {
    const category = await categoryWith('remove by id missing', ['Stays']);
    expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: category.id, subcategoryId: 'no-such-subcategory' }))).toContain('no-such-subcategory');
    expect(subNames(await one(category.data.name))).toEqual(['Stays']);
  });

  it('refuses without the ids', async () => {
    expect(await refusal(call('deleteSubcategoryAdvanced', { subcategoryId: 'any' }))).toContain('categoryId');
    expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: NO_ID }))).toContain('subcategoryId');
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('removes every subcategory, and reports each', async () => {
    const category = await categoryWith('remove batch', ['A', 'B', 'C']);
    const [a, b] = category.data.subcategories;
    expect(await call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, subcategoryId: a.id }, { categoryId: category.id, subcategoryId: b.id }] }))
      .toEqual({ subcategories: [{ index: 0, id: a.id, error: null }, { index: 1, id: b.id, error: null }], succeeded: 2, failed: 0 });
    expect(subNames(await one(category.data.name))).toEqual(['C']);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when one subcategory id matches nothing', async () => {
      const category = await categoryWith('remove batch unknown', ['A']);
      const [a] = category.data.subcategories;
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: a.id }, { categoryId: category.id, subcategoryId: 'no-such-subcategory' }
      ] }))).toContain('no-such-subcategory');
      expect(subNames(await one(category.data.name))).toEqual(['A']);
    });

    it('when the same subcategory is listed twice', async () => {
      const category = await categoryWith('remove batch twice', ['A']);
      const [a] = category.data.subcategories;
      await expectAsync(call('deleteSubcategoriesAdvanced', { subcategories: [
        { categoryId: category.id, subcategoryId: a.id }, { categoryId: category.id, subcategoryId: a.id }
      ] })).toBeRejected();
      expect(subNames(await one(category.data.name))).toEqual(['A']);
    });

    it('when it is empty', async () => {
      await expectAsync(call('deleteSubcategoriesAdvanced', { subcategories: [] })).toBeRejected();
    });
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(quietWidget);

  it('moves a subcategory to the top, renumbering the order from 0', async () => {
    const category = await categoryWith('move sub', ['A', 'B', 'C']);
    const c = category.data.subcategories[2];
    expect(await call('updateSubcategoryOrder', { categoryName: category.data.name, subcategoryName: 'C', position: 1 }))
      .toEqual({ categoryId: category.id, id: c.id, name: 'C', rank: 0 });
    expect((await one(category.data.name)).data.subcategories.map((sub) => [sub.name, sub.rank])).toEqual([['C', 0], ['A', 1], ['B', 2]]);
  });

  describe('refuses, and moves nothing', () => {
    it('a place past the end of the category', async () => {
      const category = await categoryWith('move sub past', ['A', 'B']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: category.data.name, subcategoryName: 'A', position: 3 }))).toContain('position');
      expect(subNames(await one(category.data.name))).toEqual(['A', 'B']);
    });

    it('a place below 1', async () => {
      const category = await categoryWith('move sub zero', ['A', 'B']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: category.data.name, subcategoryName: 'B', position: 0 }))).toContain('position');
      expect(subNames(await one(category.data.name))).toEqual(['A', 'B']);
    });

    it('a subcategory name the category does not have', async () => {
      const category = await categoryWith('move sub missing', ['A']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: category.data.name, subcategoryName: 'Nowhere', position: 1 }))).toContain('Nowhere');
    });

    it('without the names', async () => {
      expect(await refusal(call('updateSubcategoryOrder', { subcategoryName: 'A', position: 1 }))).toContain('categoryName');
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: unique('x'), position: 1 }))).toContain('subcategoryName');
    });
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(quietWidget);

  it('moves the subcategory with that id', async () => {
    const category = await categoryWith('move sub by id', ['A', 'B', 'C']);
    const a = category.data.subcategories[0];
    expect(await call('updateSubcategoryOrderAdvanced', { categoryId: category.id, subcategoryId: a.id, position: 3 }))
      .toEqual({ categoryId: category.id, id: a.id, name: 'A', rank: 2 });
    expect(subNames(await one(category.data.name))).toEqual(['B', 'C', 'A']);
  });

  it('refuses a subcategory id the category does not have', async () => {
    const category = await categoryWith('move sub by id missing', ['A']);
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: category.id, subcategoryId: 'no-such-subcategory', position: 1 })))
      .toContain('no-such-subcategory');
  });

  it('refuses without a place', async () => {
    const category = await categoryWith('move sub by id none', ['A']);
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: category.id, subcategoryId: category.data.subcategories[0].id }))).toContain('position');
  });
});

// Runs on both sides; on the app's side it finds what the control panel made first.
contract.describe('searchCategories', () => {
  beforeEach(quietWidget);

  it('finds a category by its exact name, with its subcategories', async () => {
    const category = await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp })).toEqual({
      result: [jasmine.objectContaining({
        id: category.id,
        data: jasmine.objectContaining({ name: forTheApp, subcategories: [jasmine.objectContaining({ id: jasmine.any(String), name: 'Post subcategory for the app', rank: 1 })] })
      })],
      totalRecord: 1
    });
  });

  it('finds nothing for a name no category has', async () => {
    expect(await call('searchCategories', { name: unique('no such category') })).toEqual({ result: [], totalRecord: 0 });
  });

  it('shows every category when no name is given', async () => {
    await categoryForTheApp();
    const { result, totalRecord } = await call('searchCategories', {});
    expect(totalRecord).toBeGreaterThanOrEqual(1);
    expect(result.length).toBe(Math.min(totalRecord, 50));
  });

  it('shows the page it is asked for', async () => {
    await categoryForTheApp();
    expect((await call('searchCategories', { name: forTheApp, page: 0 })).result.length).toBe(1);
    expect(await call('searchCategories', { name: forTheApp, page: 1 })).toEqual({ result: [], totalRecord: 1 });
  });

  it('shows at most 50 categories a page, and tells how many there are in all', async () => {
    await categoryForTheApp();
    if (contract.host === 'control') {
      // More categories than a page, made through the batch operation within its own limit, given the time that takes.
      const stamp = unique('page');
      await call('createCategoriesAdvanced', { categories: Array.from({ length: 50 }, (value, index) => ({ name: `${stamp} ${index}` })) });
      await call('createCategoriesAdvanced', { categories: [{ name: `${stamp} 50` }] });
    }
    const { result, totalRecord } = await call('searchCategories', {});
    expect(totalRecord).toBeGreaterThan(50);
    expect(result.length).toBe(50);
  }, 240000);
});
