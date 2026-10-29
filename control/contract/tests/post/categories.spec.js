// categories: every operation on categories and on the subcategories inside them, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
let sequence = 0;
const unique = (label) => `Post ${label} ${++sequence} (${contract.host}) ${Date.now()}`;
const missingId = '000000000000000000000000';
// What the contract's own read finds by that name.
const listed = async (name) => (await call('searchCategories', { name })).categories;
const category = async (name) => {
  const found = (await listed(name)).filter((record) => record.name === name);
  return found.length === 1 ? found[0] : Promise.reject(new Error(`${found.length} categories named "${name}"`));
};
const create = async (label, subcategoryNames, extra) => {
  const made = await call('createCategory', Object.assign({ name: unique(label) }, extra || {}));
  for (const name of subcategoryNames || []) {
    await call('createSubcategory', { categoryName: made.name, name });
  }
  return category(made.name);
};
const names = (record) => record.subcategories.map((subcategory) => subcategory.name);
// The widget's refresh message is the plugin's own bookkeeping, not part of the contract: the spy only answers.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};
// Every required parameter left out, null and empty is refused, naming it.
const refusesEachRequired = (operation, parameters, required) => required.forEach((name) => {
  [['without', undefined], ['with a null', null], ['with an empty', '']].forEach(([how, value]) => {
    it(`${how} ${name}`, async () => {
      const given = Object.assign({}, await parameters());
      if (value === undefined) delete given[name];
      else given[name] = value;
      expect(await refusal(call(operation, given))).toContain(name);
    });
  });
});
// Only the control panel makes categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Post category for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? Promise.resolve(standIns()).then(() => call('createCategory', { name: forTheApp, icon: ['https://example.com/app-icon.png'] }))
      .then(() => call('createSubcategory', { categoryName: forTheApp, name: 'App subcategory' }))
      .then(() => category(forTheApp))
    : category(forTheApp).catch((error) => Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it (${reason(error)})`))));
  return madeCategory;
};

contract.describe('searchCategories', () => {
  it('finds the category the control panel made, by part of its name, with its subcategories', async () => {
    const made = await categoryForTheApp();
    const result = await call('searchCategories', { name: 'category for the app' });
    expect(result).toEqual(jasmine.objectContaining({ categories: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.categories).toContain(jasmine.objectContaining({
      id: made.id, name: forTheApp, icon: 'https://example.com/app-icon.png', rank: jasmine.any(Number), createdOn: jasmine.any(String),
      subcategories: [jasmine.objectContaining({ id: jasmine.any(String), name: 'App subcategory', rank: jasmine.any(Number) })]
    }));
  });

  it('finds nothing for a name no category has', async () => {
    expect(await call('searchCategories', { name: unique('nothing') })).toEqual(jasmine.objectContaining({ categories: [], total: 0, hasMore: false }));
  });

  it('pages through the categories it finds', async () => {
    await categoryForTheApp();
    const all = await call('searchCategories', {});
    const first = await call('searchCategories', { page: 0, pageSize: 1 });
    expect(first.categories.length).toBe(1);
    expect(first.total).toBe(all.total);
    expect(first.hasMore).toBe(all.total > 1);
    expect(all.categories.length).toBeLessThanOrEqual(20);
  });

  describe('refuses', () => {
    it('a page size above 50 or below 1', async () => {
      expect(await refusal(call('searchCategories', { pageSize: 51 }))).toContain('pageSize');
      expect(await refusal(call('searchCategories', { pageSize: 0 }))).toContain('pageSize');
    });

    it('a page below 0', async () => {
      expect(await refusal(call('searchCategories', { page: -1 }))).toContain('page');
    });

    it('an empty name', async () => {
      expect(await refusal(call('searchCategories', { name: '' }))).toContain('name');
    });
  });
});

// controlBackground only (with the server): the blocks from here on run in the control frame, where the datastore is writable.
contract.describe('createCategory', () => {
  beforeEach(standIns);

  it('adds a category from its name alone, with no subcategories, listed newest first', async () => {
    const name = unique('category');
    const made = await call('createCategory', { name });
    expect(made).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name, icon: '', subcategorySortOrder: 'Newest', subcategories: [], createdOn: jasmine.any(String) }));
    expect(await category(name)).toEqual(jasmine.objectContaining({ id: made.id, name }));
  });

  it('adds a category with an icon and a subcategory order, keeping the icon as one link', async () => {
    const name = unique('with icon');
    const made = await call('createCategory', { name, icon: ['https://example.com/icon.png'], subcategorySortOrder: 'Manually' });
    expect(made).toEqual(jasmine.objectContaining({ name, icon: 'https://example.com/icon.png', subcategorySortOrder: 'Manually' }));
    expect(await category(name)).toEqual(jasmine.objectContaining({ icon: 'https://example.com/icon.png', subcategorySortOrder: 'Manually' }));
  });

  describe('refuses, and stores nothing', () => {
    refusesEachRequired('createCategory', async () => ({}), ['name']);

    it('an icon given as a bare link', async () => {
      const name = unique('bare icon');
      expect(await refusal(call('createCategory', { name, icon: 'https://example.com/icon.png' }))).toContain('icon');
      expect(await listed(name)).toEqual([]);
    });

    it('two icons', async () => {
      const name = unique('two icons');
      expect(await refusal(call('createCategory', { name, icon: ['https://example.com/a.png', 'https://example.com/b.png'] }))).toContain('icon');
      expect(await listed(name)).toEqual([]);
    });

    it('a subcategory order it does not offer', async () => {
      const name = unique('bad order');
      expect(await refusal(call('createCategory', { name, subcategorySortOrder: 'Random' }))).toContain('subcategorySortOrder');
      expect(await listed(name)).toEqual([]);
    });
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds every category, and reports each', async () => {
    const created = [unique('batch one'), unique('batch two')];
    const result = await call('createCategoriesAdvanced', { categories: [{ name: created[0] }, { name: created[1], subcategorySortOrder: 'Oldest' }] });
    expect(result).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: jasmine.any(String), error: null }), jasmine.objectContaining({ index: 1, id: jasmine.any(String), error: null })],
      succeeded: 2,
      failed: 0
    }));
    expect(await category(created[0])).toEqual(jasmine.objectContaining({ id: result.categories[0].id }));
    expect((await category(created[1])).subcategorySortOrder).toBe('Oldest');
  });

  describe('refuses the whole list, and writes none of it', () => {
    it('when one entry is invalid', async () => {
      const valid = unique('valid entry');
      expect(await refusal(call('createCategoriesAdvanced', { categories: [{ name: valid }, { name: '' }] }))).toContain('name');
      expect(await listed(valid)).toEqual([]);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('createCategoriesAdvanced', { categories: [] }))).toContain('categories');
      const stamp = unique('too many');
      const categories = Array.from({ length: 51 }, (value, index) => ({ name: `${stamp} ${index}` }));
      expect(await refusal(call('createCategoriesAdvanced', { categories }))).toContain('categories');
      expect(await listed(stamp)).toEqual([]);
    });
  });
});

contract.describe('updateCategory', () => {
  beforeEach(standIns);

  it('renames the category, keeping its subcategories', async () => {
    const made = await create('rename', ['Kept']);
    const newName = `${made.name} new`;
    expect(await call('updateCategory', { name: made.name, newName })).toEqual(jasmine.objectContaining({ id: made.id, name: newName }));
    expect(names(await category(newName))).toEqual(['Kept']);
  });

  it('removes the icon with an empty list, and with null', async () => {
    const first = await create('no icon', [], { icon: ['https://example.com/icon.png'] });
    await call('updateCategory', { name: first.name, newIcon: [] });
    expect((await category(first.name)).icon).toBe('');
    const second = await create('null icon', [], { icon: ['https://example.com/icon.png'] });
    await call('updateCategory', { name: second.name, newIcon: null });
    expect((await category(second.name)).icon).toBe('');
  });

  it('sorts the subcategories again when their order changes', async () => {
    const made = await create('resort', ['Beta', 'Alpha']);
    expect(names(await call('updateCategory', { name: made.name, newSubcategorySortOrder: 'Subcategory Title A-Z' }))).toEqual(['Alpha', 'Beta']);
    expect(await category(made.name)).toEqual(jasmine.objectContaining({ subcategorySortOrder: 'Subcategory Title A-Z' }));
    expect(names(await category(made.name))).toEqual(['Alpha', 'Beta']);
  });

  describe('refuses, and changes nothing', () => {
    it('a name no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategory', { name, newName: 'x' }))).toContain(name);
    });

    it('a name two categories share, saying how many', async () => {
      const name = unique('shared');
      await call('createCategory', { name });
      await call('createCategory', { name });
      expect((await refusal(call('updateCategory', { name, newName: `${name} changed` }))).replace(name, '')).toContain('2');
      expect((await listed(name)).map((record) => record.name)).toEqual([name, name]);
    });

    it('removing the name', async () => {
      const made = await create('keep name');
      expect(await refusal(call('updateCategory', { name: made.name, newName: null }))).toContain('newName');
      expect(await refusal(call('updateCategory', { name: made.name, newName: '' }))).toContain('newName');
      expect((await category(made.name)).id).toBe(made.id);
    });

    it('a call that changes nothing, or a subcategory order it does not offer', async () => {
      const made = await create('nothing');
      await expectAsync(call('updateCategory', { name: made.name })).toBeRejected();
      expect(await refusal(call('updateCategory', { name: made.name, newSubcategorySortOrder: 'Random' }))).toContain('newSubcategorySortOrder');
      expect((await category(made.name)).subcategorySortOrder).toBe('Newest');
    });

    refusesEachRequired('updateCategory', async () => ({ name: unique('required'), newName: 'x' }), ['name']);
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(standIns);

  it('changes the category with that id', async () => {
    const made = await create('by id', [], { icon: ['https://example.com/icon.png'] });
    expect(await call('updateCategoryAdvanced', { categoryId: made.id, newSubcategorySortOrder: 'Oldest' }))
      .toEqual(jasmine.objectContaining({ id: made.id, name: made.name, icon: 'https://example.com/icon.png', subcategorySortOrder: 'Oldest' }));
  });

  it('refuses an id that matches nothing', async () => {
    expect(await refusal(call('updateCategoryAdvanced', { categoryId: missingId, newName: 'x' }))).toContain(missingId);
  });

  describe('refuses', () => {
    refusesEachRequired('updateCategoryAdvanced', async () => ({ categoryId: missingId, newName: 'x' }), ['categoryId']);
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('changes every category, and reports each', async () => {
    const first = await create('batch update one');
    const second = await create('batch update two');
    const result = await call('updateCategoriesAdvanced', { categories: [{ categoryId: first.id, newSubcategorySortOrder: 'Manually' }, { categoryId: second.id, newName: `${second.name} new` }] });
    expect(result).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: first.id }), jasmine.objectContaining({ index: 1, id: second.id })], succeeded: 2, failed: 0
    }));
    expect((await category(first.name)).subcategorySortOrder).toBe('Manually');
    expect((await category(`${second.name} new`)).id).toBe(second.id);
  });

  describe('refuses the whole list, and writes none of it', () => {
    it('when an id matches nothing', async () => {
      const made = await create('batch unknown');
      expect(await refusal(call('updateCategoriesAdvanced', { categories: [{ categoryId: made.id, newSubcategorySortOrder: 'Oldest' }, { categoryId: missingId, newName: 'x' }] }))).toContain(missingId);
      expect((await category(made.name)).subcategorySortOrder).toBe('Newest');
    });

    it('when one entry is invalid, or the same category is listed twice', async () => {
      const made = await create('batch invalid');
      expect(await refusal(call('updateCategoriesAdvanced', { categories: [{ categoryId: made.id, newSubcategorySortOrder: 'Oldest' }, { categoryId: made.id, newName: '' }] }))).toContain('newName');
      await expectAsync(call('updateCategoriesAdvanced', { categories: [{ categoryId: made.id, newSubcategorySortOrder: 'Oldest' }, { categoryId: made.id, newSubcategorySortOrder: 'Manually' }] })).toBeRejected();
      expect((await category(made.name)).subcategorySortOrder).toBe('Newest');
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('updateCategoriesAdvanced', { categories: [] }))).toContain('categories');
      expect(await refusal(call('updateCategoriesAdvanced', { categories: Array.from({ length: 51 }, () => ({ categoryId: missingId, newName: 'x' })) }))).toContain('categories');
    });
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(standIns);

  it('deletes the category with that name, and leaves the others', async () => {
    const kept = await create('kept');
    const gone = await create('delete', ['Inside']);
    expect(await call('deleteCategory', { name: gone.name })).toEqual(jasmine.objectContaining({ id: gone.id, name: gone.name, deleted: true }));
    expect(await listed(gone.name)).toEqual([]);
    expect((await category(kept.name)).id).toBe(kept.id);
  });

  describe('refuses, and deletes nothing', () => {
    it('a name no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('deleteCategory', { name }))).toContain(name);
    });

    it('a name two categories share, saying how many, and both stay', async () => {
      const name = unique('shared');
      await call('createCategory', { name });
      await call('createCategory', { name });
      expect((await refusal(call('deleteCategory', { name }))).replace(name, '')).toContain('2');
      expect((await listed(name)).length).toBe(2);
    });

    refusesEachRequired('deleteCategory', async () => ({ name: unique('required') }), ['name']);
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(standIns);

  it('deletes the category with that id', async () => {
    const made = await create('delete by id');
    expect(await call('deleteCategoryAdvanced', { categoryId: made.id })).toEqual(jasmine.objectContaining({ id: made.id, deleted: true }));
    expect(await listed(made.name)).toEqual([]);
  });

  it('refuses an id that matches nothing', async () => {
    expect(await refusal(call('deleteCategoryAdvanced', { categoryId: missingId }))).toContain(missingId);
  });

  describe('refuses', () => {
    refusesEachRequired('deleteCategoryAdvanced', async () => ({ categoryId: missingId }), ['categoryId']);
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('deletes every category, and reports each', async () => {
    const first = await create('batch delete one');
    const second = await create('batch delete two');
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: first.id }, { categoryId: second.id }] })).toEqual(jasmine.objectContaining({
      categories: [jasmine.objectContaining({ index: 0, id: first.id }), jasmine.objectContaining({ index: 1, id: second.id })], succeeded: 2, failed: 0
    }));
    expect(await listed(first.name)).toEqual([]);
    expect(await listed(second.name)).toEqual([]);
  });

  describe('refuses the whole list, and deletes none of it', () => {
    it('when an id matches nothing, or the same category is listed twice', async () => {
      const made = await create('batch delete kept');
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: [{ categoryId: made.id }, { categoryId: missingId }] }))).toContain(missingId);
      await expectAsync(call('deleteCategoriesAdvanced', { categories: [{ categoryId: made.id }, { categoryId: made.id }] })).toBeRejected();
      expect((await category(made.name)).id).toBe(made.id);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: [] }))).toContain('categories');
      expect(await refusal(call('deleteCategoriesAdvanced', { categories: Array.from({ length: 51 }, () => ({ categoryId: missingId })) }))).toContain('categories');
    });
  });
});

contract.describe('updateCategoryOrder', () => {
  beforeEach(standIns);

  it('moves the category to the first place, then another to the second', async () => {
    const first = await create('move one');
    const second = await create('move two');
    expect(await call('updateCategoryOrder', { name: first.name, position: 1 })).toEqual(jasmine.objectContaining({ id: first.id, rank: 1 }));
    await call('updateCategoryOrder', { name: second.name, position: 2 });
    expect((await category(first.name)).rank).toBe(1);
    expect((await category(second.name)).rank).toBe(2);
  }, 120000);

  describe('refuses, and moves nothing', () => {
    it('a place past the end of the list, or below 1', async () => {
      const made = await create('too far');
      expect(await refusal(call('updateCategoryOrder', { name: made.name, position: 100000 }))).toContain('position');
      expect(await refusal(call('updateCategoryOrder', { name: made.name, position: 0 }))).toContain('position');
      expect((await category(made.name)).rank).toBe(made.rank);
    }, 120000);

    it('a name no category has, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('updateCategoryOrder', { name, position: 1 }))).toContain(name);
    });

    refusesEachRequired('updateCategoryOrder', async () => ({ name: unique('required'), position: 1 }), ['name']);
  });
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves the category with that id to the first place', async () => {
    const made = await create('move by id');
    expect(await call('updateCategoryOrderAdvanced', { categoryId: made.id, position: 1 })).toEqual(jasmine.objectContaining({ id: made.id, rank: 1 }));
    expect((await category(made.name)).rank).toBe(1);
  }, 120000);

  it('refuses an id that matches nothing', async () => {
    expect(await refusal(call('updateCategoryOrderAdvanced', { categoryId: missingId, position: 1 }))).toContain(missingId);
  });

  describe('refuses', () => {
    refusesEachRequired('updateCategoryOrderAdvanced', async () => ({ categoryId: missingId, position: 1 }), ['categoryId']);
  });
});

contract.describe('createSubcategory', () => {
  beforeEach(standIns);

  it('adds a subcategory at the end of the category', async () => {
    const made = await create('parent', ['First']);
    const added = await call('createSubcategory', { categoryName: made.name, name: 'Second' });
    expect(added).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Second', rank: 2, category: jasmine.objectContaining({ id: made.id }) }));
    expect(names(await category(made.name))).toEqual(['First', 'Second']);
  });

  describe('refuses, and adds nothing', () => {
    it('a category nothing is named, naming it', async () => {
      const name = unique('missing');
      expect(await refusal(call('createSubcategory', { categoryName: name, name: 'Sub' }))).toContain(name);
    });

    refusesEachRequired('createSubcategory', async () => ({ categoryName: unique('required'), name: 'Sub' }), ['categoryName', 'name']);

    it('an empty name, leaving the category as it was', async () => {
      const made = await create('empty sub', ['Only']);
      expect(await refusal(call('createSubcategory', { categoryName: made.name, name: '' }))).toContain('name');
      expect(names(await category(made.name))).toEqual(['Only']);
    });
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('adds a subcategory to the category with that id', async () => {
    const made = await create('parent by id');
    expect(await call('createSubcategoryAdvanced', { categoryId: made.id, name: 'Sub' })).toEqual(jasmine.objectContaining({ name: 'Sub', rank: 1 }));
    expect(names(await category(made.name))).toEqual(['Sub']);
  });

  it('refuses an id that matches nothing', async () => {
    expect(await refusal(call('createSubcategoryAdvanced', { categoryId: missingId, name: 'Sub' }))).toContain(missingId);
  });

  describe('refuses', () => {
    refusesEachRequired('createSubcategoryAdvanced', async () => ({ categoryId: missingId, name: 'Sub' }), ['categoryId', 'name']);
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds every subcategory, several to one category, and reports each', async () => {
    const made = await create('batch parent');
    const result = await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, name: 'One' }, { categoryId: made.id, name: 'Two' }] });
    expect(result).toEqual(jasmine.objectContaining({
      subcategories: [jasmine.objectContaining({ index: 0, id: jasmine.any(String) }), jasmine.objectContaining({ index: 1, id: jasmine.any(String) })], succeeded: 2, failed: 0
    }));
    expect(names(await category(made.name))).toEqual(['One', 'Two']);
  });

  describe('refuses the whole list, and adds none of it', () => {
    it('when a category id matches nothing, or an entry has no name', async () => {
      const made = await create('batch parent kept');
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, name: 'One' }, { categoryId: missingId, name: 'Two' }] }))).toContain(missingId);
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, name: 'One' }, { categoryId: made.id, name: '' }] }))).toContain('name');
      expect(names(await category(made.name))).toEqual([]);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: [] }))).toContain('subcategories');
      expect(await refusal(call('createSubcategoriesAdvanced', { subcategories: Array.from({ length: 51 }, () => ({ categoryId: missingId, name: 'x' })) }))).toContain('subcategories');
    });
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(standIns);

  it('renames the subcategory, keeping its place', async () => {
    const made = await create('rename sub', ['Old', 'Other']);
    expect(await call('updateSubcategory', { categoryName: made.name, subcategoryName: 'Old', newName: 'New' }))
      .toEqual(jasmine.objectContaining({ id: made.subcategories[0].id, name: 'New' }));
    expect(names(await category(made.name))).toEqual(['New', 'Other']);
  });

  describe('refuses, and changes nothing', () => {
    it('a subcategory the category does not have, naming it', async () => {
      const made = await create('no such sub', ['Only']);
      expect(await refusal(call('updateSubcategory', { categoryName: made.name, subcategoryName: 'Missing', newName: 'x' }))).toContain('Missing');
      expect(names(await category(made.name))).toEqual(['Only']);
    });

    it('a name two subcategories share, saying how many', async () => {
      const made = await create('shared sub', ['Twin', 'Twin']);
      expect((await refusal(call('updateSubcategory', { categoryName: made.name, subcategoryName: 'Twin', newName: 'x' }))).replace(made.name, '')).toContain('2');
      expect(names(await category(made.name))).toEqual(['Twin', 'Twin']);
    });

    it('removing the name', async () => {
      const made = await create('keep sub name', ['Kept']);
      expect(await refusal(call('updateSubcategory', { categoryName: made.name, subcategoryName: 'Kept', newName: '' }))).toContain('newName');
      expect(await refusal(call('updateSubcategory', { categoryName: made.name, subcategoryName: 'Kept' }))).toContain('newName');
      expect(names(await category(made.name))).toEqual(['Kept']);
    });

    refusesEachRequired('updateSubcategory', async () => ({ categoryName: unique('required'), subcategoryName: 'Sub', newName: 'x' }), ['categoryName', 'subcategoryName']);
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('renames the subcategory with that id', async () => {
    const made = await create('rename sub by id', ['Old']);
    await call('updateSubcategoryAdvanced', { categoryId: made.id, subcategoryId: made.subcategories[0].id, newName: 'New' });
    expect(names(await category(made.name))).toEqual(['New']);
  });

  it('refuses ids that match nothing', async () => {
    const made = await create('unknown sub id', ['Only']);
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: missingId, subcategoryId: made.subcategories[0].id, newName: 'x' }))).toContain(missingId);
    expect(await refusal(call('updateSubcategoryAdvanced', { categoryId: made.id, subcategoryId: 'nosuchsubcategory', newName: 'x' }))).toContain('nosuchsubcategory');
    expect(names(await category(made.name))).toEqual(['Only']);
  });

  describe('refuses', () => {
    refusesEachRequired('updateSubcategoryAdvanced', async () => ({ categoryId: missingId, subcategoryId: 'sub', newName: 'x' }), ['categoryId', 'subcategoryId']);
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('renames every subcategory, and reports each', async () => {
    const made = await create('batch rename', ['One', 'Two']);
    const [one, two] = made.subcategories;
    expect(await call('updateSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, subcategoryId: one.id, newName: 'Uno' }, { categoryId: made.id, subcategoryId: two.id, newName: 'Dos' }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0, subcategories: [jasmine.objectContaining({ index: 0, id: one.id }), jasmine.objectContaining({ index: 1, id: two.id })] }));
    expect(names(await category(made.name))).toEqual(['Uno', 'Dos']);
  });

  describe('refuses the whole list, and renames none of it', () => {
    it('when an id matches nothing, an entry has no new name, or the same subcategory is listed twice', async () => {
      const made = await create('batch rename kept', ['One']);
      const one = made.subcategories[0];
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, subcategoryId: one.id, newName: 'x' }, { categoryId: made.id, subcategoryId: 'nosuchsubcategory', newName: 'y' }] }))).toContain('nosuchsubcategory');
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, subcategoryId: one.id, newName: '' }] }))).toContain('newName');
      await expectAsync(call('updateSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, subcategoryId: one.id, newName: 'x' }, { categoryId: made.id, subcategoryId: one.id, newName: 'y' }] })).toBeRejected();
      expect(names(await category(made.name))).toEqual(['One']);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories: [] }))).toContain('subcategories');
      expect(await refusal(call('updateSubcategoriesAdvanced', { subcategories: Array.from({ length: 51 }, () => ({ categoryId: missingId, subcategoryId: 'x', newName: 'x' })) }))).toContain('subcategories');
    });
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(standIns);

  it('removes the subcategory, leaving the others', async () => {
    const made = await create('delete sub', ['Gone', 'Kept']);
    expect(await call('deleteSubcategory', { categoryName: made.name, subcategoryName: 'Gone' }))
      .toEqual(jasmine.objectContaining({ id: made.subcategories[0].id, name: 'Gone', deleted: true }));
    expect(names(await category(made.name))).toEqual(['Kept']);
  });

  describe('refuses, and removes nothing', () => {
    it('a subcategory the category does not have, naming it', async () => {
      const made = await create('delete no sub', ['Only']);
      expect(await refusal(call('deleteSubcategory', { categoryName: made.name, subcategoryName: 'Missing' }))).toContain('Missing');
      expect(names(await category(made.name))).toEqual(['Only']);
    });

    it('a name two subcategories share, saying how many', async () => {
      const made = await create('delete shared sub', ['Twin', 'Twin']);
      expect((await refusal(call('deleteSubcategory', { categoryName: made.name, subcategoryName: 'Twin' }))).replace(made.name, '')).toContain('2');
      expect(names(await category(made.name))).toEqual(['Twin', 'Twin']);
    });

    refusesEachRequired('deleteSubcategory', async () => ({ categoryName: unique('required'), subcategoryName: 'Sub' }), ['categoryName', 'subcategoryName']);
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('removes the subcategory with that id', async () => {
    const made = await create('delete sub by id', ['Gone']);
    await call('deleteSubcategoryAdvanced', { categoryId: made.id, subcategoryId: made.subcategories[0].id });
    expect(names(await category(made.name))).toEqual([]);
  });

  it('refuses a subcategory id the category does not have', async () => {
    const made = await create('delete unknown sub id', ['Kept']);
    expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: made.id, subcategoryId: 'nosuchsubcategory' }))).toContain('nosuchsubcategory');
    expect(await refusal(call('deleteSubcategoryAdvanced', { categoryId: missingId, subcategoryId: made.subcategories[0].id }))).toContain(missingId);
    expect(names(await category(made.name))).toEqual(['Kept']);
  });

  describe('refuses', () => {
    refusesEachRequired('deleteSubcategoryAdvanced', async () => ({ categoryId: missingId, subcategoryId: 'sub' }), ['categoryId', 'subcategoryId']);
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('removes every subcategory, and reports each', async () => {
    const made = await create('batch delete subs', ['One', 'Two', 'Kept']);
    const [one, two] = made.subcategories;
    expect(await call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, subcategoryId: one.id }, { categoryId: made.id, subcategoryId: two.id }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
    expect(names(await category(made.name))).toEqual(['Kept']);
  });

  describe('refuses the whole list, and removes none of it', () => {
    it('when an id matches nothing, or the same subcategory is listed twice', async () => {
      const made = await create('batch delete subs kept', ['One']);
      const one = made.subcategories[0];
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, subcategoryId: one.id }, { categoryId: missingId, subcategoryId: one.id }] }))).toContain(missingId);
      await expectAsync(call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, subcategoryId: one.id }, { categoryId: made.id, subcategoryId: one.id }] })).toBeRejected();
      expect(names(await category(made.name))).toEqual(['One']);
    });

    it('when it is empty, or holds more than 50 entries', async () => {
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories: [] }))).toContain('subcategories');
      expect(await refusal(call('deleteSubcategoriesAdvanced', { subcategories: Array.from({ length: 51 }, () => ({ categoryId: missingId, subcategoryId: 'x' })) }))).toContain('subcategories');
    });
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(standIns);

  it('moves the subcategory to the first place, ranking every subcategory by its place', async () => {
    const made = await create('reorder', ['One', 'Two', 'Three']);
    const moved = await call('updateSubcategoryOrder', { categoryName: made.name, subcategoryName: 'Three', position: 1 });
    expect(moved.subcategories.map((subcategory) => [subcategory.name, subcategory.rank])).toEqual([['Three', 0], ['One', 1], ['Two', 2]]);
    expect(names(await category(made.name))).toEqual(['Three', 'One', 'Two']);
  });

  describe('refuses, and moves nothing', () => {
    it('a place past the end of the list, or below 1', async () => {
      const made = await create('reorder too far', ['One', 'Two']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: made.name, subcategoryName: 'One', position: 3 }))).toContain('position');
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: made.name, subcategoryName: 'One', position: 0 }))).toContain('position');
      expect(names(await category(made.name))).toEqual(['One', 'Two']);
    });

    it('a subcategory the category does not have, naming it', async () => {
      const made = await create('reorder missing', ['One']);
      expect(await refusal(call('updateSubcategoryOrder', { categoryName: made.name, subcategoryName: 'Missing', position: 1 }))).toContain('Missing');
    });

    refusesEachRequired('updateSubcategoryOrder', async () => ({ categoryName: unique('required'), subcategoryName: 'Sub', position: 1 }), ['categoryName', 'subcategoryName']);
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves the subcategory with that id to the last place', async () => {
    const made = await create('reorder by id', ['One', 'Two']);
    await call('updateSubcategoryOrderAdvanced', { categoryId: made.id, subcategoryId: made.subcategories[0].id, position: 2 });
    expect(names(await category(made.name))).toEqual(['Two', 'One']);
  });

  it('refuses ids that match nothing', async () => {
    const made = await create('reorder unknown id', ['One']);
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: missingId, subcategoryId: made.subcategories[0].id, position: 1 }))).toContain(missingId);
    expect(await refusal(call('updateSubcategoryOrderAdvanced', { categoryId: made.id, subcategoryId: 'nosuchsubcategory', position: 1 }))).toContain('nosuchsubcategory');
  });

  describe('refuses', () => {
    refusesEachRequired('updateSubcategoryOrderAdvanced', async () => ({ categoryId: missingId, subcategoryId: 'sub', position: 1 }), ['categoryId', 'subcategoryId']);
  });
});
