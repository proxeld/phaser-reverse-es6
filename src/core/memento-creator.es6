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
    /**
     * Initializes MementoCreator
     * Config object should have following structure:
     * // TODO: describe config structure
     * @param {object} config
     */
    constructor(config) {
        this.config = Object.assign({}, configDefault, config);
        MementoCreator._validateConfig(this.config);
    }

    /**
     * Primitive config validation to prevent most common errors asap
     * @param {object} config configuration object
     * @return {boolean} true if config is valid, false otherwise
     * @private
     */
    static _validateConfig(config) {
        const { primitives, refs, nested, custom, arrays } = config;

        if (!Array.isArray(primitives)) {
            throw new Error('primitives should be an array');
        } else if (!Array.isArray(refs)) {
            throw new Error('refs should be an array');
        } else if (Array.isArray(nested) || typeof nested !== 'object') {
            throw new Error('nested should be an object');
        } else if (Array.isArray(arrays) || typeof custom !== 'object') {
            throw new Error('arrays should be an object');
        }

        if (Array.isArray(custom) || typeof custom !== 'object') {
            throw new Error('custom should be an object');
        } else {
            for (const prop of Object.keys(custom)) {
                const descriptor = custom[prop];
                if (descriptor.create === undefined || descriptor.restore === undefined) {
                    throw new Error('custom should have create and restore methods for each custom property');
                }
            }
        }

        return true;
    }

    /**
     * Check if alias for given property (in given type - @param conf) is available
     * This method is used to prevent clashes when the same propery has to be saved in memento in more than one way
     * (e.g. as reference and custom)
     * @param conf type of property (primitives/nested/refs/custom/arrays)
     * @param prop property to make alias for
     * @return {string} aliased property name or passed @prop if alias not found/specified
     * @private
     */
    _aliasify(conf, prop) {
        if (this.config.aliases[conf] && this.config.aliases[conf][prop]) {
            return this.config.aliases[conf][prop];
        }

        return prop;
    }

    /**
     * Returns rough size of the memento in bytes
     * Used for debugging
     * @param memento memento object returned by {@link MementoCreator.create} method of this memento creator
     * @return {number} rough object size (in bytes)
     * @private
     * // TODO: make it more accurate (handle different types of properties)
     */
    _calculateMementoDataSize(memento) {
        let bytes = 0;

        for (const prop of this.config.primitives) {
            const alias = this._aliasify('primitives', prop);
            bytes += utils.roughSizeOfObject(utils.getProperty(memento, alias));
        }

        for (const prop of Object.keys(this.config.nested)) {
            const nestedCreator = this.config.nested[prop];
            const alias = this._aliasify('nested', prop);
            const nestedData = utils.getProperty(memento, alias);
            bytes += nestedCreator._calculateMementoDataSize(nestedData);
        }

        return bytes;
    }

    /**
     * Creates memento of passed originator. To determine what properties should be remembered and how should they be
     * remembered configuration object is used that was passed to constructor of {@link MementoCreator.constructor}
     * @param originator
     * @see {@link MementoCreator.restore}
     * @return {object} memento of originator
     */
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

    /**
     * Restores memento created by {@link MementoCreator.create} method
     * @param originator should be the same object that was passed to create method
     * @param memento should be memento returned by create method
     * @see {@link MementoCreator.create}
     */
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
