// favorites: media items saved as favorites in the app (widgetBackground only, so every block runs in the widget frame).
// No operation of this contract adds media items (the control panel's media editor also files each one in the app's
// search, which no contract host can do), so saving a favorite is checked only for what it refuses on an instance without media.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
let made = 0;
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}-${++made}`;
const NO_ID = '000000000000000000000000';
// Nothing here answers saving or removing a favorite, nor the event: spies answer them as the app does.
const standIns = () => {
  spyOn(buildfire.bookmarks, 'add').and.callFake((options, callback) => callback && callback(null, options));
  spyOn(buildfire.bookmarks, 'delete').and.callFake((id, callback) => callback && callback(null, { status: 'deleted' }));
  spyOn(buildfire.services.contract.events, 'send').and.callFake((name, data, callback) => callback && callback(null, []));
};
// The app's favorites, as the app would list them: this replaces the captured answer, which holds none.
const favoritesAre = (favorites) => spyOn(buildfire.bookmarks, 'getAll').and.callFake((callback) => callback(null, favorites));
const favorite = (id, title) => ({ id, title, icon: `https://example.com/${id}.png`, payload: { mediaId: id } });
const nothingSaved = () => {
  expect(buildfire.bookmarks.add).not.toHaveBeenCalled();
  expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
};

contract.describe('listFavorites', () => {
  it('shows the favorites the app has, none here', async () => {
    expect(await call('listFavorites', {})).toEqual({ favorites: [] });
  });

  it('shows each favorite with its media item and title', async () => {
    favoritesAre([favorite('media-a', 'Alpha'), favorite('media-b', 'Bravo')]);
    expect(await call('listFavorites', {})).toEqual({ favorites: [
      { mediaId: 'media-a', title: 'Alpha', icon: 'https://example.com/media-a.png' },
      { mediaId: 'media-b', title: 'Bravo', icon: 'https://example.com/media-b.png' }
    ] });
  });
});

contract.describe('createFavorite', () => {
  beforeEach(standIns);

  it('refuses a title no media item has, naming it, and saves nothing', async () => {
    const title = unique('missing');
    expect(await refusal(call('createFavorite', { title }))).toContain(title);
    nothingSaved();
  });

  it('refuses without a title', async () => {
    expect(await refusal(call('createFavorite', {}))).toContain('title');
    expect(await refusal(call('createFavorite', { title: null }))).toContain('title');
    expect(await refusal(call('createFavorite', { title: '' }))).toContain('title');
    nothingSaved();
  });
});

contract.describe('createFavoriteAdvanced', () => {
  beforeEach(standIns);

  it('refuses an id no media item has, and saves nothing', async () => {
    expect(await refusal(call('createFavoriteAdvanced', { mediaId: NO_ID }))).toContain(NO_ID);
    nothingSaved();
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('createFavoriteAdvanced', {}))).toContain('mediaId');
    expect(await refusal(call('createFavoriteAdvanced', { mediaId: '' }))).toContain('mediaId');
    nothingSaved();
  });
});

contract.describe('createFavoritesAdvanced', () => {
  beforeEach(standIns);

  describe('refuses the whole list, and saves none of it', () => {
    it('when an id matches no media item', async () => {
      expect(await refusal(call('createFavoritesAdvanced', { favorites: [{ mediaId: NO_ID }] }))).toContain(NO_ID);
      nothingSaved();
    });

    it('when the same item is listed twice', async () => {
      await expectAsync(call('createFavoritesAdvanced', { favorites: [{ mediaId: NO_ID }, { mediaId: NO_ID }] })).toBeRejected();
      nothingSaved();
    });

    it('when an entry has no id', async () => {
      expect(await refusal(call('createFavoritesAdvanced', { favorites: [{ mediaId: NO_ID }, {}] }))).toContain('mediaId');
      nothingSaved();
    });

    it('when it is empty, left out, or longer than 50', async () => {
      await expectAsync(call('createFavoritesAdvanced', { favorites: [] })).toBeRejected();
      await expectAsync(call('createFavoritesAdvanced', {})).toBeRejected();
      const favorites = Array.from({ length: 51 }, (value, index) => ({ mediaId: `media-${index}` }));
      await expectAsync(call('createFavoritesAdvanced', { favorites })).toBeRejected();
      nothingSaved();
    });
  });
});

contract.describe('deleteFavorite', () => {
  beforeEach(standIns);

  it('removes the favorite with that title, and returns it', async () => {
    const title = unique('favorite');
    favoritesAre([favorite('media-a', title), favorite('media-b', 'Other')]);
    expect(await call('deleteFavorite', { title })).toEqual({ mediaId: 'media-a', title });
    expect(buildfire.bookmarks.delete).toHaveBeenCalledTimes(1);
    expect(buildfire.bookmarks.delete.calls.argsFor(0)[0]).toBe('media-a');
  });

  describe('refuses, and removes nothing', () => {
    it('a title no favorite has', async () => {
      const title = unique('missing');
      favoritesAre([favorite('media-a', 'Other')]);
      expect(await refusal(call('deleteFavorite', { title }))).toContain(title);
      expect(buildfire.bookmarks.delete).not.toHaveBeenCalled();
    });

    it('a title two favorites share, saying how many', async () => {
      const title = unique('shared');
      favoritesAre([favorite('media-a', title), favorite('media-b', title)]);
      expect((await refusal(call('deleteFavorite', { title }))).replace(title, '')).toContain('2');
      expect(buildfire.bookmarks.delete).not.toHaveBeenCalled();
    });

    it('without a title', async () => {
      expect(await refusal(call('deleteFavorite', {}))).toContain('title');
      expect(await refusal(call('deleteFavorite', { title: '' }))).toContain('title');
      expect(buildfire.bookmarks.delete).not.toHaveBeenCalled();
    });
  });
});

contract.describe('deleteFavoriteAdvanced', () => {
  beforeEach(standIns);

  it('removes the favorite of the media item with that id', async () => {
    favoritesAre([favorite('media-a', 'Alpha'), favorite('media-b', 'Bravo')]);
    expect(await call('deleteFavoriteAdvanced', { mediaId: 'media-b' })).toEqual({ mediaId: 'media-b', title: 'Bravo' });
    expect(buildfire.bookmarks.delete.calls.argsFor(0)[0]).toBe('media-b');
  });

  it('refuses an id that is not a favorite, and removes nothing', async () => {
    favoritesAre([favorite('media-a', 'Alpha')]);
    expect(await refusal(call('deleteFavoriteAdvanced', { mediaId: NO_ID }))).toContain(NO_ID);
    expect(buildfire.bookmarks.delete).not.toHaveBeenCalled();
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('deleteFavoriteAdvanced', { mediaId: null }))).toContain('mediaId');
  });
});

contract.describe('deleteFavoritesAdvanced', () => {
  beforeEach(standIns);

  it('removes every favorite, and reports each', async () => {
    favoritesAre([favorite('media-a', 'Alpha'), favorite('media-b', 'Bravo'), favorite('media-c', 'Charlie')]);
    expect(await call('deleteFavoritesAdvanced', { favorites: [{ mediaId: 'media-a' }, { mediaId: 'media-c' }] })).toEqual({
      favorites: [{ index: 0, id: 'media-a', error: null }, { index: 1, id: 'media-c', error: null }],
      succeeded: 2,
      failed: 0
    });
    expect(buildfire.bookmarks.delete.calls.allArgs().map((args) => args[0])).toEqual(['media-a', 'media-c']);
  });

  describe('refuses the whole list, and removes none of it', () => {
    beforeEach(() => favoritesAre([favorite('media-a', 'Alpha')]));

    it('when an id is not a favorite', async () => {
      expect(await refusal(call('deleteFavoritesAdvanced', { favorites: [{ mediaId: 'media-a' }, { mediaId: NO_ID }] }))).toContain(NO_ID);
      expect(buildfire.bookmarks.delete).not.toHaveBeenCalled();
    });

    it('when the same favorite is listed twice', async () => {
      await expectAsync(call('deleteFavoritesAdvanced', { favorites: [{ mediaId: 'media-a' }, { mediaId: 'media-a' }] })).toBeRejected();
      expect(buildfire.bookmarks.delete).not.toHaveBeenCalled();
    });

    it('when it is empty', async () => {
      await expectAsync(call('deleteFavoritesAdvanced', { favorites: [] })).toBeRejected();
      expect(buildfire.bookmarks.delete).not.toHaveBeenCalled();
    });
  });
});
