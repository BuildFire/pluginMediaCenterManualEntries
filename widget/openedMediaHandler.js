'use strict';

const openedMediaHandler = {
    sync(localOpenedMediaItems, MediaMetaDataDB) {
        MediaMetaDataDB.get()
            .then((response) => {
                const localItems = localOpenedMediaItems.get();
    
                const mergedItems = [...localItems, ...response.openedItems];
    
                const uniqueMergedItems = [...new Set(mergedItems)];
    
                localOpenedMediaItems.save(uniqueMergedItems);
                return uniqueMergedItems;
            })
            .then((uniqueMergedItems) => {
                this._syncToMediaMetaData(uniqueMergedItems, MediaMetaDataDB);
            })
            .catch((error) => {
                console.error('Error during sync:', error);
            });
    },
    

    _syncToMediaMetaData(localOpenedMediaItems, MediaMetaDataDB) {
        const payload = {
            $set: {
                openedItems: localOpenedMediaItems,
            },
        };
        MediaMetaDataDB.save(payload);
    },

    add(item, mediaType, localOpenedMediaItems, MediaMetaDataDB, userId) {
        let key = '';

        if (mediaType === 'Article') {
            key = item.id;
        } else if (mediaType === 'Video') {
            key = `${item.data.videoUrl}_${item.id}`;
        } else if (mediaType === 'Audio') {
            key = `${item.data.audioUrl}_${item.id}`;
        } else {
            console.warn('Unexpected media type');
            return;
        }

        const localMediaItems = localOpenedMediaItems.get();
        localMediaItems.push(key);
        localOpenedMediaItems.save(localMediaItems);

        if (MediaMetaDataDB) {
            MediaMetaDataDB.get()
                .then((response) => {
                    const payload = {
                        $set: {
                            openedItems: [...response.openedItems, key],
                            lastUpdatedBy: userId
                        },
                    };
                    return MediaMetaDataDB.save(payload);
                })
                .catch((error) => {
                    console.error('Error while adding to MediaMetaDataDB:', error);
                });
        }
    },
};
