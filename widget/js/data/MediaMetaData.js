class MediaMetaData {
    constructor(data = {}) {
        this.id = data.id || undefined;
        this.openedItems = data.openedItems || [];
        this.createdOn = data.createdOn || new Date();
        this.createdBy = data.createdBy || null;
        this.lastUpdatedOn = data.lastUpdatedOn || new Date();
        this.lastUpdatedBy = data.lastUpdatedBy || null;
        this.deletedOn = data.deletedOn || null;
        this.deletedBy = data.deletedBy || null;
        this.isActive = data.isActive || 1;
    }

    toJSON() {
        return {
            id: this.id,
            openedItems: this.openedItems,
            createdOn: this.createdOn,
            createdBy: this.createdBy,
            lastUpdatedOn: this.lastUpdatedOn,
            lastUpdatedBy: this.lastUpdatedBy,
            deletedOn: this.deletedOn,
            deletedBy: this.deletedBy,
            isActive: this.isActive,
        };
    }
}
