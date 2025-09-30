(function (angular, buildfire) {
    angular
        .module('mediaCenterWidget')
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
        .directive("buildFireCarousel", ["$rootScope", function ($rootScope) {
            return {
                restrict: 'A',
                link: function (scope, elem, attrs) {
                    $rootScope.$broadcast("Carousel:LOADED");
                }
            };
        }])
        .directive("loadImage", ['Buildfire', function (Buildfire) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var placeholderType = attrs.loadImage || '16x9';
                    var sanitizedPlaceholder = (placeholderType || '').toString().replace(/[^a-zA-Z0-9_-]/g, '');
                    var placeholderAttr = sanitizedPlaceholder || '16x9';
                    var fallbackSrc = "../../../styles/media/holder-" + placeholderAttr + ".png";
                    var transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

                    initializeSkeleton();
                    showSkeleton();

                    attrs.$observe('finalSrc', function (value) {
                        if (!value) return;
                        showSkeleton();
                        var _img = value;
                        if (attrs.cropType == 'resize') {
                            Buildfire.imageLib.local.resizeImage(_img, {
                                width: attrs.cropWidth,
                                height: attrs.cropHeight
                            }, function (err, imgUrl) {
                                if (err) return applyFallback();
                                _img = imgUrl;
                                replaceImg(_img);
                            });
                        } else {
                            Buildfire.imageLib.local.cropImage(_img, {
                                width: attrs.cropWidth,
                                height: attrs.cropHeight
                            }, function (err, imgUrl) {
                                if (err) return applyFallback();
                                _img = imgUrl;
                                replaceImg(_img);
                            });
                        }
                    });

                    function initializeSkeleton() {
                        element.addClass('load-image');
                        element.attr('data-placeholder-type', placeholderAttr);
                    }

                    function showSkeleton() {
                        element.addClass('load-image--loading');
                        element.attr('src', transparentPixel);
                        element.off("error.skeleton").on("error.skeleton", function () {
                            applyFallback();
                        });
                    }

                    function hideSkeleton() {
                        element.removeClass('load-image--loading');
                    }

                    function applyFallback() {
                        element.off("error.skeleton");
                        element.attr("src", fallbackSrc);
                        hideSkeleton();
                    }

                    function replaceImg(finalSrc) {
                        var elem = $("<img>");
                        elem[0].onload = function () {
                            element.off("error.skeleton");
                            element.attr("src", finalSrc);
                            hideSkeleton();
                            elem.remove();
                        };
                        elem[0].onerror = function () {
                            applyFallback();
                            elem.remove();
                        };
                        elem.attr("src", finalSrc);
                    }
                }
            };
        }])
        .directive('scrolly', function () {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    let raw = element[0], timeOut = null, timer = 300;
                    element.on('scroll', function () {
                        if (raw.scrollTop + raw.offsetHeight >= (raw.scrollHeight*0.60)) { //at the bottom
                            clearTimeout(timeOut);
                            timeOut = setTimeout(()=>{
                                scope.$apply(attrs.scrolly);
                            }, timer)
                        }
                    })
                }
            }
        })
        /**
       * A directive which is used handle background image for layouts.
       */
        .directive('backImg', ["$rootScope", function ($rootScope) {
            return function (scope, element, attrs) {
                attrs.$observe('backImg', function (value) {
                    var img = '';
                    if (value) {
                        buildfire.imageLib.local.cropImage(value, {
                            width: $rootScope.deviceWidth,
                            height: $rootScope.deviceHeight
                        }, function (err, imgUrl) {
                            if (imgUrl) {
                                img = imgUrl;
                                element.attr("style", 'background:url(' + img + ') !important; background-size: cover !important;');
                            } else {
                                img = '';
                                element.attr("style", 'background-color: white;');
                            }
                            element.css({
                                'background-size': 'cover !important'
                            });
                        });
                    }
                    else {
                        img = "";
                        element.attr("style", 'background-color:white');
                        element.css({
                            'background-size': 'cover !important'
                        });
                    }
                });
            };
        }]);
})(window.angular, window.buildfire);
