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
import { expect } from 'chai';
import utils from '../src/js/modules/utils.es6';


describe('Utils', () => {
    describe('#getProperty()', () => {
        it('should be able to return shallow property', () => {
            let prop = utils.getProperty({ x: 10, y: 20 }, 'x');
            expect(prop).to.eql(10);
            prop = utils.getProperty({ x: 10, y: 20 }, 'y');
            expect(prop).to.eql(20);
        });

        it('should be able to return deep property', () => {
            const prop = utils.getProperty({
                position: {
                    x: 10,
                    y: 20,
                },
            }, 'position.x');
            expect(prop).to.eql(10);
        });

        it('should not copy objects', () => {
            const obj = {
                position: {
                    x: 10,
                    y: 20,
                },
            };
            const prop = utils.getProperty(obj, 'position');
            expect(prop).to.equal(obj.position);
            expect(prop).not.to.equal({
                x: 10,
                y: 20,
            });
        });
    });

    describe('#setProperty()', () => {
        it('should be able to set new shallow property', () => {
            const obj = utils.setProperty({ x: 10, y: 20 }, 'z', 30);
            expect(obj).to.eql({ x: 10, y: 20, z: 30 });
        });

        it('should be able to set new deep property', () => {
            const obj = utils.setProperty({}, 'position.x', 10);
            expect(obj).to.eql({ position: { x: 10 } });
        });

        it('should be able to overwrite shallow property', () => {
            const obj = { x: 10, y: 20 };
            const newObj = utils.setProperty(obj, 'x', 30);
            expect(newObj).to.eql({ x: 30, y: 20 });
        });

        it('should be able to overwrite deep property', () => {
            const obj = {
                position: {
                    x: 10,
                    y: 20,
                },
            };
            const newObj = utils.setProperty(obj, 'position.x', 20);
            expect(newObj).to.eql({
                position: {
                    x: 20,
                    y: 20,
                },
            });
        });
    });
});
