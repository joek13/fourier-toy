var gulp = require("gulp");
var sass = require("gulp-sass");
var concat = require("gulp-concat");
var browserify = require("browserify");
var fs = require("fs");

function html() {
  return gulp.src("src/html/*.html")
    .pipe(gulp.dest("docs/"));
}
function js() {
  return browserify("src/js/app.js")
    .bundle()
    .pipe(fs.createWriteStream("docs/app.min.js"));
}
function css() {
  return gulp.src("src/css/*.scss")
    .pipe(sass())
    .pipe(gulp.dest("docs/"))
}

exports.html = html;
exports.js = js;
exports.css = css;
exports.default = gulp.parallel(html, js, css);
