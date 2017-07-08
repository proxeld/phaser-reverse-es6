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

const defaults = {
    range: [-8, -4, -2, -1, 0, 1, 2, 4, 8],
    resetIndex: 3,
};

export default class Multiplier {

    constructor(range = defaults.range, resetIndex = defaults.resetIndex) {
        this._range = range;
        this._resetIndex = Math.min(resetIndex, this._range.length - 1);
        this.reset();
    }

    reset() {
        this._currentMultiplierIndex = this._resetIndex;
        return this.current();
    }

    next() {
        this._currentMultiplierIndex = Math.min(this._currentMultiplierIndex + 1, this._range.length - 1);
        return this.current();
    }

    previous() {
        this._currentMultiplierIndex = Math.max(this._currentMultiplierIndex - 1, 0);
        return this.current();
    }

    current() {
        return this._range[this._currentMultiplierIndex];
    }
}
