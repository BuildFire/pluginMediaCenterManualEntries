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
        })
        .directive('errSrc', function() {
            return {
                link: function(scope, element, attrs) {
                    element.bind('error', function() {
                        if (attrs.src != attrs.errSrc) {
                            attrs.$set('src', attrs.errSrc);
                        }
                    });
                    attrs.$observe('ngSrc', function(value) {
                        if (!value && attrs.errSrc) {
                            attrs.$set('src', attrs.errSrc);
                        }
                    });
                }
            }
        }).directive('videojs', function () {
            var linker = function (scope, element, attrs){
                attrs.type = attrs.type || "video/mp4";

                var setup = {
                    'techOrder' : ['html5', 'flash'],
                    'controls' : true,
                    'preload' : 'auto',
                    'autoplay' : false,
                    'height' : 264,
                    'width' : 315
                };

                var videoid = 'vid';
                attrs.id = videoid;
                element.attr('id', attrs.id);
                element.attr('poster', attrs.poster);
                var player = _V_(attrs.id, setup, function(){
                    var source =([
                        {type:"video/mp4", src:attrs.src}
                    ]);
                    this.src({type : attrs.type, src: source });
                });
            }
            return {
                restrict : 'A',
                link : linker
            };
        });
})(window.angular, undefined);
