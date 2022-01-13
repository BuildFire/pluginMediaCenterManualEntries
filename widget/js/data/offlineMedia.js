class OfflineMedia {
    constructor(data = {}) {
        this.instanceId = buildfire.getContext().instanceId;
        this.mediaId = data.mediaId || '';
        this.mediaType = data.mediaType || '';
        this.mediaPath = data.mediaPath || '';
        this.createdOn = data.createdOn || '';
        this.lastUpdatedOn = data.lastUpdatedOn || '';
    }
}