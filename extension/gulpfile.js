// generated on 2016-03-19 using generator-chrome-extension 0.5.4

'use strict';
const del = require('del');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');
const gulp = require('gulp');
const browserify = require('gulp-browserify');
const chromeManifest = require('gulp-chrome-manifest');
const debug = require('gulp-debug');
const eslint = require('gulp-eslint');
const gulpIf = require('gulp-if');
const livereload = require('gulp-livereload');
const cleanCss = require('gulp-clean-css');
const minifyHtml = require('gulp-minify-html');
const useref = require('gulp-useref');
const zip = require('gulp-zip');

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    '!app/src',
    '!app/.DS_Store',
    '!app/*.json',
    '!app/*.html',
  ], {
    base: 'app',
    dot: true
  })
  .pipe(debug({title: 'copying to dist:'}))
  .pipe(gulp.dest('dist'));
});

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js'
  ])
  .pipe(eslint())
  .pipe(eslint.format());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest('dist/images'));
});

gulp.task('html', () => {
  return gulp.src('app/*.html')
  .pipe(useref({searchPath: ['.tmp', 'app', '.']}))
  .pipe(gulpIf('*.css', cleanCss({compatibility: '*'})))
  .pipe(gulpIf('*.html', minifyHtml({conditionals: true, loose: true})))
  .pipe(gulp.dest('dist'));
});

gulp.task('chromeManifest', () => {
  var manifestOpts = {
    buildnumber: true,
    background: {
      target: 'scripts/lighthouse-background.js',
      exclude: [
        'scripts/chromereload.js'
      ]
    }
  };
  return gulp.src('app/manifest.json')
  .pipe(chromeManifest(manifestOpts))
  .pipe(gulpIf('*.css', cleanCss({compatibility: '*'})))
  .pipe(gulp.dest('dist'));
});

gulp.task('browserify', () => {
  return gulp.src([
    'app/src/popup.js',
    'app/src/chromereload.js',
    'app/src/lighthouse-background.js',
    'app/src/report.js'])
    .pipe(browserify({
      ignore: [
        'npmlog',
        'chrome-remote-interface'
      ],
      transform: ['brfs']
    }))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('clean', () => {
  return del(['.tmp', 'dist', 'app/scripts']).then(paths =>
    paths.forEach(path => gutil.log('deleted:', gutil.colors.blue(path)))
  );
});

gulp.task('watch', ['lint', 'browserify', 'html'], () => {
  livereload.listen();

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json'
  ]).on('change', livereload.reload);

  gulp.watch([
    '*.js',
    'app/src/**/*.js',
    '../lib/**/*.js',
    '../audits/**/*.js',
    '../aggregators/**/*.js',
    '../gatherers/**/*.js',
    '../metrics/**/*.js'
  ], ['browserify', 'lint']);
});

gulp.task('package', function() {
  var manifest = require('./dist/manifest.json');
  return gulp.src('dist/**')
  .pipe(zip('lighthouse-' + manifest.version + '.zip'))
  .pipe(gulp.dest('package'));
});

gulp.task('build', cb => {
  runSequence(
    'lint', 'browserify', 'chromeManifest',
    ['html', 'images', 'extras'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
