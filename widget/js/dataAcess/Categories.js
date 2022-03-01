class Categories {
    constructor(data = {}) {
        // this.userId = data.userId || '';
        this.db = data.db;
    }

    getCategoryById(categoryId, cb) {
        if (categoryId) {
            this.db.getById({
                id: categoryId
            }).then(function success(result) {
                if (!result) {
                    return cb(null, null);
                }

                if (result) {
                    return cb(null, result);
                }
            }, function fail() {
                return cb("Getting category failed");
            });
        }
        else {
            return cb("No id provided");
        }
    }

    getCategories(data, cb) {
        if (data && data.options) {
            this.db.find(data.options).then(function success(result) {
                if (!result.length) {
                    return cb(null, []);
                }

                if (result && result.length) {
                    return cb(null, result);
                }
            }, function fail() {
                return cb("Getting categories failed");
            });
        }
        else {
            return cb("No options provided");
        }
    };

    addCategory(data, cb) {
        if (data && data.name) {
            console.log("data", data);
            this.db.insert(new Category(data)).then(function success(result) {
                return cb(null, result);
            }, function fail() {
                return cb("Adding category failed");
            });
        }
        else {
            return cb("No options provided");
        }
    };

    deleteCategory(categoryId, cb) {
        if (categoryId) {
            this.db.delete(categoryId).then(function (data) {
                return cb(null, data);
            }, function (err) {
                console.log(err);
                return cb("Error while deleting category");
            });
        }
        else {
            return cb("No id provided");
        }
    };

    updateCategory(data, cb) {
        if (data && data.id && data.data) {
            this.db.update(data.id, data.data).then(function success(result) {
                return cb(null, result);
            }, function fail() {
                return cb("Updating category failed");
            });
        }
        else {
            return cb("No id provided");
        }
    }
}