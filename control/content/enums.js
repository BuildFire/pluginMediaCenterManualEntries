'use strict';

(function (angular) {
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent')
        .constant('TAG_NAMES', {
            PEOPLE_INFO: 'mediaInfo',
            PEOPLE: 'media'
        })
})(window.angular);