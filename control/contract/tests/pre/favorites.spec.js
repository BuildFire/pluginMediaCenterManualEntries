// favorites: media items saved as favorites in the app (widgetBackground only).
// No operation of this contract adds media items: the control panel's media editor also files each one in the app's
// search, which no contract host can do. So only an instance whose owner added media in the control panel has one to
// save; a new test instance has none, and the favorite is saved only when there is one.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
// Nothing here answers saving or removing a favorite, nor the event: spies answer them as the app does.
const standIns = () => {
  spyOn(buildfire.bookmarks, 'add').and.callFake((options, callback) => callback && callback(null, options));
  spyOn(buildfire.bookmarks, 'delete').and.callFake((id, callback) => callback && callback(null, { status: 'deleted' }));
  spyOn(buildfire.services.contract.events, 'send').and.callFake((name, data, callback) => callback && callback(null, []));
};
// The app's favorites, as the app would list them: this replaces the captured answer, which holds none.
const favoritesAre = (favorites) => spyOn(buildfire.bookmarks, 'getAll').and.callFake((callback) => callback(null, favorites));
const favorite = (id, title) => ({ id, title, icon: `https://example.com/${id}.png`, payload: { mediaId: id } });
// The first media item there is that is not a favorite yet, if any; its title only when no other item shares it.
const mediaToSave = async () => {
  const found = await call('searchMedia', {});
  expect(found).toEqual(jasmine.objectContaining({ media: jasmine.any(Array) }));
  const media = found.media[0];
  if (!media) return null;
  const namesakes = await call('searchMedia', { title: media.title });
  return Object.assign({}, media, { titleIsUnique: namesakes.total === 1 });
};

contract.describe('listFavorites', () => {
  it('shows the favorites', async () => {
    expect(await call('listFavorites', {})).toEqual(jasmine.objectContaining({ favorites: jasmine.any(Array) }));
  });
});

contract.describe('createFavorite', () => {
  beforeEach(standIns);

  it('saves a media item as a favorite, naming it by its title', async () => {
    const media = await mediaToSave();
    if (media && media.titleIsUnique) {
      expect(await call('createFavorite', { title: media.title })).toEqual(jasmine.objectContaining({ mediaId: media.id }));
    }
  });
});

contract.describe('createFavoriteAdvanced', () => {
  beforeEach(standIns);

  it('saves a media item as a favorite, naming it by its id', async () => {
    const media = await mediaToSave();
    if (media) expect(await call('createFavoriteAdvanced', { mediaId: media.id })).toEqual(jasmine.objectContaining({ mediaId: media.id }));
  });
});

contract.describe('createFavoritesAdvanced', () => {
  beforeEach(standIns);

  it('saves several media items as favorites at once', async () => {
    const media = await mediaToSave();
    if (media) expect(await call('createFavoritesAdvanced', { favorites: [{ mediaId: media.id }] })).toEqual(jasmine.objectContaining({ succeeded: jasmine.any(Number) }));
  });
});

contract.describe('deleteFavorite', () => {
  beforeEach(standIns);

  it('removes a favorite, naming it by its title', async () => {
    favoritesAre([favorite('pre-media-one', `Pre favorite (${contract.host})`)]);
    expect(await call('deleteFavorite', { title: `Pre favorite (${contract.host})` })).toEqual(jasmine.objectContaining({ mediaId: 'pre-media-one' }));
  });
});

contract.describe('deleteFavoriteAdvanced', () => {
  beforeEach(standIns);

  it('removes a favorite, naming it by its id', async () => {
    favoritesAre([favorite('pre-media-two', `Pre favorite by id (${contract.host})`)]);
    expect(await call('deleteFavoriteAdvanced', { mediaId: 'pre-media-two' })).toEqual(jasmine.objectContaining({ mediaId: 'pre-media-two' }));
  });
});

contract.describe('deleteFavoritesAdvanced', () => {
  beforeEach(standIns);

  it('removes several favorites at once', async () => {
    favoritesAre([favorite('pre-media-three', 'Pre favorite three'), favorite('pre-media-four', 'Pre favorite four')]);
    expect(await call('deleteFavoritesAdvanced', { favorites: [{ mediaId: 'pre-media-three' }, { mediaId: 'pre-media-four' }] }))
      .toEqual(jasmine.objectContaining({ succeeded: 2, failed: 0 }));
  });
});
