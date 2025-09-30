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
                  
                  attrs.$observe('finalSrc', function (_img) {
                      if (!_img) return;
                      
                      var options = {};
                      if (attrs.cropWidth) options.width = attrs.cropWidth;
                      if (attrs.cropHeight) options.height = attrs.cropHeight;
                      
                      var processImage = attrs.cropType === 'resize' ? Buildfire.imageLib.local.resizeImage : Buildfire.imageLib.local.cropImage;
                      
                      processImage(_img, options, function (err, imgUrl) {
                          var finalSrc = err ? _img : imgUrl;
                          
                          var img = new Image();
                          img.onload = function () {
                              scope.$evalAsync(function () {
                                  element.attr("src", finalSrc);
                                  element.removeClass('load-image-hidden');
                                  element.addClass('load-image-visible');
                                  console.log("image loaded");
                                  
                                  if (scope.item) {
                                      scope.item.imageLoaded = true;
                                  }
                              });
                          };
                          img.src = finalSrc;
                      });
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
