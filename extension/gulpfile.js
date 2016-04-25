// generated on 2016-03-19 using generator-chrome-extension 0.5.4

'use strict';
const gulp = require('gulp');
const del = require('del');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');

const gulpLoadPlugins = require('gulp-load-plugins');
const $ = gulpLoadPlugins();

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
  .pipe($.debug({title: 'copying to dist:'}))
  .pipe(gulp.dest('dist'));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
    .pipe($.eslint(options))
    .pipe($.eslint.format());
  };
}

gulp.task('lint', lint([
  'app/src/**/*.js',
  'gulpfile.js'
], {
  env: {
    es6: true
  }
}));

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe($.if($.if.isFile, $.cache($.imagemin({
    progressive: true,
    interlaced: true,
    // don't remove IDs from SVGs, they are often used
    // as hooks for embedding and styling
    svgoPlugins: [{cleanupIDs: false}]
  }))
  .on('error', function(err) {
    console.log(err);
    this.end();
  })))
  .pipe(gulp.dest('dist/images'));
});

gulp.task('html', () => {
  return gulp.src('app/*.html')
  .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
  .pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
  .pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
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
  .pipe($.chromeManifest(manifestOpts))
  .pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
  .pipe(gulp.dest('dist'));
});

gulp.task('browserify', () => {
  return gulp.src([
    'app/src/popup.js',
    'app/src/chromereload.js',
    'app/src/lighthouse-background.js',
    'app/src/report.js'])
    .pipe($.browserify({
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
  $.livereload.listen();

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json'
  ]).on('change', $.livereload.reload);

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
  .pipe($.zip('lighthouse-' + manifest.version + '.zip'))
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
