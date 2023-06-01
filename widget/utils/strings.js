let stringsKeys = {};
const prepareStrings = () => {
    return fetch('../resources/languages.json')
        .then((response) => response.json())
        .then((data) => {
            for (const key in data.sections) {
                if (Object.hasOwnProperty.call(data.sections, key)) {
                    const element = data.sections[key];
                    for (const stringKey in element.labels) {
                        stringsKeys[`${key}.${stringKey}`] = '';
                    }
                }
            }
        })
        .catch((error) => {
            console.error('Error loading JSON file:', error);
        });
};

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
