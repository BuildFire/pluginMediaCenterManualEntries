(function (angular) {
    angular
        .module('mediaCenterContent')
        .directive("loadImage", ["Buildfire", function (Buildfire) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.attr("src", "../../../../styles/media/holder-" + attrs.loadImage + ".gif");
                    var elem = $("<img>");
                    elem[0].onload = function () {
                        element.attr("src", attrs.finalSrc);
                        elem.remove();
                    };
              
                    attrs.$observe('finalSrc', function () {
                        var _img = attrs.finalSrc;
                        if (attrs.cropType && attrs.cropType == "crop") {
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
                    elem.attr("src", attrs.finalSrc);
                }
            };
        }]);
})(window.angular);