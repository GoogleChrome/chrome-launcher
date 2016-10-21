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

const audits = fs.readdirSync(path.join(__dirname, '../', 'lighthouse-core/audits/'))
    .filter(f => /\.js$/.test(f))
    .map(f => `../lighthouse-core/audits/${f.replace(/\.js$/, '')}`);

const gatherers = fs.readdirSync(path.join(__dirname, '../', 'lighthouse-core/gather/gatherers/'))
    .filter(f => /\.js$/.test(f))
    .map(f => `../lighthouse-core/gather/gatherers/${f.replace(/\.js$/, '')}`);

const computedArtifacts = fs.readdirSync(
    path.join(__dirname, '../lighthouse-core/gather/computed/'))
    .filter(f => /\.js$/.test(f))
    .map(f => `../lighthouse-core/gather/computed/${f.replace(/\.js$/, '')}`);

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
    '../lighthouse-core/report/scripts/lighthouse-report.js'
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
      let bundle = browserify(file.path) // , {debug: true})
      // Fix an issue with Babelified code that doesn't brfs well.
      .transform('./fs-transform', {
        global: true
      })
      // Transform the fs.readFile etc, but do so in all the modules.
      .transform('brfs', {
        global: true
      });

      // In the case of our lighthouse-core script, we've got extra work to do
      if (file.path.includes('app/src/lighthouse-background.js')) {
        // Do the additional transform to convert references to devtools-timeline-model
        // to the modified version internal to Lighthouse.
        bundle.transform('./dtm-transform.js', {
          global: true
        })
        .ignore('../lighthouse-core/lib/asset-saver.js') // relative from gulpfile location
        .ignore('source-map');

        // Expose the audits, gatherers, and computed artifacts so they can be dynamically loaded.
        const corePath = '../lighthouse-core/';
        const driverPath = `${corePath}gather/`;
        audits.forEach(audit => {
          bundle = bundle.require(audit, {expose: audit.replace(corePath, '../')});
        });
        gatherers.forEach(gatherer => {
          bundle = bundle.require(gatherer, {expose: gatherer.replace(driverPath, './')});
        });
        computedArtifacts.forEach(artifact => {
          bundle = bundle.require(artifact, {expose: artifact.replace(driverPath, './')});
        });
      }
      // Inject the new browserified contents back into our gulp pipeline
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
    'app/_locales/**/*.json',
    'node_modules/lighthouse-core/**/*.js'
  ]).on('change', livereload.reload);

  gulp.watch([
    '*.js',
    'app/src/**/*.js',
    '../lighthouse-core/**/*.js'
  ], ['browserify']);
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
