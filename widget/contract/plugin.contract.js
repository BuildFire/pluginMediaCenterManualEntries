/* eslint-disable no-undef, strict */
/**
 * Media Center contract — runtime implementation.
 *
 * This file only implements the operations declared with "type": "function" in plugin.contract.json. Operations typed publicData / datastore / userData / appData / firebase are declarative: their platform call is built on the fly from context.query, so they intentionally have no counterpart here. (Every operation of this plugin is a function: each one either names its record by a title, mirrors a sort the plugin computes from its settings, or makes the several calls its control-panel action makes.)
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
 * The control panel's own side effects that no contract host can wait for — the app search index (buildfire.services.searchEngine, not loaded in the contract frames), analytics event registration, deep-link registration, comment clean-up, the refresh message to the widget and the contract events — are started without waiting for their answer, and only where the service exists. The plugin's data (the datastore records and the view counts in publicData) is always written and checked before an operation reports success.
 */

const MEDIA_TAG = 'MediaContent';       // must match the collection names in plugin.contract.json
const CATEGORIES_TAG = 'CategoryContent';
const SETTINGS_TAG = 'MediaCenter';
const VIEWS_TAG = 'MediaCount';         // publicData: per-user view records, reset when an item's media changes
const PAGE_LIMIT = 50;                  // the most records one datastore search returns
const BATCH_LIMIT = 50;

// Mirrors the sort options of widget/services.js (Orders, CategoryOrders) and control/content/services.js (SubcategoryOrders).
const MEDIA_SORT_ORDERS = ['Manually', 'Media Title A-Z', 'Media Title Z-A', 'Media Date Asc', 'Media Date Desc', 'Newest', 'Oldest'];
const CATEGORY_SORT_ORDERS = ['Manually', 'Category Title A-Z', 'Category Title Z-A', 'Newest', 'Oldest'];
const SUBCATEGORY_SORT_ORDERS = ['Manually', 'Subcategory Title A-Z', 'Subcategory Title Z-A', 'Subcategory Date Asc', 'Subcategory Date Desc', 'Newest', 'Oldest'];
// Mirrors Settings.autoPlayDelayOptions in control/settings/controllers/settings.home.controller.js.
const AUTOPLAY_DELAYS = [{ label: 'Off', value: 0 }, { label: '1s', value: 1 }, { label: '2s', value: 2 }, { label: '3s', value: 3 }, { label: '5s', value: 5 }];
// Mirrors DesignHome.layouts in control/design/controllers/design.home.controller.js.
const LIST_LAYOUTS = ['list-1', 'list-2', 'list-3', 'list-4'];
const ITEM_LAYOUTS = ['item-1', 'item-2'];

const MEDIA_TEXT_FIELDS = [
  // [create param, update param, stored field, max length] — limits mirror control/content/templates/media.html.
  ['summary', 'newSummary', 'summary', 250],
  ['sourceUrl', 'newSourceUrl', 'srcUrl'],
  ['videoUrl', 'newVideoUrl', 'videoUrl'],
  ['audioTitle', 'newAudioTitle', 'audioTitle', 70],
  ['artists', 'newArtists', 'artists', 70],
  ['audioUrl', 'newAudioUrl', 'audioUrl']
];
const MEDIA_IMAGE_FIELDS = [
  ['thumbnailImage', 'newThumbnailImage', 'topImage'],
  ['audioImage', 'newAudioImage', 'image'],
  ['audioBackgroundImage', 'newAudioBackgroundImage', 'backgroundImage']
];

/* ------------------------------------------------------------------ input checks */

const fail = (callback, message) => callback(new Error(message), undefined);
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Assert the callback is callable and options is an object.
 * @returns {boolean} true when valid; false when the callback has already fired.
 */
const requireOptions = (options, callback) => {
  if (typeof callback !== 'function') {
    // Nothing to report through; fail loudly only in this one unrecoverable case.
    throw new TypeError('callback must be a function');
  }
  if (!isPlainObject(options)) {
    fail(callback, 'options must be an object');
    return false;
  }
  return true;
};

/**
 * Assert that every named option is a non-empty string.
 * @returns {boolean} true when valid; false when the callback has already fired.
 */
const requireStringParams = (options, names, callback) => {
  if (!requireOptions(options, callback)) return false;
  const missing = names.find((name) => typeof options[name] !== 'string' || !options[name].trim());
  if (missing) {
    fail(callback, `Missing required parameter: ${missing}`);
    return false;
  }
  return true;
};

/** A non-empty text param no longer than max characters, or an error message. */
const checkText = (value, name, max) => {
  if (typeof value !== 'string' || !value.trim()) return `${name} must be non-empty text`;
  if (max && value.length > max) return `${name} must be at most ${max} characters`;
  return null;
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
  if (value.some((url) => typeof url !== 'string' || !url)) return { error: `${name} must contain only image URLs` };
  return { images: value };
};

/**
 * A list of action items, stored as passed. The plugin takes whatever its action item editor makes, so every action kind is accepted; each entry must still be an action item, an object naming its action.
 * @returns {{ actions?: object[], error?: string }}
 */
const readActionList = (value, name) => {
  if (!Array.isArray(value)) return { error: `${name} must be a list of action items` };
  const bad = value.findIndex((action) => !isPlainObject(action) || typeof action.action !== 'string' || !action.action);
  if (bad !== -1) return { error: `${name} entry ${bad} must be an action item, with its action` };
  return { actions: value };
};

/** A date param ("2026-08-17" or a full instant), or an error message. */
const readDate = (value, name) => {
  if (typeof value !== 'string' || !value) return { error: `${name} must be a date such as 2026-08-17` };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: `${name} must be a date such as 2026-08-17` };
  return { date };
};

/** A page / pageSize pair, checked against its declared bounds; pageSize defaults to the widget's 20. */
const readPaging = (options) => {
  const page = options.page === undefined ? 0 : options.page;
  const pageSize = options.pageSize === undefined ? 20 : options.pageSize;
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 0) return { error: 'page must be a whole number of 0 or more' };
  if (typeof pageSize !== 'number' || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > PAGE_LIMIT) {
    return { error: `pageSize must be a whole number from 1 to ${PAGE_LIMIT}` };
  }
  return { page, pageSize };
};

/** A position in a manual order, counting from 1. */
const readPosition = (value) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return { error: 'position must be a whole number of 1 or more' };
  return { position: value };
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toIso = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// Mirrors the nanoid factory in control/content/services.js, which names subcategories.
const nanoid = (size = 21) => crypto.getRandomValues(new Uint8Array(size)).reduce((id, byte) => {
  const e = byte & 63;
  return id + (e < 36 ? e.toString(36) : e < 62 ? (e - 26).toString(36).toUpperCase() : e > 62 ? '-' : '_');
}, '');

/* ------------------------------------------------------------------ store helpers */

/**
 * Every record of a tag matching the filter, sorted as given, read 50 at a time: a search returns at most 50 records, and recordCount/totalRecord tell whether another page exists.
 * @param {function(Error=, Array=)} callback - (error, records)
 */
const searchAll = (tag, filter, sort, callback) => {
  const records = [];
  const readPage = (page) => {
    buildfire.datastore.search({ filter, sort, page, pageSize: PAGE_LIMIT, recordCount: true }, tag, (err, response) => {
      if (err) return callback(err, undefined);
      const result = ((response && response.result) || []).filter(Boolean);
      result.forEach((record) => records.push(record));
      const total = (response && response.totalRecord) || 0;
      if (!result.length || records.length >= total) return callback(null, records);
      readPage(page + 1);
    });
  };
  readPage(0);
};

/**
 * The one record of a tag whose field equals the text a caller named. Several matches are refused rather than resolved to one of them: on a write, picking would mean acting on a record the caller did not mean.
 * @param {function(Error=, object=)} callback - (error, { id, data })
 */
const findOne = (tag, field, text, label, callback) => {
  buildfire.datastore.search({ filter: { [`$json.${field}`]: text }, page: 0, pageSize: PAGE_LIMIT, recordCount: true }, tag, (err, response) => {
    if (err) return callback(err, undefined);
    const found = ((response && response.result) || []).filter(Boolean);
    const total = Math.max((response && response.totalRecord) || 0, found.length);
    if (!total) return callback(new Error(`No ${label} named "${text}"`), undefined);
    if (total > 1) return callback(new Error(`${total} ${label.replace(/y$/, 'ie')}s are named "${text}"`), undefined);
    callback(null, found[0]);
  });
};

/**
 * The record with this id, checked to exist: the store answers an empty record for an unknown id, which is refused here rather than acted on.
 * @param {function(Error=, object=)} callback - (error, { id, data })
 */
const requireById = (tag, id, label, callback) => {
  buildfire.datastore.getById(id, tag, (err, record) => {
    if (err) return callback(err, undefined);
    if (!record || !record.data || !Object.keys(record.data).length) return callback(new Error(`No ${label} with id "${id}"`), undefined);
    callback(null, { id: record.id || id, data: record.data });
  });
};

/** The control panel's user, as the control panel stamps it on categories; '' when nobody is signed in. */
const currentUser = (callback) => {
  if (!buildfire.auth || typeof buildfire.auth.getCurrentUser !== 'function') return callback('');
  buildfire.auth.getCurrentUser((err, user) => callback(err || !user ? '' : user));
};

/* ------------------------------------------------------------------ side effects started without waiting */

const inFrame = () => typeof window !== 'undefined';

/** The contract event, from the shared implementation every caller goes through. */
const sendEvent = (name, data) => {
  const contract = buildfire.services && buildfire.services.contract;
  if (contract && contract.events && typeof contract.events.send === 'function') contract.events.send(name, data);
};

/** The refresh message the control panel sends the widget after a change; there is no widget to tell on the server. */
const notifyWidget = (message) => {
  if (inFrame() && buildfire.messaging && typeof buildfire.messaging.sendMessageToWidget === 'function') {
    buildfire.messaging.sendMessageToWidget(message);
  }
};

/** Mirrors addEditMediaController's deepLinkUrl: buildfire.deeplink.createLink({ id }). */
const createDeepLinkUrl = (id) => {
  try {
    return buildfire.deeplink && typeof buildfire.deeplink.createLink === 'function' ? buildfire.deeplink.createLink({ id }) : undefined;
  } catch (err) {
    return undefined;
  }
};

/** Mirrors widget/js/shared/Deeplink.js save(): registers the item's deep link. */
const registerDeeplink = (id, data) => {
  if (buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
    buildfire.deeplink.registerDeeplink({ id, name: data.title, deeplinkData: { id }, imageUrl: data.topImage ? data.topImage : null }, () => {});
  }
};

/** Mirrors widget/js/shared/Deeplink.js deleteById(). */
const unregisterDeeplink = (id) => {
  if (buildfire.deeplink && typeof buildfire.deeplink.unregisterDeeplink === 'function') buildfire.deeplink.unregisterDeeplink(id, () => {});
};

/** Mirrors the SearchEngine factory of control/content/services.js: the item in the app's search, keyed by its id. */
const indexForSearch = (id, data) => {
  const searchEngine = buildfire.services && buildfire.services.searchEngine;
  if (!searchEngine || typeof searchEngine.save !== 'function') return;
  const entry = { key: id, tag: MEDIA_TAG, title: data.title, description: data.summary, imageUrl: data.topImage };
  if (data.deepLinkUrl) entry.data = { deepLinkUrl: data.deepLinkUrl };
  searchEngine.save(entry, () => {});
};

const removeFromSearch = (id) => {
  const searchEngine = buildfire.services && buildfire.services.searchEngine;
  if (searchEngine && typeof searchEngine.delete === 'function') searchEngine.delete({ key: id, tag: MEDIA_TAG }, () => {});
};

/** Mirrors registerAnalytics / unregisterAnalytics of addEditMediaController.js: the item's play or open counters. */
const analyticsEventsFor = (id, data, allowOfflineDownload) => {
  let events = [];
  if (data.videoUrl) {
    events = events.concat([
      { title: `${data.title} Video Play Count`, key: `${id}_videoPlayCount`, description: 'Video Play Count' },
      { title: `${data.title} Continues Video Play Count`, key: `${id}_continuesVideoPlayCount`, description: 'Continues Video Play Count' }
    ]);
    if (allowOfflineDownload) events.push({ title: `${data.title} Video Downloads`, key: `${id}_downloads`, description: 'Video Downloads' });
  }
  if (data.audioUrl) {
    events = events.concat([
      { title: `${data.title} Audio Play Count`, key: `${id}_audioPlayCount`, description: 'Audio Play Count' },
      { title: `${data.title} Continues Audio Play Count`, key: `${id}_continuesAudioPlayCount`, description: 'Continues Audio Play Count' }
    ]);
    if (allowOfflineDownload) events.push({ title: `${data.title} Audio Downloads`, key: `${id}_downloads`, description: 'Audio Downloads' });
  }
  if (!data.videoUrl && !data.audioUrl) {
    events = events.concat([
      { title: `${data.title} Article Open Count`, key: `${id}_articleOpenCount`, description: 'Article Open Count' },
      { title: `${data.title} Continues Article Open Count`, key: `${id}_continuesArticleOpenCount`, description: 'Continues Article Open Count' }
    ]);
  }
  return events;
};

const registerAnalytics = (id, data, allowOfflineDownload) => {
  if (buildfire.analytics && typeof buildfire.analytics.bulkRegisterEvents === 'function') {
    buildfire.analytics.bulkRegisterEvents(analyticsEventsFor(id, data, allowOfflineDownload), { silentNotification: true }, () => {});
  }
};

const unregisterAnalytics = (id, data, allowOfflineDownload) => {
  if (buildfire.analytics && typeof buildfire.analytics.bulkUnregisterEvents === 'function') {
    buildfire.analytics.bulkUnregisterEvents(analyticsEventsFor(id, data, allowOfflineDownload).map((event) => event.key), () => {});
  }
};

/** Mirrors removeViews of addEditMediaController.js: the item's view records are retired when its media changes. */
const resetViews = (id) => {
  ['VIDEO', 'AUDIO', 'Article'].forEach((mediaType) => {
    buildfire.publicData.searchAndUpdate(
      { $and: [{ '$json.mediaId': { $eq: id } }, { '$json.mediaType': mediaType }] },
      { $set: { isActive: false, _buildfire: { index: { string1: `${id}-false` } } } },
      VIEWS_TAG,
      () => {}
    );
  });
};

/** Mirrors the clean-up of mediaHomeController.js deleteMediaItem: the item's comments go with it. */
const deleteComments = (id) => {
  const comments = buildfire.components && buildfire.components.comments;
  if (comments && typeof comments.deleteSummary === 'function') comments.deleteSummary({ itemId: id, deleteComments: true }, () => {});
};

/* ------------------------------------------------------------------ settings */

/** The settings the control panel fills in when nothing is saved (homeController.js, settings.home.controller.js, design.home.controller.js). */
const settingsDefaults = () => ({
  content: {
    images: [],
    descriptionHTML: '',
    description: '',
    sortBy: 'Newest',
    sortCategoriesBy: 'Newest',
    rankOfLastItem: 0,
    allowShare: true,
    allowFavorites: true,
    allowAddingNotes: true,
    allowSource: true,
    allowOfflineDownload: false,
    enableFiltering: false,
    showViewCount: false,
    indicatePlayedItems: false,
    globalPlaylist: false,
    showGlobalAddAllToPlaylistButton: false,
    showGlobalPlaylistNavButton: false,
    autoPlay: false,
    autoPlayDelay: { label: 'Off', value: 0 },
    shuffleAudioListItems: false,
    forceAutoPlay: false,
    startWithAutoJumpByDefault: false
  },
  design: {
    listLayout: 'list-1',
    itemLayout: 'item-1',
    backgroundImage: '',
    skipMediaPage: false
  }
});

const withDefaults = (data) => {
  const defaults = settingsDefaults();
  const stored = data || {};
  return Object.assign({}, stored, {
    content: Object.assign({}, defaults.content, stored.content || {}),
    design: Object.assign({}, defaults.design, stored.design || {})
  });
};

/**
 * The plugin's one settings record. A new instance has none; the control panel's first save then also writes its migration flags, so its own one-off data migrations never run on records the contract made.
 * @param {function(Error=, object=)} callback - (error, { data, isNew })
 */
const readSettings = (callback) => {
  buildfire.datastore.get(SETTINGS_TAG, (err, record) => {
    if (err && err.code !== 'NOTFOUND') return callback(err, undefined);
    const stored = record && record.data && Object.keys(record.data).length ? record.data : null;
    if (stored) return callback(null, { data: withDefaults(stored), isNew: false });
    const data = withDefaults({ indexingUpdateDone: true, indexingUpdateDoneV2: true });
    data.content.dateIndexed = true;
    data.content.dateCreatedIndexed = true;
    data.content.rankofLastCategory = 0;
    callback(null, { data, isNew: true });
  });
};

/** Mirrors widget.home.controller.js updateGetOptions: the sort the app lists media items in. */
const mediaSort = (content) => {
  const order = content.sortBy || 'Manually';
  const titleKey = content.updatedRecords ? 'titleIndex' : 'title';
  const dateKey = content.dateIndexed ? 'mediaDateIndex' : 'mediaDate';
  const sorts = {
    'Manually': { rank: 1 },
    'Media Title A-Z': { [titleKey]: 1 },
    'Media Title Z-A': { [titleKey]: -1 },
    'Media Date Asc': { [dateKey]: 1 },
    'Media Date Desc': { [dateKey]: -1 },
    'Newest': { dateCreated: -1 },
    'Oldest': { dateCreated: 1 },
    'Most': { title: 1 },
    'Least': { title: -1 }
  };
  const sort = Object.assign({}, sorts[order] || sorts.Manually);
  if (!sort.rank) sort.rank = 1;
  return sort;
};

/** Mirrors widget.filters.controller.js: the sort the app lists categories in. */
const categorySort = (content) => {
  const order = content.sortCategoriesBy || 'Manually';
  const sorts = {
    'Manually': { rank: 1 },
    'Category Title A-Z': { titleIndex: 1 },
    'Category Title Z-A': { titleIndex: -1 },
    'Newest': { createdOn: -1 },
    'Oldest': { createdOn: 1 }
  };
  const sort = Object.assign({}, sorts[order] || sorts.Manually);
  if (!sort.rank) sort.rank = 1;
  return sort;
};

/* ------------------------------------------------------------------ media items */

/** A media item as the contract reports it: the stored fields under the names the operations take. */
const toMediaItem = (record) => {
  const data = record.data || {};
  return {
    id: record.id,
    title: data.title,
    summary: data.summary,
    body: data.body,
    sourceUrl: data.srcUrl,
    videoUrl: data.videoUrl,
    audioTitle: data.audioTitle,
    artists: data.artists,
    audioUrl: data.audioUrl,
    thumbnailImage: data.topImage,
    audioImage: data.image,
    audioBackgroundImage: data.backgroundImage,
    mediaDate: toIso(data.mediaDate),
    actionLinks: data.links || [],
    categoryIds: data.categories || [],
    subcategoryIds: data.subcategories || [],
    rank: data.rank,
    createdOn: toIso(data.dateCreated),
    deepLinkUrl: data.deepLinkUrl
  };
};

const mediaEventData = (id, data) => ({
  mediaItemId: id,
  title: data.title,
  summary: data.summary || null,
  thumbnailImage: data.topImage || null,
  videoUrl: data.videoUrl || null,
  audioUrl: data.audioUrl || null,
  mediaDate: toIso(data.mediaDate),
  createdAt: toIso(data.dateCreated)
});

/**
 * The fields a create or an update asks for. On create, a param left out is simply not set (the form's empty default); on update, left out keeps the stored value, null or '' clears a text field, null or [] an image or the actions, and any other valid value sets it. The title is required by the plugin's form, so it can be changed but never cleared.
 * @param {object} options
 * @param {boolean} isUpdate - update params carry the "new" prefix
 * @returns {{ changes?: object, error?: string }}
 */
const collectMediaChanges = (options, isUpdate) => {
  const changes = {};
  const titleName = isUpdate ? 'newTitle' : 'title';
  if (!isUpdate || options.newTitle !== undefined) {
    const error = checkText(options[titleName], titleName, 70);
    if (error) return { error: isUpdate && (options.newTitle === null || options.newTitle === '') ? 'newTitle cannot be removed; pass a non-empty title' : error };
    changes.title = options[titleName];
  }
  for (const [createName, updateName, field, max] of MEDIA_TEXT_FIELDS) {
    const name = isUpdate ? updateName : createName;
    const value = options[name];
    if (value === undefined) continue;
    if (value === null && isUpdate) {
      changes[field] = null;
      continue;
    }
    if (typeof value !== 'string') return { error: `${name} must be text${isUpdate ? ', null or an empty text to remove it' : ''}` };
    if (max && value.length > max) return { error: `${name} must be at most ${max} characters` };
    changes[field] = value;
  }
  const bodyName = isUpdate ? 'newBody' : 'body';
  if (options[bodyName] !== undefined) {
    if (options[bodyName] !== null && typeof options[bodyName] !== 'string') return { error: `${bodyName} must be formatted text (HTML)` };
    if (options[bodyName] === null && !isUpdate) return { error: `${bodyName} must be formatted text (HTML)` };
    // The editor saves the body twice, as body and bodyHTML (updateItemData / addNewItem).
    changes.body = options[bodyName];
    changes.bodyHTML = options[bodyName];
  }
  for (const [createName, updateName, field] of MEDIA_IMAGE_FIELDS) {
    const name = isUpdate ? updateName : createName;
    const value = options[name];
    if (value === undefined) continue;
    // The plugin keeps one URL per image field and stores a removed image as '' (removeListImage and friends).
    if (value === null && isUpdate) {
      changes[field] = '';
      continue;
    }
    const { images, error } = readImageList(value, { name, minValue: 0, maxValue: 1 });
    if (error) return { error };
    changes[field] = images.length ? images[0] : '';
  }
  const dateName = isUpdate ? 'newMediaDate' : 'mediaDate';
  if (options[dateName] !== undefined) {
    const { date, error } = readDate(options[dateName], dateName);
    if (error) return { error };
    changes.mediaDate = date.toISOString();
    changes.mediaDateIndex = date.getTime();
  }
  const linksName = isUpdate ? 'newActionLinks' : 'actionLinks';
  if (options[linksName] !== undefined) {
    if (options[linksName] === null && isUpdate) {
      changes.links = [];
    } else {
      const { actions, error } = readActionList(options[linksName], linksName);
      if (error) return { error };
      changes.links = actions;
    }
  }
  if (isUpdate && options.resetViews !== undefined && typeof options.resetViews !== 'boolean') return { error: 'resetViews must be true or false' };
  if (isUpdate && !Object.keys(changes).length) {
    return { error: 'Pass at least one of newTitle, newSummary, newBody, newSourceUrl, newVideoUrl, newAudioTitle, newArtists, newAudioUrl, newThumbnailImage, newAudioImage, newAudioBackgroundImage, newMediaDate or newActionLinks' };
  }
  return { changes };
};

/**
 * Adds one media item the way the control panel's Save does for a new item (addEditMediaController.js addNewItem): the form's defaults, then the insert, then its analytics counters, its place in the app search and its deep link. Shared by createMediaItem and createMediaItemsAdvanced.
 * @param {object} changes - checked fields from collectMediaChanges
 * @param {object} content - the settings' content, for the rank and the download counters
 */
const insertMediaItem = (changes, content, callback) => {
  const now = new Date();
  const data = Object.assign({
    topImage: '',
    summary: '',
    title: '',
    body: '',
    bodyHTML: '',
    srcUrl: '',
    audioUrl: '',
    videoUrl: '',
    image: '',
    mediaDate: now.toISOString(),
    mediaDateIndex: now.getTime(),
    // The form starts every new item at the settings' rankOfLastItem + 10.
    rank: (content.rankOfLastItem || 0) + 10,
    links: [],
    searchEngineId: '',
    allowShare: true,
    allowAddingNotes: true,
    allowSource: true,
    forceAutoPlay: false
  }, changes);
  data.titleIndex = data.title.toLowerCase();
  data.dateCreated = now.getTime();

  buildfire.datastore.insert(data, MEDIA_TAG, false, (err, record) => {
    if (err) return callback(err, undefined);
    if (!record || !record.id) return callback(new Error('The media item was not saved'), undefined);
    // Like the control panel, the deep link is computed for the search index and the result, not written back.
    const saved = Object.assign({}, record.data || data, { deepLinkUrl: createDeepLinkUrl(record.id) });
    registerAnalytics(record.id, saved, content.allowOfflineDownload);
    indexForSearch(record.id, saved);
    registerDeeplink(record.id, saved);
    sendEvent('mediaItemCreated', mediaEventData(record.id, saved));
    callback(null, toMediaItem({ id: record.id, data: saved }));
  });
};

/**
 * Changes one media item the way the control panel's Save does for an existing item (addEditMediaController.js updateItemData / updateData): the stored record merged with the changes, its title index and deep link kept in step; when its video or audio link changes, its analytics counters are re-registered and, as the plugin does, its view count restarts — unless the caller says otherwise. Shared by updateMediaItem, updateMediaItemAdvanced, updateMediaItemsAdvanced and the category toggles.
 * @param {{ id: string, data: object }} record - the item as stored
 * @param {object} changes - checked fields
 * @param {boolean=} resetViewsChoice - true / false, or undefined for the plugin's own choice
 */
const applyMediaUpdate = (record, changes, resetViewsChoice, callback) => {
  readSettings((settingsErr, settings) => {
    if (settingsErr) return callback(settingsErr, undefined);
    const content = settings.data.content;
    const previous = record.data;
    const data = Object.assign({}, previous, changes);
    if (data.title) data.titleIndex = data.title.toLowerCase();
    if (!data.deepLinkUrl) data.deepLinkUrl = createDeepLinkUrl(record.id);
    const mediaChanged = (previous.videoUrl || '') !== (data.videoUrl || '') || (previous.audioUrl || '') !== (data.audioUrl || '');

    buildfire.datastore.update(record.id, data, MEDIA_TAG, (err, result) => {
      if (err) return callback(err, undefined);
      const saved = (result && result.data) || data;
      if (mediaChanged) {
        // With view counts hidden the plugin restarts them without asking; with them shown it asks, and keeping them is the safe answer.
        const shouldReset = resetViewsChoice === undefined ? !content.showViewCount : resetViewsChoice;
        if (shouldReset) resetViews(record.id);
        unregisterAnalytics(record.id, previous, content.allowOfflineDownload);
      }
      registerAnalytics(record.id, saved, content.allowOfflineDownload);
      indexForSearch(record.id, saved);
      registerDeeplink(record.id, saved);
      notifyWidget({ name: 'ITEMS_CHANGE', message: { itemUpdatedData: { id: record.id, data: saved } } });
      sendEvent('mediaItemUpdated', Object.assign(mediaEventData(record.id, saved), { previousTitle: previous.title || null }));
      callback(null, toMediaItem({ id: record.id, data: saved }));
    });
  });
};

/** Mirrors mediaHomeController.js deleteMediaItem: out of the app search, its deep link and comments gone, the record deleted. */
const removeMediaItem = (record, callback) => {
  buildfire.datastore.delete(record.id, MEDIA_TAG, (err) => {
    if (err) return callback(err, undefined);
    removeFromSearch(record.id);
    unregisterDeeplink(record.id);
    deleteComments(record.id);
    sendEvent('mediaItemDeleted', { mediaItemId: record.id, title: record.data.title || null });
    callback(null, { id: record.id, title: record.data.title, deleted: true });
  });
};

/** The category (and optional subcategory) a basic call named, resolved to ids. */
const resolveCategoryHandles = (categoryName, subcategoryName, callback) => {
  findOne(CATEGORIES_TAG, 'name', categoryName, 'category', (err, category) => {
    if (err) return callback(err, undefined);
    if (subcategoryName === undefined) return callback(null, { category, subcategoryId: undefined });
    resolveSubcategory(category, subcategoryName, (subErr, subcategory) => {
      if (subErr) return callback(subErr, undefined);
      callback(null, { category, subcategoryId: subcategory.id });
    });
  });
};

/** The category (and optional subcategory) an advanced call named by id, checked to exist. */
const requireCategoryHandles = (categoryId, subcategoryId, callback) => {
  requireById(CATEGORIES_TAG, categoryId, 'category', (err, category) => {
    if (err) return callback(err, undefined);
    if (subcategoryId === undefined) return callback(null, { category, subcategoryId: undefined });
    const found = (category.data.subcategories || []).some((subcategory) => subcategory.id === subcategoryId);
    if (!found) return callback(new Error(`Category "${category.data.name}" has no subcategory with id "${subcategoryId}"`), undefined);
    callback(null, { category, subcategoryId });
  });
};

/** Mirrors pickCategory / pickSubcategory of addEditMediaController.js, made idempotent: in puts the item in, out takes it out. */
const categoryChanges = (data, category, subcategoryId, included) => {
  const categories = (data.categories || []).slice();
  let subcategories = (data.subcategories || []).slice();
  if (included) {
    if (categories.indexOf(category.id) === -1) categories.push(category.id);
    if (subcategoryId && subcategories.indexOf(subcategoryId) === -1) subcategories.push(subcategoryId);
  } else if (subcategoryId) {
    subcategories = subcategories.filter((id) => id !== subcategoryId);
  } else {
    // Taking an item out of a category also takes it out of that category's subcategories.
    const ownIds = (category.data.subcategories || []).map((subcategory) => subcategory.id);
    const index = categories.indexOf(category.id);
    if (index !== -1) categories.splice(index, 1);
    subcategories = subcategories.filter((id) => ownIds.indexOf(id) === -1);
  }
  return { categories, subcategories };
};

const checkIncluded = (options) => (typeof options.included === 'boolean' ? null : 'included must be true or false');

/** Moves one record to a position of a manual order and renumbers the ranks that changed, 1 for the first place (mediaHomeController.js / categoryHomeController.js onOrderChange). */
const moveInRankOrder = (tag, records, id, position, callback) => {
  if (position > records.length) return callback(new Error(`position must be from 1 to ${records.length}`), undefined);
  const ordered = records.slice();
  const from = ordered.findIndex((record) => record.id === id);
  const [moved] = ordered.splice(from, 1);
  ordered.splice(position - 1, 0, moved);
  const changed = ordered.map((record, index) => ({ record, rank: index + 1 })).filter(({ record, rank }) => record.data.rank !== rank);
  let pending = changed.length;
  let firstError = null;
  if (!pending) return callback(null, Object.assign({}, moved, { data: Object.assign({}, moved.data, { rank: position }) }));
  changed.forEach(({ record, rank }) => {
    buildfire.datastore.update(record.id, { $set: { rank } }, tag, (err) => {
      if (err && !firstError) firstError = err;
      if (--pending) return;
      if (firstError) return callback(firstError, undefined);
      callback(null, Object.assign({}, moved, { data: Object.assign({}, moved.data, { rank: position }) }));
    });
  });
};

/** Every record of a tag in its manual order: by rank, ties by when they were added. */
const allInRankOrder = (tag, createdField, callback) => {
  searchAll(tag, {}, { rank: 1 }, (err, records) => {
    if (err) return callback(err, undefined);
    records.sort((a, b) => ((a.data.rank || 0) - (b.data.rank || 0)) || (new Date(a.data[createdField] || 0) - new Date(b.data[createdField] || 0)));
    callback(null, records);
  });
};

/* ------------------------------------------------------------------ categories */

const toCategory = (record) => {
  const data = record.data || {};
  return {
    id: record.id,
    name: data.name,
    icon: data.icon,
    subcategorySortOrder: data.sortBy,
    rank: data.rank,
    createdOn: toIso(data.createdOn),
    lastUpdatedOn: toIso(data.lastUpdatedOn),
    subcategories: (data.subcategories || []).map((subcategory) => ({ id: subcategory.id, name: subcategory.name, rank: subcategory.rank }))
  };
};

/** Mirrors ContentCategory.sort of addEditCategoryController.js: the subcategories in the category's chosen order. */
const sortSubcategories = (subcategories, sortBy) => {
  const sorters = {
    'Subcategory Title A-Z': (a, b) => String(a.name).localeCompare(String(b.name)),
    'Subcategory Title Z-A': (a, b) => String(b.name).localeCompare(String(a.name)),
    'Manually': (a, b) => (a.rank || 0) - (b.rank || 0),
    'Newest': (a, b) => new Date(b.createdOn || 0) - new Date(a.createdOn || 0),
    'Oldest': (a, b) => new Date(a.createdOn || 0) - new Date(b.createdOn || 0)
  };
  if (sorters[sortBy]) subcategories.sort(sorters[sortBy]);
};

const readIcon = (value, name, isUpdate) => {
  // The icon picker allows a picture or one of BuildFire's icons, stored as one value; a removed icon is stored as ''.
  if (value === null && isUpdate) return { icon: '' };
  const { images, error } = readImageList(value, { name, minValue: 0, maxValue: 1 });
  if (error) return { error };
  return { icon: images.length ? images[0] : '' };
};

/** The changes a category update asks for: name (never cleared), icon (null or [] removes it), subcategory order. */
const collectCategoryChanges = (options) => {
  const changes = {};
  if (options.newName !== undefined) {
    if (typeof options.newName !== 'string' || !options.newName.trim()) return { error: 'newName cannot be removed; pass a non-empty name' };
    changes.name = options.newName.trim();
  }
  if (options.newIcon !== undefined) {
    const { icon, error } = readIcon(options.newIcon, 'newIcon', true);
    if (error) return { error };
    changes.icon = icon;
  }
  if (options.newSubcategorySortOrder !== undefined) {
    if (SUBCATEGORY_SORT_ORDERS.indexOf(options.newSubcategorySortOrder) === -1) return { error: `newSubcategorySortOrder must be one of: ${SUBCATEGORY_SORT_ORDERS.join(', ')}` };
    changes.sortBy = options.newSubcategorySortOrder;
  }
  if (!Object.keys(changes).length) return { error: 'Pass at least one of newName, newIcon or newSubcategorySortOrder' };
  return { changes };
};

/** The checked fields of a new category. */
const collectNewCategory = (options) => {
  const error = checkText(options.name, 'name');
  if (error) return { error };
  const category = { name: options.name.trim() };
  if (options.icon !== undefined) {
    const read = readIcon(options.icon, 'icon', false);
    if (read.error) return { error: read.error };
    category.icon = read.icon;
  }
  if (options.subcategorySortOrder !== undefined) {
    if (SUBCATEGORY_SORT_ORDERS.indexOf(options.subcategorySortOrder) === -1) return { error: `subcategorySortOrder must be one of: ${SUBCATEGORY_SORT_ORDERS.join(', ')}` };
    category.sortBy = options.subcategorySortOrder;
  }
  return { category };
};

/** Mirrors Categories.addCategory with widget/js/data/Category.js: a new category with the add form's defaults, stamped with who added it. */
const insertCategory = (fields, callback) => {
  currentUser((user) => {
    const now = new Date().toISOString();
    const data = {
      icon: fields.icon || '',
      name: fields.name,
      subcategories: [],
      sortBy: fields.sortBy || 'Newest',
      rank: 0,
      createdOn: now,
      createdBy: user,
      lastUpdatedOn: now,
      lastUpdatedBy: '',
      deletedOn: '',
      deletedBy: '',
      titleIndex: fields.name.toLowerCase()
    };
    buildfire.datastore.insert(data, CATEGORIES_TAG, false, (err, record) => {
      if (err) return callback(err, undefined);
      if (!record || !record.id) return callback(new Error('The category was not saved'), undefined);
      notifyWidget({ name: 'CATEGORIES_CHANGE', message: {} });
      callback(null, toCategory({ id: record.id, data: record.data || data }));
    });
  });
};

/** Mirrors ContentCategory.updateItem for an existing category: the whole category saved back, stamped with when and by whom, then the widget told. */
const saveCategory = (record, data, callback) => {
  currentUser((user) => {
    const saved = Object.assign({}, data, {
      id: record.id,
      name: String(data.name).trim(),
      titleIndex: String(data.name).trim().toLowerCase(),
      lastUpdatedOn: new Date().toISOString(),
      lastUpdatedBy: user
    });
    buildfire.datastore.update(record.id, saved, CATEGORIES_TAG, (err, result) => {
      if (err) return callback(err, undefined);
      notifyWidget({ name: 'CATEGORIES_CHANGE', message: {} });
      callback(null, toCategory({ id: record.id, data: (result && result.data) || saved }));
    });
  });
};

const applyCategoryUpdate = (record, changes, callback) => {
  const data = Object.assign({}, record.data, changes);
  if (changes.sortBy) {
    // Picking a subcategory order re-sorts the list and stores the choice twice (toggleSortOrder).
    data.sortByValue = changes.sortBy;
    data.subcategories = (data.subcategories || []).slice();
    sortSubcategories(data.subcategories, changes.sortBy);
  }
  saveCategory(record, data, callback);
};

const removeCategory = (record, callback) => {
  buildfire.datastore.delete(record.id, CATEGORIES_TAG, (err) => {
    if (err) return callback(err, undefined);
    callback(null, { id: record.id, name: record.data.name, deleted: true });
  });
};

/* ------------------------------------------------------------------ subcategories */

/** The one subcategory of a category with this exact name; several are refused. */
const resolveSubcategory = (category, name, callback) => {
  const found = (category.data.subcategories || []).filter((subcategory) => subcategory.name === name);
  if (!found.length) return callback(new Error(`Category "${category.data.name}" has no subcategory named "${name}"`), undefined);
  if (found.length > 1) return callback(new Error(`${found.length} subcategories of "${category.data.name}" are named "${name}"`), undefined);
  callback(null, found[0]);
};

const requireSubcategoryById = (category, subcategoryId, callback) => {
  const found = (category.data.subcategories || []).find((subcategory) => subcategory.id === subcategoryId);
  if (!found) return callback(new Error(`Category "${category.data.name}" has no subcategory with id "${subcategoryId}"`), undefined);
  callback(null, found);
};

/** Mirrors showSubcategoryModal of addEditCategoryController.js: a new subcategory at the end of the list, then the category saved. */
const addSubcategory = (category, name, callback) => {
  currentUser((user) => {
    const subcategories = (category.data.subcategories || []).slice();
    const subcategory = { name, id: nanoid(), rank: subcategories.length + 1, createdBy: user || '' };
    subcategories.push(subcategory);
    saveCategory(category, Object.assign({}, category.data, { subcategories }), (err, saved) => {
      if (err) return callback(err, undefined);
      callback(null, { id: subcategory.id, name, rank: subcategory.rank, category: saved });
    });
  });
};

const renameSubcategory = (category, subcategoryId, newName, callback) => {
  const subcategories = (category.data.subcategories || []).map((subcategory) => (subcategory.id === subcategoryId ? Object.assign({}, subcategory, { name: newName }) : subcategory));
  saveCategory(category, Object.assign({}, category.data, { subcategories }), (err, saved) => {
    if (err) return callback(err, undefined);
    const renamed = subcategories.find((subcategory) => subcategory.id === subcategoryId);
    callback(null, { id: subcategoryId, name: newName, rank: renamed.rank, category: saved });
  });
};

/** Mirrors removeSubcategory: the subcategory leaves the category's list (media items keep the id until the control panel next opens them, as in the plugin). */
const removeSubcategory = (category, subcategoryId, callback) => {
  const removed = (category.data.subcategories || []).find((subcategory) => subcategory.id === subcategoryId);
  const subcategories = (category.data.subcategories || []).filter((subcategory) => subcategory.id !== subcategoryId);
  saveCategory(category, Object.assign({}, category.data, { subcategories }), (err, saved) => {
    if (err) return callback(err, undefined);
    callback(null, { id: subcategoryId, name: removed.name, deleted: true, category: saved });
  });
};

/** Mirrors onOrderChange of addEditCategoryController.js: the list reordered, every subcategory ranked by its place, counting from 0. */
const moveSubcategory = (category, subcategoryId, position, callback) => {
  const subcategories = (category.data.subcategories || []).slice();
  if (position > subcategories.length) return callback(new Error(`position must be from 1 to ${subcategories.length}`), undefined);
  const from = subcategories.findIndex((subcategory) => subcategory.id === subcategoryId);
  const [moved] = subcategories.splice(from, 1);
  subcategories.splice(position - 1, 0, moved);
  const ranked = subcategories.map((subcategory, index) => Object.assign({}, subcategory, { rank: index }));
  saveCategory(category, Object.assign({}, category.data, { subcategories: ranked }), callback);
};

const checkSubcategoryName = (value, name) => checkText(value, name);

/** Mirrors mediaHomeController.js onOrderChange for one item: every item in rank order, the item moved, then the widget sent back to its list. */
const moveMediaItem = (record, position, callback) => {
  allInRankOrder(MEDIA_TAG, 'dateCreated', (err, records) => {
    if (err) return callback(err, undefined);
    moveInRankOrder(MEDIA_TAG, records, record.id, position, (moveErr, moved) => {
      if (moveErr) return callback(moveErr, undefined);
      notifyWidget({ name: 'ROUTE_CHANGE', message: { path: 'HOME' } });
      callback(null, toMediaItem(moved));
    });
  });
};

/** Mirrors categoryHomeController.js onOrderChange for one category. */
const moveCategory = (record, position, callback) => {
  allInRankOrder(CATEGORIES_TAG, 'createdOn', (err, records) => {
    if (err) return callback(err, undefined);
    moveInRankOrder(CATEGORIES_TAG, records, record.id, position, (moveErr, moved) => {
      if (moveErr) return callback(moveErr, undefined);
      callback(null, toCategory(moved));
    });
  });
};

/* ------------------------------------------------------------------ batches */

/**
 * Runs a batch: every entry validated first (nothing written if any is invalid), every id resolved first (nothing written if any is unknown), then each entry applied in turn through the single operation's own implementation, recording every outcome.
 * @param {object} options
 * @param {string} listName - the list param, also the result's key
 * @param {function(object): string|null} validate - the single operation's checks for one entry
 * @param {function(object): string|null} duplicateKey - what makes two entries the same target, or null when entries have none
 * @param {function(object, function)} resolve - entry → checked target, (error, target)
 * @param {function(object, object, function)} apply - (entry, target, callback(error, result)) through the shared implementation
 * @param {function(object): string} idOf - the id a successful result reports
 */
const runBatch = (options, callback, { listName, validate, duplicateKey, resolve, apply, idOf }) => {
  if (!requireOptions(options, callback)) return;
  const entries = options[listName];
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > BATCH_LIMIT) {
    return fail(callback, `${listName} must be a list of 1 to ${BATCH_LIMIT} entries`);
  }
  const invalid = entries.map((entry, index) => {
    if (!isPlainObject(entry)) return `entry ${index}: must be an object`;
    const error = validate(entry);
    return error ? `entry ${index}: ${error}` : null;
  }).filter(Boolean);
  if (invalid.length) return fail(callback, `Invalid entries: ${invalid.join('; ')}`);
  if (duplicateKey) {
    const keys = entries.map(duplicateKey);
    if (new Set(keys).size !== keys.length) return fail(callback, `The same target is listed more than once in ${listName}`);
  }

  const targets = [];
  const unknown = [];
  let pending = entries.length;
  const applyAll = () => {
    if (unknown.length) return fail(callback, `Not found: ${unknown.join('; ')}`);
    const results = [];
    const applyNext = (index) => {
      if (index === entries.length) {
        const failed = results.filter((result) => result.error).length;
        return callback(null, { [listName]: results, succeeded: results.length - failed, failed });
      }
      apply(entries[index], targets[index], (err, result) => {
        results.push({ index, id: err ? null : idOf(result), error: err ? String(err.message || err) : null });
        applyNext(index + 1);
      });
    };
    applyNext(0);
  };
  entries.forEach((entry, index) => {
    resolve(entry, (err, target) => {
      if (err) unknown.push(`entry ${index}: ${err.message || err}`);
      else targets[index] = target;
      if (--pending === 0) applyAll();
    });
  });
};

const noTarget = (entry, callback) => callback(null, null);

/* ------------------------------------------------------------------ the contract */

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
   * hosts: widgetBackground, controlBackground, headlessSdk. Lists media items the way the app's home list does (widget.home.controller.js updateGetOptions / loadMore): sorted by the owner's chosen order, narrowed by the control panel's title search ($regex on title, case-insensitive) and by the app's category filter ($json.categories / $json.subcategories). Multi-step over the SDK: the settings decide the sort and category names are resolved to ids before the search, which is why it is not a declarative operation. Uses only buildfire.datastore reads, which behave the same in both frames and on the server; nothing about it needs to be watched, so Background.
   * @param {{ title?: string, categoryName?: string, subcategoryName?: string, page?: number, pageSize?: number }} options
   * @param {function(Error=, object=)} callback - (error, { mediaItems, total, page, hasMore })
   */
  searchMediaItems(options, callback) {
    if (!requireOptions(options, callback)) return;
    const { page, pageSize, error } = readPaging(options);
    if (error) return fail(callback, error);
    for (const name of ['title', 'categoryName', 'subcategoryName']) {
      if (options[name] !== undefined && (typeof options[name] !== 'string' || !options[name].trim())) return fail(callback, `${name} must be non-empty text`);
    }
    if (options.subcategoryName !== undefined && options.categoryName === undefined) return fail(callback, 'subcategoryName needs categoryName, the category it belongs to');

    const withCategory = (next) => {
      if (options.categoryName === undefined) return next(null, null);
      resolveCategoryHandles(options.categoryName, options.subcategoryName, next);
    };
    withCategory((categoryErr, handles) => {
      if (categoryErr) return callback(categoryErr, undefined);
      readSettings((settingsErr, settings) => {
        if (settingsErr) return callback(settingsErr, undefined);
        const clauses = [];
        if (options.title !== undefined) clauses.push({ '$json.title': { $regex: escapeRegex(options.title.trim()), $options: 'i' } });
        if (handles) {
          clauses.push(handles.subcategoryId ? { '$json.subcategories': handles.subcategoryId } : { '$json.categories': handles.category.id });
        }
        const filter = clauses.length ? { $and: clauses } : {};
        buildfire.datastore.search({ filter, sort: mediaSort(settings.data.content), page, pageSize, recordCount: true }, MEDIA_TAG, (err, response) => {
          if (err) return callback(err, undefined);
          const records = ((response && response.result) || []).filter(Boolean);
          const total = (response && response.totalRecord) || 0;
          callback(null, { mediaItems: records.map(toMediaItem), total, page, hasMore: (page + 1) * pageSize < total });
        });
      });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. One media item, named by its exact title, as the app's item page shows it. Resolving the title is a search, which is why this is a function. Uses only buildfire.datastore reads, the same in both frames and on the server; Background, nothing to watch. usage: basic; its advanced alternative is getMediaItemAdvanced.
   * @param {{ title: string }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  getMediaItem(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    findOne(MEDIA_TAG, 'title', options.title, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      callback(null, toMediaItem(record));
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. usage: advanced; the alternative of getMediaItem, taking the item's id. Checks the id names an item, since the store answers an empty record for an unknown id. Same hosts and reasons as getMediaItem.
   * @param {{ mediaItemId: string }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  getMediaItemAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaItemId'], callback)) return;
    requireById(MEDIA_TAG, options.mediaItemId, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      callback(null, toMediaItem(record));
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Adds a media item as the control panel's item form does (addEditMediaController.js addNewItem): reads the settings for the starting rank, inserts the item with the form's defaults, then starts its analytics counters, app search entry and deep link, and fires mediaItemCreated. Multi-step over the SDK, which is why it is not a declarative insert. No widget host: app users must not change the owner's content (the app's datastore is read-only). Background: adding content to the list contacts nobody. Server-safe: buildfire.datastore behaves the same there.
   * @param {{ title: string, summary?: string, body?: string, sourceUrl?: string, videoUrl?: string, audioTitle?: string, artists?: string, audioUrl?: string, thumbnailImage?: string[], audioImage?: string[], audioBackgroundImage?: string[], mediaDate?: string, actionLinks?: object[] }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  createMediaItem(options, callback) {
    if (!requireOptions(options, callback)) return;
    const { changes, error } = collectMediaChanges(options, false);
    if (error) return fail(callback, error);
    readSettings((err, settings) => {
      if (err) return callback(err, undefined);
      insertMediaItem(changes, settings.data.content, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced (batches are never basic). The batch form of createMediaItem, as the control panel's CSV import adds many at once: validates every entry with createMediaItem's checks before writing anything, then adds each through insertMediaItem, so every item gets exactly what createMediaItem does. A failed write is reported per entry; it does not stop the rest. Same hosts and reasons as createMediaItem.
   * @param {{ mediaItems: object[] }} options
   * @param {function(Error=, object=)} callback - (error, { mediaItems, succeeded, failed })
   */
  createMediaItemsAdvanced(options, callback) {
    let content = null;
    runBatch(options, callback, {
      listName: 'mediaItems',
      validate: (entry) => collectMediaChanges(entry, false).error || null,
      duplicateKey: null,
      resolve: noTarget,
      apply: (entry, target, done) => {
        const insert = () => insertMediaItem(collectMediaChanges(entry, false).changes, content, done);
        if (content) return insert();
        readSettings((err, settings) => {
          if (err) return done(err);
          content = settings.data.content;
          insert();
        });
      },
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Edits one media item, named by its exact current title, changing only the fields passed, through applyMediaUpdate (the control panel's Save on an existing item, with its analytics, search, deep link and view-count steps) and fires mediaItemUpdated. Resolving the title is a search and the save is several calls, which is why it is a function. No widget host: app users must not change the owner's content. Background: nothing to watch. Server-safe. usage: basic; its advanced alternative is updateMediaItemAdvanced.
   * @param {{ title: string, newTitle?: string, newSummary?: string|null, newBody?: string|null, newSourceUrl?: string|null, newVideoUrl?: string|null, newAudioTitle?: string|null, newArtists?: string|null, newAudioUrl?: string|null, newThumbnailImage?: string[]|null, newAudioImage?: string[]|null, newAudioBackgroundImage?: string[]|null, newMediaDate?: string, newActionLinks?: object[]|null, resetViews?: boolean }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  updateMediaItem(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    const { changes, error } = collectMediaChanges(options, true);
    if (error) return fail(callback, error);
    findOne(MEDIA_TAG, 'title', options.title, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      applyMediaUpdate(record, changes, options.resetViews, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateMediaItem, taking the item's id. Same checks and effect through applyMediaUpdate; it checks the id exists instead of searching.
   * @param {{ mediaItemId: string }} options - plus updateMediaItem's change params
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  updateMediaItemAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaItemId'], callback)) return;
    const { changes, error } = collectMediaChanges(options, true);
    if (error) return fail(callback, error);
    requireById(MEDIA_TAG, options.mediaItemId, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      applyMediaUpdate(record, changes, options.resetViews, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of updateMediaItemAdvanced: each entry names its item by id. Validates every entry and checks every id before writing anything, refuses the same item twice, then applies each through applyMediaUpdate. Same hosts and reasons as updateMediaItem.
   * @param {{ mediaItems: object[] }} options
   * @param {function(Error=, object=)} callback - (error, { mediaItems, succeeded, failed })
   */
  updateMediaItemsAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'mediaItems',
      validate: (entry) => checkText(entry.mediaItemId, 'mediaItemId') || collectMediaChanges(entry, true).error || null,
      duplicateKey: (entry) => entry.mediaItemId,
      resolve: (entry, done) => requireById(MEDIA_TAG, entry.mediaItemId, 'media item', done),
      apply: (entry, record, done) => applyMediaUpdate(record, collectMediaChanges(entry, true).changes, entry.resetViews, done),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Permanently deletes one media item, named by its exact title, as the control panel's delete does (mediaHomeController.js deleteMediaItem): the record goes, and with it its app search entry and deep link, and its comments where the comments component is loaded (not in the contract frames); fires mediaItemDeleted. Resolving the title is a search, which is why it is a function. No widget host: app users must not remove the owner's content. Background: nothing to watch; the owner is asked by the MCP server through the dangerous flag. Server-safe. usage: basic; its advanced alternative is deleteMediaItemAdvanced.
   * @param {{ title: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, title, deleted })
   */
  deleteMediaItem(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    findOne(MEDIA_TAG, 'title', options.title, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      removeMediaItem(record, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of deleteMediaItem, taking the item's id, checked to exist before anything is deleted.
   * @param {{ mediaItemId: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, title, deleted })
   */
  deleteMediaItemAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaItemId'], callback)) return;
    requireById(MEDIA_TAG, options.mediaItemId, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      removeMediaItem(record, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of deleteMediaItemAdvanced: checks every id before deleting anything, refuses the same item twice, then deletes each through removeMediaItem. Same hosts and reasons as deleteMediaItem.
   * @param {{ mediaItems: Array<{ mediaItemId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { mediaItems, succeeded, failed })
   */
  deleteMediaItemsAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'mediaItems',
      validate: (entry) => checkText(entry.mediaItemId, 'mediaItemId'),
      duplicateKey: (entry) => entry.mediaItemId,
      resolve: (entry, done) => requireById(MEDIA_TAG, entry.mediaItemId, 'media item', done),
      apply: (entry, record, done) => removeMediaItem(record, done),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Moves one media item, named by its exact title, to a place in the manual order, as dragging it in the control panel's list does (mediaHomeController.js onOrderChange): every item is read in rank order (50 a page), the item moved, and each rank that changed rewritten, 1 for the first place. Only the rank is written ($set), not the list row the control panel writes back. No widget host: the order is the owner's. Background; server-safe. usage: basic; its advanced alternative is updateMediaItemOrderAdvanced.
   * @param {{ title: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  updateMediaItemOrder(options, callback) {
    if (!requireStringParams(options, ['title'], callback)) return;
    const { position, error } = readPosition(options.position);
    if (error) return fail(callback, error);
    findOne(MEDIA_TAG, 'title', options.title, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      moveMediaItem(record, position, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateMediaItemOrder, taking the item's id, checked to exist first.
   * @param {{ mediaItemId: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  updateMediaItemOrderAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaItemId'], callback)) return;
    const { position, error } = readPosition(options.position);
    if (error) return fail(callback, error);
    requireById(MEDIA_TAG, options.mediaItemId, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      moveMediaItem(record, position, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Puts a media item in a category, or one of its subcategories, or takes it out, as the item form's category picker does (pickCategory / pickSubcategory), then saves the item through applyMediaUpdate like the form's Save. Item and category are named by exact title and name, resolved by searches, which is why it is a function. No widget host; Background; server-safe. usage: basic; its advanced alternative is updateMediaItemCategoryAdvanced.
   * @param {{ title: string, categoryName: string, subcategoryName?: string, included: boolean }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  updateMediaItemCategory(options, callback) {
    if (!requireStringParams(options, ['title', 'categoryName'], callback)) return;
    if (options.subcategoryName !== undefined && checkText(options.subcategoryName, 'subcategoryName')) return fail(callback, checkText(options.subcategoryName, 'subcategoryName'));
    if (checkIncluded(options)) return fail(callback, checkIncluded(options));
    findOne(MEDIA_TAG, 'title', options.title, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      resolveCategoryHandles(options.categoryName, options.subcategoryName, (categoryErr, handles) => {
        if (categoryErr) return callback(categoryErr, undefined);
        applyMediaUpdate(record, categoryChanges(record.data, handles.category, handles.subcategoryId, options.included), undefined, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateMediaItemCategory, taking the item, category and subcategory ids, each checked to exist first.
   * @param {{ mediaItemId: string, categoryId: string, subcategoryId?: string, included: boolean }} options
   * @param {function(Error=, object=)} callback - (error, media item)
   */
  updateMediaItemCategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['mediaItemId', 'categoryId'], callback)) return;
    if (options.subcategoryId !== undefined && checkText(options.subcategoryId, 'subcategoryId')) return fail(callback, checkText(options.subcategoryId, 'subcategoryId'));
    if (checkIncluded(options)) return fail(callback, checkIncluded(options));
    requireById(MEDIA_TAG, options.mediaItemId, 'media item', (err, record) => {
      if (err) return callback(err, undefined);
      requireCategoryHandles(options.categoryId, options.subcategoryId, (categoryErr, handles) => {
        if (categoryErr) return callback(categoryErr, undefined);
        applyMediaUpdate(record, categoryChanges(record.data, handles.category, handles.subcategoryId, options.included), undefined, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of updateMediaItemCategoryAdvanced: checks every item, category and subcategory id before writing, refuses the same change listed twice, then applies each in turn (re-reading the item, so several changes to one item all land). Same hosts and reasons as updateMediaItemCategory.
   * @param {{ mediaItems: Array<{ mediaItemId: string, categoryId: string, subcategoryId?: string, included: boolean }> }} options
   * @param {function(Error=, object=)} callback - (error, { mediaItems, succeeded, failed })
   */
  updateMediaItemsCategoryAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'mediaItems',
      validate: (entry) => checkText(entry.mediaItemId, 'mediaItemId') || checkText(entry.categoryId, 'categoryId')
        || (entry.subcategoryId !== undefined ? checkText(entry.subcategoryId, 'subcategoryId') : null) || checkIncluded(entry),
      duplicateKey: (entry) => `${entry.mediaItemId}/${entry.categoryId}/${entry.subcategoryId || ''}`,
      resolve: (entry, done) => requireById(MEDIA_TAG, entry.mediaItemId, 'media item', (err) => {
        if (err) return done(err);
        requireCategoryHandles(entry.categoryId, entry.subcategoryId, done);
      }),
      apply: (entry, handles, done) => requireById(MEDIA_TAG, entry.mediaItemId, 'media item', (err, record) => {
        if (err) return done(err);
        applyMediaUpdate(record, categoryChanges(record.data, handles.category, handles.subcategoryId, entry.included), undefined, done);
      }),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. Lists categories with their subcategories, the way the app's filter page and the control panel's category list do (widget.filters.controller.js, categoryHomeController.js): sorted by the owner's chosen category order, narrowed by the control panel's name search ($regex on name, case-insensitive). The settings decide the sort, which is why it is a function. Uses only buildfire.datastore reads; Background; server-safe.
   * @param {{ name?: string, page?: number, pageSize?: number }} options
   * @param {function(Error=, object=)} callback - (error, { categories, total, page, hasMore })
   */
  searchCategories(options, callback) {
    if (!requireOptions(options, callback)) return;
    const { page, pageSize, error } = readPaging(options);
    if (error) return fail(callback, error);
    if (options.name !== undefined && (typeof options.name !== 'string' || !options.name.trim())) return fail(callback, 'name must be non-empty text');
    readSettings((settingsErr, settings) => {
      if (settingsErr) return callback(settingsErr, undefined);
      const filter = options.name !== undefined ? { '$json.name': { $regex: escapeRegex(options.name.trim()), $options: 'i' } } : {};
      buildfire.datastore.search({ filter, sort: categorySort(settings.data.content), page, pageSize, recordCount: true }, CATEGORIES_TAG, (err, response) => {
        if (err) return callback(err, undefined);
        const records = ((response && response.result) || []).filter(Boolean);
        const total = (response && response.totalRecord) || 0;
        callback(null, { categories: records.map(toCategory), total, page, hasMore: (page + 1) * pageSize < total });
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Adds a category as the control panel's category form does (Categories.addCategory with the Category model): the form's defaults, stamped with the control panel's user, then the widget told. No widget host: categories are the owner's content. Background; server-safe (buildfire.datastore and buildfire.auth.getCurrentUser answer there; the widget message is only sent from a frame).
   * @param {{ name: string, icon?: string[], subcategorySortOrder?: string }} options
   * @param {function(Error=, object=)} callback - (error, category)
   */
  createCategory(options, callback) {
    if (!requireOptions(options, callback)) return;
    const { category, error } = collectNewCategory(options);
    if (error) return fail(callback, error);
    insertCategory(category, callback);
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of createCategory, as the control panel's category CSV import does: validates every entry first, then adds each through insertCategory. Same hosts and reasons as createCategory.
   * @param {{ categories: Array<{ name: string, icon?: string[], subcategorySortOrder?: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { categories, succeeded, failed })
   */
  createCategoriesAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'categories',
      validate: (entry) => collectNewCategory(entry).error || null,
      duplicateKey: null,
      resolve: noTarget,
      apply: (entry, target, done) => insertCategory(collectNewCategory(entry).category, done),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Changes one category, named by its exact name, as the category form's Save does: name, icon, and the order its subcategories are listed in (which re-sorts them), saved with who changed it and when, then the widget told. Resolving the name is a search, which is why it is a function. No widget host; Background; server-safe. usage: basic; its advanced alternative is updateCategoryAdvanced.
   * @param {{ name: string, newName?: string, newIcon?: string[]|null, newSubcategorySortOrder?: string }} options
   * @param {function(Error=, object=)} callback - (error, category)
   */
  updateCategory(options, callback) {
    if (!requireStringParams(options, ['name'], callback)) return;
    const { changes, error } = collectCategoryChanges(options);
    if (error) return fail(callback, error);
    findOne(CATEGORIES_TAG, 'name', options.name, 'category', (err, record) => {
      if (err) return callback(err, undefined);
      applyCategoryUpdate(record, changes, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateCategory, taking the category's id, checked to exist first.
   * @param {{ categoryId: string, newName?: string, newIcon?: string[]|null, newSubcategorySortOrder?: string }} options
   * @param {function(Error=, object=)} callback - (error, category)
   */
  updateCategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId'], callback)) return;
    const { changes, error } = collectCategoryChanges(options);
    if (error) return fail(callback, error);
    requireById(CATEGORIES_TAG, options.categoryId, 'category', (err, record) => {
      if (err) return callback(err, undefined);
      applyCategoryUpdate(record, changes, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of updateCategoryAdvanced: validates every entry and checks every id first, refuses the same category twice, then applies each through applyCategoryUpdate.
   * @param {{ categories: object[] }} options
   * @param {function(Error=, object=)} callback - (error, { categories, succeeded, failed })
   */
  updateCategoriesAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'categories',
      validate: (entry) => checkText(entry.categoryId, 'categoryId') || collectCategoryChanges(entry).error || null,
      duplicateKey: (entry) => entry.categoryId,
      resolve: (entry, done) => requireById(CATEGORIES_TAG, entry.categoryId, 'category', done),
      apply: (entry, record, done) => applyCategoryUpdate(record, collectCategoryChanges(entry).changes, done),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Permanently deletes one category, named by its exact name, with its subcategories, as the control panel's category delete does (categoryHomeController.js deleteMediaItem: the record only; media items drop the id when the control panel next opens them). Resolving the name is a search, which is why it is a function. No widget host; Background; server-safe. usage: basic; its advanced alternative is deleteCategoryAdvanced.
   * @param {{ name: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, deleted })
   */
  deleteCategory(options, callback) {
    if (!requireStringParams(options, ['name'], callback)) return;
    findOne(CATEGORIES_TAG, 'name', options.name, 'category', (err, record) => {
      if (err) return callback(err, undefined);
      removeCategory(record, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of deleteCategory, taking the category's id, checked to exist first.
   * @param {{ categoryId: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, deleted })
   */
  deleteCategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId'], callback)) return;
    requireById(CATEGORIES_TAG, options.categoryId, 'category', (err, record) => {
      if (err) return callback(err, undefined);
      removeCategory(record, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of deleteCategoryAdvanced: checks every id first, refuses the same category twice, then deletes each through removeCategory.
   * @param {{ categories: Array<{ categoryId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { categories, succeeded, failed })
   */
  deleteCategoriesAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'categories',
      validate: (entry) => checkText(entry.categoryId, 'categoryId'),
      duplicateKey: (entry) => entry.categoryId,
      resolve: (entry, done) => requireById(CATEGORIES_TAG, entry.categoryId, 'category', done),
      apply: (entry, record, done) => removeCategory(record, done),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Moves one category, named by its exact name, to a place in the manual order, as dragging it in the control panel's category list does (categoryHomeController.js onOrderChange): every category read in rank order, the category moved, each rank that changed rewritten, 1 for the first place. Only the rank is written ($set). No widget host; Background; server-safe. usage: basic; its advanced alternative is updateCategoryOrderAdvanced.
   * @param {{ name: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, category)
   */
  updateCategoryOrder(options, callback) {
    if (!requireStringParams(options, ['name'], callback)) return;
    const { position, error } = readPosition(options.position);
    if (error) return fail(callback, error);
    findOne(CATEGORIES_TAG, 'name', options.name, 'category', (err, record) => {
      if (err) return callback(err, undefined);
      moveCategory(record, position, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateCategoryOrder, taking the category's id, checked to exist first.
   * @param {{ categoryId: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, category)
   */
  updateCategoryOrderAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId'], callback)) return;
    const { position, error } = readPosition(options.position);
    if (error) return fail(callback, error);
    requireById(CATEGORIES_TAG, options.categoryId, 'category', (err, record) => {
      if (err) return callback(err, undefined);
      moveCategory(record, position, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Adds a subcategory at the end of a category's list, the category named by its exact name, as the category form's subcategory dialog and Save do: a new id, the next rank, then the whole category saved. Subcategories live inside their category's record, so this is a read-modify-write of it, which is why it is a function. No widget host; Background; server-safe. usage: basic; its advanced alternative is createSubcategoryAdvanced.
   * @param {{ categoryName: string, name: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, rank, category })
   */
  createSubcategory(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'name'], callback)) return;
    findOne(CATEGORIES_TAG, 'name', options.categoryName, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      addSubcategory(category, options.name, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of createSubcategory, taking the category's id, checked to exist first.
   * @param {{ categoryId: string, name: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, rank, category })
   */
  createSubcategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'name'], callback)) return;
    requireById(CATEGORIES_TAG, options.categoryId, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      addSubcategory(category, options.name, callback);
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of createSubcategoryAdvanced, as the subcategory CSV import adds many: validates every entry and checks every category id first, then adds each through addSubcategory, re-reading its category so several entries for one category all land.
   * @param {{ subcategories: Array<{ categoryId: string, name: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { subcategories, succeeded, failed })
   */
  createSubcategoriesAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'subcategories',
      validate: (entry) => checkText(entry.categoryId, 'categoryId') || checkSubcategoryName(entry.name, 'name'),
      duplicateKey: null,
      resolve: (entry, done) => requireById(CATEGORIES_TAG, entry.categoryId, 'category', done),
      apply: (entry, target, done) => requireById(CATEGORIES_TAG, entry.categoryId, 'category', (err, category) => {
        if (err) return done(err);
        addSubcategory(category, entry.name, done);
      }),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Renames one subcategory, named by its exact name within a category named by its exact name, as the subcategory dialog's edit and the category's Save do. A read-modify-write of the category, which is why it is a function. No widget host; Background; server-safe. usage: basic; its advanced alternative is updateSubcategoryAdvanced.
   * @param {{ categoryName: string, subcategoryName: string, newName: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, rank, category })
   */
  updateSubcategory(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'subcategoryName'], callback)) return;
    if (checkText(options.newName, 'newName')) return fail(callback, 'newName cannot be removed; pass a non-empty name');
    findOne(CATEGORIES_TAG, 'name', options.categoryName, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      resolveSubcategory(category, options.subcategoryName, (subErr, subcategory) => {
        if (subErr) return callback(subErr, undefined);
        renameSubcategory(category, subcategory.id, options.newName, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateSubcategory, taking the category's and the subcategory's ids, each checked to exist first.
   * @param {{ categoryId: string, subcategoryId: string, newName: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, rank, category })
   */
  updateSubcategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'subcategoryId'], callback)) return;
    if (checkText(options.newName, 'newName')) return fail(callback, 'newName cannot be removed; pass a non-empty name');
    requireById(CATEGORIES_TAG, options.categoryId, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      requireSubcategoryById(category, options.subcategoryId, (subErr) => {
        if (subErr) return callback(subErr, undefined);
        renameSubcategory(category, options.subcategoryId, options.newName, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of updateSubcategoryAdvanced: validates every entry and checks every category and subcategory id first, refuses the same subcategory twice, then renames each, re-reading its category.
   * @param {{ subcategories: Array<{ categoryId: string, subcategoryId: string, newName: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { subcategories, succeeded, failed })
   */
  updateSubcategoriesAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'subcategories',
      validate: (entry) => checkText(entry.categoryId, 'categoryId') || checkText(entry.subcategoryId, 'subcategoryId')
        || (checkText(entry.newName, 'newName') ? 'newName cannot be removed; pass a non-empty name' : null),
      duplicateKey: (entry) => `${entry.categoryId}/${entry.subcategoryId}`,
      resolve: (entry, done) => requireCategoryHandles(entry.categoryId, entry.subcategoryId, done),
      apply: (entry, target, done) => requireById(CATEGORIES_TAG, entry.categoryId, 'category', (err, category) => {
        if (err) return done(err);
        renameSubcategory(category, entry.subcategoryId, entry.newName, done);
      }),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Permanently removes one subcategory, named by its exact name within a category named by its exact name, as the subcategory delete and the category's Save do. A read-modify-write of the category, which is why it is a function. No widget host; Background; server-safe. usage: basic; its advanced alternative is deleteSubcategoryAdvanced.
   * @param {{ categoryName: string, subcategoryName: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, deleted, category })
   */
  deleteSubcategory(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'subcategoryName'], callback)) return;
    findOne(CATEGORIES_TAG, 'name', options.categoryName, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      resolveSubcategory(category, options.subcategoryName, (subErr, subcategory) => {
        if (subErr) return callback(subErr, undefined);
        removeSubcategory(category, subcategory.id, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of deleteSubcategory, taking the category's and the subcategory's ids, each checked to exist first.
   * @param {{ categoryId: string, subcategoryId: string }} options
   * @param {function(Error=, object=)} callback - (error, { id, name, deleted, category })
   */
  deleteSubcategoryAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'subcategoryId'], callback)) return;
    requireById(CATEGORIES_TAG, options.categoryId, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      requireSubcategoryById(category, options.subcategoryId, (subErr) => {
        if (subErr) return callback(subErr, undefined);
        removeSubcategory(category, options.subcategoryId, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced. The batch form of deleteSubcategoryAdvanced: checks every category and subcategory id first, refuses the same subcategory twice, then removes each, re-reading its category.
   * @param {{ subcategories: Array<{ categoryId: string, subcategoryId: string }> }} options
   * @param {function(Error=, object=)} callback - (error, { subcategories, succeeded, failed })
   */
  deleteSubcategoriesAdvanced(options, callback) {
    runBatch(options, callback, {
      listName: 'subcategories',
      validate: (entry) => checkText(entry.categoryId, 'categoryId') || checkText(entry.subcategoryId, 'subcategoryId'),
      duplicateKey: (entry) => `${entry.categoryId}/${entry.subcategoryId}`,
      resolve: (entry, done) => requireCategoryHandles(entry.categoryId, entry.subcategoryId, done),
      apply: (entry, target, done) => requireById(CATEGORIES_TAG, entry.categoryId, 'category', (err, category) => {
        if (err) return done(err);
        removeSubcategory(category, entry.subcategoryId, done);
      }),
      idOf: (result) => result.id
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Moves one subcategory to a place in its category's list, as dragging it in the category form does (onOrderChange: every subcategory ranked by its place, from 0), then saves the category. A read-modify-write of the category, which is why it is a function. No widget host; Background; server-safe. usage: basic; its advanced alternative is updateSubcategoryOrderAdvanced.
   * @param {{ categoryName: string, subcategoryName: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, category)
   */
  updateSubcategoryOrder(options, callback) {
    if (!requireStringParams(options, ['categoryName', 'subcategoryName'], callback)) return;
    const { position, error } = readPosition(options.position);
    if (error) return fail(callback, error);
    findOne(CATEGORIES_TAG, 'name', options.categoryName, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      resolveSubcategory(category, options.subcategoryName, (subErr, subcategory) => {
        if (subErr) return callback(subErr, undefined);
        moveSubcategory(category, subcategory.id, position, callback);
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. usage: advanced; the alternative of updateSubcategoryOrder, taking the category's and the subcategory's ids, each checked to exist first.
   * @param {{ categoryId: string, subcategoryId: string, position: number }} options
   * @param {function(Error=, object=)} callback - (error, category)
   */
  updateSubcategoryOrderAdvanced(options, callback) {
    if (!requireStringParams(options, ['categoryId', 'subcategoryId'], callback)) return;
    const { position, error } = readPosition(options.position);
    if (error) return fail(callback, error);
    requireById(CATEGORIES_TAG, options.categoryId, 'category', (err, category) => {
      if (err) return callback(err, undefined);
      requireSubcategoryById(category, options.subcategoryId, (subErr) => {
        if (subErr) return callback(subErr, undefined);
        moveSubcategory(category, options.subcategoryId, position, callback);
      });
    });
  },

  /**
   * hosts: widgetBackground, controlBackground, headlessSdk. The plugin's settings and design as stored, with the control panel's defaults filled in where nothing is saved yet (homeController.js, settings.home.controller.js, design.home.controller.js); reading saves nothing. Applying the defaults is logic, which is why it is a function. Uses only buildfire.datastore.get; Background; server-safe.
   * @param {object} options - none
   * @param {function(Error=, object=)} callback - (error, { content, design })
   */
  getSettings(options, callback) {
    if (!requireOptions(options || {}, callback)) return;
    readSettings((err, settings) => {
      if (err) return callback(err, undefined);
      callback(null, { content: settings.data.content, design: settings.data.design });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Changes the settings the control panel's Content and Settings tabs edit, only those passed, then saves the whole record through datastore.save as the Settings tab does, applying its rules (formatSettingsAndSave: continuous playback off turns shuffle off; auto-adding audio turns continuous playback, shuffle and the global playlist off; without it, resuming playback is off; turning filtering on registers the filter page's deep link once), then tells the widget. Sort orders are stored as the Content tab's list stores them (sortBy and sortByValue; sortCategoriesBy). No widget host: app users must not change the owner's configuration. Background: it changes configuration and contacts nobody. Server-safe. Left out: who may comment or react (access settings) and the connected playlist feature (picked in a dialog of plugin instances).
   * @param {object} options - one optional param per setting, see plugin.contract.json
   * @param {function(Error=, object=)} callback - (error, { content, design })
   */
  updateSettings(options, callback) {
    if (!requireOptions(options, callback)) return;
    const content = {};
    const design = {};
    const booleans = {
      allowSharing: 'allowShare', allowFavorites: 'allowFavorites', allowNotes: 'allowAddingNotes', showMediaSource: 'allowSource',
      allowOfflineAccess: 'allowOfflineDownload', enableFiltering: 'enableFiltering', showViewCount: 'showViewCount',
      highlightPlayedItems: 'indicatePlayedItems', useGlobalPlaylist: 'globalPlaylist', showAddAllToPlaylistButton: 'showGlobalAddAllToPlaylistButton',
      showPlaylistButton: 'showGlobalPlaylistNavButton', continuousPlayback: 'autoPlay', shuffleList: 'shuffleAudioListItems',
      autoAddAudioToPlaylist: 'forceAutoPlay', resumePlayback: 'startWithAutoJumpByDefault'
    };
    for (const name of Object.keys(booleans)) {
      if (options[name] === undefined) continue;
      if (typeof options[name] !== 'boolean') return fail(callback, `${name} must be true or false`);
      content[booleans[name]] = options[name];
    }
    if (options.bypassInfoPage !== undefined) {
      if (typeof options.bypassInfoPage !== 'boolean') return fail(callback, 'bypassInfoPage must be true or false');
      design.skipMediaPage = options.bypassInfoPage;
    }
    if (options.description !== undefined) {
      if (options.description !== null && typeof options.description !== 'string') return fail(callback, 'description must be formatted text (HTML), or null or an empty text to remove it');
      content.descriptionHTML = options.description === null ? null : options.description;
    }
    if (options.carouselImages !== undefined) {
      if (options.carouselImages === null) {
        content.images = [];
      } else {
        const { actions, error } = readActionList(options.carouselImages, 'carouselImages');
        if (error) return fail(callback, error);
        content.images = actions;
      }
    }
    if (options.mediaSortOrder !== undefined) {
      if (MEDIA_SORT_ORDERS.indexOf(options.mediaSortOrder) === -1) return fail(callback, `mediaSortOrder must be one of: ${MEDIA_SORT_ORDERS.join(', ')}`);
      content.sortBy = options.mediaSortOrder;
      content.sortByValue = options.mediaSortOrder;
    }
    if (options.categorySortOrder !== undefined) {
      if (CATEGORY_SORT_ORDERS.indexOf(options.categorySortOrder) === -1) return fail(callback, `categorySortOrder must be one of: ${CATEGORY_SORT_ORDERS.join(', ')}`);
      content.sortCategoriesBy = options.categorySortOrder;
    }
    if (options.autoplayDelay !== undefined) {
      const delay = AUTOPLAY_DELAYS.find((option) => option.value === options.autoplayDelay);
      if (!delay) return fail(callback, `autoplayDelay must be one of: ${AUTOPLAY_DELAYS.map((option) => option.value).join(', ')}`);
      content.autoPlayDelay = Object.assign({}, delay);
    }
    if (!Object.keys(content).length && !Object.keys(design).length) return fail(callback, 'Pass at least one setting to change');

    readSettings((err, settings) => {
      if (err) return callback(err, undefined);
      const data = settings.data;
      Object.assign(data.content, content);
      Object.assign(data.design, design);
      // The Settings tab's own rules, applied on every save (formatSettingsAndSave).
      if (!data.content.autoPlay) data.content.shuffleAudioListItems = false;
      if (data.content.forceAutoPlay) {
        data.content.autoPlay = false;
        data.content.shuffleAudioListItems = false;
        data.content.globalPlaylist = false;
      } else {
        data.content.startWithAutoJumpByDefault = false;
      }
      let filterDeeplink = null;
      if (data.content.enableFiltering && !data.content.filterPageDeeplink) {
        let instanceId = null;
        try {
          instanceId = buildfire.getContext().instanceId;
        } catch (contextErr) {
          instanceId = null;
        }
        if (instanceId) {
          data.content.filterPageDeeplink = `${instanceId}_filterScreen`;
          filterDeeplink = data.content.filterPageDeeplink;
        }
      }
      buildfire.datastore.save(data, SETTINGS_TAG, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        if (filterDeeplink && buildfire.deeplink && typeof buildfire.deeplink.registerDeeplink === 'function') {
          buildfire.deeplink.registerDeeplink({ id: filterDeeplink, name: 'Filter Screen', deeplinkData: { screen: 'filterScreen' } }, () => {});
        }
        notifyWidget({ name: 'SETTINGS_CHANGE', message: { itemUpdatedData: data.content } });
        notifyWidget({ cmd: 'settings', data });
        callback(null, { content: data.content, design: data.design });
      });
    });
  },

  /**
   * hosts: controlBackground, headlessSdk. Changes the Design tab's layouts and background image, only those passed, then saves the whole settings record and tells the widget, as the Design tab does (design.home.controller.js). No widget host: app users must not change the owner's design. Background: nothing to watch. Server-safe.
   * @param {{ listLayout?: string, itemLayout?: string, backgroundImage?: string[]|null }} options
   * @param {function(Error=, object=)} callback - (error, { content, design })
   */
  updateDesign(options, callback) {
    if (!requireOptions(options, callback)) return;
    const design = {};
    if (options.listLayout !== undefined) {
      if (LIST_LAYOUTS.indexOf(options.listLayout) === -1) return fail(callback, `listLayout must be one of: ${LIST_LAYOUTS.join(', ')}`);
      design.listLayout = options.listLayout;
    }
    if (options.itemLayout !== undefined) {
      if (ITEM_LAYOUTS.indexOf(options.itemLayout) === -1) return fail(callback, `itemLayout must be one of: ${ITEM_LAYOUTS.join(', ')}`);
      design.itemLayout = options.itemLayout;
    }
    if (options.backgroundImage !== undefined) {
      // A removed background is stored as '' (background.onDelete).
      if (options.backgroundImage === null) {
        design.backgroundImage = '';
      } else {
        const { images, error } = readImageList(options.backgroundImage, { name: 'backgroundImage', minValue: 0, maxValue: 1 });
        if (error) return fail(callback, error);
        design.backgroundImage = images.length ? images[0] : '';
      }
    }
    if (!Object.keys(design).length) return fail(callback, 'Pass at least one of listLayout, itemLayout or backgroundImage');
    readSettings((err, settings) => {
      if (err) return callback(err, undefined);
      const data = settings.data;
      Object.assign(data.design, design);
      buildfire.datastore.save(data, SETTINGS_TAG, (saveErr) => {
        if (saveErr) return callback(saveErr, undefined);
        notifyWidget({ name: 'DESIGN_LAYOUT_CHANGE', message: { design: data.design } });
        callback(null, { content: data.content, design: data.design });
      });
    });
  }
};

/**
 * What the control panel's frame (control/contract.html) dispatches to: init plus every function whose hosts include controlForeground or controlBackground, in plugin.contract.json order. The implementations are widgetContract's own.
 */
controlContract = {
  init: widgetContract.init,
  searchMediaItems: widgetContract.searchMediaItems,
  getMediaItem: widgetContract.getMediaItem,
  getMediaItemAdvanced: widgetContract.getMediaItemAdvanced,
  createMediaItem: widgetContract.createMediaItem,
  createMediaItemsAdvanced: widgetContract.createMediaItemsAdvanced,
  updateMediaItem: widgetContract.updateMediaItem,
  updateMediaItemAdvanced: widgetContract.updateMediaItemAdvanced,
  updateMediaItemsAdvanced: widgetContract.updateMediaItemsAdvanced,
  deleteMediaItem: widgetContract.deleteMediaItem,
  deleteMediaItemAdvanced: widgetContract.deleteMediaItemAdvanced,
  deleteMediaItemsAdvanced: widgetContract.deleteMediaItemsAdvanced,
  updateMediaItemOrder: widgetContract.updateMediaItemOrder,
  updateMediaItemOrderAdvanced: widgetContract.updateMediaItemOrderAdvanced,
  updateMediaItemCategory: widgetContract.updateMediaItemCategory,
  updateMediaItemCategoryAdvanced: widgetContract.updateMediaItemCategoryAdvanced,
  updateMediaItemsCategoryAdvanced: widgetContract.updateMediaItemsCategoryAdvanced,
  searchCategories: widgetContract.searchCategories,
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
  getSettings: widgetContract.getSettings,
  updateSettings: widgetContract.updateSettings,
  updateDesign: widgetContract.updateDesign
};
