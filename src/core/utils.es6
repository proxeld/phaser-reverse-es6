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
    setProperty(obj, dotedString, value = {}) {
        if (dotedString === undefined) {
            return obj;
        }

        const props = dotedString.split('.');
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
            } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
                objectList.push(value);

                for (const i of Object.keys(value)) {
                    stack.push(value[i]);
                }
            }
        }
        return bytes;
    },
};
