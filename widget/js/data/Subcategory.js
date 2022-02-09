class Subcategory {
    constructor(data = {}) {
        this.id = data.id || '';
        this.icon = data.icon || '';
        this.name = data.name || '';
        this.rank = data.rank || 0;
        this.createdOn = data.createdOn || new Date();
        this.createdBy = data.createdBy || '';
        this.lastUpdatedOn = data.lastUpdatedOn || new Date();
        this.lastUpdatedBy = data.lastUpdatedBy || '';
        this.deletedOn = data.deletedOn || '';
        this.deletedBy = data.deletedBy || '';
    }
}