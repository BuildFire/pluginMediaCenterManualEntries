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
            SETTINGS_CHANGE: "SETTINGS_CHANGE",
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
            PLUGIN_CONFIG : "plugin_mediaCenterManual",
        })
        .constant('MEDIA_ACTION_ICONS', {
            VIEWS: {id: 'views', iconName: 'visibility', filled: true},
            COMMENTS: {id: 'comments', iconName: 'chat_bubble_outline'},
            SHARE: {id: 'share', iconName: 'share'},
            FAVORITE: {id: 'favorite', iconName: 'star_outline'},
            FAVORITE_FILLED: {id: 'favorite', iconName: 'star'},
            NOTE: {id: 'note', iconName: 'note_add'},
            DOWNLOAD_VIDEO: {id: 'downloadVideo', iconName: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">\n<g clip-path="url(#clip0_1664_11661)">\n<path d="M3 5H21V10H23V5C23 3.9 22.1 3 21 3H3C1.9 3 1 3.9 1 5V17C1 18.1 1.9 19 3 19H12V17H3V5Z" fill="#46BFE6"/>\n<path d="M15 11L9 7V15L15 11Z" fill="#46BFE6"/>\n<path d="M24 18.4167L22.59 17.1242L20 19.4892L20 12L18 12L18 19.4892L15.41 17.1242L14 18.4167L19 23L24 18.4167Z" fill="#46BFE6"/>\n</g>\n<defs>\n<clipPath id="clip0_1664_11661">\n<rect width="24" height="24" fill="white"/>\n</clipPath>\n</defs>\n</svg>'},
            DOWNLOAD_AUDIO: {id: 'downloadAudio', iconName: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">\n<g clip-path="url(#clip0_1664_11652)">\n<path d="M8 3L8.01 13.55C7.41 13.21 6.73 13 6.01 13C3.79 13 2 14.79 2 17C2 19.21 3.79 21 6.01 21C8.23 21 10 19.21 10 17V7H14V3H8Z" fill="#46BFE6"/>\n<path d="M22 16L20.59 14.59L18 17.17L18 9L16 9L16 17.17L13.41 14.59L12 16L17 21L22 16Z" fill="#46BFE6"/>\n</g>\n<defs>\n<clipPath id="clip0_1664_11652">\n<rect width="24" height="24" fill="white"/>\n</clipPath>\n</defs>\n</svg>'},
            SOURCE_LINK: {id: 'sourceLink', iconName: '<i class="glyphicon share glyphicon-link" role="button" aria-label="Audio Item source button"></i>'},
            OPEN_ACTION_LINKS: {id: 'openActionLinks', iconName: 'open_in_new'},
            PLAYLIST_ADD: {id: 'playlist', iconName: 'playlist_add'},
            PLAYLIST_REMOVE: {id: 'playlist', iconName: 'playlist_remove'}
        });
})(window.angular, undefined);