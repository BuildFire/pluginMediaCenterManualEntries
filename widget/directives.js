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
        })
        .directive('videoJs', function () {
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

                var videoid = 'video';
                attrs.id = videoid;
                var videlem;
                element.attr('id', videoid);
                element.html('');
                videlem = document.createElement("video");
                videlem.setAttribute('class', "video-js vjs-default-skin vjs-big-play-centered");
                videlem.setAttribute("height", "264");
                videlem.setAttribute("width", "315");
                videlem.setAttribute("id", "vid");
                videlem.setAttribute("data-setup", setup);
                videlem.setAttribute("controls", "");
                var sourceMP4 = document.createElement("source");
                sourceMP4.type = "video/mp4";
                sourceMP4.src = attrs.videoUrl;
                videlem.appendChild(sourceMP4);
                element.append(videlem);
                setTimeout(function () {
                    videojs("vid", {}, function () {
                        myPlayer = this;
                        myPlayer.play();
                    });
                },2000);
            }
            return {
                restrict : 'A',
                link : linker
            };
        })
        .directive('audioJs', function () {
            var linker = function (scope, element, attrs){
                attrs.type = attrs.type || "audio/mp3";
                var setup = {
                    'techOrder' : ['html5', 'flash'],
                    'controls' : true,
                    'preload' : 'auto',
                    'autoplay' : false,
                    'height' : 264,
                    'width' : 315
                };

                var videoid = 'audiojs';
                attrs.id = videoid;
                var videlem;
                element.attr('id', videoid);
                element.html('');
                videlem = document.createElement("audio");
                videlem.setAttribute('class', "video-js vjs-default-skin vjs-big-play-centered");
                videlem.setAttribute("height", "264");
                videlem.setAttribute("width", "315");
                videlem.setAttribute("id", "audio");
                videlem.setAttribute("data-setup", setup);
                videlem.setAttribute("controls", "");
                var sourceMP3 = document.createElement("source");
                sourceMP3.setAttribute('src',attrs.audioUrl);
                sourceMP3.setAttribute('type',"audio/mp3");
                videlem.appendChild(sourceMP3);
                element.append(videlem);
            }
            return {
                restrict : 'A',
                link : linker
            };
        })
        .directive('playBtn', function () {
            var linker = function (scope, element, attrs) {
                if (attrs.playBtn == 'true')
                    element.addClass('play-btn');
            }
            return {
                restrict: 'A',
                link: linker
            };
        })
        .directive('buildfireCarousel', function () {
            return {
                restrict: 'E',
                replace: true,
                link: function (scope, elem, attrs) {
                    var view;
                    function initCarousel() {
                        var imgs = scope.images || [];
                        modifySource(imgs);
                        view = new buildfire.components.carousel.view("#carousel", imgs);
                    }

                    function modifySource(arr){
                        angular.forEach(arr, function (i) {
                            i.iconUrl = i.imageUrl;
                        });
                    }

                    initCarousel();


                    scope.$watch(function () {
                        return scope.images;
                    },function(newValue,oldValue) {
                        var imgs = angular.copy(newValue);
                        modifySource(imgs);
                        view.loadItems(imgs);
                    });

                },
                template: "<div id='carousel'></div>",
                scope: {
                    images: '='
                }
            }
        });
})(window.angular, undefined);
