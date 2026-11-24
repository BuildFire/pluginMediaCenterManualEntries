// categories: every operation on categories and on the subcategories inside them, one block each, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// The category with exactly that name, as the contract's own search finds it.
const category = async (name) => (await call('searchCategories', { name, pageSize: 50 })).categories.find((record) => record.name === name);
// Calls nothing here answers. The widget's refresh message is the plugin's own bookkeeping: the spy only answers.
const standIns = () => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') spyOn(buildfire.messaging, 'sendMessageToWidget');
};
// Only the control panel makes categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Pre category for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? call('createCategory', { name: forTheApp, icon: ['https://example.com/pre-app-icon.png'] })
      .then(() => call('createSubcategory', { categoryName: forTheApp, name: 'Pre app subcategory' }))
      .then(() => category(forTheApp))
    : category(forTheApp).then((record) => record || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`))));
  return madeCategory;
};
const madeCategoryShape = (name) => jasmine.objectContaining({ id: jasmine.any(String), name });
const batchShape = (key, count) => jasmine.objectContaining({ [key]: jasmine.any(Array), succeeded: count, failed: 0 });

contract.describe('searchCategories', () => {
  beforeEach(standIns);

  it('finds the category the control panel made, by its name', async () => {
    await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp })).toEqual(jasmine.objectContaining({
      categories: jasmine.arrayContaining([jasmine.objectContaining({ id: jasmine.any(String), name: forTheApp })])
    }));
  });

  it('finds it with a page and a page size', async () => {
    await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp, page: 0, pageSize: 20 })).toEqual(jasmine.objectContaining({
      categories: jasmine.arrayContaining([jasmine.objectContaining({ name: forTheApp })]), page: 0
    }));
  });
});

contract.describe('createCategory', () => {
  beforeEach(standIns);

  it('adds a category from its name', async () => {
    const name = `Pre category (${contract.host})`;
    expect(await call('createCategory', { name })).toEqual(madeCategoryShape(name));
  });

  it('adds a category with an icon and a subcategory order', async () => {
    const name = `Pre category with an icon (${contract.host})`;
    expect(await call('createCategory', { name, icon: ['https://example.com/pre-icon.png'], subcategorySortOrder: 'Manually' })).toEqual(madeCategoryShape(name));
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds several categories at once', async () => {
    expect(await call('createCategoriesAdvanced', { categories: [
      { name: `Pre batch category one (${contract.host})` },
      { name: `Pre batch category two (${contract.host})`, icon: ['https://example.com/pre-batch-icon.png'], subcategorySortOrder: 'Oldest' }
    ] })).toEqual(batchShape('categories', 2));
  });
});

contract.describe('updateCategory', () => {
  beforeEach(standIns);

  it("changes a category's subcategory order, naming the category", async () => {
    const name = `Pre category to update (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategory', { name, newSubcategorySortOrder: 'Manually' })).toEqual(madeCategoryShape(name));
  });

  it('renames a category and changes its icon and order', async () => {
    const name = `Pre category to rename (${contract.host})`;
    await call('createCategory', { name });
    const newName = `Pre category renamed (${contract.host})`;
    expect(await call('updateCategory', { name, newName, newIcon: ['https://example.com/pre-new-icon.png'], newSubcategorySortOrder: 'Oldest' }))
      .toEqual(madeCategoryShape(newName));
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(standIns);

  it('changes a category by its id', async () => {
    const name = `Pre category to update by id (${contract.host})`;
    const { id } = await call('createCategory', { name });
    expect(await call('updateCategoryAdvanced', { categoryId: id, newIcon: ['https://example.com/pre-icon-by-id.png'] }))
      .toEqual(jasmine.objectContaining({ id, name }));
  });

  it('renames a category by its id, and changes its order', async () => {
    const { id } = await call('createCategory', { name: `Pre category to rename by id (${contract.host})` });
    const newName = `Pre category renamed by id (${contract.host})`;
    expect(await call('updateCategoryAdvanced', { categoryId: id, newName, newSubcategorySortOrder: 'Subcategory Title A-Z' }))
      .toEqual(jasmine.objectContaining({ id, name: newName }));
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('changes several categories at once', async () => {
    const first = await call('createCategory', { name: `Pre batch category to update one (${contract.host})` });
    const second = await call('createCategory', { name: `Pre batch category to update two (${contract.host})` });
    expect(await call('updateCategoriesAdvanced', { categories: [
      { categoryId: first.id, newSubcategorySortOrder: 'Manually' },
      { categoryId: second.id, newName: `Pre batch category updated two (${contract.host})`, newIcon: ['https://example.com/pre-batch-new-icon.png'] }
    ] })).toEqual(batchShape('categories', 2));
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(standIns);

  it('deletes a category, naming it', async () => {
    const name = `Pre category to delete (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('deleteCategory', { name })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), deleted: true }));
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(standIns);

  it('deletes a category by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to delete by id (${contract.host})` });
    expect(await call('deleteCategoryAdvanced', { categoryId: id })).toEqual(jasmine.objectContaining({ id, deleted: true }));
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(standIns);

  it('deletes several categories at once', async () => {
    const first = await call('createCategory', { name: `Pre batch category to delete one (${contract.host})` });
    const second = await call('createCategory', { name: `Pre batch category to delete two (${contract.host})` });
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: first.id }, { categoryId: second.id }] })).toEqual(batchShape('categories', 2));
  });
});

contract.describe('updateCategoryOrder', () => {
  beforeEach(standIns);

  it('moves a category to the first place, naming it', async () => {
    const name = `Pre category to move (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategoryOrder', { name, position: 1 })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), name }));
  }, 120000);
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves a category to the first place by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category to move by id (${contract.host})` });
    expect(await call('updateCategoryOrderAdvanced', { categoryId: id, position: 1 })).toEqual(jasmine.objectContaining({ id }));
  }, 120000);
});

contract.describe('createSubcategory', () => {
  beforeEach(standIns);

  it('adds a subcategory to a category, naming the category', async () => {
    const categoryName = `Pre category for a subcategory (${contract.host})`;
    await call('createCategory', { name: categoryName });
    expect(await call('createSubcategory', { categoryName, name: 'Pre subcategory' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre subcategory', category: jasmine.objectContaining({ name: categoryName }) }));
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it("adds a subcategory to a category by the category's id", async () => {
    const { id } = await call('createCategory', { name: `Pre category for a subcategory by id (${contract.host})` });
    expect(await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre subcategory by id' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre subcategory by id', category: jasmine.objectContaining({ id }) }));
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('adds several subcategories at once', async () => {
    const { id } = await call('createCategory', { name: `Pre category for batch subcategories (${contract.host})` });
    expect(await call('createSubcategoriesAdvanced', { subcategories: [
      { categoryId: id, name: 'Pre batch subcategory one' },
      { categoryId: id, name: 'Pre batch subcategory two' }
    ] })).toEqual(batchShape('subcategories', 2));
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(standIns);

  it('renames a subcategory, naming it and its category', async () => {
    const categoryName = `Pre category with a subcategory to rename (${contract.host})`;
    await call('createCategory', { name: categoryName });
    await call('createSubcategory', { categoryName, name: 'Pre subcategory to rename' });
    expect(await call('updateSubcategory', { categoryName, subcategoryName: 'Pre subcategory to rename', newName: 'Pre subcategory renamed' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre subcategory renamed' }));
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('renames a subcategory by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category with a subcategory to rename by id (${contract.host})` });
    const added = await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre subcategory to rename by id' });
    expect(await call('updateSubcategoryAdvanced', { categoryId: id, subcategoryId: added.id, newName: 'Pre subcategory renamed by id' }))
      .toEqual(jasmine.objectContaining({ id: added.id, name: 'Pre subcategory renamed by id' }));
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('renames several subcategories at once', async () => {
    const { id } = await call('createCategory', { name: `Pre category with batch subcategories to rename (${contract.host})` });
    const one = await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre batch subcategory to rename one' });
    const two = await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre batch subcategory to rename two' });
    expect(await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: id, subcategoryId: one.id, newName: 'Pre batch subcategory renamed one' },
      { categoryId: id, subcategoryId: two.id, newName: 'Pre batch subcategory renamed two' }
    ] })).toEqual(batchShape('subcategories', 2));
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(standIns);

  it('removes a subcategory, naming it and its category', async () => {
    const categoryName = `Pre category with a subcategory to delete (${contract.host})`;
    await call('createCategory', { name: categoryName });
    await call('createSubcategory', { categoryName, name: 'Pre subcategory to delete' });
    await call('createSubcategory', { categoryName, name: 'Pre subcategory kept' });
    expect(await call('deleteSubcategory', { categoryName, subcategoryName: 'Pre subcategory to delete' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre subcategory to delete', deleted: true }));
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(standIns);

  it('removes a subcategory by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category with a subcategory to delete by id (${contract.host})` });
    const added = await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre subcategory to delete by id' });
    expect(await call('deleteSubcategoryAdvanced', { categoryId: id, subcategoryId: added.id })).toEqual(jasmine.objectContaining({ id: added.id, deleted: true }));
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(standIns);

  it('removes several subcategories at once', async () => {
    const { id } = await call('createCategory', { name: `Pre category with batch subcategories to delete (${contract.host})` });
    const one = await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre batch subcategory to delete one' });
    const two = await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre batch subcategory to delete two' });
    expect(await call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: id, subcategoryId: one.id }, { categoryId: id, subcategoryId: two.id }] }))
      .toEqual(batchShape('subcategories', 2));
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(standIns);

  it('moves a subcategory to the first place, naming it and its category', async () => {
    const categoryName = `Pre category with subcategories to move (${contract.host})`;
    await call('createCategory', { name: categoryName });
    await call('createSubcategory', { categoryName, name: 'Pre subcategory first' });
    await call('createSubcategory', { categoryName, name: 'Pre subcategory to move' });
    expect(await call('updateSubcategoryOrder', { categoryName, subcategoryName: 'Pre subcategory to move', position: 1 }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: categoryName, subcategories: jasmine.any(Array) }));
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(standIns);

  it('moves a subcategory to the last place by its id', async () => {
    const { id } = await call('createCategory', { name: `Pre category with subcategories to move by id (${contract.host})` });
    const first = await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre subcategory to move by id' });
    await call('createSubcategoryAdvanced', { categoryId: id, name: 'Pre subcategory staying by id' });
    expect(await call('updateSubcategoryOrderAdvanced', { categoryId: id, subcategoryId: first.id, position: 2 }))
      .toEqual(jasmine.objectContaining({ id, subcategories: jasmine.any(Array) }));
  });
});
