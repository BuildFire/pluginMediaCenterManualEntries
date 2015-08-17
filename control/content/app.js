'use strict';

(function (angular, buildfire) {
    //created mediaCenterContent module
    angular
        .module('mediaCenterContent', ['mediaCenterEnums','mediaCenterServices','ngAnimate', 'ngRoute', 'ui.bootstrap', 'ui.sortable', 'ngClipboard', 'infinite-scroll', "bngCsv"])
        //injected ngRoute for routing
        //injected ui.bootstrap for angular bootstrap component
        //injected ui.sortable for manual ordering of list
        //ngClipboard to provide copytoclipboard feature
        .config(['$routeProvider', 'ngClipProvider','COLLECTIONS', function ($routeProvider, ngClipProvider,COLLECTIONS) {
            ngClipProvider.setPath("//cdnjs.cloudflare.com/ajax/libs/zeroclipboard/2.1.6/ZeroClipboard.swf");
            $routeProvider
                .when('/', {
                    templateUrl: 'templates/home.html',
                    controllerAs: 'ContentHome',
                    controller: 'ContentHomeCtrl'
                })
                .when('/media', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'ContentMedia',
                    controller: 'ContentMediaCtrl',
                    resolve:{
                        media:function(){
                            return null;
                        }
                    }

                })
                .when('/media/:itemId', {
                    templateUrl: 'templates/media.html',
                    controllerAs: 'ContentMedia',
                    controller: 'ContentMediaCtrl',
                    resolve:{
                        media:function(DB,$routeParams){
                            var db=new DB(COLLECTIONS.MediaContent);
                            db.find($routeParams.id).then(function(data){
                                return data;
                            },function(err){
                                return null;
                            });
                        }
                    }
                })
                .otherwise('/');
        }])
        .run(function ($rootScope, $location) {
            /* Buildfire.messaging.onReceivedMessage = function(message){
             $location.path('/people/'+ message.id);
             };*/
        });
})(window.angular, window.buildfire);
