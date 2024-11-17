const gulp = require("gulp");
const del = require("del");
const minHTML = require("gulp-htmlmin");
const minifyCSS = require("gulp-csso");
const concat = require("gulp-concat");
const htmlReplace = require("gulp-html-replace");
const uglifyes = require("uglify-es");
const composer = require("gulp-uglify/composer");
const uglify = composer(uglifyes, console);
const babel = require("gulp-babel");

const destinationFolder = releaseFolder();
function releaseFolder() {
    var arr = __dirname.split("/");
    var fldr = arr.pop();
    arr.push(fldr + "_release");
    return arr.join("/");
}

const cssTasks = [
    {
        name: "widgetCSS",
        src: ["widget/assets/css/*.css", "!widget/assets/**"],
        dest: "/widget/assets/css",
    },
    {
        name: "controlSettingsCSS",
        src: "control/settings/assets/css/*.css",
        dest: "/control/settings/assets/css",
    },
    {
        name: "controlContentCSS",
        src: "control/content/assets/css/*.css",
        dest: "/control/content/assets/css",
    },
];

cssTasks.forEach(function (task) {
    gulp.task(task.name, function () {
        return (
          gulp
            .src(task.src, { base: "." })
            .pipe(concat("styles.min.css"))
            .pipe(gulp.dest(destinationFolder + task.dest))
        );
    });
});

gulp.task("widgetCSSLayouts", function () {
    return gulp
      .src("widget/layouts/*.css", { base: "widget" })
      .pipe(gulp.dest(destinationFolder + "/widget"));
});

const jsTasks = [
    {
        name: "widgetJS",
        src: [
            "widget/**/**/**/*.js",
            "!widget/js/**",
            "!widget/assets/**",
        ],
        dest: "/widget",
    },
    {
        name: "controlContentJS",
        src: "control/content/**/**/**/*.js",
        dest: "/control/content",
    },
    {
        name: "controlDesignJS",
        src: "control/design/**/**/*.js",
        dest: "/control/design",
    },
    {
        name: "controlSettingsJS",
        src: "control/settings/**/**/*.js",
        dest: "/control/settings",
    },
];

jsTasks.forEach(function (task) {
    gulp.task(task.name, function () {
        return gulp
          .src(task.src, { base: "." })
          .pipe(
            babel({
                // Transpile JS to ES5
                presets: ["@babel/preset-env"],
            }),
          )
          .pipe(uglify())
          .pipe(concat("scripts.min.js"))
          .pipe(gulp.dest(destinationFolder + task.dest));
    });
});

gulp.task("sharedJS", function () {
    return gulp
      .src([
          "widget/js/shared/*.js",
          "widget/js/data/*.js",
          "widget/js/dataAcess/*.js",
      ])
      .pipe(concat("scripts.min.js"))
      .pipe(gulp.dest(destinationFolder + "/widget/global"));
});

gulp.task("libJS", function () {
    return gulp
      .src([
          "control/content/assets/js/angular-csv.js",
          "control/content/assets/js/ng-clip.min.js",
          "control/content/assets/js/ZeroClipboard.min.js",
      ])
      .pipe(concat("vendor.js"))
      .pipe(gulp.dest(destinationFolder + "/control/content/assets/js"));
});

gulp.task("assetsJs", function () {
    return gulp
      .src(["widget/assets/**/*", "!widget/assets/css/**"], { base: "widget" })
      .pipe(gulp.dest(destinationFolder + "/widget"));
});

gulp.task("contentAssetsJs", function () {
    return gulp
      .src(["control/content/assets/**/*", "!control/content/assets/css/**", "!control/content/assets/js/**"], {
          base: "control/content/assets",
      })
      .pipe(gulp.dest(destinationFolder + "/control/content/assets"));
});

gulp.task("designAssets", function () {
    return gulp
      .src(["control/design/assets/**/*"], { base: "control/design" })
      .pipe(gulp.dest(destinationFolder + "/control/design"));
});

gulp.task("clean", function () {
    return del([destinationFolder], { force: true });
});

gulp.task("controlHtml", function () {
    return (
      gulp
        .src(["control/**/*.html"], { base: "." })
        .pipe(
          htmlReplace({
              bundleJSFiles: "scripts.min.js?v=" + new Date().getTime(),
              bundleCSSFiles: "assets/css/styles.min.css?v=" + new Date().getTime(),
              bundleSharedJSFiles:
                "../../widget/global/scripts.min.js?v=" + new Date().getTime(),
              bundleLibJsFiles: 'assets/js/vendor.js?v=' + new Date().getTime(),
          }),
        )
        .pipe(minHTML({ removeComments: true, collapseWhitespace: true }))
        .pipe(gulp.dest(destinationFolder))
    );
});

gulp.task("widgetHtml", function () {
    return (
      gulp
        .src(["widget/**/*.html"], { base: "." })
        .pipe(
          htmlReplace({
              bundleJSFiles: "scripts.min.js?v=" + new Date().getTime(),
              bundleSharedJSFiles:
                "./global/scripts.min.js?v=" + new Date().getTime(),
              bundleCSSFiles:
                "./assets/css/styles.min.css?v=" + new Date().getTime(),
          }),
        )
        .pipe(minHTML({ removeComments: true, collapseWhitespace: true }))
        .pipe(gulp.dest(destinationFolder))
    );
});

gulp.task("resources", function () {
    return gulp
      .src(["resources/**/*", "resources/*", "plugin.json"], { base: "." })
      .pipe(gulp.dest(destinationFolder));
});


var buildTasksToRun = [
    "widgetHtml",
    "widgetCSSLayouts",
    "controlHtml",
    "resources",
    "sharedJS",
    "libJS",
    "assetsJs",
    "contentAssetsJs",
    "designAssets",
];

cssTasks.forEach(function (task) {
    buildTasksToRun.push(task.name);
});
jsTasks.forEach(function (task) {
    buildTasksToRun.push(task.name);
});

gulp.task("build", gulp.series("clean", buildTasksToRun));
