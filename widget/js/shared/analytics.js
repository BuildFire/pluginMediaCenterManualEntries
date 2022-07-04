class Analytics {
  

    static trackAction = (eventName, metaData) => {
        buildfire.analytics.trackAction(eventName, metaData);
    }

    static registerEvent = (event = {}, options = {}) => {
        var _event = {
            title: event.title || null,
            key: event.key || undefined,
            description: event.description || null,
        };

        var _options = {
            silentNotification: options.silentNotification || true,
        };

        if (!_event.title || !_event.key) {
            return console.error("Missing Data");
        }

        return new Promise((resolve, reject) => {
            buildfire.analytics.registerEvent(_event, _options, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    }

    static unregisterEvent = (key) => {
        if (!key) {
            return console.error("Missing Data");
        }

        return new Promise((resolve, reject) => {
            buildfire.analytics.unregisterEvent(key, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    }

    static showReports = (options = {}) => {
        var _options = {
            eventKey: options.eventKey || undefined,
        };

        if (!_options.eventKey) {
            return console.error("Missing Data");
        }

        return new Promise((resolve, reject) => {
            buildfire.analytics.showReports(_options, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });
    }
}