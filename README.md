Phaser Reverse
==============

## Usage

Include Phaser Reverse bundle.js (or minified bundle) using tag script in your HTML code.
Notice that Phaser Reverse assumes that Phaser library has already been loaded.

```
<script type="text/javascript" src="lib/phaser.min.js"></script>
<script type="text/javascript" src="lib/phaser-reverse.min.js"></script>
```


## Building & Testing

### Prerequisites
* Python (for http server)
* Node, npm

### Running project

* clone repository
* install dependencies (`npm install`)
* use package.json scripts to build/test project (see below)

For coverage information, you have to install `babel-cli` globally.

### Project structure

This is the directory structure:

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

To watch for changes in source files and auto-build type:

```bash
npm run watch
```

or

```
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
## TODO
- snapshot minification
- keys in memento object - minification
- handling object remove/restore operations