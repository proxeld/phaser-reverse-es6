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
import MementoCreator from "./memento-creator.es6";

export default class StateManipulator {
    constructor() {
        // object => mementoCreator
        this._memorables = new Map();

        // class => mementoCreator
        this._creators = new Map();
    }


    registerMemorable(memorable, creator) {

        // check if creator was specified explicitly
        if (creator instanceof MementoCreator) {
            this._memorables.set(memorable, creator);

            // cache creator for latter usage with the same class of memorable object
            this._creators.set(memorable.constructor, creator);
        }
        // if not, try to find creator associated with memorable class
        else if(creator === undefined) {
            let found = false;

            for(const [constructor, cachedCreator] of this._creators.entries()) {
                // check cache of creators - search for creator that matches memorable class
                if (memorable instanceof constructor) {
                    this._memorables.set(memorable, cachedCreator);
                    found = true;
                    break;
                }
            }

            if(!found) {
                throw new Error('Creator not specified and not found in cache. Please specify a creator explicitly.');
            }
        }
        // not valid creator and not undefined
        else {
            throw new Error('Specified creator is not instance of MementoCreator class. Creator:', creator);
        }
    }

    takeSnapshot() {

    }
};
