class Subcategories {
    constructor(data = {}) {
        // this.userId = data.userId || '';
        this.db = data.db;
        this.categoryDB = data.categoryDB;
    }

    getSubcategories(data, cb) {
        if (data && data.options && data.options.categoryId) {
            this.db.find(data.options).then(function success(result) {
                if (!result.length) {
                    return cb(null, []);
                }

                if (result && result.length) {
                    return cb(null, result);
                }
            }, function fail() {
                return cb("Getting subcategories failed");
            });
        }
        else {
            return cb("No options provided");
        }
    };

    addSubcategory(data, cb) {
        // insert subcategory to db then update category subcategory array
        if (data && data.name && data.categoryId) {
            this.db.insert(new Subcategory(data)).then(function success(result) {
                let CategoyContent = new Categories({ db: this.categoryDB });
                CategoyContent.getCategoryById(data.categoryId, (err, res) => {
                    if (err) {
                        return cb(err);
                    }

                    if (res) {
                        res.subcategories.push(result);
                        res.lastUpdatedOn = new Date();
                        if (data.user) res.lastUpdatedBy = data.user;
                        CategoyContent.updateCategory(res, (error, ress) => {
                            if (err) {
                                return cb(error);
                            }

                            return cb(null, ress);
                        });
                    }
                })
                return cb(null, result);
            }, function fail() {
                return cb("Adding category failed");
            });
        }
        else {
            return cb("No options provided");
        }
    };

    deleteSubcategory(data, cb) {
        if (data && data.id && data.categoryId) {
            this.db.delete(data.id).then(function success(result) {
                let CategoyContent = new Categories({ db: this.categoryDB });
                CategoyContent.getCategoryById(data.categoryId, (err, res) => {
                    if (err) {
                        return cb(err);
                    }

                    if (res) {
                        let matchingSubcategory = res.subcategories.find(subcategory => subcategory.id === data.id);
                        if (matchingSubcategory) {
                            res.subcategories.splice(res.subcategories.indexOf(matchingSubcategory), 1);
                            res.lastUpdatedOn = new Date();
                            if (data.user) res.lastUpdatedBy = data.user;
                            CategoyContent.updateCategory(res, (error, ress) => {
                                if (err) {
                                    return cb(error);
                                }
    
                                return cb(null, ress);
                            });
                        }
                    }
                })
                return cb(null, result);
            }, function fail() {
                return cb("Error while deleting subcategory");
            });
        }
        else {
            return cb("No id provided");
        }
    };

    updateSubcategory(data, cb) {
        if (data && data.id && data.categoryId) {
            this.db.update(data).then(function success(result) {
                let CategoyContent = new Categories({ db: this.categoryDB });
                CategoyContent.getCategoryById(data.categoryId, (err, res) => {
                    if (err) {
                        return cb(err);
                    }

                    if (res) {
                        let matchingSubcategory = res.subcategories.find(subcategory => subcategory.id === data.id);
                        if (matchingSubcategory) {
                            res.subcategories[res.subcategories.indexOf(matchingSubcategory)] = data;
                            res.lastUpdatedOn = new Date();
                            if (data.user) res.lastUpdatedBy = data.user;
                            CategoyContent.updateCategory(res, (error, ress) => {
                                if (err) {
                                    return cb(error);
                                }

                                return cb(null, ress);
                            });
                        }
                    }
                })
                return cb(null, result);
            }, function fail() {
                return cb("Error while deleting subcategory");
            });
        }
        else {
            return cb("No id provided");
        }
    }
}