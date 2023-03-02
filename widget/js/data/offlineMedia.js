class OfflineMedia {
    constructor(data = {}) {
        this.instanceId = buildfire.getContext().instanceId;
        this.mediaId = data.mediaId || '';
        this.mediaType = data.mediaType || '';
        this.mediaPath = data.mediaPath || '';
        this.originalMediaUrl = data.originalMediaUrl || '';
        this.dropboxAudioUpdatedV2 = typeof(data.dropboxAudioUpdatedV2)==='boolean' ? data.dropboxAudioUpdatedV2 : false;
        this.createdOn = data.createdOn || '';
        this.lastUpdatedOn = data.lastUpdatedOn || '';
    }
}