// categories: every operation on categories and the subcategories inside them, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));

// The refresh message the contract sends the widget after a change: nothing here answers it, so a spy stands in for it.
const standInForSideEffects = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};
const category = jasmine.objectContaining({ id: jasmine.any(String), name: jasmine.any(String) });
const subcategory = jasmine.objectContaining({ id: jasmine.any(String), name: jasmine.any(String), category: jasmine.any(Object) });
const batchResult = (count) => jasmine.objectContaining({ succeeded: count, failed: 0 });
// A category holding subcategories with these names, in this order.
const withSubcategories = async (name, names) => {
  const made = await call('createCategory', { name });
  const subcategories = [];
  for (const subcategoryName of names) subcategories.push(await call('createSubcategoryAdvanced', { categoryId: made.id, name: subcategoryName }));
  return { category: made, subcategories };
};

// Only the control panel adds categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Pre category for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? call('createCategory', { name: forTheApp, icon: ['https://example.com/pre-for-the-app.png'] })
    : call('searchCategories', { name: forTheApp }).then(({ categories }) => categories.find((found) => found.name === forTheApp)
      || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`))));
  return madeCategory;
};

contract.describe('searchCategories', () => {
  beforeEach(standInForSideEffects);

  it('finds categories by part of their name', async () => {
    const made = await categoryForTheApp();
    expect(await call('searchCategories', { name: 'category for the app' })).toEqual(jasmine.objectContaining({
      categories: jasmine.arrayContaining([jasmine.objectContaining({ id: made.id, name: forTheApp })])
    }));
  });

  it('shows categories a page at a time', async () => {
    const made = await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp, page: 0, pageSize: 10 })).toEqual(jasmine.objectContaining({
      categories: jasmine.arrayContaining([jasmine.objectContaining({ id: made.id })]), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean)
    }));
  });
});

contract.describe('createCategory', () => {
  beforeEach(standInForSideEffects);

  it('adds a category from its name', async () => {
    const name = `Pre category (${contract.host})`;
    expect(await call('createCategory', { name })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name }));
  });

  it('adds a category with an icon and a subcategory order', async () => {
    const name = `Pre category with an icon (${contract.host})`;
    expect(await call('createCategory', { name, icon: ['https://example.com/pre-icon.png'], subcategorySortOrder: 'Subcategory Title A-Z' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name }));
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds several categories at once', async () => {
    const categories = [{ name: `Pre batch category one (${contract.host})` }, { name: `Pre batch category two (${contract.host})`, icon: ['https://example.com/pre-batch-icon.png'], subcategorySortOrder: 'Oldest' }];
    expect(await call('createCategoriesAdvanced', { categories })).toEqual(batchResult(2));
  });
});

contract.describe('updateCategory', () => {
  beforeEach(standInForSideEffects);

  it('renames a category, naming it by its name', async () => {
    const name = `Pre category to rename (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategory', { name, newName: `Pre category renamed (${contract.host})` })).toEqual(category);
  });

  it('changes everything about a category', async () => {
    const name = `Pre category to change fully (${contract.host})`;
    await withSubcategories(name, ['Pre bravo', 'Pre alpha']);
    expect(await call('updateCategory', {
      name, newName: `Pre category changed fully (${contract.host})`, newIcon: ['https://example.com/pre-new-icon.png'], newSubcategorySortOrder: 'Subcategory Title A-Z'
    })).toEqual(category);
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes a category, naming it by its id', async () => {
    const made = await call('createCategory', { name: `Pre category to change by id (${contract.host})`, icon: ['https://example.com/pre-old-icon.png'] });
    expect(await call('updateCategoryAdvanced', { categoryId: made.id, newIcon: [], newSubcategorySortOrder: 'Manually' })).toEqual(jasmine.objectContaining({ id: made.id }));
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('changes several categories at once', async () => {
    const one = await call('createCategory', { name: `Pre batch category to change one (${contract.host})` });
    const two = await call('createCategory', { name: `Pre batch category to change two (${contract.host})` });
    expect(await call('updateCategoriesAdvanced', { categories: [
      { categoryId: one.id, newName: `Pre batch category changed one (${contract.host})` },
      { categoryId: two.id, newIcon: ['https://example.com/pre-batch-new-icon.png'] }
    ] })).toEqual(batchResult(2));
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(standInForSideEffects);

  it('removes a category, naming it by its name', async () => {
    const name = `Pre category to delete (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('deleteCategory', { name })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes a category, naming it by its id', async () => {
    const made = await call('createCategory', { name: `Pre category to delete by id (${contract.host})` });
    expect(await call('deleteCategoryAdvanced', { categoryId: made.id })).toEqual(jasmine.objectContaining({ id: made.id, deleted: true }));
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes several categories at once', async () => {
    const one = await call('createCategory', { name: `Pre batch category to delete one (${contract.host})` });
    const two = await call('createCategory', { name: `Pre batch category to delete two (${contract.host})` });
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: one.id }, { categoryId: two.id }] })).toEqual(batchResult(2));
  });
});

contract.describe('updateCategoryOrder', () => {
  beforeEach(standInForSideEffects);

  it('moves a category to the first place, naming it by its name', async () => {
    const name = `Pre category to move (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategoryOrder', { name, position: 1 })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name }));
  }, 120000);
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('moves a category to the second place, naming it by its id', async () => {
    const made = await call('createCategory', { name: `Pre category to move by id (${contract.host})` });
    expect(await call('updateCategoryOrderAdvanced', { categoryId: made.id, position: 2 })).toEqual(jasmine.objectContaining({ id: made.id }));
  }, 120000);
});

contract.describe('createSubcategory', () => {
  beforeEach(standInForSideEffects);

  it('adds a subcategory to a category, naming it by its name', async () => {
    const categoryName = `Pre category for a subcategory (${contract.host})`;
    await call('createCategory', { name: categoryName });
    expect(await call('createSubcategory', { categoryName, name: 'Pre subcategory' })).toEqual(subcategory);
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds a subcategory to a category, naming it by its id', async () => {
    const made = await call('createCategory', { name: `Pre category for a subcategory by id (${contract.host})` });
    expect(await call('createSubcategoryAdvanced', { categoryId: made.id, name: 'Pre subcategory by id' })).toEqual(subcategory);
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('adds several subcategories at once', async () => {
    const made = await call('createCategory', { name: `Pre category for batch subcategories (${contract.host})` });
    expect(await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: made.id, name: 'Pre batch one' }, { categoryId: made.id, name: 'Pre batch two' }] }))
      .toEqual(batchResult(2));
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(standInForSideEffects);

  it('renames a subcategory, naming both by their names', async () => {
    const categoryName = `Pre category with a subcategory to rename (${contract.host})`;
    await withSubcategories(categoryName, ['Pre old name']);
    expect(await call('updateSubcategory', { categoryName, subcategoryName: 'Pre old name', newName: 'Pre new name' })).toEqual(subcategory);
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('renames a subcategory, naming both by their ids', async () => {
    const made = await withSubcategories(`Pre category with a subcategory to rename by id (${contract.host})`, ['Pre old name by id']);
    expect(await call('updateSubcategoryAdvanced', { categoryId: made.category.id, subcategoryId: made.subcategories[0].id, newName: 'Pre new name by id' }))
      .toEqual(subcategory);
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('renames several subcategories at once', async () => {
    const made = await withSubcategories(`Pre category with batch subcategories to rename (${contract.host})`, ['Pre batch old one', 'Pre batch old two']);
    expect(await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: made.category.id, subcategoryId: made.subcategories[0].id, newName: 'Pre batch new one' },
      { categoryId: made.category.id, subcategoryId: made.subcategories[1].id, newName: 'Pre batch new two' }
    ] })).toEqual(batchResult(2));
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(standInForSideEffects);

  it('removes a subcategory, naming both by their names', async () => {
    const categoryName = `Pre category with a subcategory to delete (${contract.host})`;
    await withSubcategories(categoryName, ['Pre gone', 'Pre kept']);
    expect(await call('deleteSubcategory', { categoryName, subcategoryName: 'Pre gone' })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes a subcategory, naming both by their ids', async () => {
    const made = await withSubcategories(`Pre category with a subcategory to delete by id (${contract.host})`, ['Pre gone by id']);
    expect(await call('deleteSubcategoryAdvanced', { categoryId: made.category.id, subcategoryId: made.subcategories[0].id }))
      .toEqual(jasmine.objectContaining({ id: made.subcategories[0].id, deleted: true }));
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('removes several subcategories at once', async () => {
    const made = await withSubcategories(`Pre category with batch subcategories to delete (${contract.host})`, ['Pre batch gone one', 'Pre batch gone two', 'Pre batch kept']);
    expect(await call('deleteSubcategoriesAdvanced', { subcategories: [
      { categoryId: made.category.id, subcategoryId: made.subcategories[0].id },
      { categoryId: made.category.id, subcategoryId: made.subcategories[1].id }
    ] })).toEqual(batchResult(2));
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(standInForSideEffects);

  it('moves a subcategory to the first place, naming both by their names', async () => {
    const categoryName = `Pre category with subcategories to move (${contract.host})`;
    await withSubcategories(categoryName, ['Pre first', 'Pre second']);
    expect(await call('updateSubcategoryOrder', { categoryName, subcategoryName: 'Pre second', position: 1 })).toEqual(category);
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(standInForSideEffects);

  it('moves a subcategory to the first place, naming both by their ids', async () => {
    const made = await withSubcategories(`Pre category with subcategories to move by id (${contract.host})`, ['Pre first by id', 'Pre second by id']);
    expect(await call('updateSubcategoryOrderAdvanced', { categoryId: made.category.id, subcategoryId: made.subcategories[1].id, position: 1 }))
      .toEqual(jasmine.objectContaining({ id: made.category.id }));
  });
});
