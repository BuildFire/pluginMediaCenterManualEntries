class Category {
    constructor(data = {}) {
        this.icon = data.icon || '';
        this.name = data.name || '';
        this.subcategories = data.subcategories || [];
        this.sortBy = data.sortBy || Orders.ordersMap.Default;
        this.rank = data.rank || 0;
        this.rankOfLastSubcategory = data.rankOfLastSubcategory || 0;
        this.lastSubcategoryId = data.lastSubcategoryId || 0;
        this.createdOn = data.createdOn || new Date();
        this.createdBy = data.createdBy || '';
        this.lastUpdatedOn = data.lastUpdatedOn || new Date();
        this.lastUpdatedBy = data.lastUpdatedBy || '';
        this.deletedOn = data.deletedOn || '';
        this.deletedBy = data.deletedBy || '';
    }
}