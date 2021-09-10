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
            DESIGN_BGIMAGE_CHANGE: "DESIGN_BGIMAGE_CHANGE"
        })
        .constant('COLLECTIONS', {
            MediaContent: "MediaContent",
            MediaCenter: "MediaCenter"
        })
        .constant('PATHS', {
            MEDIA: "MEDIA",
            HOME: "HOME"
        }).constant('PLAYLISTINSTANCES', {
            DEV: "5adb9753-58df-437c-96c6-efc6c3af9b4b",
            QA: "TODO: Hit Me Baby",
            PROD: "TODO: Hit Me Baby One More Time"
        });
})(window.angular, undefined);