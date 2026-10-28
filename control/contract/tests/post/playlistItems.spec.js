// playlistItems: the media items in a person's playlist, which the app keeps for the Playlist feature.
// No operation of this contract adds media items (the control panel's media editor also files each one in the app's
// search, which no contract host can do), so adding to a playlist is checked only for what it refuses on an instance
// without media, and nothing here writes the playlist the whole test app shares.
const call = (operation, parameters) => new Promise((resolve, reject) =>
  contract.invoke(operation, parameters, (error, result) => (error ? reject(error) : resolve(result))));
const reason = (error) => String((error && error.message) || error);
// The reason a call was refused; fails the spec when the call succeeds.
const refusal = (promise) => promise.then(() => fail('expected the call to be refused'), reason);
let made = 0;
const unique = (label) => `Post ${label} (${contract.host}) ${Date.now()}-${++made}`;
const NO_ID = '000000000000000000000000';
// Nothing here answers the event: a spy stands in for it.
const quietEvents = () => spyOn(buildfire.services.contract.events, 'send').and.callFake((name, data, callback) => callback && callback(null, []));
const playlistOf = async (userId) => (await call('listPlaylistItems', { userId })).playlistItems;

contract.describe('listPlaylistItems', () => {
  it("shows the person's playlist", async () => {
    const items = await playlistOf(contract.user._id);
    expect(items).toEqual(jasmine.any(Array));
    items.forEach((item) => expect(item).toEqual(jasmine.objectContaining({ mediaId: jasmine.any(String) })));
  });

  it('changes nothing', async () => {
    expect(await playlistOf(contract.user._id)).toEqual(await playlistOf(contract.user._id));
  });

  it('refuses without a person', async () => {
    expect(await refusal(call('listPlaylistItems', {}))).toContain('userId');
    expect(await refusal(call('listPlaylistItems', { userId: null }))).toContain('userId');
    expect(await refusal(call('listPlaylistItems', { userId: '' }))).toContain('userId');
  });

  it('refuses an email address nobody in the app has', async () => {
    await expectAsync(call('listPlaylistItems', { userId: `nobody.${Date.now()}@example.com` })).toBeRejected();
  });
});

contract.describe('createPlaylistItem', () => {
  beforeEach(quietEvents);

  it('refuses a title no media item has, naming it, and adds nothing', async () => {
    const before = await playlistOf(contract.user._id);
    const title = unique('missing');
    expect(await refusal(call('createPlaylistItem', { userId: contract.user._id, title }))).toContain(title);
    expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
    expect(await playlistOf(contract.user._id)).toEqual(before);
  });

  it('refuses without a person or a title', async () => {
    expect(await refusal(call('createPlaylistItem', { title: unique('x') }))).toContain('userId');
    expect(await refusal(call('createPlaylistItem', { userId: contract.user._id }))).toContain('title');
    expect(await refusal(call('createPlaylistItem', { userId: contract.user._id, title: '' }))).toContain('title');
    expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
  });
});

contract.describe('createPlaylistItemAdvanced', () => {
  beforeEach(quietEvents);

  it('refuses an id no media item has, and adds nothing', async () => {
    expect(await refusal(call('createPlaylistItemAdvanced', { userId: contract.user._id, mediaId: NO_ID }))).toContain(NO_ID);
    expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
    expect((await playlistOf(contract.user._id)).map((item) => item.mediaId)).not.toContain(NO_ID);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('createPlaylistItemAdvanced', { userId: contract.user._id }))).toContain('mediaId');
    expect(await refusal(call('createPlaylistItemAdvanced', { userId: contract.user._id, mediaId: null }))).toContain('mediaId');
  });
});

contract.describe('createPlaylistItemsAdvanced', () => {
  beforeEach(quietEvents);

  describe('refuses the whole list, and adds none of it', () => {
    it('when an id matches no media item', async () => {
      expect(await refusal(call('createPlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [{ mediaId: NO_ID }] }))).toContain(NO_ID);
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
    });

    it('when the same item is listed twice', async () => {
      await expectAsync(call('createPlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [{ mediaId: NO_ID }, { mediaId: NO_ID }] })).toBeRejected();
    });

    it('when an entry has no id', async () => {
      expect(await refusal(call('createPlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [{}] }))).toContain('mediaId');
    });

    it('when it is empty or longer than 50', async () => {
      await expectAsync(call('createPlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [] })).toBeRejected();
      const playlistItems = Array.from({ length: 51 }, (value, index) => ({ mediaId: `media-${index}` }));
      await expectAsync(call('createPlaylistItemsAdvanced', { userId: contract.user._id, playlistItems })).toBeRejected();
      expect(buildfire.services.contract.events.send).not.toHaveBeenCalled();
    });

    it('without a person', async () => {
      expect(await refusal(call('createPlaylistItemsAdvanced', { playlistItems: [{ mediaId: NO_ID }] }))).toContain('userId');
    });
  });
});

contract.describe('deletePlaylistItem', () => {
  it('refuses a title that is not in the playlist, naming it', async () => {
    const title = unique('missing');
    expect(await refusal(call('deletePlaylistItem', { userId: contract.user._id, title }))).toContain(title);
  });

  it('refuses without a person or a title', async () => {
    expect(await refusal(call('deletePlaylistItem', { title: unique('x') }))).toContain('userId');
    expect(await refusal(call('deletePlaylistItem', { userId: contract.user._id, title: null }))).toContain('title');
  });
});

contract.describe('deletePlaylistItemAdvanced', () => {
  it('refuses an id that is not in the playlist', async () => {
    expect(await refusal(call('deletePlaylistItemAdvanced', { userId: contract.user._id, mediaId: NO_ID }))).toContain(NO_ID);
  });

  it('refuses without an id', async () => {
    expect(await refusal(call('deletePlaylistItemAdvanced', { userId: contract.user._id, mediaId: '' }))).toContain('mediaId');
  });
});

contract.describe('deletePlaylistItemsAdvanced', () => {
  describe('refuses the whole list, and removes none of it', () => {
    it('when an id is not in the playlist', async () => {
      const before = await playlistOf(contract.user._id);
      expect(await refusal(call('deletePlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [{ mediaId: NO_ID }] }))).toContain(NO_ID);
      expect(await playlistOf(contract.user._id)).toEqual(before);
    });

    it('when the same item is listed twice', async () => {
      await expectAsync(call('deletePlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [{ mediaId: NO_ID }, { mediaId: NO_ID }] })).toBeRejected();
    });

    it('when it is empty', async () => {
      await expectAsync(call('deletePlaylistItemsAdvanced', { userId: contract.user._id, playlistItems: [] })).toBeRejected();
    });

    it('without a person', async () => {
      expect(await refusal(call('deletePlaylistItemsAdvanced', { playlistItems: [{ mediaId: NO_ID }] }))).toContain('userId');
    });
  });
});
