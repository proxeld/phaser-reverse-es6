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

export default class MementoCreator {
    constructor(conf) {
        this.properties = conf.properties || [];
        this.refs = conf.refs || [];
        this.children = conf.children || [];
        this.custom = conf.custom || {};
    }

    create(originator) {
        const data = {};
        const children = {};
        const refs = {};

        // iterate over properties of originator and clone them into the memento
        // properties should be primitive values or small objects with only few properties
        for (const prop of this.properties) {
            // property cannot be circular object
            const value = clone(utils.getProperty(originator, prop), false);
            utils.setProperty(data, prop, value);
        }

        // copy references, not their values
        // this can prevent garbage collection
        for (const ref of this.refs) {
            const value = utils.getProperty(originator, ref);
            utils.setProperty(data, ref, value);
        }

        // custom behaviour for properties that need such
        for (const key of Object.keys(this.custom)) {
            const descriptor = this.custom[key];
            const value = descriptor.create(originator);
            utils.setProperty(data, key, value);
        }

        for(const prop of Object.keys(this.children)) {
            const nestedCreator = this.children[prop];
            const nestedObj = utils.getProperty(originator, prop);
            const memento = nestedCreator.create(nestedObj);
            utils.setProperty(data, prop, memento);
        }

        return data;
    }

    restore(originator, memento) {

        for (const prop of this.properties) {
            const value = clone(utils.getProperty(memento, prop));
            utils.setProperty(originator, prop, value);
        }

        for (const ref of this.refs) {
            utils.setProperty(originator, ref, memento[ref]);
        }

        for (const key of Object.keys(this.custom)) {
            const descriptor = this.custom[key];
            const value = utils.getProperty(memento, key);
            descriptor.restore(originator, value);
        }

        for(const prop of Object.keys(this.children)) {
            const nestedCreator = this.children[prop];
            const nestedObj = utils.getProperty(originator, prop);
            const nestedMemento = utils.getProperty(memento, prop);
            nestedCreator.restore(nestedObj, nestedMemento);
            utils.setProperty(originator, prop, nestedObj);
        }
    }
}
