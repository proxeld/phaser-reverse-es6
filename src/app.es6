/**
 The MIT License (MIT)

 Copyright (c) 2015 Maciej (proxeld) Urbanek

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */
/* eslint no-console: ["error", { allow: ["info"] }] */
import MementoCreator from './core/memento-creator.es6';
import StateManipulator from './core/state-manipulator.es6';
import Creators from './core/creators.es6';
import Debugger from './utils/debugger.es6';
import Multiplier from './utils/multiplier.es6';

console.info(
    '%c⏳ PhaserReverse (v0.0.1) ⏳ Made with %c♥%c by proxeld',
    'background: #222; color: #bada55',
    'background: #222; color: #ff1111',
    'background: #222; color: #bada55'
);

// Library API
export {
    MementoCreator,
    StateManipulator,
    Creators,
    Debugger,
    Multiplier,
};
