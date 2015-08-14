(function (angular) {
    angular
        .module('mediaCenterWidget')
        .controller('WidgetHomeCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', function ($scope, $window, DB, COLLECTIONS) {
            var WidgetHome = this;
            WidgetHome.media = {};
            var MediaCenter = new DB(COLLECTIONS.MediaCenter)
            MediaCenter.get().then(BootStrap, showDummy)
            function BootStrap(media) {
                WidgetHome.media = media;
                if (!WidgetHome.media.content) {
                    WidgetHome.media.content = {
                        sortBy: "Newest"
                    }
                }
                console.log(WidgetHome.media)
            }

            function showDummy() {
                console.log(WidgetHome.media)
                WidgetHome.media = {
                    content: {
                        images: [{
                            imageUrl: "http://www.placehold.it/1280x720.jpg",
                            title: "Dummy",
                            links: "http://www.placehold.it/1280x720.jpg",
                            target: "_blank" //possible values “_blank”
                        }
                        ],
                        descriptionHTML: '<h1>This is dummy data this will change</h1>',
                        description: ' This is dummy data this will change',
                        sortBy: 'Newest'
                    },
                    design: {
                        backgroundImage: ""
                    }

                }
                console.log(WidgetHome.media)
            }

        }]);
})(window.angular, undefined);