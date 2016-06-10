// generated on 2016-03-19 using generator-chrome-extension 0.5.4

'use strict';
const fs = require('fs');
const path = require('path');
const del = require('del');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');
const gulp = require('gulp');
const browserify = require('browserify');
const chromeManifest = require('gulp-chrome-manifest');
const debug = require('gulp-debug');
const eslint = require('gulp-eslint');
const livereload = require('gulp-livereload');
const tap = require('gulp-tap');
const zip = require('gulp-zip');
const rename = require('gulp-rename');

const audits = fs.readdirSync(path.join(__dirname, '../', 'src/audits/'))
    .filter(f => /\.js$/.test(f))
    .map(f => `../src/audits/${f.replace(/\.js$/, '')}`);

const gatherers = fs.readdirSync(path.join(__dirname, '../', 'src/gatherers/'))
    .filter(f => /\.js$/.test(f))
    .map(f => `../src/gatherers/${f.replace(/\.js$/, '')}`);

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    'app/pages/**',
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

gulp.task('copyReportScripts', () => {
  return gulp.src([
    '../report/scripts/lighthouse-report.js'
  ])
  .pipe(rename('pages/scripts/lighthouse-report.js'))
  .pipe(gulp.dest('app'))
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

gulp.task('css', () => {
  return gulp.src('app/styles/**/*.css')
  .pipe(gulp.dest('dist/styles'));
});

gulp.task('html', () => {
  return gulp.src('app/*.html')
  .pipe(gulp.dest('dist'));
});

gulp.task('chromeManifest', () => {
  var manifestOpts = {
    buildnumber: false,
    background: {
      target: 'scripts/lighthouse-background.js',
      exclude: [
        'scripts/chromereload.js'
      ]
    }
  };
  return gulp.src('app/manifest.json')
  .pipe(chromeManifest(manifestOpts))
  .pipe(gulp.dest('dist'));
});

gulp.task('browserify', () => {
  return gulp.src([
    'app/src/popup.js',
    'app/src/chromereload.js',
    'app/src/lighthouse-background.js',
    'app/src/report-loader.js'
  ], {read: false})
    .pipe(tap(file => {
      let bundle = browserify(file.path, {
        transform: ['brfs'],
      })
      // Do the additional transform to convert references to devtools-timeline-model
      // to the modified version internal to Lighthouse.
      .transform('./dtm-transform.js', {
        global: true
      })
      .ignore('npmlog')
      .ignore('chrome-remote-interface');

      const srcPath = /\.\.\/src\//;

      // Expose the audits and gatherers so they can be dynamically loaded.
      audits.forEach(audit => {
        bundle = bundle.require(audit, {expose: audit.replace(srcPath, './')});
      });

      gatherers.forEach(gatherer => {
        bundle = bundle.require(gatherer, {expose: gatherer.replace(srcPath, './')});
      });

      file.contents = bundle.bundle();
    }))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('clean', () => {
  return del(['.tmp', 'dist', 'app/scripts']).then(paths =>
    paths.forEach(path => gutil.log('deleted:', gutil.colors.blue(path)))
  );
});

gulp.task('watch', ['lint', 'browserify', 'html', 'copyReportScripts'], () => {
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
    '../src/**/*.js'
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
    ['html', 'images', 'css', 'extras', 'copyReportScripts'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
