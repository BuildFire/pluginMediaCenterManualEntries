// media: the media list and its manual order.
// No operation of this contract adds media items: the control panel's media editor also files each one in the app's
// search, which no contract host can do. So only an instance whose owner added media in the control panel has one to
// move; a new test instance has none, and the move is made only when there is one.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const quietWidget = () => spyOn(buildfire.messaging, 'sendMessageToWidget');
// The first media item there is, if any; its title only when no other item shares it.
const firstMedia = async () => {
  const found = await call('searchMedia', {});
  expect(found).toEqual(jasmine.objectContaining({ media: jasmine.any(Array) }));
  const media = found.media[0];
  if (!media) return null;
  const namesakes = await call('searchMedia', { title: media.title });
  return Object.assign({}, media, { titleIsUnique: namesakes.total === 1 });
};
// Only the control panel makes categories, and its run comes first: it makes this one, once, and the app's run finds it.
const forTheApp = 'Pre media category for the app';
let madeCategory;
const categoryForTheApp = () => {
  madeCategory = madeCategory || (contract.host === 'control'
    ? call('createCategory', { name: forTheApp })
      .then((category) => call('createSubcategoryAdvanced', { categoryId: category.id, name: 'Pre media subcategory for the app' }))
    : call('searchCategories', { name: forTheApp })
      .then(({ result }) => result[0] || Promise.reject(new Error(`no category named "${forTheApp}": the control run makes it`))));
  return madeCategory;
};

contract.describe('searchMedia', () => {
  beforeEach(quietWidget);

  it('shows the first page of media', async () => {
    expect(await call('searchMedia', {})).toEqual(jasmine.objectContaining({ media: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
  });

  it('shows media by title, category, subcategory and page', async () => {
    await categoryForTheApp();
    expect(await call('searchMedia', { title: `Pre media (${contract.host})`, categoryName: forTheApp, subcategoryName: 'Pre media subcategory for the app', page: 0 }))
      .toEqual(jasmine.objectContaining({ media: jasmine.any(Array), total: jasmine.any(Number), page: 0, hasMore: jasmine.any(Boolean) }));
  });
});

contract.describe('updateMediaOrder', () => {
  beforeEach(quietWidget);

  it('moves a media item to the top, naming it by its title', async () => {
    const media = await firstMedia();
    if (media && media.titleIsUnique) {
      expect(await call('updateMediaOrder', { title: media.title, position: 1 })).toEqual(jasmine.objectContaining({ id: media.id, rank: 1 }));
    }
  });
});

contract.describe('updateMediaOrderAdvanced', () => {
  beforeEach(quietWidget);

  it('moves a media item to the top, naming it by its id', async () => {
    const media = await firstMedia();
    if (media) expect(await call('updateMediaOrderAdvanced', { mediaId: media.id, position: 1 })).toEqual(jasmine.objectContaining({ id: media.id, rank: 1 }));
  });
});
