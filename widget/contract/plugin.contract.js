/* eslint-disable no-undef, strict */
/**
 * Media Center contract — runtime implementation.
 *
 * This file only implements the operations declared with "type": "function" in plugin.contract.json. Operations typed publicData / datastore / userData / appData / firebase are declarative: their platform call is built on the fly from context.query, so they intentionally have no counterpart here (searchCategories is one).
 *
 * Each function operation is dispatched by its context.functionName, receives (options, callback), may nest any number of buildfire.* calls, and may run its own logic between them. Each one declares a context.hosts in plugin.contract.json, which is what the `hosts:` tag on the JSDoc below refers to. An operation lists every place it can run: at most one widget host, at most one control host, and headlessSdk when it is server-safe (generic always stands alone):
 *
 *   generic            no buildfire at all — pure logic, evaluated anywhere.
 *   headlessSdk        uses buildfire and is server-safe; runs on the server.
 *   widgetForeground   runs in the iframe under the app; never on the server.
 *   widgetBackground   Foreground when someone has to be watching it run — it
 *                      surfaces UI, or reaches real people so unattended is
 *                      itself a problem; Background otherwise.
 *   controlForeground  runs in the iframe under the control panel; never on
 *   controlBackground  the server. Foreground/Background by the same rule.
 *
 * headlessSdk is left out when the operation needs frame state (device, localStorage, bookmarks, the actual signed-in session, UI) or handles user-sensitive data / critical behavior that must not be reachable remotely.
 *
 * Only operations whose hosts include generic or headlessSdk are exposed to the MCP.
 *
 * `buildfire` is resolved as a global: in the widget/control hosts it comes from the injected SDK, and on the server the headless SDK provides it. `widgetContract`, `controlContract` and `frameId` are assigned as implicit globals for the same reason — the consumer reaches them without importing this file. The widget frame (widget/contract.html) and the server dispatch to widgetContract; the control panel's frame (control/contract.html) loads this same file and dispatches to controlContract.
 *
 * Every function is Node-style: callback(error, result), invoked exactly once, never with both error and result populated. Invalid input is reported through the callback rather than thrown synchronously.
 *
 * Every option a function reads here must be declared in that operation's `parameters` block, or a caller cannot pass it: the MCP server refuses any param the contract does not declare.
 *
 * Adding, editing and deleting media items is not in this contract: the control panel keeps every saved item in the app's search index through buildfire.services.searchEngine (and deletes an item's comments through the comments component), and no contract host loads either, so none of those actions can run completely here.
 */

// Must match the collection names the plugin uses (control/content/enums.js, widget/enums.js).
const MEDIA_TAG = 'MediaContent';
const SETTINGS_TAG = 'MediaCenter';
const CATEGORIES_TAG = 'CategoryContent';
const VIEWS_TAG = 'MediaCount';
const PLAYLIST_LIMIT_TAG = 'GlobalPlayListSettings';
// The platform returns at most 50 records a search; another page is told by recordCount / totalRecord.
const PAGE_SIZE = 50;
const BATCH_LIMIT = 50;

// Option sets, as control/content/services.js (Orders, CategoryOrders, SubcategoryOrders), control/settings and control/design define them.
const MEDIA_SORTS = ['Manually', 'Media Title A-Z', 'Media Title Z-A', 'Media Date Asc', 'Media Date Desc', 'Newest', 'Oldest'];
const CATEGORY_SORTS = ['Manually', 'Category Title A-Z', 'Category Title Z-A', 'Newest', 'Oldest'];
const SUBCATEGORY_SORTS = ['Manually', 'Subcategory Title A-Z', 'Subcategory Title Z-A', 'Subcategory Date Asc', 'Subcategory Date Desc', 'Newest', 'Oldest'];
const AUTOPLAY_DELAYS = [{ label: 'Off', value: 0 }, { label: '1s', value: 1 }, { label: '2s', value: 2 }, { label: '3s', value: 3 }, { label: '5s', value: 5 }];
const LIST_LAYOUTS = ['list-1', 'list-2', 'list-3', 'list-4'];
const ITEM_LAYOUTS = ['item-1', 'item-2'];
const SETTINGS_BOOLEANS = ['allowShare', 'allowFavorites', 'allowAddingNotes', 'allowSource', 'allowOfflineDownload', 'enableFiltering', 'showViewCount',
  'indicatePlayedItems', 'globalPlaylist', 'showGlobalAddAllToPlaylistButton', 'showGlobalPlaylistNavButton', 'autoPlay', 'shuffleAudioListItems',
  'forceAutoPlay', 'startWithAutoJumpByDefault'];

const isText = (value) => typeof value === 'string' && value.length > 0;
const orNull = (value) => (value === undefined ? null : value);

const requireCallback = (callback) => {
  if (typeof callback !== 'function') {
    // Nothing to report through; fail loudly only in this one unrecoverable case.
    throw new TypeError('callback must be a function');
  }
};

/**
 * Assert that every named option is a non-empty string.
 * @returns {boolean} true when valid; false when the callback has already fired.
 */
const requireStringParams = (options, names, callback) => {
  requireCallback(callback);
  if (options === null || typeof options !== 'object') {
    callback(new Error('options must be an object'), undefined);
    return false;
  }
  const missing = names.find((name) => !isText(options[name]));
  if (missing) {
    callback(new Error(`Missing required parameter: ${missing}`), undefined);
    return false;
  }
  return true;
};

/**
 * An image param, checked against its declared count. Image params are always arrays, even for a single image, so a bare string is refused rather than wrapped: it means the caller misread the contract.
 * @returns {{ images?: string[], error?: string }}
 */
const readImageList = (value, { name, minValue, maxValue }) => {
  const range = maxValue === undefined ? `at least ${minValue}`
    : (minValue === maxValue ? `exactly ${minValue}` : (minValue === 0 ? `up to ${maxValue}` : `${minValue} to ${maxValue}`));
  if (!Array.isArray(value)) return { error: `${name} must be a list of image URLs (${range}), even for one image` };
  if (value.length < minValue || (maxValue !== undefined && value.length > maxValue)) {
    return { error: `${name} must hold ${range} image${maxValue === 1 ? '' : 's'}; got ${value.length}` };
  }
  if (value.some((url) => !isText(url))) return { error: `${name} must contain only image URLs` };
  return { images: value };
};

/** A position in a manual order: a whole number from 1. */
const readPosition = (value) => (Number.isInteger(value) && value >= 1 ? null : 'position must be a whole number from 1');

/** Mirrors the nanoid factory in control/content/services.js, which makes subcategory ids. */
const nanoid = (size = 21) => crypto.getRandomValues(new Uint8Array(size)).reduce((id, byte) => {
  const value = byte & 63;
  if (value < 36) return id + value.toString(36);
  if (value < 62) return id + (value - 26).toString(36).toUpperCase();
  return id + (value > 62 ? '-' : '_');
}, '');

/** The refresh messages the control panel sends the widget. The server has no messaging, and nothing there is open to refresh. */
const notifyWidget = (message) => {
  if (buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') {
    buildfire.messaging.sendMessageToWidget(message);
  }
};

/** Fires a declared event when the frame can send one; the server has no listeners to reach. */
const sendEvent = (name, data) => {
  const events = buildfire.services && buildfire.services.contract && buildfire.services.contract.events;
  if (events && typeof events.send === 'function') events.send(name, data);
};

/**
 * Who is signed in, recorded as the category editor the way the control panel records ContentCategory.user ('' when nobody is, as on the server).
 * @param {function(*)} done - (user object or '')
 */
const currentUserOrEmpty = (done) => {
  if (!buildfire.auth || typeof buildfire.auth.getCurrentUser !== 'function') return done('');
  buildfire.auth.getCurrentUser((err, user) => done(!err && user ? user : ''));
};

/**
 * The one record of a collection whose `field` is exactly `value`. A value matching several records is refused rather than resolved to one of them: on a write, picking would mean acting on a record the caller did not mean.
 * @param {function(Error=, object=)} callback - (error, { id, data })
 */
const findOneBy = (tag, field, value, label, plural, callback) => {
  buildfire.datastore.search({ filter: { [`$json.${field}`]: value }, page: 0, pageSize: PAGE_SIZE, recordCount: true }, tag, (err, response) => {
    if (err) return callback(err, undefined);
    const found = ((response && response.result) || []).filter(Boolean);
    const total = (response && response.totalRecord) || found.length;
    if (!found.length) return callback(new Error(`No ${label} named "${value}"`), undefined);
    if (total > 1) return callback(new Error(`${total} ${plural} are named "${value}"`), undefined);
    callback(null, found[0]);
  });
};

/**
 * The record an advanced operation names by id, checked to exist. The stores answer an empty record for an unknown id, not an error.
 * @param {function(Error=, object=)} callback - (error, { id, data })
 */
const requireById = (tag, id, label, callback) => {
  buildfire.datastore.getById(id, tag, (err, record) => {
    if (err) return callback(err, undefined);
    if (!record || !record.data || !Object.keys(record.data).length) return callback(new Error(`No ${label} with id "${id}"`), undefined);
    callback(null, { id: record.id || id, data: record.data });
  });
};

/**
 * Every record of a collection in one sort order, read 50 at a time until totalRecord is reached.
 * @param {function(Error=, Array=)} callback - (error, records)
 */
const searchAll = (tag, sort, callback) => {
  const records = [];
  const readPage = (page) => {
    buildfire.datastore.search({ filter: {}, sort, page, pageSize: PAGE_SIZE, recordCount: true }, tag, (err, response) => {
      if (err) return callback(err, undefined);
      const result = (response && response.result) || [];
      records.push(...result);
      const total = (response && response.totalRecord) || 0;
      if (result.length === PAGE_SIZE && records.length < total) return readPage(page + 1);
      callback(null, records);
    });
  };
  readPage(0);
};

/**
 * Moves one record to a 1-based place in the manual order and renumbers every record 1..n, as the control panel's drag-to-reorder does (mediaHomeController / categoryHomeController onOrderChange). Only the records whose rank changes are written. The control panel writes back the list row it rendered; only the rank is written here, so the placeholder image the list shows is never stored.
 * @param {function(Error=, object=)} callback - (error, { id, rank })
 */
const moveInOrder = (tag, id, position, label, callback) => {
  searchAll(tag, { rank: 1 }, (err, records) => {
    if (err) return callback(err, undefined);
    const from = records.findIndex((record) => record.id === id);
    if (from < 0) return callback(new Error(`No ${label} with id "${id}"`), undefined);
    if (position > records.length) return callback(new Error(`position must be between 1 and ${records.length}`), undefined);

    const [moved] = records.splice(from, 1);
    records.splice(position - 1, 0, moved);
    const changed = records.map((record, index) => ({ id: record.id, rank: index + 1, was: record.data && record.data.rank }))
      .filter((entry) => entry.rank !== entry.was);

    const writeNext = (index) => {
      if (index === changed.length) return callback(null, { id, rank: position });
      buildfire.datastore.update(changed[index].id, { $set: { rank: changed[index].rank } }, tag, (updateErr) => {
        if (updateErr) return callback(updateErr, undefined);
        writeNext(index + 1);
      });
    };
    writeNext(0);
  });
};

/**
 * Runs a batch: every entry is validated, duplicates refused and every target resolved before anything is written; then each entry goes through the single operation's own implementation, one after another, and every outcome is reported. A failed write is a result entry, not a call error.
 * @param {{ check: function(object): string, key?: function(object): string, resolve: function(object, function(Error=, *=)), apply: function(*, object, function(Error=, string=)) }} steps
 */
const runBatch = (entries, listName, callback, steps) => {
  requireCallback(callback);
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > BATCH_LIMIT) {
    return callback(new Error(`${listName} must be a list of 1 to ${BATCH_LIMIT} entries`), undefined);
  }
  const invalid = entries.map((entry, index) => {
    if (entry === null || typeof entry !== 'object') return `entry ${index}: must be an object`;
    const error = steps.check(entry);
    return error ? `entry ${index}: ${error}` : null;
  }).filter(Boolean);
  if (invalid.length) return callback(new Error(`Invalid ${listName}: ${invalid.join('; ')}`), undefined);
  if (steps.key && new Set(entries.map(steps.key)).size !== entries.length) {
    return callback(new Error(`The same entry is listed more than once in ${listName}`), undefined);
  }

  const targets = [];
  const unknown = [];
  const resolveNext = (index) => {
    if (index === entries.length) {
      if (unknown.length) return callback(new Error(`Not found: ${unknown.join('; ')}`), undefined);
      return applyNext(0, []);
    }
    steps.resolve(entries[index], (err, target) => {
      if (err) unknown.push(`entry ${index}: ${err.message || err}`);
      else targets[index] = target;
      resolveNext(index + 1);
    });
  };
  const applyNext = (index, results) => {
    if (index === entries.length) {
      const failed = results.filter((entry) => entry.error).length;
      return callback(null, { [listName]: results, succeeded: results.length - failed, failed });
    }
    steps.apply(targets[index], entries[index], (err, id) => {
      results.push({ index, id: err ? null : id, error: err ? String(err.message || err) : null });
      applyNext(index + 1, results);
    });
  };
  resolveNext(0);
};

// ---------------------------------------------------------------- settings

/** What a new instance holds before anything is saved: ContentHome's _infoData plus the defaults the settings tab fills in on load. */
const defaultSettings = () => ({
  content: {
    images: [], descriptionHTML: '', description: '', sortBy: 'Newest', sortCategoriesBy: 'Newest', rankOfLastItem: 0, rankofLastCategory: 0,
    allowShare: true, allowFavorites: true, allowAddingNotes: true, allowSource: true, allowOfflineDownload: false, enableFiltering: false,
    forceAutoPlay: false, autoPlay: false, shuffleAudioListItems: false, autoPlayDelay: { label: 'Off', value: 0 }, globalPlaylist: false,
    showGlobalPlaylistNavButton: false, showGlobalAddAllToPlaylistButton: false, globalPlaylistPlugin: false, showViewCount: false,
    indicatePlayedItems: false, startWithAutoJumpByDefault: false, comments: { value: 'none', tags: [] }, reactions: { value: 'none', tags: [] },
    dateIndexed: true, dateCreatedIndexed: true
  },
  design: { listLayout: 'list-1', itemLayout: 'item-1', backgroundImage: '', skipMediaPage: false },
  indexingUpdateDone: true,
  indexingUpdateDoneV2: true
});

/**
 * The settings document as the control panel loads it: the stored one with every missing setting at its default, or the defaults when nothing is saved yet.
 * @param {function(Error=, object=)} callback - (error, settings document)
 */
const readSettings = (callback) => {
  buildfire.datastore.get(SETTINGS_TAG, (err, record) => {
    // The control panel treats a missing settings record (NOTFOUND) as "nothing saved yet".
    if (err && err.code !== 'NOTFOUND') return callback(err, undefined);
    const defaults = defaultSettings();
    const stored = record && record.data && Object.keys(record.data).length ? record.data : null;
    if (!stored) return callback(null, defaults);
    const doc = Object.assign({}, stored);
    doc.content = Object.assign({}, defaults.content, stored.content || {});
    doc.design = Object.assign({}, defaults.design, stored.design || {});
    callback(null, doc);
  });
};

const publicSettings = (doc) => ({ content: doc.content, design: doc.design });

/** The settings tab's formatSettingsAndSave rules, applied before every save. */
const normalizeSettings = (doc) => {
  const content = doc.content;
  if (!content.autoPlay) content.shuffleAudioListItems = false;
  if (content.forceAutoPlay) {
    content.autoPlay = false;
    content.shuffleAudioListItems = false;
    content.globalPlaylist = false;
  } else {
    content.startWithAutoJumpByDefault = false;
  }
};

/**
 * The changes an updateSettings call asks for, each as a function applying it to the document. Left out skips a setting; null or '' empties the description, null or [] the carousel and background image (stored as the forms store them: '' and []).
 * @returns {{ changes?: Array<function(object)>, sortChanged?: boolean, error?: string }}
 */
const collectSettingsChanges = (options) => {
  const changes = [];
  let sortChanged = false;
  if (options.description !== undefined) {
    if (options.description !== null && typeof options.description !== 'string') return { error: 'description must be formatted text, null or an empty string' };
    // The description editor stores an emptied description as ''.
    changes.push((doc) => { doc.content.descriptionHTML = options.description || ''; });
  }
  if (options.carouselImages !== undefined) {
    const images = options.carouselImages === null ? [] : options.carouselImages;
    if (!Array.isArray(images)) return { error: 'carouselImages must be a list of carousel images' };
    const bad = images.findIndex((image) => image === null || typeof image !== 'object' || !isText(image.action) || !isText(image.iconUrl));
    if (bad >= 0) return { error: `carouselImages entry ${bad} must be an action item with an action and an iconUrl image` };
    changes.push((doc) => { doc.content.images = images; });
  }
  if (options.mediaSortOrder !== undefined) {
    if (!MEDIA_SORTS.includes(options.mediaSortOrder)) return { error: `mediaSortOrder must be one of: ${MEDIA_SORTS.join(', ')}` };
    sortChanged = true;
    changes.push((doc) => { doc.content.sortBy = options.mediaSortOrder; doc.content.sortByValue = options.mediaSortOrder; });
  }
  if (options.categorySortOrder !== undefined) {
    if (!CATEGORY_SORTS.includes(options.categorySortOrder)) return { error: `categorySortOrder must be one of: ${CATEGORY_SORTS.join(', ')}` };
    changes.push((doc) => { doc.content.sortCategoriesBy = options.categorySortOrder; });
  }
  for (const name of SETTINGS_BOOLEANS) {
    if (options[name] === undefined) continue;
    if (typeof options[name] !== 'boolean') return { error: `${name} must be true or false` };
    changes.push((doc) => { doc.content[name] = options[name]; });
  }
  if (options.autoPlayDelay !== undefined) {
    const delay = AUTOPLAY_DELAYS.find((option) => option.value === options.autoPlayDelay);
    if (!delay) return { error: `autoPlayDelay must be one of: ${AUTOPLAY_DELAYS.map((option) => option.value).join(', ')}` };
    changes.push((doc) => { doc.content.autoPlayDelay = Object.assign({}, delay); });
  }
  if (options.skipMediaPage !== undefined) {
    if (typeof options.skipMediaPage !== 'boolean') return { error: 'skipMediaPage must be true or false' };
    changes.push((doc) => { doc.design.skipMediaPage = options.skipMediaPage; });
  }
  if (options.listLayout !== undefined) {
    if (!LIST_LAYOUTS.includes(options.listLayout)) return { error: `listLayout must be one of: ${LIST_LAYOUTS.join(', ')}` };
    changes.push((doc) => { doc.design.listLayout = options.listLayout; });
  }
  if (options.itemLayout !== undefined) {
    if (!ITEM_LAYOUTS.includes(options.itemLayout)) return { error: `itemLayout must be one of: ${ITEM_LAYOUTS.join(', ')}` };
    changes.push((doc) => { doc.design.itemLayout = options.itemLayout; });
  }
  if (options.backgroundImage !== undefined) {
    let url = '';
    if (options.backgroundImage !== null) {
      const { images, error } = readImageList(options.backgroundImage, { name: 'backgroundImage', minValue: 0, maxValue: 1 });
      if (error) return { error };
      url = images.length ? images[0] : '';
    }
    // The design tab stores a removed background as ''.
    changes.push((doc) => { doc.design.backgroundImage = url; });
  }
  if (!changes.length) return { error: 'Pass at least one setting to change' };
  return { changes, sortChanged };
};

// ---------------------------------------------------------------- media

/** The sort the app's media list uses, mirroring updateGetOptions in widget/controllers/widget.home.controller.js. */
const mediaSort = (content) => {
  const name = content.sortBy || 'Manually';
  let sort;
  if (name === 'Media Title A-Z' || name === 'Most') sort = content.updatedRecords && name !== 'Most' ? { titleIndex: 1 } : { title: 1 };
  else if (name === 'Media Title Z-A' || name === 'Least') sort = content.updatedRecords && name !== 'Least' ? { titleIndex: -1 } : { title: -1 };
  else if (name === 'Media Date Asc' || name === 'Media Date Desc') sort = { [content.dateIndexed ? 'mediaDateIndex' : 'mediaDate']: name === 'Media Date Asc' ? 1 : -1 };
  else if (name === 'Newest' || name === 'Oldest') sort = { dateCreated: name === 'Newest' ? -1 : 1 };
  else sort = { rank: 1 };
  if (!sort.rank) sort.rank = 1;
  return sort;
};

const mediaView = (record, views) => {
  const data = record.data || {};
  return {
    id: record.id, title: orNull(data.title), summary: orNull(data.summary), bodyHTML: orNull(data.bodyHTML), topImage: orNull(data.topImage),
    image: orNull(data.image), backgroundImage: orNull(data.backgroundImage), audioTitle: orNull(data.audioTitle), artists: orNull(data.artists),
    audioUrl: orNull(data.audioUrl), videoUrl: orNull(data.videoUrl), srcUrl: orNull(data.srcUrl), mediaDate: orNull(data.mediaDate),
    dateCreated: orNull(data.dateCreated), categories: data.categories || [], subcategories: data.subcategories || [], rank: orNull(data.rank),
    deepLinkUrl: orNull(data.deepLinkUrl), views
  };
};

/**
 * How many times each media item was played, as the widget counts it when view counts are shown: the active view records keyed "<id>-true".
 * @param {function(Array<number>)} done
 */
const countViews = (records, done) => {
  const counts = [];
  let pending = records.length;
  if (!pending) return done(counts);
  records.forEach((record, index) => {
    buildfire.publicData.search({ filter: { '_buildfire.index.string1': `${record.id}-true` }, skip: 0, limit: 1, recordCount: true }, VIEWS_TAG, (err, response) => {
      counts[index] = !err && response && response.totalRecord ? response.totalRecord : 0;
      if (--pending === 0) done(counts);
    });
  });
};

const resolveMediaByTitle = (title, callback) => findOneBy(MEDIA_TAG, 'title', title, 'media item', 'media items', callback);
const requireMedia = (mediaId, callback) => requireById(MEDIA_TAG, mediaId, 'media item', callback);

/** Moves a media item and tells an open widget to reload its list, as the content tab does after a reorder. */
const applyMediaMove = (record, position, callback) => {
  moveInOrder(MEDIA_TAG, record.id, position, 'media item', (err, result) => {
    if (err) return callback(err, undefined);
    notifyWidget({ name: 'ROUTE_CHANGE', message: { path: 'HOME' } });
    callback(null, result);
  });
};

// ---------------------------------------------------------------- categories and subcategories

const resolveCategory = (name, callback) => findOneBy(CATEGORIES_TAG, 'name', name, 'category', 'categories', callback);
const requireCategory = (categoryId, callback) => requireById(CATEGORIES_TAG, categoryId, 'category', callback);

/** Mirrors ContentCategory.sort in control/content/controllers/addEditCategoryController.js; the date orders are stored but reorder nothing there either. */
const sortSubcategories = (subcategories, sortBy) => {
  if (sortBy === 'Subcategory Title A-Z') subcategories.sort((a, b) => a.name.localeCompare(b.name));
  if (sortBy === 'Subcategory Title Z-A') subcategories.sort((a, b) => b.name.localeCompare(a.name));
  if (sortBy === 'Manually') subcategories.sort((a, b) => a.rank - b.rank);
  if (sortBy === 'Newest') subcategories.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
  if (sortBy === 'Oldest') subcategories.sort((a, b) => new Date(a.createdOn) - new Date(b.createdOn));
};

/** A new category's fields, checked the way the category form checks them. @returns {string} the problem, or '' */
const checkNewCategory = (entry) => {
  if (!isText(entry.name) || !entry.name.trim()) return 'Missing required parameter: name';
  if (entry.icon !== undefined) {
    const { error } = readImageList(entry.icon, { name: 'icon', minValue: 0, maxValue: 1 });
    if (error) return error;
  }
  return '';
};

/**
 * Adds a category exactly as the category form does: Categories.addCategory inserts new Category(data) (widget/js/data/Category.js) with the trimmed name, its lower-cased titleIndex, rank 0, subcategories ordered Newest, and the signed-in editor as createdBy; then the widget is told to reload its categories.
 */
const insertCategory = (entry, callback) => {
  currentUserOrEmpty((user) => {
    const name = entry.name.trim();
    const now = new Date();
    const data = {
      icon: entry.icon && entry.icon.length ? entry.icon[0] : '', name, subcategories: [], sortBy: 'Newest', rank: 0,
      createdOn: now, createdBy: user, lastUpdatedOn: now, lastUpdatedBy: '', deletedOn: '', deletedBy: '', titleIndex: name.toLowerCase()
    };
    buildfire.datastore.insert(data, CATEGORIES_TAG, false, (err, record) => {
      if (err) return callback(err, undefined);
      notifyWidget({ name: 'CATEGORIES_CHANGE', message: {} });
      callback(null, { id: record.id, data: record.data });
    });
  });
};

/**
 * The changes a category update asks for. Left out skips a field; the name is required by the form, so it can be changed but never cleared; null or [] removes the icon, stored as '' as the form stores it.
 * @returns {{ changes?: object, error?: string }}
 */
const collectCategoryChanges = (options) => {
  const changes = {};
  if (options.newName !== undefined) {
    if (!isText(options.newName) || !options.newName.trim()) return { error: 'newName cannot be removed; pass a non-empty name' };
    changes.name = options.newName.trim();
  }
  if (options.newIcon !== undefined) {
    if (options.newIcon === null) {
      changes.icon = '';
    } else {
      const { images, error } = readImageList(options.newIcon, { name: 'newIcon', minValue: 0, maxValue: 1 });
      if (error) return { error };
      changes.icon = images.length ? images[0] : '';
    }
  }
  if (options.newSubcategorySortBy !== undefined) {
    if (!SUBCATEGORY_SORTS.includes(options.newSubcategorySortBy)) return { error: `newSubcategorySortBy must be one of: ${SUBCATEGORY_SORTS.join(', ')}` };
    changes.sortBy = options.newSubcategorySortBy;
  }
  if (!Object.keys(changes).length) return { error: 'Pass at least one of newName, newIcon or newSubcategorySortBy' };
  return { changes };
};

/**
 * Saves a category the way the category form's Save does (ContentCategory.updateItem): the whole record with its trimmed name and titleIndex, id, lastUpdatedOn and the signed-in editor as lastUpdatedBy, then tells the widget to reload its categories. Shared by every category and subcategory edit, so they behave identically.
 * @param {function(object)} change - edits a copy of the category's data
 */
const saveCategory = (record, change, callback) => {
  currentUserOrEmpty((user) => {
    const data = Object.assign({}, record.data, { subcategories: (record.data.subcategories || []).map((sub) => Object.assign({}, sub)) });
    const problem = change(data);
    if (problem) return callback(new Error(problem), undefined);
    data.name = String(data.name || '').trim();
    data.titleIndex = data.name.toLowerCase();
    data.id = record.id;
    data.lastUpdatedOn = new Date();
    data.lastUpdatedBy = user;
    buildfire.datastore.update(record.id, data, CATEGORIES_TAG, (err, saved) => {
      if (err) return callback(err, undefined);
      notifyWidget({ name: 'CATEGORIES_CHANGE', message: {} });
      callback(null, { id: record.id, data: (saved && saved.data) || data });
    });
  });
};

const applyCategoryUpdate = (record, options, callback) => {
  const { changes, error } = collectCategoryChanges(options);
  if (error) return callback(new Error(error), undefined);
  saveCategory(record, (data) => {
    if (changes.name !== undefined) data.name = changes.name;
    if (changes.icon !== undefined) data.icon = changes.icon;
    if (changes.sortBy !== undefined) {
      // The subcategory sort control stores the order and reorders the list right away (toggleSortOrder).
      data.sortBy = changes.sortBy;
      data.sortByValue = changes.sortBy;
      sortSubcategories(data.subcategories, changes.sortBy);
    }
    return '';
  }, callback);
};

const deleteCategoryRecord = (record, callback) => {
  // The category list deletes only the category record; media keep its id until they are next edited.
  buildfire.datastore.delete(record.id, CATEGORIES_TAG, (err) => {
    if (err) return callback(err, undefined);
    callback(null, { id: record.id });
  });
};

/** The one subcategory of a category with exactly this name; several sharing it are refused. @returns {{ sub?: object, error?: string }} */
const findSubcategoryByName = (record, name) => {
  const found = (record.data.subcategories || []).filter((sub) => sub && sub.name === name);
  if (!found.length) return { error: `No subcategory named "${name}" in "${record.data.name}"` };
  if (found.length > 1) return { error: `${found.length} subcategories are named "${name}" in "${record.data.name}"` };
  return { sub: found[0] };
};

const findSubcategoryById = (record, subcategoryId) => {
  const sub = (record.data.subcategories || []).find((entry) => entry && entry.id === subcategoryId);
  return sub ? { sub } : { error: `No subcategory with id "${subcategoryId}" in "${record.data.name}"` };
};

const subcategoryView = (categoryId, sub) => ({ categoryId, id: sub.id, name: sub.name, rank: orNull(sub.rank) });

/** Adds a subcategory at the end of the list, shaped as the subcategory dialog adds it: a nanoid id, rank = list length + 1, and the editor as createdBy. */
const addSubcategory = (record, name, callback) => {
  if (!isText(name)) return callback(new Error('Missing required parameter: name'), undefined);
  currentUserOrEmpty((user) => {
    let added;
    saveCategory(record, (data) => {
      added = { name, id: nanoid(), rank: data.subcategories.length + 1, createdBy: user };
      data.subcategories.push(added);
      return '';
    }, (err) => (err ? callback(err, undefined) : callback(null, subcategoryView(record.id, added))));
  });
};

const renameSubcategory = (record, subcategoryId, newName, callback) => {
  if (!isText(newName)) return callback(new Error('Missing required parameter: newName'), undefined);
  let renamed;
  saveCategory(record, (data) => {
    renamed = data.subcategories.find((sub) => sub.id === subcategoryId);
    if (!renamed) return `No subcategory with id "${subcategoryId}"`;
    renamed.name = newName;
    return '';
  }, (err) => (err ? callback(err, undefined) : callback(null, subcategoryView(record.id, renamed))));
};

const removeSubcategory = (record, subcategoryId, callback) => {
  saveCategory(record, (data) => {
    const index = data.subcategories.findIndex((sub) => sub.id === subcategoryId);
    if (index < 0) return `No subcategory with id "${subcategoryId}"`;
    data.subcategories.splice(index, 1);
    return '';
  }, (err) => (err ? callback(err, undefined) : callback(null, { categoryId: record.id, id: subcategoryId })));
};

/** Moves a subcategory and renumbers every rank from 0, as the subcategory list's onOrderChange does. */
const moveSubcategory = (record, subcategoryId, position, callback) => {
  let moved;
  saveCategory(record, (data) => {
    const from = data.subcategories.findIndex((sub) => sub.id === subcategoryId);
    if (from < 0) return `No subcategory with id "${subcategoryId}"`;
    if (position > data.subcategories.length) return `position must be between 1 and ${data.subcategories.length}`;
    [moved] = data.subcategories.splice(from, 1);
    data.subcategories.splice(position - 1, 0, moved);
    data.subcategories.forEach((sub, index) => { sub.rank = index; });
    return '';
  }, (err) => (err ? callback(err, undefined) : callback(null, subcategoryView(record.id, moved))));
};

/** Resolves a category by name, then one of its subcategories by name, for the basic subcategory operations. */
const resolveSubcategory = (options, callback) => {
  resolveCategory(options.categoryName, (err, record) => {
    if (err) return callback(err, undefined);
    const { sub, error } = findSubcategoryByName(record, options.subcategoryName);
    if (error) return callback(new Error(error), undefined);
    callback(null, { record, sub });
  });
};

/** The advanced counterpart of resolveSubcategory: both ids, checked to exist. */
const requireSubcategory = (options, callback) => {
  requireCategory(options.categoryId, (err, record) => {
    if (err) return callback(err, undefined);
    const { sub, error } = findSubcategoryById(record, options.subcategoryId);
    if (error) return callback(new Error(error), undefined);
    callback(null, { record, sub });
  });
};

// ---------------------------------------------------------------- favorites

/** The app's favorites (buildfire.bookmarks), which belong to the app user holding the device. */
const readFavorites = (callback) => {
  if (!buildfire.bookmarks || typeof buildfire.bookmarks.getAll !== 'function') return callback(new Error('Favorites are not available here'), undefined);
  buildfire.bookmarks.getAll((err, bookmarks) => {
    if (err) return callback(err, undefined);
    callback(null, (bookmarks || []).filter(Boolean));
  });
};

const favoriteView = (bookmark) => ({ mediaId: bookmark.id, title: orNull(bookmark.title), icon: orNull(bookmark.icon) });

/**
 * Saves a media item as a favorite the way widget/bookmarkHandler.js does, with the checks the widget applies: the favorite button only shows when favorites are on, and only adds an item that is not a favorite yet. Fires mediaFavorited once saved.
 */
const addFavorite = (record, callback) => {
  readSettings((settingsErr, settings) => {
    if (settingsErr) return callback(settingsErr, undefined);
    if (settings.content.allowFavorites === false) return callback(new Error('Favorites are turned off in this media center'), undefined);
    readFavorites((err, favorites) => {
      if (err) return callback(err, undefined);
      if (favorites.some((bookmark) => bookmark.id === record.id)) return callback(new Error(`"${record.data.title}" is already a favorite`), undefined);
      const bookmark = { id: record.id, title: record.data.title, payload: { mediaId: encodeURIComponent(record.id) }, icon: record.data.topImage };
      buildfire.bookmarks.add(bookmark, (addErr) => {
        if (addErr) return callback(addErr, undefined);
        sendEvent('mediaFavorited', { mediaId: record.id, title: orNull(record.data.title), imageUrl: record.data.topImage || null, user: null });
        callback(null, { mediaId: record.id, title: orNull(record.data.title) });
      });
    });
  });
};

const removeFavorite = (bookmark, callback) => {
  buildfire.bookmarks.delete(bookmark.id, (err) => {
    if (err) return callback(err, undefined);
    callback(null, { mediaId: bookmark.id, title: orNull(bookmark.title) });
  });
};

// ---------------------------------------------------------------- playlist

/**
 * The app user a playlist belongs to: an id as given, or an email address resolved through the app's users.
 * @param {function(Error=, { userId: string, email: string }=)} callback
 */
const resolveUser = (value, callback) => {
  if (value.indexOf('@') < 0) return callback(null, { userId: value, email: null });
  buildfire.auth.getUsersByEmail({ emails: [value] }, (err, response) => {
    if (err) return callback(err, undefined);
    const users = Array.isArray(response) ? response : ((response && response.result) || []);
    const user = users.find((entry) => entry && entry._id);
    if (!user) return callback(new Error(`No user has the email address "${value}"`), undefined);
    callback(null, { userId: user._id, email: value });
  });
};

// The widget keeps each person's playlist in appData under 'MediaContent' + their user id (AppDB in widget/services.js).
const playlistTag = (userId) => MEDIA_TAG + userId;

const readPlaylist = (userId, callback) => {
  buildfire.appData.get(playlistTag(userId), (err, record) => {
    if (err && err.code !== 'NOTFOUND') return callback(err, undefined);
    const data = (record && record.data) || {};
    callback(null, { id: record && record.id, data, playlist: data.playlist || {} });
  });
};

const playlistItemView = (mediaId, data) => ({ mediaId, title: orNull(data && data.title), topImage: orNull(data && data.topImage),
  audioUrl: orNull(data && data.audioUrl), videoUrl: orNull(data && data.videoUrl) });

/**
 * Adds a media item to a person's playlist the way the widget's toggleGlobalPlaylistItem does ($set of playlist.<id> to the item's details), with the checks the widget applies: the playlist must be turned on, only audio and video go in (as "add all" filters them), an item already there is not added again, and the app-wide limit in GlobalPlayListSettings is kept. Fires mediaAddedToPlaylist once saved.
 */
const addToPlaylist = (user, record, callback) => {
  readSettings((settingsErr, settings) => {
    if (settingsErr) return callback(settingsErr, undefined);
    if (settings.content.globalPlaylist !== true) return callback(new Error('The playlist is turned off in this media center'), undefined);
    if (!record.data.audioUrl && !record.data.videoUrl) return callback(new Error(`"${record.data.title}" has no audio or video to play`), undefined);
    buildfire.appData.get(PLAYLIST_LIMIT_TAG, (limitErr, limitRecord) => {
      if (limitErr && limitErr.code !== 'NOTFOUND') return callback(limitErr, undefined);
      const limit = limitRecord && limitRecord.data ? limitRecord.data.globalPlaylistLimit : undefined;
      readPlaylist(user.userId, (err, current) => {
        if (err) return callback(err, undefined);
        if (current.playlist[record.id]) return callback(new Error(`"${record.data.title}" is already in the playlist`), undefined);
        if (typeof limit === 'number' && Object.keys(current.playlist).length >= limit) return callback(new Error('The playlist is full'), undefined);
        const done = (writeErr) => {
          if (writeErr) return callback(writeErr, undefined);
          sendEvent('mediaAddedToPlaylist', { mediaId: record.id, title: orNull(record.data.title), imageUrl: record.data.topImage || null,
            user: { userId: user.userId, displayName: null, email: user.email } });
          callback(null, { mediaId: record.id, title: orNull(record.data.title) });
        };
        if (current.id && current.data.playlist) {
          buildfire.appData.update(current.id, { $set: { [`playlist.${record.id}`]: record.data } }, playlistTag(user.userId), done);
        } else {
          // The widget first saves an empty { playlist: {} } and then sets the item; this saves the same end state in one call.
          buildfire.appData.save(Object.assign({}, current.data, { playlist: { [record.id]: record.data } }), playlistTag(user.userId), done);
        }
      });
    });
  });
};

const removeFromPlaylist = (user, current, mediaId, callback) => {
  const data = current.playlist[mediaId];
  buildfire.appData.update(current.id, { $unset: { [`playlist.${mediaId}`]: '' } }, playlistTag(user.userId), (err) => {
    if (err) return callback(err, undefined);
    callback(null, { mediaId, title: orNull(data && data.title) });
  });
};

/** Checks the user param and resolves it, for every playlist operation. */
const withPlaylistUser = (options, names, callback, next) => {
  if (!requireStringParams(options, ['userId'].concat(names), callback)) return;
  resolveUser(options.userId, (err, user) => (err ? callback(err, undefined) : next(user)));
};

widgetContract = {
  /**
   * Bind this contract to a plugin instance. Called by the consumer; resolves the iframe window that widget/control-hosted operations are proxied into.
   * @param {string} instanceId - the plugin instance to contract with.
   */
  init(instanceId) {
    buildfire.services.contract.use({ instanceId }, (err, data) => {
      if (err) return console.error('Failed to initialize Media Center contract', err);
      frameId = data.fid;
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Reads the settings document and fills every missing setting with the default the control panel applies on load, so a new instance answers the same as one already saved. Uses only buildfire.datastore reads, which behave the same in both frames and on the server; it changes nothing, so Background.
   * @param {object} options - none
   * @param {function(Error=, object=)} callback - (error, { content, design })
   */
  getSettings(options, callback) {
    requireCallback(callback);
    readSettings((err, doc) => (err ? callback(err, undefined) : callback(null, publicSettings(doc))));
  },

  /**
   * hosts: controlBackground, headlessSdk. Changes the settings the way the content, settings and design tabs do: only the settings passed change. Every tab saves the whole MediaCenter document, so this reads it (defaults filled in), merges, applies the settings tab's rules (continuous playback off clears shuffle; auto-add all audio clears continuous playback, shuffle and the playlist, and its absence clears resume-from-last-position), registers the filter screen's deep link the first time filtering is turned on (formatSettingsAndSave), saves through datastore.save, then sends the tabs' refresh messages. Not on the widget: app users must not change the owner's configuration. Background: it changes configuration and contacts no one. Server-safe: the deep link and messages are skipped where the SDK has no frame to reach.
   * Left out, as the plugin's forms keep them: the who-may-comment and who-may-react settings and the reaction set (access settings), and the linked Playlist feature, which the control panel picks from the app's features in a dialog that returns the feature's own record.
   * @param {object} options - the settings declared in plugin.contract.json, each optional
   * @param {function(Error=, object=)} callback - (error, { content, design })
   */
  updateSettings(options, callback) {
    requireCallback(callback);
    if (options === null || typeof options !== 'object') return callback(new Error('options must be an object'), undefined);
    const { changes, sortChanged, error } = collectSettingsChanges(options);
    if (error) return callback(new Error(error), undefined);

    readSettings((err, doc) => {
      if (err) return callback(err, undefined);
      changes.forEach((change) => change(doc));
      normalizeSettings(doc);

      if (doc.content.enableFiltering && !doc.content.filterPageDeeplink) {
        const context = typeof buildfire.getContext === 'function' ? buildfire.getContext() : null;
        if (context && context.instanceId) {
          doc.content.filterPageDeeplink = `${context.instanceId}_filterScreen`;
          if (buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
            // The settings tab registers it without waiting for the answer.
            buildfire.deeplink.registerDeeplink({ id: doc.content.filterPageDeeplink, name: 'Filter Screen', deeplinkData: { screen: 'filterScreen' } }, () => {});
          }
        }
      }

      buildfire.datastore.save(doc, SETTINGS_TAG, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        notifyWidget({ name: 'SETTINGS_CHANGE', message: { itemUpdatedData: doc.content } });
        notifyWidget({ cmd: 'settings', data: doc });
        notifyWidget({ name: 'DESIGN_LAYOUT_CHANGE', message: { design: doc.design } });
        if (sortChanged) notifyWidget({ name: 'ROUTE_CHANGE', message: { path: 'HOME' } });
        callback(null, publicSettings(doc));
      });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. The app's media list: reads the settings to sort as the widget does (updateGetOptions), narrows by an exact title and by a category or one of its subcategories named as the filter screen picks them ($json.categories / $json.subcategories), and reads one page of 50 with recordCount, so total and hasMore come from totalRecord. When view counts are shown, each item's count is read the way the widget reads it. Multi-step (settings, category lookup, media, counts), which is why it is not declarative; reads only, so Background, and the same in both frames and on the server.
   * @param {{ title?: string, categoryName?: string, subcategoryName?: string, page?: number }} options
   * @param {function(Error=, object=)} callback - (error, { media, total, page, hasMore })
   */
  searchMedia(options, callback) {
    requireCallback(callback);
    if (options === null || typeof options !== 'object') return callback(new Error('options must be an object'), undefined);
    const bad = ['title', 'categoryName', 'subcategoryName'].find((name) => options[name] !== undefined && !isText(options[name]));
    if (bad) return callback(new Error(`${bad} must be non-empty text`), undefined);
    if (options.subcategoryName !== undefined && options.categoryName === undefined) return callback(new Error('subcategoryName needs categoryName'), undefined);
    const page = options.page === undefined ? 0 : options.page;
    if (!Number.isInteger(page) || page < 0) return callback(new Error('page must be a whole number from 0'), undefined);

    readSettings((settingsErr, settings) => {
      if (settingsErr) return callback(settingsErr, undefined);
      const withCategory = (next) => {
        if (options.categoryName === undefined) return next(null);
        resolveCategory(options.categoryName, (err, record) => {
          if (err) return callback(err, undefined);
          if (options.subcategoryName === undefined) return next({ '$json.categories': record.id });
          const { sub, error } = findSubcategoryByName(record, options.subcategoryName);
          if (error) return callback(new Error(error), undefined);
          next({ $or: [{ '$json.subcategories': sub.id }] });
        });
      };
      withCategory((categoryFilter) => {
        const and = [];
        if (options.title !== undefined) and.push({ '$json.title': options.title });
        if (categoryFilter) and.push(categoryFilter);
        const filter = and.length ? { $and: and } : {};
        buildfire.datastore.search({ filter, sort: mediaSort(settings.content), page, pageSize: PAGE_SIZE, recordCount: true }, MEDIA_TAG, (err, response) => {
          if (err) return callback(err, undefined);
          const records = ((response && response.result) || []).filter(Boolean);
          const total = (response && response.totalRecord) || 0;
          const finish = (counts) => callback(null, {
            media: records.map((record, index) => mediaView(record, counts ? counts[index] : null)),
            total, page, hasMore: (page + 1) * PAGE_SIZE < total
          });
          if (settings.content.showViewCount) countViews(records, finish);
          else finish(null);
        });
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Moves one media item, named by its exact title, to a place in the manual order, renumbering the order as the content tab's drag-and-drop does. Uses only buildfire.datastore, so it runs the same in the control panel and on the server; the widget refresh message is skipped where there is no frame. Not on the widget: app users must not reorder the owner's content. Background: nothing about it needs watching. usage: basic; its advanced alternative is updateMediaOrderAdvanced.
   * @param {{ title: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { id, rank })
   */
  updateMediaOrder(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    const problem = readPosition(options.position);
    if (problem) return callback(new Error(problem), undefined);
    resolveMediaByTitle(options.title, (err, record) => (err ? callback(err, undefined) : applyMediaMove(record, options.position, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateMediaOrder, taking the media item's id. Same hosts, checks and effect through applyMediaMove; it checks the id exists instead of searching.
   * @param {{ mediaId: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { id, rank })
   */
  updateMediaOrderAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaId'], callback)) return;
    const problem = readPosition(options.position);
    if (problem) return callback(new Error(problem), undefined);
    requireMedia(options.mediaId, (err, record) => (err ? callback(err, undefined) : applyMediaMove(record, options.position, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. Adds a category as the category form does (insertCategory). Uses buildfire.datastore and buildfire.auth.getCurrentUser (the editor recorded as createdBy; '' on the server, where nobody is signed in), so it runs in the control panel and on the server. Not on the widget: app users must not change the owner's content. Background: nothing about it needs watching.
   * @param {{ name: string, icon?: string[] }} options
   * @param {function(Error=, object=)} callback - (error, { id, data })
   */
  createCategory(options, callback) {
    requireCallback(callback);
    if (options === null || typeof options !== 'object') return callback(new Error('options must be an object'), undefined);
    const problem = checkNewCategory(options);
    if (problem) return callback(new Error(problem), undefined);
    insertCategory(options, callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced (batches are never basic). The batch form of createCategory: every entry is checked first, then each is added through insertCategory, so every category gets exactly what createCategory gives it.
   * @param {{ categories: Array<{ name: string, icon?: string[] }> }} options
   * @param {function(Error=, object=)} callback - (error, { categories, succeeded, failed })
   */
  createCategoriesAdvanced(options, callback) {
    runBatch(options && options.categories, 'categories', callback, {
      check: checkNewCategory,
      resolve: (entry, done) => done(null, entry),
      apply: (entry, unused, done) => insertCategory(entry, (err, record) => done(err, record && record.id))
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Edits one category, named by its exact name, changing only what is passed, and saves it through saveCategory as the category form does. Name, icon and subcategory order are one operation because the form saves them together with the same side effects. Resolving the name is a search, which is why this is a function. usage: basic; its advanced alternative is updateCategoryAdvanced.
   * @param {{ categoryName: string, newName?: string, newIcon?: string[]|null, newSubcategorySortBy?: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, data })
   */
  updateCategory(options, callback) {
    if (!requireStringParams(options, ['categoryName'], callback)) return;
    const { error } = collectCategoryChanges(options);
    if (error) return callback(new Error(error), undefined);
    resolveCategory(options.categoryName, (err, record) => (err ? callback(err, undefined) : applyCategoryUpdate(record, options, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateCategory, taking the category's id. Same checks and effect through applyCategoryUpdate; it checks the id exists instead of searching.
   * @param {{ categoryId: string, newName?: string, newIcon?: string[]|null, newSubcategorySortBy?: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, data })
   */
  updateCategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId'], callback)) return;
    const { error } = collectCategoryChanges(options);
    if (error) return callback(new Error(error), undefined);
    requireCategory(options.categoryId, (err, record) => (err ? callback(err, undefined) : applyCategoryUpdate(record, options, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of updateCategoryAdvanced: validates every entry and checks every id before writing, refuses a category listed twice, then applies each through applyCategoryUpdate.
   * @param {{ categories: Array<{ categoryId: string, newName?: string, newIcon?: string[]|null, newSubcategorySortBy?: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { categories, succeeded, failed })
   */
  updateCategoriesAdvanced(options, callback) {
    runBatch(options && options.categories, 'categories', callback, {
      check: (entry) => (!isText(entry.categoryId) ? 'Missing required parameter: categoryId' : collectCategoryChanges(entry).error),
      key: (entry) => entry.categoryId,
      resolve: (entry, done) => requireCategory(entry.categoryId, done),
      apply: (record, entry, done) => applyCategoryUpdate(record, entry, (err) => done(err, record.id))
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Permanently removes one category, named by its exact name, with the subcategories it holds, as the category list's delete does: only the category record is deleted. Uses only buildfire.datastore, so it runs in the control panel and on the server. Background: nothing about it needs watching; the flags make it ask first on the server. usage: basic; its advanced alternative is deleteCategoryAdvanced.
   * @param {{ categoryName: string }} options
   * @param {function(Error=, object=)} callback - (error, { id })
   */
  deleteCategory(options, callback) {
    if (!requireStringParams(options, ['categoryName'], callback)) return;
    resolveCategory(options.categoryName, (err, record) => (err ? callback(err, undefined) : deleteCategoryRecord(record, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of deleteCategory, taking the category's id, checked to exist first.
   * @param {{ categoryId: string }} options
   * @param {function(Error=, object=)} callback - (error, { id })
   */
  deleteCategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId'], callback)) return;
    requireCategory(options.categoryId, (err, record) => (err ? callback(err, undefined) : deleteCategoryRecord(record, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of deleteCategoryAdvanced: checks every id first, refuses a category listed twice, then deletes each through deleteCategoryRecord.
   * @param {{ categories: Array<{ categoryId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { categories, succeeded, failed })
   */
  deleteCategoriesAdvanced(options, callback) {
    runBatch(options && options.categories, 'categories', callback, {
      check: (entry) => (!isText(entry.categoryId) ? 'Missing required parameter: categoryId' : ''),
      key: (entry) => entry.categoryId,
      resolve: (entry, done) => requireCategory(entry.categoryId, done),
      apply: (record, entry, done) => deleteCategoryRecord(record, (err) => done(err, record.id))
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Moves one category, named by its exact name, to a place in the manual order, renumbering as the category list's drag-and-drop does (moveInOrder). Uses only buildfire.datastore. usage: basic; its advanced alternative is updateCategoryOrderAdvanced.
   * @param {{ categoryName: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { id, rank })
   */
  updateCategoryOrder(options, callback) {
    if (!requireStringParams(options, ['categoryName'], callback)) return;
    const problem = readPosition(options.position);
    if (problem) return callback(new Error(problem), undefined);
    resolveCategory(options.categoryName, (err, record) => (err ? callback(err, undefined)
      : moveInOrder(CATEGORIES_TAG, record.id, options.position, 'category', callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateCategoryOrder, taking the category's id, checked to exist first.
   * @param {{ categoryId: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { id, rank })
   */
  updateCategoryOrderAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId'], callback)) return;
    const problem = readPosition(options.position);
    if (problem) return callback(new Error(problem), undefined);
    requireCategory(options.categoryId, (err, record) => (err ? callback(err, undefined)
      : moveInOrder(CATEGORIES_TAG, record.id, options.position, 'category', callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. Adds a subcategory to a category named by its exact name. Subcategories live inside their category's record, so this is the category form's read-modify-write (addSubcategory, saved through saveCategory). Uses buildfire.datastore and buildfire.auth.getCurrentUser, so it runs in the control panel and on the server. usage: basic; its advanced alternative is createSubcategoryAdvanced.
   * @param {{ categoryName: string, name: string }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id, name, rank })
   */
  createSubcategory(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'name'], callback)) return;
    resolveCategory(options.categoryName, (err, record) => (err ? callback(err, undefined) : addSubcategory(record, options.name, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of createSubcategory, taking the category's id, checked to exist first.
   * @param {{ categoryId: string, name: string }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id, name, rank })
   */
  createSubcategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'name'], callback)) return;
    requireCategory(options.categoryId, (err, record) => (err ? callback(err, undefined) : addSubcategory(record, options.name, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of createSubcategoryAdvanced: checks every entry and category first, then adds each through addSubcategory, re-reading the category every time so several entries for one category all land.
   * @param {{ subcategories: Array<{ categoryId: string, name: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { subcategories, succeeded, failed })
   */
  createSubcategoriesAdvanced(options, callback) {
    runBatch(options && options.subcategories, 'subcategories', callback, {
      check: (entry) => ['categoryId', 'name'].filter((name) => !isText(entry[name])).map((name) => `Missing required parameter: ${name}`)[0] || '',
      resolve: (entry, done) => requireCategory(entry.categoryId, (err) => done(err, entry.categoryId)),
      apply: (categoryId, entry, done) => requireCategory(categoryId, (err, record) => (err ? done(err)
        : addSubcategory(record, entry.name, (addErr, added) => done(addErr, added && added.id))))
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Renames a subcategory, both named by their exact names, as the subcategory dialog does, saved through saveCategory. usage: basic; its advanced alternative is updateSubcategoryAdvanced.
   * @param {{ categoryName: string, subcategoryName: string, newName: string }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id, name, rank })
   */
  updateSubcategory(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'subcategoryName', 'newName'], callback)) return;
    resolveSubcategory(options, (err, found) => (err ? callback(err, undefined) : renameSubcategory(found.record, found.sub.id, options.newName, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateSubcategory, taking both ids, checked to exist first.
   * @param {{ categoryId: string, subcategoryId: string, newName: string }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id, name, rank })
   */
  updateSubcategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'subcategoryId', 'newName'], callback)) return;
    requireSubcategory(options, (err, found) => (err ? callback(err, undefined) : renameSubcategory(found.record, found.sub.id, options.newName, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of updateSubcategoryAdvanced: checks every entry and both ids first, refuses a subcategory listed twice, then renames each through renameSubcategory on a fresh read of its category.
   * @param {{ subcategories: Array<{ categoryId: string, subcategoryId: string, newName: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { subcategories, succeeded, failed })
   */
  updateSubcategoriesAdvanced(options, callback) {
    runBatch(options && options.subcategories, 'subcategories', callback, {
      check: (entry) => ['categoryId', 'subcategoryId', 'newName'].filter((name) => !isText(entry[name])).map((name) => `Missing required parameter: ${name}`)[0] || '',
      key: (entry) => `${entry.categoryId}/${entry.subcategoryId}`,
      resolve: (entry, done) => requireSubcategory(entry, (err) => done(err, entry)),
      apply: (target, entry, done) => requireCategory(entry.categoryId, (err, record) => (err ? done(err)
        : renameSubcategory(record, entry.subcategoryId, entry.newName, (renameErr) => done(renameErr, entry.subcategoryId))))
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Permanently removes a subcategory, both named by their exact names, as the subcategory list's delete does, saved through saveCategory. usage: basic; its advanced alternative is deleteSubcategoryAdvanced.
   * @param {{ categoryName: string, subcategoryName: string }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id })
   */
  deleteSubcategory(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'subcategoryName'], callback)) return;
    resolveSubcategory(options, (err, found) => (err ? callback(err, undefined) : removeSubcategory(found.record, found.sub.id, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of deleteSubcategory, taking both ids, checked to exist first.
   * @param {{ categoryId: string, subcategoryId: string }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id })
   */
  deleteSubcategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'subcategoryId'], callback)) return;
    requireSubcategory(options, (err, found) => (err ? callback(err, undefined) : removeSubcategory(found.record, found.sub.id, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of deleteSubcategoryAdvanced: checks every pair of ids first, refuses one listed twice, then removes each through removeSubcategory on a fresh read of its category.
   * @param {{ subcategories: Array<{ categoryId: string, subcategoryId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { subcategories, succeeded, failed })
   */
  deleteSubcategoriesAdvanced(options, callback) {
    runBatch(options && options.subcategories, 'subcategories', callback, {
      check: (entry) => ['categoryId', 'subcategoryId'].filter((name) => !isText(entry[name])).map((name) => `Missing required parameter: ${name}`)[0] || '',
      key: (entry) => `${entry.categoryId}/${entry.subcategoryId}`,
      resolve: (entry, done) => requireSubcategory(entry, (err) => done(err, entry)),
      apply: (target, entry, done) => requireCategory(entry.categoryId, (err, record) => (err ? done(err)
        : removeSubcategory(record, entry.subcategoryId, (removeErr) => done(removeErr, entry.subcategoryId))))
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Moves a subcategory, both named by their exact names, to a place in its category, renumbering the ranks from 0 as the subcategory list's drag-and-drop does. usage: basic; its advanced alternative is updateSubcategoryOrderAdvanced.
   * @param {{ categoryName: string, subcategoryName: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id, name, rank })
   */
  updateSubcategoryOrder(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'subcategoryName'], callback)) return;
    const problem = readPosition(options.position);
    if (problem) return callback(new Error(problem), undefined);
    resolveSubcategory(options, (err, found) => (err ? callback(err, undefined) : moveSubcategory(found.record, found.sub.id, options.position, callback)));
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateSubcategoryOrder, taking both ids, checked to exist first.
   * @param {{ categoryId: string, subcategoryId: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, { categoryId, id, name, rank })
   */
  updateSubcategoryOrderAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'subcategoryId'], callback)) return;
    const problem = readPosition(options.position);
    if (problem) return callback(new Error(problem), undefined);
    requireSubcategory(options, (err, found) => (err ? callback(err, undefined) : moveSubcategory(found.record, found.sub.id, options.position, callback)));
  },

  /**
   * hosts: widgetBackground. Can never run on the server or in the control panel: favorites are buildfire.bookmarks, which belong to the app user holding the device and exist only in the app, so this is widget-only and excluded from the MCP; it only reads, so Background.
   * @param {object} options - none
   * @param {function(Error=, object=)} callback - (error, { favorites })
   */
  listFavorites(options, callback) {
    requireCallback(callback);
    readFavorites((err, favorites) => (err ? callback(err, undefined) : callback(null, { favorites: favorites.map(favoriteView) })));
  },

  /**
   * hosts: widgetBackground. Saves a media item, named by its exact title, as a favorite through addFavorite. Widget-only for the same reason as listFavorites (buildfire.bookmarks is the device user's), so excluded from the MCP; it adds to that person's own list and reaches no one, so Background. usage: basic; its advanced alternative is createFavoriteAdvanced.
   * @param {{ title: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  createFavorite(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    resolveMediaByTitle(options.title, (err, record) => (err ? callback(err, undefined) : addFavorite(record, callback)));
  },

  /**
   * hosts: widgetBackground. usage: advanced; the alternative of createFavorite, taking the media item's id, checked to exist first.
   * @param {{ mediaId: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  createFavoriteAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaId'], callback)) return;
    requireMedia(options.mediaId, (err, record) => (err ? callback(err, undefined) : addFavorite(record, callback)));
  },

  /**
   * hosts: widgetBackground. usage: advanced. The batch form of createFavoriteAdvanced: checks every id first, refuses an item listed twice, then saves each through addFavorite.
   * @param {{ favorites: Array<{ mediaId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { favorites, succeeded, failed })
   */
  createFavoritesAdvanced(options, callback) {
    runBatch(options && options.favorites, 'favorites', callback, {
      check: (entry) => (!isText(entry.mediaId) ? 'Missing required parameter: mediaId' : ''),
      key: (entry) => entry.mediaId,
      resolve: (entry, done) => requireMedia(entry.mediaId, done),
      apply: (record, entry, done) => addFavorite(record, (err) => done(err, record.id))
    });
  },

  /**
   * hosts: widgetBackground. Removes the favorite with exactly this title, found among the favorites themselves (a favorite keeps the title it was saved with, and may outlive its media item), as the widget's toggle does with bookmarks.delete. Widget-only for the same reason as listFavorites. usage: basic; its advanced alternative is deleteFavoriteAdvanced.
   * @param {{ title: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  deleteFavorite(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    readFavorites((err, favorites) => {
      if (err) return callback(err, undefined);
      const found = favorites.filter((bookmark) => bookmark.title === options.title);
      if (!found.length) return callback(new Error(`No favorite named "${options.title}"`), undefined);
      if (found.length > 1) return callback(new Error(`${found.length} favorites are named "${options.title}"`), undefined);
      removeFavorite(found[0], callback);
    });
  },

  /**
   * hosts: widgetBackground. usage: advanced; the alternative of deleteFavorite, taking the media item's id, checked to be a favorite first.
   * @param {{ mediaId: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  deleteFavoriteAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaId'], callback)) return;
    readFavorites((err, favorites) => {
      if (err) return callback(err, undefined);
      const found = favorites.find((bookmark) => bookmark.id === options.mediaId);
      if (!found) return callback(new Error(`No favorite with id "${options.mediaId}"`), undefined);
      removeFavorite(found, callback);
    });
  },

  /**
   * hosts: widgetBackground. usage: advanced. The batch form of deleteFavoriteAdvanced: checks every id is a favorite first, refuses one listed twice, then removes each through removeFavorite.
   * @param {{ favorites: Array<{ mediaId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { favorites, succeeded, failed })
   */
  deleteFavoritesAdvanced(options, callback) {
    runBatch(options && options.favorites, 'favorites', callback, {
      check: (entry) => (!isText(entry.mediaId) ? 'Missing required parameter: mediaId' : ''),
      key: (entry) => entry.mediaId,
      resolve: (entry, done) => readFavorites((err, favorites) => {
        if (err) return done(err);
        const found = favorites.find((bookmark) => bookmark.id === entry.mediaId);
        return found ? done(null, found) : done(new Error(`No favorite with id "${entry.mediaId}"`));
      }),
      apply: (bookmark, entry, done) => removeFavorite(bookmark, (err) => done(err, bookmark.id))
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. A person's playlist, read from appData the way the widget reads it, for the user the call names (an id, or an email resolved with getUsersByEmail), so it needs no signed-in session and runs in both frames and on the server; it only reads, so Background.
   * @param {{ userId: string }} options
   * @param {function(Error=, object=)} callback - (error, { playlistItems })
   */
  listPlaylistItems(options, callback) {
    withPlaylistUser(options, [], callback, (user) => readPlaylist(user.userId, (err, current) => (err ? callback(err, undefined)
      : callback(null, { playlistItems: Object.keys(current.playlist).map((mediaId) => playlistItemView(mediaId, current.playlist[mediaId])) }))));
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Adds a media item, named by its exact title, to the named person's playlist on behalf of the app, through addToPlaylist. Acts on the person, not as them: it adds to their own list and contacts no one, so Background. Uses buildfire.datastore and buildfire.appData for the user the call names, so it needs no signed-in session and runs in both frames and on the server. usage: basic; its advanced alternative is createPlaylistItemAdvanced.
   * @param {{ userId: string, title: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  createPlaylistItem(options, callback) {
    withPlaylistUser(options, ['title'], callback, (user) => resolveMediaByTitle(options.title, (err, record) => (err ? callback(err, undefined)
      : addToPlaylist(user, record, callback))));
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced; the alternative of createPlaylistItem, taking the media item's id, checked to exist first.
   * @param {{ userId: string, mediaId: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  createPlaylistItemAdvanced(options, callback) {
    withPlaylistUser(options, ['mediaId'], callback, (user) => requireMedia(options.mediaId, (err, record) => (err ? callback(err, undefined)
      : addToPlaylist(user, record, callback))));
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced. The batch form of createPlaylistItemAdvanced, like the widget's "add all": checks every id first, refuses an item listed twice, then adds each through addToPlaylist, so the limit is kept item by item.
   * @param {{ userId: string, playlistItems: Array<{ mediaId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { playlistItems, succeeded, failed })
   */
  createPlaylistItemsAdvanced(options, callback) {
    withPlaylistUser(options, [], callback, (user) => runBatch(options.playlistItems, 'playlistItems', callback, {
      check: (entry) => (!isText(entry.mediaId) ? 'Missing required parameter: mediaId' : ''),
      key: (entry) => entry.mediaId,
      resolve: (entry, done) => requireMedia(entry.mediaId, done),
      apply: (record, entry, done) => addToPlaylist(user, record, (err) => done(err, record.id))
    }));
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Removes the item with exactly this title from the named person's playlist ($unset of playlist.<id>, as the widget's toggle does), found among the playlist's own items. Same hosts and grounds as createPlaylistItem. usage: basic; its advanced alternative is deletePlaylistItemAdvanced.
   * @param {{ userId: string, title: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  deletePlaylistItem(options, callback) {
    withPlaylistUser(options, ['title'], callback, (user) => readPlaylist(user.userId, (err, current) => {
      if (err) return callback(err, undefined);
      const found = Object.keys(current.playlist).filter((mediaId) => current.playlist[mediaId] && current.playlist[mediaId].title === options.title);
      if (!found.length) return callback(new Error(`No playlist item named "${options.title}"`), undefined);
      if (found.length > 1) return callback(new Error(`${found.length} playlist items are named "${options.title}"`), undefined);
      removeFromPlaylist(user, current, found[0], callback);
    }));
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced; the alternative of deletePlaylistItem, taking the media item's id, checked to be in the playlist first.
   * @param {{ userId: string, mediaId: string }} options
   * @param {function(Error=, object=)} callback - (error, { mediaId, title })
   */
  deletePlaylistItemAdvanced(options, callback) {
    withPlaylistUser(options, ['mediaId'], callback, (user) => readPlaylist(user.userId, (err, current) => {
      if (err) return callback(err, undefined);
      if (!current.playlist[options.mediaId]) return callback(new Error(`No playlist item with id "${options.mediaId}"`), undefined);
      removeFromPlaylist(user, current, options.mediaId, callback);
    }));
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced. The batch form of deletePlaylistItemAdvanced: checks every id is in the playlist first, refuses one listed twice, then removes each through removeFromPlaylist.
   * @param {{ userId: string, playlistItems: Array<{ mediaId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { playlistItems, succeeded, failed })
   */
  deletePlaylistItemsAdvanced(options, callback) {
    withPlaylistUser(options, [], callback, (user) => readPlaylist(user.userId, (err, current) => {
      if (err) return callback(err, undefined);
      runBatch(options.playlistItems, 'playlistItems', callback, {
        check: (entry) => (!isText(entry.mediaId) ? 'Missing required parameter: mediaId' : ''),
        key: (entry) => entry.mediaId,
        resolve: (entry, done) => (current.playlist[entry.mediaId] ? done(null, entry.mediaId) : done(new Error(`No playlist item with id "${entry.mediaId}"`))),
        apply: (mediaId, entry, done) => removeFromPlaylist(user, current, mediaId, (removeErr) => done(removeErr, mediaId))
      });
    }));
  }
};

/**
 * What the control panel's frame (control/contract.html) dispatches to: init plus every function whose hosts include controlBackground, in plugin.contract.json order. The implementations are widgetContract's own; the favorites functions have no control host, so they are left out and cannot be invoked from the control panel.
 */
controlContract = {
  init: widgetContract.init,
  getSettings: widgetContract.getSettings,
  updateSettings: widgetContract.updateSettings,
  searchMedia: widgetContract.searchMedia,
  updateMediaOrder: widgetContract.updateMediaOrder,
  updateMediaOrderAdvanced: widgetContract.updateMediaOrderAdvanced,
  createCategory: widgetContract.createCategory,
  createCategoriesAdvanced: widgetContract.createCategoriesAdvanced,
  updateCategory: widgetContract.updateCategory,
  updateCategoryAdvanced: widgetContract.updateCategoryAdvanced,
  updateCategoriesAdvanced: widgetContract.updateCategoriesAdvanced,
  deleteCategory: widgetContract.deleteCategory,
  deleteCategoryAdvanced: widgetContract.deleteCategoryAdvanced,
  deleteCategoriesAdvanced: widgetContract.deleteCategoriesAdvanced,
  updateCategoryOrder: widgetContract.updateCategoryOrder,
  updateCategoryOrderAdvanced: widgetContract.updateCategoryOrderAdvanced,
  createSubcategory: widgetContract.createSubcategory,
  createSubcategoryAdvanced: widgetContract.createSubcategoryAdvanced,
  createSubcategoriesAdvanced: widgetContract.createSubcategoriesAdvanced,
  updateSubcategory: widgetContract.updateSubcategory,
  updateSubcategoryAdvanced: widgetContract.updateSubcategoryAdvanced,
  updateSubcategoriesAdvanced: widgetContract.updateSubcategoriesAdvanced,
  deleteSubcategory: widgetContract.deleteSubcategory,
  deleteSubcategoryAdvanced: widgetContract.deleteSubcategoryAdvanced,
  deleteSubcategoriesAdvanced: widgetContract.deleteSubcategoriesAdvanced,
  updateSubcategoryOrder: widgetContract.updateSubcategoryOrder,
  updateSubcategoryOrderAdvanced: widgetContract.updateSubcategoryOrderAdvanced,
  listPlaylistItems: widgetContract.listPlaylistItems,
  createPlaylistItem: widgetContract.createPlaylistItem,
  createPlaylistItemAdvanced: widgetContract.createPlaylistItemAdvanced,
  createPlaylistItemsAdvanced: widgetContract.createPlaylistItemsAdvanced,
  deletePlaylistItem: widgetContract.deletePlaylistItem,
  deletePlaylistItemAdvanced: widgetContract.deletePlaylistItemAdvanced,
  deletePlaylistItemsAdvanced: widgetContract.deletePlaylistItemsAdvanced
};
