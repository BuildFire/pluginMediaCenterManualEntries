(function (angular , buildfire) {
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
                  element.attr("src", "../../../styles/media/holder-" + attrs.loadImage + ".gif");

                  attrs.$observe('finalSrc', function() {
                      var _img = attrs.finalSrc;

                      if (attrs.cropType == 'resize') {
                          Buildfire.imageLib.local.resizeImage(_img, {
                              width: attrs.cropWidth,
                              height: attrs.cropHeight
                          }, function (err, imgUrl) {
                              _img = imgUrl;
                              replaceImg(_img);
                          });
                      } else {
                          Buildfire.imageLib.local.cropImage(_img, {
                              width: attrs.cropWidth,
                              height: attrs.cropHeight
                          }, function (err, imgUrl) {
                              _img = imgUrl;
                              replaceImg(_img);
                          });
                      }
                  });

                  function replaceImg(finalSrc) {
                      var elem = $("<img>");
                      elem[0].onload = function () {
                          element.attr("src", finalSrc);
                          elem.remove();
                      };
                      elem.attr("src", finalSrc);
                  }
              }
          };
      }])

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
                            if(imgUrl) {
                                img = imgUrl;
                                element.attr("style", 'background:url(' + img + ') !important ;;background-size: cover !important;');
                            } else {
                                img = '';
                                element.attr("style", 'background-color:white');
                            }
                            element.css({
                                'background-size': 'cover'
                            });
                        });
//                      img = $filter("cropImage")(value, $rootScope.deviceWidth, $rootScope.deviceHeight, true);
                    }
                    else {
                        img = "";
                        element.attr("style", 'background-color:white');
                        element.css({
                            'background-size': 'cover'
                        });
                    }
                });
            };
        }]);
})(window.angular, window.buildfire);
