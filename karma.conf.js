// Karma configuration
// Generated on Wed Aug 12 2015 15:10:36 GMT+0530 (IST)

module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine'],


        // list of files / patterns to load in the browser
        files: [
            './bower_components/jquery/dist/jquery.min.js',
            './bower_components/angular/angular.js',
            './bower_components/angular-mocks/angular-mocks.js',
            './bower_components/angular-animate/angular-animate.min.js',
            './bower_components/angular-route/angular-route.min.js',
            './bower_components/angular-bootstrap/ui-bootstrap.min.js',
            './bower_components/angular-ui-tinymce/src/tinymce.js',
            './bower_components/tinymce-dist/tinymce.min.js',
            './bower_components/angular-sanitize/angular-sanitize.min.js',
            './bower_components/videogular/videogular.min.js',
            './bower_components/videogular-controls/vg-controls.min.js',
            './bower_components/videogular-overlay-play/vg-overlay-play.min.js',
            './bower_components/ng-videosharing-embed/build/ng-videosharing-embed.min.js',
            './test/assets/buildfire.js',
            './control/design/**/*.js',
            './control/content/**/*.js',
            './widget/**/*.js',
            './test/**/*.js',
            //'http://localhost:63342/sdk/scripts/buildfire.js',
            'http://localhost:63342/sdk/plugins/pluginMediaCenterManualEntries/widget/assets/js/owl.carousel.min.js',
            'http://localhost:63342/sdk/scripts/buildfire/services/media/audioPlayer.js',
            'http://localhost:63342/sdk/scripts/buildfire/components/carousel/carousel.js'
        ],


        // list of files to exclude
        exclude: [],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            'widget/**/!(js)/*.js': ['coverage'],
            'widget/*.js': ['coverage'],
            'control/design/**/!(js)/*.js': ['coverage'],
            'control/design/*.js': ['coverage'],
            'control/content/**/!(js)/*.js': ['coverage'],
            'control/content/*.js': ['coverage']
        },

        plugins: [
            'karma-phantomjs-launcher',
            'karma-jasmine',
            'karma-junit-reporter',
            'karma-coverage'
        ],
        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'coverage'],

        coverageReporter: {
            type: 'html',
            dir: 'coverage/'
        },

        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['PhantomJS'],


        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true
    })
}
