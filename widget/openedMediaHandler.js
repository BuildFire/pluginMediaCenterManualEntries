'use strict';

const openedMediaHandler = {
    sync: function sync(localOpenedMediaItems, MediaMetaDataDB) {
        MediaMetaDataDB.get().then((response) => {
            this._syncToLocalMediaItems(localOpenedMediaItems, response.data.openedItems).then(
                (response) => {
                    let openedItems = JSON.parse(response);
                    this._syncToMediaMetaData(openedItems, MediaMetaDataDB);
                }
            );
        });
    },

    _syncToLocalMediaItems: function _syncToLocalMediaItems(localOpenedMediaItems, mediaMetaData) {
        return new Promise((resolve, reject) => {
            const localMediaItems = localOpenedMediaItems.get();
            const mergedItemsSet = new Set([...localMediaItems, ...mediaMetaData]);
            const mergedItems = Array.from(mergedItemsSet);
            resolve(localOpenedMediaItems.save(mergedItems));
        });
    },

    _syncToMediaMetaData: function _syncToMediaMetaData(localOpenedMediaItems, MediaMetaDataDB) {
        const payload = {
            $set: {
                openedItems: localOpenedMediaItems,
            },
        };

        MediaMetaDataDB.save(payload);
    },

    add(item, mediaType, localOpenedMediaItems, MediaMetaDataDB) {
        let key = '';
        if (mediaType === 'Article') {
            key = item.id;
        } else if (mediaType === 'Video') {
            key = `${item.data.videoUrl}_${item.id}`;
        } else if (mediaType === 'Audio') {
            key = `${item.data.audioUrl}_${item.id}`;
        } else {
            return console.warn('Unexpected media type');
        }

        const localMediaItems = localOpenedMediaItems.get();
        localOpenedMediaItems.save([...localMediaItems, key]);

        if (MediaMetaDataDB) {
            MediaMetaDataDB.get().then((response) => {
                const payload = {
                    $set: {
                        openedItems: [...response.data.openedItems, key],
                    },
                };
                MediaMetaDataDB.save(payload);
            });
        }
    },
};
