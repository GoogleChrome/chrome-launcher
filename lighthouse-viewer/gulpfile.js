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
const closure = require('google-closure-compiler-js').gulp();
const ghPages = require('gulp-gh-pages');

const $ = gulpLoadPlugins();

function license() {
  return $.license('Apache', {
    organization: 'Copyright 2016 Google Inc. All rights reserved.',
    tiny: true
  });
}

function applyBrowserifyTransforms(bundle) {
  // Fix an issue with imported speedline code that doesn't brfs well.
  return bundle.transform('../lighthouse-extension/fs-transform', {
    global: true
  }).transform('brfs', {global: true}); // Transform the fs.readFile etc. Do so in all the modules.
}

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js'
  ])
  .pipe($.eslint())
  .pipe($.eslint.format());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest('dist/images'));
});

gulp.task('css', () => {
  return gulp.src([
    'app/styles/**/*.css',
    '../lighthouse-core/report/styles/report.css'
  ])
  .pipe(gulp.dest('dist/styles'));
});

gulp.task('html', () => {
  return gulp.src('app/*.html').pipe(gulp.dest('dist'));
});

gulp.task('browserify', () => {
  return gulp.src([
    'app/src/main.js'
  ], {read: false})
    .pipe($.tap(file => {
      let bundle = browserify(file.path);
      bundle = applyBrowserifyTransforms(bundle);

      // Inject transformed browserified content back into our gulp pipeline.
      file.contents = bundle.bundle();
    }))
    .pipe(gulp.dest('dist/src'));
});

gulp.task('compile', ['browserify'], () => {
  return gulp.src([
    'dist/src/main.js'
  ])
    // .pipe($.sourcemaps.init())
    .pipe(closure({
      compilationLevel: 'SIMPLE',
      // warningLevel: 'VERBOSE',
      // outputWrapper: '(function(){\n%output%\n}).call(this)',
      // languageOut: 'ECMASCRIPT5',
      // processCommonJsModules: true,
      jsOutputFile: 'main.js',
      createSourceMap: true
    }))
    .pipe($.uglify()) // Use uglify to strip out duplicated license headers.
    .pipe(license())  // Add license to top.
    // .pipe($.sourcemaps.write('/'))
    .pipe(gulp.dest('dist/src'));
});

gulp.task('clean', () => {
  return del(['dist']).then(paths =>
    paths.forEach(path => $.util.log('deleted:', $.util.colors.blue(path)))
  );
});

gulp.task('watch', ['lint', 'browserify', 'html', 'images', 'css'], () => {
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

gulp.task('deploy', ['build'], () => {
  return gulp.src('dist/**/*').pipe(ghPages());
});

gulp.task('build', cb => {
  runSequence(
    'lint', 'compile',
    ['html', 'images', 'css'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
