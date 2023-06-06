const getString = (key) => {
    return stringsKeys[key];
};

const getLanguage = (key) => {
    return new Promise((resolve, reject) => {
        buildfire.language.get({ stringKey: key }, (err, res) => {
            if (err) {
                reject(err);
            }
            stringsKeys[key] = res;
            resolve(res);
        });
    });
};

const initLangStr = () => {
    return new Promise((resolve, reject) => {
        const arr = Object.keys(stringsKeys).map((el) => getLanguage(el));
        Promise.all(arr)
            .then((values) => resolve(values))
            .catch((error) => reject(error));
    });
};
