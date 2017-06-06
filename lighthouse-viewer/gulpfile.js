/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const del = require('del');
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const runSequence = require('run-sequence');
const browserify = require('browserify');
const ghpages = require('gh-pages');

const compile = require('../gulp/compile');
const config = require('../gulp/config');

const $ = gulpLoadPlugins();

function license() {
  return $.license('Apache', {
    organization: 'Copyright 2017 Google Inc. All rights reserved.',
    tiny: true
  });
}

gulp.task('compileReport', compile.compileReport);
gulp.task('compilePartials', compile.compilePartials);

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js',
    'sw.js'
  ])
  .pipe($.eslint())
  .pipe($.eslint.format())
  .pipe($.eslint.failAfterError());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest(`${config.dist}/images`));
});

gulp.task('concat-css', () => {
  return gulp.src([
    '../lighthouse-core/report/styles/report.css',
    '../lighthouse-core/report/partials/*.css',
    'app/styles/viewer.css',
  ])
  .pipe($.concat('viewer.css'))
  .pipe(gulp.dest(`${config.dist}/styles`));
});

gulp.task('html', () => {
  return gulp.src([
    'app/*.html',
    'app/sw.js',
    'app/manifest.json'
  ]).pipe(gulp.dest(config.dist));
});

gulp.task('polyfills', () => {
  return gulp.src([
    'node_modules/url-search-params/build/url-search-params.js',
    'node_modules/whatwg-fetch/fetch.js'
  ])
  .pipe(gulp.dest(`${config.dist}/src/polyfills`));
});

gulp.task('browserify', () => {
  return gulp.src([
    'app/src/main.js'
  ], {read: false})
    .pipe($.tap(file => {
      const bundle = browserify(file.path, {debug: false})
        .plugin('tsify', { // Note: tsify needs to come before transforms.
          allowJs: true,
          target: 'es5',
          diagnostics: true,
          pretty: true,
          removeComments: true
        })
        .transform('brfs')
        .ignore('../lighthouse-core/lib/log.js')
        .ignore('whatwg-url')
        .ignore('url')
        .ignore('debug/node')
        .ignore('source-map')
        .bundle();

      file.contents = bundle; // Inject transformed content back the gulp pipeline.
    }))
    .pipe(gulp.dest(`${config.dist}/src`));
});

gulp.task('compile', ['browserify'], () => {
  return gulp.src([`${config.dist}/src/main.js`])
    .pipe($.uglify()) // minify.
    .pipe(license())  // Add license to top.
    .pipe(gulp.dest(`${config.dist}/src`));
});

gulp.task('clean', () => {
  return del([config.dist]).then(paths =>
    paths.forEach(path => $.util.log('deleted:', $.util.colors.blue(path)))
  );
});

gulp.task('watch', [
  'lint',
  'browserify',
  'polyfills',
  'html',
  'images',
  'concat-css',
  'compileReport',
  'compilePartials'], () => {
    gulp.watch([
      'app/styles/**/*.css',
      '../lighthouse-core/report/styles/**/*.css',
      '../lighthouse-core/report/partials/*.css'
    ]).on('change', () => {
      runSequence('concat-css');
    });

    gulp.watch([
      'app/index.html',
      'app/manifest.json',
      'app/sw.js'
    ]).on('change', () => {
      runSequence('html');
    });

    gulp.watch([
      `../${config.report}`
    ], ['compileReport']);

    gulp.watch([
      `../${config.partials}`
    ], ['compilePartials']);
  });

gulp.task('create-dir-for-gh-pages', () => {
  del.sync([`${config.dist}/viewer`]);

  return gulp.src([`${config.dist}/**/*`])
    .pipe(gulp.dest(`${config.dist}/viewer/viewer`));
});

gulp.task('deploy', cb => {
  runSequence('build', 'create-dir-for-gh-pages', function() {
    ghpages.publish(`${config.dist}/viewer`, {
      logger: $.util.log
    }, err => {
      if (err) {
        $.util.log(err);
      }
      cb();
    });
  });
});

gulp.task('compile-templates', ['compileReport', 'compilePartials']);

gulp.task('build', cb => {
  runSequence(
    'lint', 'compile-templates', 'compile',
    ['html', 'images', 'concat-css', 'polyfills'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
