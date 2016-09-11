var gulp = require('gulp');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');


/**
 * Pretty logging
 * @param e
 */
function handleError(e) {
    gutil.log(e);
}

/**
 * Creates a bundle file using specified bundler (one-time or watching)
 * @param bundler
 */
function bundle(bundler) {
    return bundler
        // transform to es5 javascript
        .transform(babelify.configure({
            // set set of features that we want to transform
            presets: ['es2015'],

            // Optional ignore regex - if any file names do match this regex then
            // they aren't compiled
            // ignore: /regex/,
        }))
        // create a bundle
        .bundle()
        // inform about errors if exist
        .on('error', handleError)
        // buffer all data in single file called 'bundle.js'
        .pipe(source('bundle.js'))
        // save that file to destination directory
        .pipe(gulp.dest('build'))
        // rename before minification
        .pipe(rename('bundle.min.js'))
        // buffer before piping to uglify
        .pipe(buffer())
        // uglify
        .pipe(uglify({debug: true}))
        // inform about errors if exist
        // save minified file
        .pipe(gulp.dest('build'));
}



gulp.task('watch', function () {

    var watcherBundler = browserify({
        debug: true,
        extensions: ['es6'],
        entries: ['src/js/app.es6'],
        // single global variable for the library
        standalone: 'LibraryName',
        cache: {},
        packageCache: {},
        plugin: [watchify]
    });
    
    bundle(watcherBundler);
    
    watcherBundler.on('update', function () {
        bundle(watcherBundler)
    });

    watcherBundler.on('log', gutil.log);
});


gulp.task('js', function () {
    bundle(browserify({
        debug: true,
        extensions: ['es6'],
        entries: ['src/js/app.es6'],
        // single global variable for the library
        // this will be available in the browser if bundle will be loaded using html script tag
        standalone: 'LibraryName'
    }))
});


gulp.task('default', ['watch']);