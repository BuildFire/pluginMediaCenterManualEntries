'use strict';

(function (angular, buildfire) {
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent')
        .provider('Buildfire', [function () {
            this.$get = function () {
                return buildfire;
            }
        }])
        .factory('Media',[function(){
            var media=this;
            media.getById=function(itemId,callback){
                buildfire.datastore.getById(itemId,'media',callback);
            };
            media.add=function(item,callback){
                buildfire.datastore.insert(item,'media',true,callback);
            };
            media.delete=function(itemId,callback){
                buildfire.datastore.delete(itemId,'media',callback);
            };
            media.search=function(options,callback){
                buildfire.datastore.search(options,'media',callback);
            };
            return media;
        }])
})(window.angular, window.buildfire);