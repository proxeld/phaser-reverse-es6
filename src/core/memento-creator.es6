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

// remembered property is a common name for all primitives, refs, nested, custom and arrays
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
     * // TODO: minification by using shorter keys for memento objects (http://stackoverflow.com/questions/9719676/javascript-object-sizes)
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
        }

        // arrays validation
        if (Array.isArray(arrays) || typeof custom !== 'object') {
            throw new Error('arrays should be an object');
        } else {
            for (const prop of Object.keys(arrays)) {
                const creator = arrays[prop];
                if (!(creator instanceof MementoCreator || creator === undefined)) {
                    throw new Error('arrays should have MementoCreator instance or undefined as a value for each property');
                }
            }
        }

        // custom validation
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
    _calculateMementoSize(memento) {
        let bytes = 0;

        for (const prop of this.config.primitives) {
            const alias = this._aliasify('primitives', prop);
            bytes += utils.roughSizeOfObject(utils.getProperty(memento, alias));
        }

        // this is potentially dangerous
        // custom mementos has no defined structure
        for (const key of Object.keys(this.config.custom)) {
            const alias = this._aliasify('custom', key);
            const value = utils.getProperty(memento, alias);
            bytes += utils.roughSizeOfObject(value);
        }


        for (const prop of Object.keys(this.config.nested)) {
            const nestedCreator = this.config.nested[prop];
            const alias = this._aliasify('nested', prop);
            const nestedData = utils.getProperty(memento, alias);
            bytes += nestedCreator._calculateMementoSize(nestedData);
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
        // TODO: break it up into subfunctions: e.g. _restorePrimitives(originator, memento)
        // TODO: add comments in similar way as in restore methods
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
                        __ref: elem,
                        memento: inArrayElemMementoCreator.create(elem),
                    });
                } else {
                    value.push({
                        __ref: elem,
                    });
                }
            }

            const alias = this._aliasify('arrays', prop);
            utils.setProperty(data, alias, value);
        }

        return data;
    }

    /**
     * Primitives remembered properties from memento are copied and set on originator object
     * Aliases are possible to prevent clashes with different kind of remembered properties
     * @param originator should be the same object that was passed to create method
     * @param memento should be memento returned by create method
     * @see {@link MementoCreator.create}
     * @private
     */
    _restorePrimitives(originator, memento) {

        for (const prop of this.config.primitives) {
            // resolve final name of the remembered property used in the memento
            const alias = this._aliasify('primitives', prop);

            // check if remembered property exists in memento
            // the reason for this is that it could have been removed through the memento minification
            if (utils.hasProperty(memento, alias)) {
                // if so, extract remembered property from memento and copy it's value
                const value = clone(utils.getProperty(memento, alias));

                // set that copied value on originator object - use original name, not alias - aliases are only used internally
                utils.setProperty(originator, prop, value);
            }

            // if remembered property does not exist in memento then simply skip it
        }
    }

    /**
     * For references the values from memento are simply assigned on originator object (not copied)
     * Aliases are possible to prevent clashes with different kind of remembered properties
     * @param originator should be the same object that was passed to create method
     * @param memento should be memento returned by create method
     * @see {@link MementoCreator.create}
     * @private
     */
    _restoreRefs(originator, memento) {
        for (const ref of this.config.refs) {
            // resolve final name of the remembered property used in the memento
            const alias = this._aliasify('refs', ref);

            // check if remembered property exists in memento
            // the reason for this is that it could have been removed through the memento minification
            if (utils.hasProperty(memento, alias)) {
                // if so, extract remembered property from memento (not copied)
                const value = utils.getProperty(memento, alias);

                // set that value on originator object - use original name, not alias - aliases are only used internally
                utils.setProperty(originator, ref, value);
            }

            // if remembered property does not exist in memento then simply skip it
        }
    }

    /**
     * For custom remembered properties use provided descriptor to restore memento
     * Aliases are possible to prevent clashes with different kind of remembered properties
     * @param originator should be the same object that was passed to create method
     * @param memento should be memento returned by create method
     * @see {@link MementoCreator.create}
     * @private
     */
    _restoreCustom(originator, memento) {
        for (const key of Object.keys(this.config.custom)) {
            // resolve final name of the remembered property used in the memento
            const alias = this._aliasify('custom', key);

            // retrieve property descriptor (object with create() and restore() methods
            const descriptor = this.config.custom[key];

            // check if remembered property exists in memento
            // the reason for this is that it could have been removed through the memento minification
            if (utils.hasProperty(memento, alias)) {
                // if so, extract remembered property from memento (not copied)
                const value = utils.getProperty(memento, alias);

                // restore state of nestedObj using descriptor
                descriptor.restore(originator, value);
            }

            // if remembered property does not exist in memento then simply skip it
        }
    }

    /**
     * For nested remembered properties use another memento creator to restore memento
     * This is especially useful when object's property value is another type of object for which
     * we already have creator prepared (e.g. body on sprite)
     * Aliases are possible to prevent clashes with different kind of remembered properties
     * @param originator should be the same object that was passed to create method
     * @param memento should be memento returned by create method
     * @see {@link MementoCreator.create}
     * @private
     */
    _restoreNested(originator, memento) {
        for (const prop of Object.keys(this.config.nested)) {
            // resolve final name of the remembered property used in the memento
            const alias = this._aliasify('nested', prop);

            // retrieve nested memento creator from configuration
            const nestedCreator = this.config.nested[prop];

            // retrieve nested object for which nested creator will be used
            const nestedObj = utils.getProperty(originator, prop);

            // retrieve nested memento
            const nestedMemento = utils.getProperty(memento, alias);

            // restore state of nestedObj using nested memento creator and nested memento
            nestedCreator.restore(nestedObj, nestedMemento);
        }
    }

    /**
     * For arrays remembered properties restore array elements adding all references from memento to newly created array
     * and optionally restoring their state using provided MementoCreator (per element)
     * Aliases are possible to prevent clashes with different kind of remembered properties
     * @param originator should be the same object that was passed to create method
     * @param memento should be memento returned by create method
     * @see {@link MementoCreator.create}
     * @private
     */
    _restoreArrays(originator, memento) {
        // TODO: consider some optimization: right now every time memento is restored it needs to clear all array and then
        for (const prop of Object.keys(this.config.arrays)) {
            // resolve final name of the remembered property used in the memento
            const alias = this._aliasify('arrays', prop);

            // retrieve MementoCreator used for each element in array
            const inArrayElemMementoCreator = this.config.arrays[prop];

            // check if remembered property exists in memento
            // the reason for this is that it could have been removed through the memento minification
            if (utils.hasProperty(memento, alias)) {
                // retrieve current array from originator
                const memorable = utils.getProperty(originator, prop, []);

                // clear array (this will affect all references to the array)
                memorable.length = 0;

                // retrieve array memento
                const arrayMemento = utils.getProperty(memento, alias);

                // iterate over mementos of array elements
                for (const arrayElemMemento of arrayMemento) {
                    // get reference to original element__ref
                    // this is necessary, because we need to have a way to know to which object from array apply it's memento
                    const elemRef = arrayElemMemento.__ref;

                    // if creator is specified, then restore memento for current element of an array
                    if (inArrayElemMementoCreator) {
                        inArrayElemMementoCreator.restore(elemRef, arrayElemMemento.memento);
                    }

                    // push reference to original array
                    memorable.push(elemRef);
                }

                // set final result on the originator
                utils.setProperty(originator, prop, memorable);
            }

            // if remembered property does not exist in memento then simply skip it
        }
    }

    /**
     * Restores memento created by {@link MementoCreator.create} method
     * @param originator should be the same object that was passed to create method
     * @param memento should be memento returned by create method
     * @see {@link MementoCreator.create}
     */
    restore(originator, memento) {
        this._restorePrimitives(originator, memento);

        this._restoreRefs(originator, memento);

        this._restoreCustom(originator, memento);

        this._restoreNested(originator, memento);

        this._restoreArrays(originator, memento);
    }
}
