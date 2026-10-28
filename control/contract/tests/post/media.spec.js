// media: the media list and its manual order. No operation of this contract adds media items (the control panel's
// media editor also files each one in the app's search, which no contract host can do), so a test instance holds none:
// these specs check what the operations promise of an instance without media.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
let made = 0;
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}-${++made}`;
const NO_ID = '000000000000000000000000';
// The refresh message the control panel sends the widget is not a promise of the contract: the spy only answers it.
const quietWidget = () => spyOn(buildfire.messaging, 'sendMessageToWidget');
// Only the control panel makes categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Post media category for the app';
const subcategoryForTheApp = 'Post media subcategory for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? call('createCategory', { name: forTheApp })
      .then((category) => call('createSubcategoryAdvanced', { categoryId: category.id, name: subcategoryForTheApp }).then(() => category))
    : call('searchCategories', { name: forTheApp })
      .then(({ result }) => result[0] || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`))));
  return madeCategory;
};

contract.describe('searchMedia', () => {
  beforeEach(quietWidget);

  it('shows a page of media, telling how many there are', async () => {
    const found = await call('searchMedia', {});
    expect(found).toEqual({ media: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: found.total > 50 });
    expect(found.media.length).toBe(Math.min(found.total, 50));
  });

  it('finds nothing for a title no media item has', async () => {
    expect(await call('searchMedia', { title: unique('no such media') })).toEqual({ media: [], total: 0, page: 0, hasMore: false });
  });

  it('narrows to a category, and to one of its subcategories', async () => {
    await categoryForTheApp();
    expect(await call('searchMedia', { categoryName: forTheApp })).toEqual({ media: [], total: 0, page: 0, hasMore: false });
    expect(await call('searchMedia', { categoryName: forTheApp, subcategoryName: subcategoryForTheApp, title: unique('title'), page: 0 }))
      .toEqual({ media: [], total: 0, page: 0, hasMore: false });
  });

  it('shows the page it is asked for', async () => {
    expect(await call('searchMedia', { title: unique('paged'), page: 2 })).toEqual({ media: [], total: 0, page: 2, hasMore: false });
  });

  describe('refuses', () => {
    it('a category name no category has', async () => {
      const name = unique('missing');
      expect(await refusal(call('searchMedia', { categoryName: name }))).toContain(name);
    });

    it('a subcategory name the category does not have', async () => {
      await categoryForTheApp();
      expect(await refusal(call('searchMedia', { categoryName: forTheApp, subcategoryName: 'Nowhere' }))).toContain('Nowhere');
    });

    it('a subcategory without its category', async () => {
      expect(await refusal(call('searchMedia', { subcategoryName: subcategoryForTheApp }))).toContain('categoryName');
    });

    it('a page below 0, or not a whole number', async () => {
      expect(await refusal(call('searchMedia', { page: -1 }))).toContain('page');
      expect(await refusal(call('searchMedia', { page: 1.5 }))).toContain('page');
      expect(await refusal(call('searchMedia', { page: '1' }))).toContain('page');
    });

    it('an empty title', async () => {
      expect(await refusal(call('searchMedia', { title: '' }))).toContain('title');
      expect(await refusal(call('searchMedia', { title: 7 }))).toContain('title');
    });
  });
});

contract.describe('updateMediaOrder', () => {
  beforeEach(quietWidget);

  it('refuses a title no media item has, naming it', async () => {
    const title = unique('missing');
    expect(await refusal(call('updateMediaOrder', { title, position: 1 }))).toContain(title);
  });

  it('refuses without a title', async () => {
    expect(await refusal(call('updateMediaOrder', { position: 1 }))).toContain('title');
    expect(await refusal(call('updateMediaOrder', { title: null, position: 1 }))).toContain('title');
    expect(await refusal(call('updateMediaOrder', { title: '', position: 1 }))).toContain('title');
  });

  it('refuses a place that is missing, below 1, or not a whole number', async () => {
    const title = unique('placed');
    expect(await refusal(call('updateMediaOrder', { title }))).toContain('position');
    expect(await refusal(call('updateMediaOrder', { title, position: 0 }))).toContain('position');
    expect(await refusal(call('updateMediaOrder', { title, position: 2.5 }))).toContain('position');
  });
});

contract.describe('updateMediaOrderAdvanced', () => {
  beforeEach(quietWidget);

  it('refuses an id no media item has', async () => {
    expect(await refusal(call('updateMediaOrderAdvanced', { mediaId: NO_ID, position: 1 }))).toContain(NO_ID);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('updateMediaOrderAdvanced', { position: 1 }))).toContain('mediaId');
    expect(await refusal(call('updateMediaOrderAdvanced', { mediaId: '', position: 1 }))).toContain('mediaId');
  });

  it('refuses a place that is missing or below 1', async () => {
    expect(await refusal(call('updateMediaOrderAdvanced', { mediaId: NO_ID }))).toContain('position');
    expect(await refusal(call('updateMediaOrderAdvanced', { mediaId: NO_ID, position: -3 }))).toContain('position');
  });
});
