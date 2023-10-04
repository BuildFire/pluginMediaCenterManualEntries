'use strict';

const openedMediaHandler = {
    sync(localOpenedMediaItems, MediaMetaDataDB) {
        return MediaMetaDataDB.get()
            .then((result) => {                
                let uniqueMergedItems = [];
                localOpenedMediaItems.get((error, response) => {
                    if(error) response = [];
                    const mergedItems = [...response, ...result.openedItems];
                    uniqueMergedItems = [...new Set(mergedItems)];
                    localOpenedMediaItems.save(uniqueMergedItems);
                });
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

        localOpenedMediaItems.get((error, response) => {
            if (error) return console.error(error);

            response = [...response, key];
            localOpenedMediaItems.save(response);

            MediaMetaDataDB.get()
                .then((response) => {
                    const payload = {
                        $set: {
                            openedItems: [...response.openedItems, key],
                            lastUpdatedBy: userId,
                        },
                    };
                    return MediaMetaDataDB.save(payload);
                })
                .catch((error) => {
                    console.error('Error while adding to MediaMetaDataDB:', error);
                });
        });
    },
};
