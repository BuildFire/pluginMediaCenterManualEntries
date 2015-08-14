//app.directive('videojs', function () {
//    var linker = function (scope, element, attrs){
//        attrs.type = attrs.type || "video/mp4";
//
//        var setup = {
//            'techOrder' : ['html5', 'flash'],
//            'controls' : true,
//            'preload' : 'auto',
//            'autoplay' : false,
//            'height' : 480,
//            'width' : 854
//        };
//
//        var videoid = 107;
//        attrs.id = "videojs" + videoid;
//        element.attr('id', attrs.id);
//        element.attr('poster', "http://10.1.21.36:8080/Testube/media/" + videoid + ".jpg");
//        var player = _V_(attrs.id, setup, function(){
//            var source =([
//                {type:"video/mp4", src:"http://testube:8080/Testube/media/" + videoid + ".mp4"}
//            ]);
//            this.src({type : attrs.type, src: source });
//        });
//    }
//    return {
//        restrict : 'A',
//        link : linker
//    };
//});
/*
 <video videojs class="video-js vjs-default-skin vjs-controls-enabled vjs-has-started vjs-paused vjs-user-inactive" ng-model="video">
 </video>
 */
(function (angular) {
    angular
        .module('mediaCenterWidget')
        .directive('imageCarousel', function () {
            return {
                restrict: 'A',
                link: function (scope, elem, attrs) {
                    scope.carousel = null;
                    scope.isCarouselInitiated = false;
                    function initCarousel() {
                        scope.carousel = null;
                        setTimeout(function () {
                            var obj = {
                                'items': 1,
                                'slideSpeed': 300,
                                'dots': true,
                                'autoplay': true
                            };

                            var totalImages = parseInt(attrs.imageCarousel, 10);
                            if (totalImages) {
                                if (totalImages > 1) {
                                    obj['loop'] = true;
                                }
                                scope.carousel = $(elem).owlCarousel(obj);
                                scope.isCarouselInitiated = true;
                            }
                            scope.$apply();
                        }, 100);
                    }
                    initCarousel();
                    scope.$watch("imagesUpdated", function (newVal, oldVal) {
                        if (newVal) {
                            if (scope.isCarouselInitiated) {
                                scope.carousel.trigger("destroy.owl.carousel");
                                scope.isCarouselInitiated = false;
                            }
                            $(elem).find(".owl-stage-outer").remove();
                            initCarousel();
                        }
                    });
                }
            }
        });
})(window.angular, undefined);
