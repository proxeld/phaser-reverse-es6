es6-browserify-gulp-boilerplate
===============================

### Getting started

```bash
# clone repository
git clone https://github.com/proxeld/es6-browserify-gulp-boilerplate.git es6-boilerplate
cd es6-boilerplate

# install dependencies
npm install
```

To use gulp tasks you need to have gulp command available globally (`npm i gulp -g`) or you can use gulp from node_modules directory:

```bash
./node_modules/.bin/gulp
```

For coverage information, you have to install `babel-cli` globally.

### Project structure

This is the directory structure you will end up with following the instructions in the Installation Guide.

    |-- src 
    |   |-- js
    |       |-- app.es6
    |       |-- ...
    |-- test
    |-- build
    |-- Gulpfile.js
    |-- tests.html
    |-- ...

* `src/js` - all source code of the application
* `src/js/app.es6` - main entry point of the application (for bundling)
* `test` - directory with all tests
* `build` - output directory created automatically. Contains bundles (minified/normal)
* `Gulpfile.js` - gulp tasks configuration
* `tests.html` - in-browser test runner

### Usage

To build final bundle (both minified and not minified) just type (in your console):

```bash
npm run build
```

You can configure destination of the bundle in `Gulpfile.js` file. By default it will be created in ```build``` directory.

To watch for changes in source files and auto-build type:

```bash
npm run watch

# or
gulp watch
```

To run tests in console type:

```bash
npm test
```

If you want to run tests in the browser type:

```bash
npm run build-browser-tests-bundle
```
and open tests.html in your browser.

To get coverage of your code type:

```bash
npm run cover
```

To check eslint rules compliance:

```bash
npm run eslint
```

### What should work out of the box:

- ES6 (ECMAScript 2015) syntax in application code and tests (browserify, babel)
- code transpilation after change detection (gulp, watchify, babel)
- bundling into a single file (browserify)
- bundling with minification (browserify, gulp-uglify) 
- running tests from both console and browser (mocha, browserify)
- getting code coverage (istanbul)
