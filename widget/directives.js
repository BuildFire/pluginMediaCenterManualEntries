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
                    var parent = element.parent();
                    var container;
                    if (parent && parent.hasClass('load-image-container')) {
                        container = parent;
                    } else {
                        container = angular.element('<div class="load-image-container"></div>');
                        if (parent && parent[0]) {
                            parent[0].insertBefore(container[0], element[0]);
                        }
                        container.append(element);
                    }

                    var loaderElement = container[0] && container[0].querySelector ? container[0].querySelector('.load-image-spinner') : null;
                    var loader = loaderElement ? angular.element(loaderElement) : angular.element('<div class="load-image-spinner" aria-hidden="true"></div>');
                    if (!loaderElement) {
                        container.append(loader);
                    }

                    element.addClass('load-image-img load-image-hidden');

                    if (element[0] && element[0].style && element[0].style.width) {
                        container.css('width', element[0].style.width);
                    }

                    var minHeight = null;
                    if (element[0] && element[0].style && element[0].style.height) {
                        minHeight = element[0].style.height;
                    } else if (attrs.cropHeight) {
                        minHeight = attrs.cropHeight + 'px';
                    }

                    function applyMinHeight() {
                        if (minHeight) {
                            container.css('min-height', minHeight);
                        }
                    }

                    function clearMinHeight() {
                        if (minHeight) {
                            container.css('min-height', '');
                        }
                    }

                    function showLoader() {
                        applyMinHeight();
                        container.removeClass('load-image-ready');
                        loader.removeClass('ng-hide');
                        element.removeClass('load-image-visible');
                        element.addClass('load-image-hidden');
                    }

                    function hideLoader() {
                        clearMinHeight();
                        container.addClass('load-image-ready');
                        loader.addClass('ng-hide');
                        element.removeClass('load-image-hidden');
                        element.addClass('load-image-visible');
                    }

                    function setImage(finalSrc) {
                        if (!finalSrc) {
                            hideLoader();
                            return;
                        }

                        var img = new Image();
                        img.onload = function () {
                            scope.$evalAsync(function () {
                                element.attr('src', finalSrc);
                                hideLoader();
                            });
                        };
                        img.onerror = function () {
                            scope.$evalAsync(function () {
                                hideLoader();
                            });
                        };
                        img.src = finalSrc;
                    }

                    attrs.$observe('finalSrc', function () {
                        var _img = attrs.finalSrc;
                        if (!_img) {
                            element.removeAttr('src');
                            container.removeClass('load-image-ready');
                            loader.addClass('ng-hide');
                            element.removeClass('load-image-visible');
                            element.addClass('load-image-hidden');
                            return;
                        }

                        showLoader();

                        var options = {};
                        if (attrs.cropWidth) {
                            options.width = attrs.cropWidth;
                        }
                        if (attrs.cropHeight) {
                            options.height = attrs.cropHeight;
                        }

                        if (attrs.cropType == 'resize') {
                            Buildfire.imageLib.local.resizeImage(_img, options, function (err, imgUrl) {
                                setImage(err ? _img : imgUrl);
                            });
                        } else {
                            Buildfire.imageLib.local.cropImage(_img, options, function (err, imgUrl) {
                                setImage(err ? _img : imgUrl);
                            });
                        }
                    });
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
