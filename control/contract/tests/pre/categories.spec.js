// categories: media categories and the subcategories inside them, one block per operation, after the helpers they share.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const one = async (name) => (await call('searchCategories', { name })).result[0];
// A category with subcategories of these names, made through the contract.
const categoryWith = async (name, names) => {
  const category = await call('createCategory', { name });
  for (const subcategory of names) await call('createSubcategoryAdvanced', { categoryId: category.id, name: subcategory });
  return one(name);
};
// The refresh message the control panel sends the widget: the spy only answers it.
const quietWidget = () => spyOn(buildfire.messaging, 'sendMessageToWidget');
const added = jasmine.objectContaining({ id: jasmine.any(String) });
// Only the control panel makes categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Pre category for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? call('createCategory', { name: forTheApp })
    : one(forTheApp).then((record) => record || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`))));
  return madeCategory;
};

contract.describe('updateCategoryOrder', () => {
  beforeEach(quietWidget);

  it('moves a category to the top, naming it by its name', async () => {
    const name = `Pre category to move (${contract.host})`;
    const category = await call('createCategory', { name });
    expect(await call('updateCategoryOrder', { categoryName: name, position: 1 })).toEqual(jasmine.objectContaining({ id: category.id, rank: 1 }));
  });
});

contract.describe('updateCategoryOrderAdvanced', () => {
  beforeEach(quietWidget);

  it('moves a category to the top, naming it by its id', async () => {
    const category = await call('createCategory', { name: `Pre category to move by id (${contract.host})` });
    expect(await call('updateCategoryOrderAdvanced', { categoryId: category.id, position: 1 })).toEqual(jasmine.objectContaining({ id: category.id, rank: 1 }));
  });
});

contract.describe('createCategory', () => {
  beforeEach(quietWidget);

  it('adds a category from its name', async () => {
    const name = `Pre category (${contract.host})`;
    expect(await call('createCategory', { name })).toEqual(jasmine.objectContaining({ id: jasmine.any(String), data: jasmine.objectContaining({ name }) }));
  });

  it('adds a category with an icon', async () => {
    const name = `Pre category with an icon (${contract.host})`;
    expect(await call('createCategory', { name, icon: ['https://example.com/pre-category.png'] }))
      .toEqual(jasmine.objectContaining({ data: jasmine.objectContaining({ name, icon: 'https://example.com/pre-category.png' }) }));
  });
});

contract.describe('createCategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('adds several categories at once', async () => {
    const categories = [{ name: `Pre batch category one (${contract.host})` }, { name: `Pre batch category two (${contract.host})`, icon: ['https://example.com/pre-batch.png'] }];
    expect(await call('createCategoriesAdvanced', { categories })).toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
  });
});

contract.describe('updateCategory', () => {
  beforeEach(quietWidget);

  it("changes a category's icon, naming it by its name", async () => {
    const name = `Pre category to update (${contract.host})`;
    await call('createCategory', { name });
    expect(await call('updateCategory', { categoryName: name, newIcon: ['https://example.com/pre-updated.png'] })).toEqual(added);
  });

  it("changes a category's name, icon and subcategory order", async () => {
    const name = `Pre category to rename (${contract.host})`;
    await categoryWith(name, ['Pre B', 'Pre A']);
    expect(await call('updateCategory', {
      categoryName: name, newName: `Pre category renamed (${contract.host})`, newIcon: [], newSubcategorySortBy: 'Subcategory Title A-Z'
    })).toEqual(jasmine.objectContaining({ data: jasmine.objectContaining({ name: `Pre category renamed (${contract.host})` }) }));
  });
});

contract.describe('updateCategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('changes a category, naming it by its id', async () => {
    const category = await call('createCategory', { name: `Pre category to update by id (${contract.host})` });
    expect(await call('updateCategoryAdvanced', { categoryId: category.id, newName: `Pre category updated by id (${contract.host})` }))
      .toEqual(jasmine.objectContaining({ id: category.id }));
  });

  it("changes a category's icon and subcategory order, naming it by its id", async () => {
    const category = await call('createCategory', { name: `Pre category to sort by id (${contract.host})` });
    expect(await call('updateCategoryAdvanced', { categoryId: category.id, newIcon: ['https://example.com/pre-by-id.png'], newSubcategorySortBy: 'Oldest' }))
      .toEqual(jasmine.objectContaining({ id: category.id }));
  });
});

contract.describe('updateCategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('changes several categories at once', async () => {
    const first = await call('createCategory', { name: `Pre batch category to update one (${contract.host})` });
    const second = await call('createCategory', { name: `Pre batch category to update two (${contract.host})` });
    expect(await call('updateCategoriesAdvanced', { categories: [
      { categoryId: first.id, newName: `Pre batch category updated one (${contract.host})` },
      { categoryId: second.id, newIcon: ['https://example.com/pre-batch-updated.png'], newSubcategorySortBy: 'Newest' }
    ] })).toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
  });
});

contract.describe('deleteCategory', () => {
  beforeEach(quietWidget);

  it('removes a category, naming it by its name', async () => {
    const name = `Pre category to delete (${contract.host})`;
    const category = await call('createCategory', { name });
    expect(await call('deleteCategory', { categoryName: name })).toEqual(jasmine.objectContaining({ id: category.id }));
  });
});

contract.describe('deleteCategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('removes a category, naming it by its id', async () => {
    const category = await call('createCategory', { name: `Pre category to delete by id (${contract.host})` });
    expect(await call('deleteCategoryAdvanced', { categoryId: category.id })).toEqual(jasmine.objectContaining({ id: category.id }));
  });
});

contract.describe('deleteCategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('removes several categories at once', async () => {
    const first = await call('createCategory', { name: `Pre batch category to delete one (${contract.host})` });
    const second = await call('createCategory', { name: `Pre batch category to delete two (${contract.host})` });
    expect(await call('deleteCategoriesAdvanced', { categories: [{ categoryId: first.id }, { categoryId: second.id }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
  });
});

contract.describe('createSubcategory', () => {
  beforeEach(quietWidget);

  it('adds a subcategory to a category named by its name', async () => {
    const name = `Pre category for a subcategory (${contract.host})`;
    const category = await call('createCategory', { name });
    expect(await call('createSubcategory', { categoryName: name, name: 'Pre subcategory' }))
      .toEqual(jasmine.objectContaining({ categoryId: category.id, id: jasmine.any(String), name: 'Pre subcategory' }));
  });
});

contract.describe('createSubcategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('adds a subcategory to a category named by its id', async () => {
    const category = await call('createCategory', { name: `Pre category for a subcategory by id (${contract.host})` });
    expect(await call('createSubcategoryAdvanced', { categoryId: category.id, name: 'Pre subcategory by id' }))
      .toEqual(jasmine.objectContaining({ categoryId: category.id, id: jasmine.any(String), name: 'Pre subcategory by id' }));
  });
});

contract.describe('createSubcategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('adds several subcategories at once', async () => {
    const category = await call('createCategory', { name: `Pre category for batch subcategories (${contract.host})` });
    expect(await call('createSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, name: 'Pre batch one' }, { categoryId: category.id, name: 'Pre batch two' }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
  });
});

contract.describe('updateSubcategory', () => {
  beforeEach(quietWidget);

  it('renames a subcategory, naming both by their names', async () => {
    const name = `Pre category with a subcategory to rename (${contract.host})`;
    await categoryWith(name, ['Pre old name']);
    expect(await call('updateSubcategory', { categoryName: name, subcategoryName: 'Pre old name', newName: 'Pre new name' }))
      .toEqual(jasmine.objectContaining({ id: jasmine.any(String), name: 'Pre new name' }));
  });
});

contract.describe('updateSubcategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('renames a subcategory, naming both by their ids', async () => {
    const category = await categoryWith(`Pre category with a subcategory to rename by id (${contract.host})`, ['Pre old name by id']);
    const sub = category.data.subcategories[0];
    expect(await call('updateSubcategoryAdvanced', { categoryId: category.id, subcategoryId: sub.id, newName: 'Pre new name by id' }))
      .toEqual(jasmine.objectContaining({ id: sub.id, name: 'Pre new name by id' }));
  });
});

contract.describe('updateSubcategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('renames several subcategories at once', async () => {
    const category = await categoryWith(`Pre category with subcategories to rename (${contract.host})`, ['Pre first', 'Pre second']);
    const [first, second] = category.data.subcategories;
    expect(await call('updateSubcategoriesAdvanced', { subcategories: [
      { categoryId: category.id, subcategoryId: first.id, newName: 'Pre first renamed' },
      { categoryId: category.id, subcategoryId: second.id, newName: 'Pre second renamed' }
    ] })).toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
  });
});

contract.describe('deleteSubcategory', () => {
  beforeEach(quietWidget);

  it('removes a subcategory, naming both by their names', async () => {
    const name = `Pre category with a subcategory to delete (${contract.host})`;
    await categoryWith(name, ['Pre subcategory to delete', 'Pre subcategory to keep']);
    expect(await call('deleteSubcategory', { categoryName: name, subcategoryName: 'Pre subcategory to delete' })).toEqual(added);
  });
});

contract.describe('deleteSubcategoryAdvanced', () => {
  beforeEach(quietWidget);

  it('removes a subcategory, naming both by their ids', async () => {
    const category = await categoryWith(`Pre category with a subcategory to delete by id (${contract.host})`, ['Pre subcategory to delete by id']);
    const sub = category.data.subcategories[0];
    expect(await call('deleteSubcategoryAdvanced', { categoryId: category.id, subcategoryId: sub.id })).toEqual(jasmine.objectContaining({ id: sub.id }));
  });
});

contract.describe('deleteSubcategoriesAdvanced', () => {
  beforeEach(quietWidget);

  it('removes several subcategories at once', async () => {
    const category = await categoryWith(`Pre category with subcategories to delete (${contract.host})`, ['Pre gone one', 'Pre gone two', 'Pre stays']);
    const [first, second] = category.data.subcategories;
    expect(await call('deleteSubcategoriesAdvanced', { subcategories: [{ categoryId: category.id, subcategoryId: first.id }, { categoryId: category.id, subcategoryId: second.id }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
  });
});

contract.describe('updateSubcategoryOrder', () => {
  beforeEach(quietWidget);

  it('moves a subcategory to the top, naming both by their names', async () => {
    const name = `Pre category with subcategories to move (${contract.host})`;
    await categoryWith(name, ['Pre one', 'Pre two', 'Pre three']);
    expect(await call('updateSubcategoryOrder', { categoryName: name, subcategoryName: 'Pre three', position: 1 }))
      .toEqual(jasmine.objectContaining({ name: 'Pre three', rank: 0 }));
  });
});

contract.describe('updateSubcategoryOrderAdvanced', () => {
  beforeEach(quietWidget);

  it('moves a subcategory to the end, naming both by their ids', async () => {
    const category = await categoryWith(`Pre category with subcategories to move by id (${contract.host})`, ['Pre one', 'Pre two']);
    const sub = category.data.subcategories[0];
    expect(await call('updateSubcategoryOrderAdvanced', { categoryId: category.id, subcategoryId: sub.id, position: 2 }))
      .toEqual(jasmine.objectContaining({ id: sub.id, rank: 1 }));
  });
});

contract.describe('searchCategories', () => {
  beforeEach(quietWidget);

  it('finds a category the control panel made, by its name', async () => {
    await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp })).toEqual(jasmine.objectContaining({
      result: jasmine.arrayContaining([jasmine.objectContaining({ id: jasmine.any(String), data: jasmine.objectContaining({ name: forTheApp }) })])
    }));
  });

  it('finds a category by its name, on the page asked for', async () => {
    await categoryForTheApp();
    expect(await call('searchCategories', { name: forTheApp, page: 0 })).toEqual(jasmine.objectContaining({
      result: jasmine.arrayContaining([jasmine.objectContaining({ data: jasmine.objectContaining({ name: forTheApp }) })]),
      totalRecord: jasmine.any(Number)
    }));
  });
});
