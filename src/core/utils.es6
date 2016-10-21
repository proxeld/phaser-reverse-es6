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

export default {
    /**
     * Returns object (possibly nested) property.
     * Takes into account prototype chain
     * @param obj object from which property is taken
     * @param dottedString simple property name or dotted name for nested properties
     * (e.g 'position.x' if you want to get x property from position property on @param obj)
     * @param fallbackValue if property is equal to undefined fallbackValue will be returned
     * (if not specified undefined will be returned)
     * @return {*}
     */
    getProperty(obj, dottedString = '', fallbackValue) {
        const props = dottedString.split('.');
        let final = obj;

        for (const part of props) {
            if (typeof final === 'object' && part in final) {
                final = final[part];
            } else {
                return fallbackValue;
            }
        }

        return final;
    },
    /**
     * Sets property of an object (possibly nested).
     * If on the way to set final value properties are missing, they are being created
     * @param obj object on which property is set
     * @param dottedString simple property name or dotted name for nested properties
     * (e.g 'position.x' if you want to get x property from position property on @param obj)
     * @param value value of the property that is being set
     * @return {*}
     */
    setProperty(obj, dottedString, value) {
        if (dottedString === undefined) {
            return obj;
        }

        const props = dottedString.split('.');
        const lastProp = props.pop();
        let temp = obj;

        for (const part of props) {
            if (temp.hasOwnProperty(part)) {
                temp = temp[part];
            } else {
                temp[part] = {};
                temp = temp[part];
            }
        }

        temp[lastProp] = value;

        return obj;
    },
    /**
     * Checks if property (possibly nested) exists in object
     * Takes into account prototype chain
     * @param obj object from which property is checked
     * @param dottedString simple property name or dotted name for nested properties
     * (e.g 'position.x' if you want to get x property from position property on @param obj)
     * @return {boolean}
     */
    hasProperty(obj, dottedString) {
        const props = dottedString.split('.');
        let final = obj;

        for (const part of props) {
            if (typeof final === 'object' && part in final) {
                final = final[part];
            } else {
                return false;
            }
        }

        return true;
    },
    // TODO: add doc to this function or replace it with better one
    // alternative: https://www.npmjs.com/package/object-sizeof
    roughSizeOfObject(object) {
        // source: http://stackoverflow.com/questions/1248302/javascript-object-size#answer-11900218
        const objectList = [];
        const stack = [object];
        let bytes = 0;

        while (stack.length) {
            const value = stack.pop();

            if (typeof value === 'boolean') {
                bytes += 4;
            } else if (typeof value === 'string') {
                bytes += value.length * 2;
            } else if (typeof value === 'number') {
                bytes += 8;
            } else if (typeof value === 'object' && objectList.indexOf(value) === -1 && value !== null) {
                objectList.push(value);

                for (const key of Object.keys(value)) {
                    // add length of the key
                    bytes += key.length * 2;

                    stack.push(value[key]);
                }
            }
        }
        return bytes;
    },
};
