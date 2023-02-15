class OfflineMedia {
    constructor(data = {}) {
        this.instanceId = buildfire.getContext().instanceId;
        this.mediaId = data.mediaId || '';
        this.mediaType = data.mediaType || '';
        this.mediaPath = data.mediaPath || '';
        this.originalMediaUrl = data.originalMediaUrl || '';
        this.dropboxAudioUpdated = typeof(data.dropboxAudioUpdated)==='boolean' ? data.dropboxAudioUpdated : false;
        this.createdOn = data.createdOn || '';
        this.lastUpdatedOn = data.lastUpdatedOn || '';
    }
}