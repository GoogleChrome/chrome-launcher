/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const del = require('del');
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const runSequence = require('run-sequence');
const browserify = require('browserify');
const ghpages = require('gh-pages');

const $ = gulpLoadPlugins();

const DIST_FOLDER = 'dist';

function license() {
  return $.license('Apache', {
    organization: 'Copyright 2016 Google Inc. All rights reserved.',
    tiny: true
  });
}

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js'
  ])
  .pipe($.eslint())
  .pipe($.eslint.format())
  .pipe($.eslint.failAfterError());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest(`${DIST_FOLDER}/images`));
});

gulp.task('css', () => {
  return gulp.src([
    'app/styles/**/*.css',
    '../lighthouse-core/report/styles/report.css'
  ])
  .pipe(gulp.dest(`${DIST_FOLDER}/styles`));
});

gulp.task('concat-css', ['html', 'css'], () => {
  return gulp.src([`${DIST_FOLDER}/index.html`])
    .pipe($.useref())
    .pipe(gulp.dest(DIST_FOLDER));
});

gulp.task('html', () => {
  return gulp.src('app/*.html').pipe(gulp.dest(DIST_FOLDER));
});

gulp.task('polyfills', () => {
  return gulp.src([
    'node_modules/url-search-params/build/url-search-params.js',
    'node_modules/whatwg-fetch/fetch.js'
  ])
  .pipe(gulp.dest(`${DIST_FOLDER}/src/polyfills`));
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
    .pipe(gulp.dest(`${DIST_FOLDER}/src`));
});

gulp.task('compile', ['browserify'], () => {
  return gulp.src([`${DIST_FOLDER}/src/main.js`])
    .pipe($.uglify()) // minify.
    .pipe(license())  // Add license to top.
    .pipe(gulp.dest(`${DIST_FOLDER}/src`));
});

gulp.task('clean', () => {
  return del([DIST_FOLDER]).then(paths =>
    paths.forEach(path => $.util.log('deleted:', $.util.colors.blue(path)))
  );
});

gulp.task('watch', ['lint', 'browserify', 'polyfills', 'html', 'images', 'css'], () => {
  gulp.watch([
    'app/styles/**/*.css',
    '../lighthouse-core/report/styles/**/*.css'
  ]).on('change', () => {
    runSequence('css');
  });

  gulp.watch([
    'app/index.html'
  ]).on('change', () => {
    runSequence('html');
  });

  gulp.watch([
    'app/src/**/*.js',
    '../lighthouse-core/**/*.js'
  ], ['browserify']);
});

gulp.task('create-dir-for-gh-pages', () => {
  del.sync([`${DIST_FOLDER}/viewer`]);

  return gulp.src([`${DIST_FOLDER}/**/*`])
    .pipe(gulp.dest(`${DIST_FOLDER}/viewer/viewer`));
});

gulp.task('deploy', cb => {
  runSequence('build', 'create-dir-for-gh-pages', function() {
    ghpages.publish(`${DIST_FOLDER}/viewer`, {
      logger: $.util.log
    }, err => {
      if (err) {
        $.util.log(err);
      }
      cb();
    });
  });
});

gulp.task('build', cb => {
  runSequence(
    'lint', 'compile',
    ['html', 'images', 'css', 'polyfills'],
    'concat-css', cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
