// playlistItems: the media items in a person's playlist, which the app keeps for the Playlist feature.
// No operation of this contract adds media items: the control panel's media editor also files each one in the app's
// search, which no contract host can do. So only an instance whose owner added playable media in the control panel and
// turned the playlist on has something to add; a new test instance has none, and the calls are made only when there is.
// The playlist is shared by the whole test app, so whatever a spec adds is removed again after it.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const quietEvents = () => spyOn(buildfire.services.contract.events, 'send').and.callFake((name, data, callback) => callback && callback(null, []));
const playlistOf = async () => (await call('listPlaylistItems', { userId: contract.user._id })).playlistItems;
// A playable media item that is not in the playlist yet, when the playlist is on; its title only when no other item shares it.
const mediaToAdd = async () => {
  const [{ media }, settings, playlist] = await Promise.all([call('searchMedia', {}), call('getSettings', {}), playlistOf()]);
  expect(media).toEqual(jasmine.any(Array));
  if (!settings.content.globalPlaylist) return null;
  const inPlaylist = playlist.map((item) => item.mediaId);
  const found = media.find((item) => (item.audioUrl || item.videoUrl) && !inPlaylist.includes(item.id));
  if (!found) return null;
  const namesakes = await call('searchMedia', { title: found.title });
  return Object.assign({}, found, { titleIsUnique: namesakes.total === 1 });
};
// What a spec added, removed after it whether it passed or not.
let addedIds = [];
const cleanUp = async () => {
  const ids = addedIds;
  addedIds = [];
  if (ids.length) await call('deletePlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: ids.map((mediaId) => ({ mediaId })) });
};

contract.describe('listPlaylistItems', () => {
  it("shows a person's playlist", async () => {
    expect(await call('listPlaylistItems', { userId: contract.user._id })).toEqual(jasmine.objectContaining({ playlistItems: jasmine.any(Array) }));
  });
});

contract.describe('createPlaylistItem', () => {
  beforeEach(quietEvents);
  afterEach(cleanUp);

  it("adds a media item to a person's playlist, naming it by its title", async () => {
    const media = await mediaToAdd();
    if (media && media.titleIsUnique) {
      addedIds.push(media.id);
      expect(await call('createPlaylistItem', { userId: contract.user._id, title: media.title })).toEqual(jasmine.objectContaining({ mediaId: media.id }));
    }
  });
});

contract.describe('createPlaylistItemAdvanced', () => {
  beforeEach(quietEvents);
  afterEach(cleanUp);

  it("adds a media item to a person's playlist, naming it by its id", async () => {
    const media = await mediaToAdd();
    if (media) {
      addedIds.push(media.id);
      expect(await call('createPlaylistItemAdvanced', { userId: contract.user._id, mediaId: media.id })).toEqual(jasmine.objectContaining({ mediaId: media.id }));
    }
  });
});

contract.describe('createPlaylistItemsAdvanced', () => {
  beforeEach(quietEvents);
  afterEach(cleanUp);

  it("adds several media items to a person's playlist at once", async () => {
    const media = await mediaToAdd();
    if (media) {
      addedIds.push(media.id);
      expect(await call('createPlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [{ mediaId: media.id }] }))
        .toEqual(jasmine.objectContaining({ succeeded: 1 }));
    }
  });
});

contract.describe('deletePlaylistItem', () => {
  beforeEach(quietEvents);

  it("removes a media item from a person's playlist, naming it by its title", async () => {
    const media = await mediaToAdd();
    if (media && media.titleIsUnique) {
      await call('createPlaylistItemAdvanced', { userId: contract.user._id, mediaId: media.id });
      expect(await call('deletePlaylistItem', { userId: contract.user._id, title: media.title })).toEqual(jasmine.objectContaining({ mediaId: media.id }));
    }
  });
});

contract.describe('deletePlaylistItemAdvanced', () => {
  beforeEach(quietEvents);

  it("removes a media item from a person's playlist, naming it by its id", async () => {
    const media = await mediaToAdd();
    if (media) {
      await call('createPlaylistItemAdvanced', { userId: contract.user._id, mediaId: media.id });
      expect(await call('deletePlaylistItemAdvanced', { userId: contract.user._id, mediaId: media.id })).toEqual(jasmine.objectContaining({ mediaId: media.id }));
    }
  });
});

contract.describe('deletePlaylistItemsAdvanced', () => {
  beforeEach(quietEvents);

  it("removes several media items from a person's playlist at once", async () => {
    const media = await mediaToAdd();
    if (media) {
      await call('createPlaylistItemAdvanced', { userId: contract.user._id, mediaId: media.id });
      expect(await call('deletePlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [{ mediaId: media.id }] }))
        .toEqual(jasmine.objectContaining({ succeeded: 1 }));
    }
  });
});
