// generated on 2016-03-19 using generator-chrome-extension 0.5.4
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import browserify from 'gulp-browserify';
import runSequence from 'run-sequence';

var debug = require('gulp-debug');

const $ = gulpLoadPlugins();

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    '!app/scripts.babel',
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

function lint(files, options) {
  return () => {
    return gulp.src(files)
    .pipe($.eslint(options))
    .pipe($.eslint.format());
  };
}

gulp.task('lint', lint('app/scripts.babel/**/*.js', {
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
  .on('error', function (err) {
    console.log(err);
    this.end();
  })))
  .pipe(gulp.dest('dist/images'));
});

gulp.task('html',  () => {
  return gulp.src('app/*.html')
  .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
  .pipe($.if('*.js', $.uglify()))
  .pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
  .pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
  .pipe(gulp.dest('dist'));
});

gulp.task('chromeManifest', () => {
  var manifestOpts = {
    buildnumber: true,
    background: {
      target: 'scripts/background.js',
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

gulp.task('babel', () => {
  return gulp.src([
    'app/scripts.babel/app.js',
    'app/scripts.babel/chromereload.js',
    'app/scripts.babel/background.js'])
    .pipe($.rollup())
    .pipe($.babel({
      presets: ['es2015']
    }))
    .pipe(browserify({
      ignore: ['npmlog']
    }))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('watch', ['lint', 'babel', 'html'], () => {
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
    'app/scripts.babel/**/*.js',
    '../helpers/**/*.js',
    '../audits/**/*.js',
    '../aggregators/**/*.js',
    '../gatherers/**/*.js',
    '../metrics/**/*.js'
  ], ['babel', 'lint']);
});

gulp.task('package', function () {
  var manifest = require('./dist/manifest.json');
  return gulp.src('dist/**')
  .pipe($.zip('lighthouse-' + manifest.version + '.zip'))
  .pipe(gulp.dest('package'));
});

gulp.task('build', (cb) => {
  runSequence(
    'lint', 'babel', 'chromeManifest',
    ['html', 'images', 'extras'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
