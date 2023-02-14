class OfflineMedia {
    constructor(data = {}) {
        this.instanceId = buildfire.getContext().instanceId;
        this.mediaId = data.mediaId || '';
        this.mediaType = data.mediaType || '';
        this.mediaPath = data.mediaPath || '';
        this.originalMediaUrl = data.originalMediaUrl || '';
        this.dropboxDownloadUpdated = typeof(data.dropboxDownloadUpdated)==='boolean' ? data.dropboxDownloadUpdated : false;
        this.createdOn = data.createdOn || '';
        this.lastUpdatedOn = data.lastUpdatedOn || '';
    }
}