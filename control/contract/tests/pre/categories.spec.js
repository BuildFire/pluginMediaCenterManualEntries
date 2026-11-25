// categories: every operation on categories and the subcategories inside them, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const category = (fields) => jasmine.objectContaining(Object.assign({ id: jasmine.any(String) }, fields || {}));
const batch = (count) => jasmine.objectContaining({ succeeded: count, failed: 0 });
// A category holding subcategories with these names, in this order.
const withSubcategories = async (name, names) => {
  const { id } = await call('createCategory', { name });
  const subcategoryIds = [];
  for (const subcategoryName of names) subcategoryIds.push((await call('createSubcategory', { categoryName: name, name: subcategoryName })).id);
  return { id, subcategoryIds };
};

// The refresh message to the widget, which nothing here answers: a spy stands in for it.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};

// Only the control panel adds categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Pre category for the app';
let madeForTheApp;
const categoryForTheApp = () => {
  madeForTheApp = madeForTheApp || (contract.host === 'control'
    ? withSubcategories(forTheApp, ['Pre subcategory for the app'])
    : Promise.resolve());
  return madeForTheApp;
};

contract.describe('searchCategories', () => {
  beforeEach(standIns);

  it('finds a category by its name', async () => {
    await categoryForTheApp();
    const { categories } = await call('searchCategories', { name: forTheApp });
    expect(categories).toEqual(jasmine.arrayContaining([category({ name: forTheApp })]));
  });

  it('finds a category by its name, a page at a time', async () => {
    await categoryForTheApp();
    const result = await call('searchCategories', { name: forTheApp, page: 0, pageSize: 10 });
    expect(result).toEqual(jasmine.objectContaining({ total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
    expect(result.categories).toEqual(jasmine.arrayContaining([category({ name: forTheApp })]));
  });
});

contract.describe('createCategory', () => {
  beforeEach(standIns);

  it('adds a category from its name', async () => {
    const name = `Pre category (${contract.host})`;
    expect(await call('createCategory', { name })).toEqual(category({ name }));
  });

  it('adds a category with its picture and subcategory order', async () => {
    const name = `Pre category with an icon (${contract.host})`;
    expect(await call('createCategory', { name, icon: ['https://example.com/pre-icon.png'], subcategorySortOrder: 'Manually' }))
      .toEqual(category({ name, icon: 'https://example.com/pre-icon.png', subcategorySortOrder: 'Manually' }));
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds several categories at once', async () => {
    const categories = [{ name: `Pre batch category one (${contract.host})` }, { name: `Pre batch category two (${contract.host})`, subcategorySortOrder: 'Oldest' }];
    expect(await call('createCategoriesAdvanced', { categories })).toEqual(batch(2));
  });
});

contract.describe('updateCategory', () => {
  beforeEach(standIns);

  it("changes a category's subcategory order, naming it by its name", async () => {
    const name = `Pre category to update (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategory', { name, newSubcategorySortOrder: 'Oldest' })).toEqual(category({ name, subcategorySortOrder: 'Oldest' }));
  });

  it('renames a category and changes its picture', async () => {
    const name = `Pre category to rename (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategory', { name, newName: `Pre category renamed (${contract.host})`, newIcon: ['https://example.com/pre-new-icon.png'], newSubcategorySortOrder: 'Manually' }))
      .toEqual(category({ name: `Pre category renamed (${contract.host})`, icon: 'https://example.com/pre-new-icon.png' }));
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(standIns);

  it('changes a category by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to update by id (${contract.host})` });
    expect(await call('updateCategoryAdvanced', { categoryId: id, newName: `Pre category updated by id (${contract.host})`, newIcon: [], newSubcategorySortOrder: 'Oldest' }))
      .toEqual(category({ id, name: `Pre category updated by id (${contract.host})` }));
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('changes several categories at once', async () => {
    const one = await call('createCategory', { name: `Pre batch category to update one (${contract.host})` });
    const two = await call('createCategory', { name: `Pre batch category to update two (${contract.host})` });
    expect(await call('updateCategoriesAdvanced', { categories: [
      { categoryId: one.id, newSubcategorySortOrder: 'Oldest' },
      { categoryId: two.id, newName: `Pre batch category updated two (${contract.host})`, newIcon: ['https://example.com/pre-batch-icon.png'] }
    ] })).toEqual(batch(2));
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(standIns);

  it('removes a category by its name', async () => {
    const name = `Pre category to delete (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('deleteCategory', { name })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(standIns);

  it('removes a category by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to delete by id (${contract.host})` });
    expect(await call('deleteCategoryAdvanced', { categoryId: id })).toEqual(jasmine.objectContaining({ id, deleted: true }));
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('removes several categories at once', async () => {
    const one = await call('createCategory', { name: `Pre batch category to delete one (${contract.host})` });
    const two = await call('createCategory', { name: `Pre batch category to delete two (${contract.host})` });
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: one.id }, { categoryId: two.id }] })).toEqual(batch(2));
  });
});

contract.describe('updateCategoryOrder', () => {
  beforeEach(standIns);

  it('moves a category to the first place, naming it by its name', async () => {
    const name = `Pre category to move (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategoryOrder', { name, position: 1 })).toEqual(category({ name, rank: 1 }));
  }, 120000);
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves a category to the first place, naming it by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to move by id (${contract.host})` });
    expect(await call('updateCategoryOrderAdvanced', { categoryId: id, position: 1 })).toEqual(category({ id, rank: 1 }));
  }, 120000);
});

contract.describe('createSubcategory', () => {
  beforeEach(standIns);

  it('adds a subcategory to a category named by its name', async () => {
    const categoryName = `Pre category for a subcategory (${contract.host})`;
    await call('createCategory', { name: categoryName });
    expect(await call('createSubcategory', { categoryName, name: 'Pre subcategory' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre subcategory', category: jasmine.any(Object) }));
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('adds a subcategory to a category named by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category for a subcategory by id (${contract.host})` });
    expect(await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre subcategory by id' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre subcategory by id' }));
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds several subcategories at once', async () => {
    const { id } = await call('createCategory', { name: `Pre category for batch subcategories (${contract.host})` });
    expect(await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: id, name: 'Pre batch one' }, { categoryId: id, name: 'Pre batch two' }] })).toEqual(batch(2));
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(standIns);

  it('renames a subcategory, naming it and its category by their names', async () => {
    const categoryName = `Pre category with a subcategory to rename (${contract.host})`;
    await withSubcategories(categoryName, ['Pre old name']);
    expect(await call('updateSubcategory', { categoryName, subcategoryName: 'Pre old name', newName: 'Pre new name' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre new name' }));
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('renames a subcategory by its id', async () => {
    const { id, subcategoryIds } = await withSubcategories(`Pre category with a subcategory to rename by id (${contract.host})`, ['Pre old name']);
    expect(await call('updateSubcategoryAdvanced', { categoryId: id, subcategoryId: subcategoryIds[0], newName: 'Pre new name' }))
      .toEqual(jasmine.objectContaining({ id: subcategoryIds[0], name: 'Pre new name' }));
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('renames several subcategories at once', async () => {
    const { id, subcategoryIds } = await withSubcategories(`Pre category with subcategories to rename (${contract.host})`, ['Pre one', 'Pre two']);
    expect(await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: id, subcategoryId: subcategoryIds[0], newName: 'Pre uno' },
      { categoryId: id, subcategoryId: subcategoryIds[1], newName: 'Pre dos' }
    ] })).toEqual(batch(2));
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(standIns);

  it('removes a subcategory, naming it and its category by their names', async () => {
    const categoryName = `Pre category with a subcategory to delete (${contract.host})`;
    await withSubcategories(categoryName, ['Pre gone', 'Pre kept']);
    expect(await call('deleteSubcategory', { categoryName, subcategoryName: 'Pre gone' })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('removes a subcategory by its id', async () => {
    const { id, subcategoryIds } = await withSubcategories(`Pre category with a subcategory to delete by id (${contract.host})`, ['Pre gone', 'Pre kept']);
    expect(await call('deleteSubcategoryAdvanced', { categoryId: id, subcategoryId: subcategoryIds[0] })).toEqual(jasmine.objectContaining({ id: subcategoryIds[0], deleted: true }));
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('removes several subcategories at once', async () => {
    const { id, subcategoryIds } = await withSubcategories(`Pre category with subcategories to delete (${contract.host})`, ['Pre one', 'Pre two', 'Pre kept']);
    expect(await call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: id, subcategoryId: subcategoryIds[0] }, { categoryId: id, subcategoryId: subcategoryIds[1] }] }))
      .toEqual(batch(2));
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(standIns);

  it('moves a subcategory to the first place, naming it and its category by their names', async () => {
    const categoryName = `Pre category with subcategories to move (${contract.host})`;
    await withSubcategories(categoryName, ['Pre first', 'Pre second']);
    expect(await call('updateSubcategoryOrder', { categoryName, subcategoryName: 'Pre second', position: 1 }))
      .toEqual(category({ name: categoryName, subcategories: [jasmine.objectContaining({ name: 'Pre second' }), jasmine.objectContaining({ name: 'Pre first' })] }));
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves a subcategory to the first place by its id', async () => {
    const { id, subcategoryIds } = await withSubcategories(`Pre category with subcategories to move by id (${contract.host})`, ['Pre first', 'Pre second']);
    expect(await call('updateSubcategoryOrderAdvanced', { categoryId: id, subcategoryId: subcategoryIds[1], position: 1 }))
      .toEqual(category({ id, subcategories: [jasmine.objectContaining({ id: subcategoryIds[1] }), jasmine.objectContaining({ id: subcategoryIds[0] })] }));
  });
});
