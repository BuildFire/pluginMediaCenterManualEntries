// categories: every operation on categories and on the subcategories inside them, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const host = contract.host;
// The widget's refresh message is the plugin's own bookkeeping: the spy only answers.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};
const named = (name) => jasmine.objectContaining({ id: jasmine.any(String), name });
const categoryNamed = async (name) => (await call('searchCategories', { name })).categories.find((found) => found.name === name);
// A category with the subcategories given, for one spec.
const categoryWith = async (name, subcategoryNames) => {
  await call('createCategory', { name });
  for (const subcategoryName of subcategoryNames) {
    await call('createSubcategory', { categoryName: name, name: subcategoryName });
  }
  return categoryNamed(name);
};
// Only the control panel makes categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Pre category for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (host === 'control'
    ? (async () => {
      standIns();
      await call('createCategory', { name: forTheApp });
      await call('createSubcategory', { categoryName: forTheApp, name: 'Pre app subcategory' });
      return categoryNamed(forTheApp);
    })()
    : categoryNamed(forTheApp));
  return madeCategory;
};

contract.describe('searchCategories', () => {
  it('finds a category by its name', async () => {
    await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp })).toEqual(jasmine.objectContaining({
      categories: jasmine.arrayContaining([jasmine.objectContaining({ name: forTheApp, subcategories: [jasmine.objectContaining({ name: 'Pre app subcategory' })] })]),
      total: jasmine.any(Number)
    }));
  });

  it('finds a category by its name, a page at a time', async () => {
    await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp, page: 0, pageSize: 10 }))
      .toEqual(jasmine.objectContaining({ categories: jasmine.arrayContaining([named(forTheApp)]), page: 0, hasMore: jasmine.any(Boolean) }));
  });
});

contract.describe('createCategory', () => {
  beforeEach(standIns);

  it('adds a category from its name', async () => {
    const name = `Pre category (${host})`;
    expect(await call('createCategory', { name })).toEqual(named(name));
  });

  it('adds a category with an icon and a subcategory order', async () => {
    const name = `Pre category with an icon (${host})`;
    expect(await call('createCategory', { name, icon: ['https://example.com/pre-icon.png'], subcategorySortOrder: 'Manually' })).toEqual(named(name));
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds several categories at once', async () => {
    const categories = [
      { name: `Pre batch category one (${host})` },
      { name: `Pre batch category two (${host})`, icon: ['https://example.com/pre-batch-icon.png'], subcategorySortOrder: 'Oldest' }
    ];
    expect(await call('createCategoriesAdvanced', { categories })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateCategory', () => {
  beforeEach(standIns);

  it('renames a category, naming it by its name', async () => {
    const name = `Pre category to rename (${host})`;
    await call('createCategory', { name });
    expect(await call('updateCategory', { name, newName: `Pre category renamed (${host})` })).toEqual(named(`Pre category renamed (${host})`));
  });

  it('changes every detail of a category', async () => {
    const name = `Pre category to change fully (${host})`;
    await categoryWith(name, ['Pre B', 'Pre A']);
    expect(await call('updateCategory', { name, newName: `Pre category changed fully (${host})`, newIcon: ['https://example.com/pre-new-icon.png'], newSubcategorySortOrder: 'Subcategory Title A-Z' }))
      .toEqual(named(`Pre category changed fully (${host})`));
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(standIns);

  it("changes a category's subcategory order, naming it by its id", async () => {
    const { id } = await call('createCategory', { name: `Pre category to update by id (${host})` });
    expect(await call('updateCategoryAdvanced', { categoryId: id, newSubcategorySortOrder: 'Oldest' })).toEqual(jasmine.objectContaining({ id }));
  });

  it('changes every detail of a category, by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to change by id (${host})`, icon: ['https://example.com/pre-icon.png'] });
    expect(await call('updateCategoryAdvanced', { categoryId: id, newName: `Pre category changed by id (${host})`, newIcon: null, newSubcategorySortOrder: 'Manually' }))
      .toEqual(jasmine.objectContaining({ id }));
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('changes several categories at once', async () => {
    const first = await call('createCategory', { name: `Pre batch category to update one (${host})` });
    const second = await call('createCategory', { name: `Pre batch category to update two (${host})` });
    expect(await call('updateCategoriesAdvanced', { categories: [
      { categoryId: first.id, newSubcategorySortOrder: 'Oldest' },
      { categoryId: second.id, newName: `Pre batch category updated two (${host})`, newIcon: [] }
    ] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(standIns);

  it('deletes a category by its name', async () => {
    const name = `Pre category to delete (${host})`;
    await call('createCategory', { name });
    expect(await call('deleteCategory', { name })).toEqual(jasmine.objectContaining({ deleted: true }));
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(standIns);

  it('deletes a category by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to delete by id (${host})` });
    expect(await call('deleteCategoryAdvanced', { categoryId: id })).toEqual(jasmine.objectContaining({ id, deleted: true }));
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('deletes several categories at once', async () => {
    const first = await call('createCategory', { name: `Pre batch category to delete one (${host})` });
    const second = await call('createCategory', { name: `Pre batch category to delete two (${host})` });
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: first.id }, { categoryId: second.id }] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateCategoryOrder', () => {
  beforeEach(standIns);

  it('moves a category to the first place, naming it by its name', async () => {
    const name = `Pre category to move (${host})`;
    await call('createCategory', { name });
    expect(await call('updateCategoryOrder', { name, position: 1 })).toEqual(named(name));
  }, 120000);
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves a category to the first place, naming it by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to move by id (${host})` });
    expect(await call('updateCategoryOrderAdvanced', { categoryId: id, position: 1 })).toEqual(jasmine.objectContaining({ id }));
  }, 120000);
});

contract.describe('createSubcategory', () => {
  beforeEach(standIns);

  it('adds a subcategory to a category named by its name', async () => {
    const categoryName = `Pre category for a subcategory (${host})`;
    await call('createCategory', { name: categoryName });
    expect(await call('createSubcategory', { categoryName, name: 'Pre subcategory' })).toEqual(named('Pre subcategory'));
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('adds a subcategory to a category named by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category for a subcategory by id (${host})` });
    expect(await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre subcategory by id' })).toEqual(named('Pre subcategory by id'));
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds several subcategories at once', async () => {
    const { id } = await call('createCategory', { name: `Pre category for batch subcategories (${host})` });
    expect(await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: id, name: 'Pre batch one' }, { categoryId: id, name: 'Pre batch two' }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(standIns);

  it('renames a subcategory, naming it and its category by their names', async () => {
    const categoryName = `Pre category with a subcategory to rename (${host})`;
    await categoryWith(categoryName, ['Pre old name']);
    expect(await call('updateSubcategory', { categoryName, subcategoryName: 'Pre old name', newName: 'Pre new name' })).toEqual(named('Pre new name'));
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('renames a subcategory, naming it and its category by their ids', async () => {
    const category = await categoryWith(`Pre category with a subcategory to rename by id (${host})`, ['Pre old name']);
    expect(await call('updateSubcategoryAdvanced', { categoryId: category.id, subcategoryId: category.subcategories[0].id, newName: 'Pre new name by id' }))
      .toEqual(named('Pre new name by id'));
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('renames several subcategories at once', async () => {
    const category = await categoryWith(`Pre category with subcategories to rename (${host})`, ['Pre one', 'Pre two']);
    expect(await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: category.id, subcategoryId: category.subcategories[0].id, newName: 'Pre uno' },
      { categoryId: category.id, subcategoryId: category.subcategories[1].id, newName: 'Pre dos' }
    ] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(standIns);

  it('removes a subcategory, naming it and its category by their names', async () => {
    const categoryName = `Pre category with a subcategory to delete (${host})`;
    await categoryWith(categoryName, ['Pre gone', 'Pre kept']);
    expect(await call('deleteSubcategory', { categoryName, subcategoryName: 'Pre gone' })).toEqual(jasmine.objectContaining({ name: 'Pre gone', deleted: true }));
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('removes a subcategory, naming it and its category by their ids', async () => {
    const category = await categoryWith(`Pre category with a subcategory to delete by id (${host})`, ['Pre gone']);
    expect(await call('deleteSubcategoryAdvanced', { categoryId: category.id, subcategoryId: category.subcategories[0].id })).toEqual(jasmine.objectContaining({ deleted: true }));
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('removes several subcategories at once', async () => {
    const category = await categoryWith(`Pre category with subcategories to delete (${host})`, ['Pre one', 'Pre two', 'Pre kept']);
    expect(await call('deleteSubcategoriesAdvanced', { subcategories: [
      { categoryId: category.id, subcategoryId: category.subcategories[0].id },
      { categoryId: category.id, subcategoryId: category.subcategories[1].id }
    ] })).toEqual(jasmine.objectContaining({ succeeded: 2 }));
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(standIns);

  it('moves a subcategory to the first place, naming it and its category by their names', async () => {
    const categoryName = `Pre category with subcategories to move (${host})`;
    await categoryWith(categoryName, ['Pre first', 'Pre second']);
    expect(await call('updateSubcategoryOrder', { categoryName, subcategoryName: 'Pre second', position: 1 })).toEqual(named(categoryName));
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves a subcategory to the last place, naming it and its category by their ids', async () => {
    const category = await categoryWith(`Pre category with subcategories to move by id (${host})`, ['Pre first', 'Pre second']);
    expect(await call('updateSubcategoryOrderAdvanced', { categoryId: category.id, subcategoryId: category.subcategories[0].id, position: 2 }))
      .toEqual(jasmine.objectContaining({ id: category.id }));
  });
});
