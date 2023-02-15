class OfflineAccess {
    constructor(data = {}) {
        // this.userId = data.userId || '';
        this.db = data.db;
        this.instanceId = buildfire.getContext().instanceId;
        this.platform = buildfire.getContext().device.platform;
    }

    save(data, cb) {
            if (this.platform === "web") {
                return cb("File system not supported on web");
            }
            this.db.get((err, result) => {
                if (err) {
                    return cb(err);
                }
                if (!result) {
                    result = [];
                }

                result.push(new OfflineMedia({
                    id: result.length + 1,
                    instanceId: this.instanceId,
                    mediaId: data.mediaId,
                    mediaType: data.mediaType,
                    mediaPath: data.mediaPath,
                    originalMediaUrl: data.originalMediaUrl,
                    dropboxAudioUpdated: data.dropboxAudioUpdated,
                    createdOn: data.createdOn || new Date(),
                    lastUpdatedOn: new Date(),
                }))
                this.db.insert(result, (err, result) => {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, result);
                });
            });
    };

    update(data, cb) {
            if (this.platform === "web") {
                return cb("File system not supported on web");
            }
            this.db.get((err, result) => {
                if (err) {
                    return cb(err);
                }
                if (!result) {
                    return cb("No such downloaded media");
                }

                let updatedMedia = result.filter(elem => elem.id == data.id);
                if (updatedMedia.length != 0) {
                    result.splice(result.indexOf(updatedMedia[0]), 1);
                    updatedMedia[0] = new OfflineMedia({
                        userId: this.userId,
                        instanceId: this.instanceId,
                        mediaId: data.mediaId,
                        mediaType: data.mediaType,
                        dropboxAudioUpdated: data.dropboxAudioUpdated,
                        mediaPath: data.mediaPath,
                        createdOn: data.createdOn,
                        lastUpdatedOn: new Date(),
                        originalMediaUrl: data.originalMediaUrl,
                    });


                    result.push(updatedMedia[0]);

                    this.db.insert(result, (err, result) => {
                        if (err) {
                            return cb(err);
                        }
                        return cb(null, result);
                    });
                }
                else {
                    return cb("No such downloaded media");
                }
            });
    }

    delete(data, cb) {
            if (this.platform === "web") {
                return cb("File system not supported on web");
            }
            this.db.get((err, result) => {
                if (err) {
                    if (cb) cb(err);
                    buildfire.dialog.toast({
                        message: `Error while deleting downloads`,
                        type: 'warning',
                    });
                    return;
                }
                if (!result) {
                    buildfire.dialog.toast({
                        message: `Error while deleting downloads`,
                        type: 'warning',
                    });
                    if (cb) cb("Media not found");
                    return;
                }

                result = result.filter(elem => elem.mediaType != data.mediaType || elem.mediaId != data.mediaId);

                this.db.insert(result, (err, result) => {
                    if (err) {
                        buildfire.dialog.toast({
                            message: `Error while deleting downloads`,
                            type: 'warning',
                        });
                        if (cb) return cb(err);
                    }
                    if (cb) return cb(null, result);
                });
            });
    };
}