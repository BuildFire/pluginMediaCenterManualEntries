/**
 * Created by lakshay on 27/8/15.
 */
describe('Unit: resizeImage filter', function () {
    beforeEach(module('mediaCenterFilters'));
    var filter;
    beforeEach(inject(function (_$filter_) {
        filter = _$filter_;
    }));

    it('it should pass if "resizeImage" filter returns resized image url', function () {
        var result;
        result = filter('resizeImage')('https://imagelibserver.s3.amazonaws.com/25935164-2add-11e5-9d04-02f7ca55c361/950a50c0-400a-11e5-9af5-3f5e0d725ccb.jpg', 88, 124, 'resize');
        expect(result).toEqual("http://s7obnu.cloudimage.io/s/resizenp/88x124/https://imagelibserver.s3.amazonaws.com/25935164-2add-11e5-9d04-02f7ca55c361/950a50c0-400a-11e5-9af5-3f5e0d725ccb.jpg");
    });

    it('it should give a default image even if parameter is blank', function () {
        var result;
        result = filter('resizeImage')('', 88, 124, 'resize');
        expect(result).toEqual("http://s7obnu.cloudimage.io/s/resizenp/88x124/");
    });
});


describe('Unit: isYoutubeVimeoLink filter', function () {
    beforeEach(module('mediaCenterFilters'));
    var filter;
    beforeEach(inject(function (_$filter_) {
        filter = _$filter_;
    }));

    it('it should pass if returns true for vimeo link', function () {
        var result;
        result = filter('isYoutubeVimeoLink')('https://vimeo.com/8733915','isYoutubeVimeoLink');
        expect(result).toBeTruthy();
    });

    it('it should pass if returns true for youtube link', function () {
        var result;
        result = filter('isYoutubeVimeoLink')('https://www.youtube.com/?v=e1ZUQoRyhi4','isYoutubeVimeoLink');
        expect(result).toBeTruthy();
    });

    it('it should pass if returns false for blank input', function () {
        var result;
        result = filter('isYoutubeVimeoLink')('','isYoutubeVimeoLink');
        expect(result).toBeFalsy();
    });

    it('it should pass if returns false for undefined input', function () {
        var result;
        result = filter('isYoutubeVimeoLink')(undefined,'isYoutubeVimeoLink');
        expect(result).toBeFalsy();
    });
});