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
const LighthouseRunner = require('../lighthouse-core/runner');

const audits = LighthouseRunner.getAuditList()
    .map(f => '../lighthouse-core/audits/' + f.replace(/\.js$/, ''));

const gatherers = LighthouseRunner.getGathererList()
    .map(f => '../lighthouse-core/gather/gatherers/' + f.replace(/\.js$/, ''));

const computedArtifacts = fs.readdirSync(
    path.join(__dirname, '../lighthouse-core/gather/computed/'))
    .filter(f => /\.js$/.test(f))
    .map(f => '../lighthouse-core/gather/computed/' + f.replace(/\.js$/, ''));

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

function applyBrowserifyTransforms(bundle) {
  // Fix an issue with imported speedline code that doesn't brfs well.
  return bundle.transform('./fs-transform', {
    global: true
  })
  // Transform the fs.readFile etc, but do so in all the modules.
  .transform('brfs', {
    global: true
  });
}

gulp.task('browserify-lighthouse', () => {
  return gulp.src([
    'app/src/lighthouse-background.js'
  ], {read: false})
    .pipe(tap(file => {
      let bundle = browserify(file.path); // , {debug: true})
      bundle = applyBrowserifyTransforms(bundle);

      // lighthouse-background will need some additional transforms, ignores and requires…

      // Do the additional transform to convert references of devtools-timeline-model
      // to the modified version internal to Lighthouse.
      bundle.transform('./dtm-transform.js', {
        global: true
      })
      .ignore('../lighthouse-core/lib/asset-saver.js') // relative from gulpfile location
      .ignore('source-map')
      .ignore('debug/node');

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

      // Inject the new browserified contents back into our gulp pipeline
      file.contents = bundle.bundle();
    }))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('browserify-other', () => {
  return gulp.src([
    'app/src/popup.js',
    'app/src/chromereload.js',
  ], {read: false})
    .pipe(tap(file => {
      let bundle = browserify(file.path); // , {debug: true})
      bundle = applyBrowserifyTransforms(bundle);
      // Inject the new browserified contents back into our gulp pipeline
      file.contents = bundle.bundle();
    }))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('browserify', cb => {
  runSequence('browserify-lighthouse', 'browserify-other', cb);
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
    ['html', 'images', 'css', 'extras'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
