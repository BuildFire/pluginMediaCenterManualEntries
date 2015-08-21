var gulp = require('gulp')
    eslint = require('gulp-eslint');
var scriptsGlobs = ['./control/**/*.js'];
/**
 * Simple example of using eslint and a formatter
 * Note: eslint does not write to the console itself.
 * Use format or formatEach to print eslint results.
 * @returns {stream} gulp file stream
 */
gulp.task('validate', function() {
    return gulp.src(scriptsGlobs)
        .pipe(eslint({
            config: 'eslint-config.json'
        }))
        .pipe(eslint.format());
});
