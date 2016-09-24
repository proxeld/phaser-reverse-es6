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
import clone from 'clone';
import utils from './utils.es6';

// property is a common name for all primitives, refs, nested, custom and arrays
// primitives does not necessarily be primitive values (they will be copied regardless of the type)
const configDefault = {
    primitives: [],
    refs: [],
    nested: {},
    custom: {},
    arrays: {},
    // for changing name of the property in the memento (to prevent clashing)
    aliases: {},
};

export default class MementoCreator {
    constructor(config) {
        this.config = Object.assign({}, configDefault, config);
    }

    _aliasify(conf, prop) {
        if (this.config.aliases[conf] && this.config.aliases[conf][prop]) {
            return this.config.aliases[conf][prop];
        }

        return prop;
    }

    create(originator) {
        const data = {};

        // iterate over primitives of originator and clone them into the memento
        // primitives should be primitive values or small objects with only few properties
        for (const prop of this.config.primitives) {
            // property cannot be circular object
            const value = clone(utils.getProperty(originator, prop), false);
            const alias = this._aliasify('primitives', prop);
            utils.setProperty(data, alias, value);
        }

        // copy references, not their values
        // this can prevent garbage collection
        for (const ref of this.config.refs) {
            const value = utils.getProperty(originator, ref);
            const alias = this._aliasify('refs', ref);
            utils.setProperty(data, alias, value);
        }

        // custom behaviour for properties that need such
        for (const key of Object.keys(this.config.custom)) {
            const descriptor = this.config.custom[key];
            const value = descriptor.create(originator);
            const alias = this._aliasify('custom', key);
            utils.setProperty(data, alias, value);
        }

        // nested creators
        for (const prop of Object.keys(this.config.nested)) {
            const nestedCreator = this.config.nested[prop];
            const nestedObj = utils.getProperty(originator, prop);
            const memento = nestedCreator.create(nestedObj);
            const alias = this._aliasify('nested', prop);
            utils.setProperty(data, alias, memento);
        }

        // array handling
        for (const prop of Object.keys(this.config.arrays)) {
            const inArrayElemMementoCreator = this.config.arrays[prop];
            // value is always a new array
            const value = [];
            const memorable = utils.getProperty(originator, prop, []);

            for (const elem of memorable) {
                // if creator is specified, then create memento for each element of an array
                if (inArrayElemMementoCreator) {
                    value.push({
                        ref: elem,
                        memento: inArrayElemMementoCreator.create(elem),
                    });
                } else {
                    value.push({
                        ref: elem,
                    });
                }
            }

            const alias = this._aliasify('arrays', prop);
            utils.setProperty(data, alias, value);
        }

        return data;
    }

    restore(originator, memento) {
        for (const prop of this.config.primitives) {
            const alias = this._aliasify('primitives', prop);
            const value = clone(utils.getProperty(memento, alias));
            utils.setProperty(originator, prop, value);
        }

        for (const ref of this.config.refs) {
            const alias = this._aliasify('refs', ref);
            utils.setProperty(originator, ref, memento[alias]);
        }

        for (const key of Object.keys(this.config.custom)) {
            const descriptor = this.config.custom[key];
            const alias = this._aliasify('custom', key);
            const value = utils.getProperty(memento, alias);
            descriptor.restore(originator, value);
        }

        for (const prop of Object.keys(this.config.nested)) {
            const nestedCreator = this.config.nested[prop];
            const nestedObj = utils.getProperty(originator, prop);
            const alias = this._aliasify('nested', prop);
            const nestedMemento = utils.getProperty(memento, alias);
            nestedCreator.restore(nestedObj, nestedMemento);
            // TODO: check if it's necessary: utils.setProperty(originator, prop, nestedObj);
        }

        // TODO: consider some optimization: right now every time memento is restored it needs to clear all array and then
        // re-add elements
        for (const prop of Object.keys(this.config.arrays)) {
            const inArrayElemMementoCreator = this.config.arrays[prop];
            // value is always a new array
            const memorable = utils.getProperty(originator, prop, []);
            const value = memorable;
            // clear array (this will affect all references to the array)
            memorable.length = 0;

            const alias = this._aliasify('arrays', prop);
            const arrayMemento = utils.getProperty(memento, alias);

            for (const arrayElemMemento of arrayMemento) {
                const elemRef = arrayElemMemento.ref;

                // if creator is specified, then restore memento for each element of an array
                if (inArrayElemMementoCreator) {
                    inArrayElemMementoCreator.restore(elemRef, arrayElemMemento.memento);
                }

                value.push(elemRef);
            }

            utils.setProperty(originator, prop, value);
        }
    }
}
