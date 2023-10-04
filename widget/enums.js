(function (angular) {
    "use strict";
    angular
        .module('mediaCenterEnums', [])
        .constant('CODES', {
            NOT_FOUND: 'NOTFOUND',
            SUCCESS: 'SUCCESS'
        })
        .constant('MESSAGES', {
            ERROR: {
                NOT_FOUND: "No result found",
                CALLBACK_NOT_DEFINED: "Callback is not defined",
                ID_NOT_DEFINED: "Id is not defined",
                DATA_NOT_DEFINED: "Data is not defined",
                OPTION_REQUIRES: "Requires options"
            }
        })
        .constant('EVENTS', {
            ROUTE_CHANGE: "ROUTE_CHANGE",
            DESIGN_LAYOUT_CHANGE: "DESIGN_LAYOUT_CHANGE",
            DESIGN_BGIMAGE_CHANGE: "DESIGN_BGIMAGE_CHANGE",
            ITEMS_CHANGE: "ITEMS_CHANGE",
            CATEGORIES_CHANGE: "CATEGORIES_CHANGE",
        })
        .constant('COLLECTIONS', {
            MediaContent: "MediaContent",
            MediaCenter: "MediaCenter",
            CategoryContent:"CategoryContent",
            MediaCount:"MediaCount",
            MediaMetaData : "MediaMetaData"
        })
        .constant('PATHS', {
            MEDIA: "MEDIA",
            HOME: "HOME"
        })
        .constant('localStorageKeys', {
            PLUGIN_MEDIA_CENTER_MANUAL_CONFIG: "plugin_mediaCenterManual_config",
        });
})(window.angular, undefined);