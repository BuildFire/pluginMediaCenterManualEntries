app.directive('videojs', function () {
    var linker = function (scope, element, attrs){
        attrs.type = attrs.type || "video/mp4";

        var setup = {
            'techOrder' : ['html5', 'flash'],
            'controls' : true,
            'preload' : 'auto',
            'autoplay' : false,
            'height' : 480,
            'width' : 854
        };

        var videoid = 107;
        attrs.id = "videojs" + videoid;
        element.attr('id', attrs.id);
        element.attr('poster', "http://10.1.21.36:8080/Testube/media/" + videoid + ".jpg");
        var player = _V_(attrs.id, setup, function(){
            var source =([
                {type:"video/mp4", src:"http://testube:8080/Testube/media/" + videoid + ".mp4"}
            ]);
            this.src({type : attrs.type, src: source });
        });
    }
    return {
        restrict : 'A',
        link : linker
    };
});
/*
 <video videojs class="video-js vjs-default-skin vjs-controls-enabled vjs-has-started vjs-paused vjs-user-inactive" ng-model="video">
 </video>
 */