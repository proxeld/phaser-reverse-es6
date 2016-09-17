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
import StateManipulator from '../../src/core/state-manipulator.es6';
import MementoCreator from '../../src/core/memento-creator.es6';

describe('State Manipulator', () => {
    describe('#registerMemorable()', () => {
        let stateManipulator;
        let dummyMemorable;
        let dummyMemorable2;
        let dummyCreator;

        beforeEach(() => {
            stateManipulator = new StateManipulator();
            dummyMemorable = {};
            dummyMemorable2 = {};
            dummyCreator = new MementoCreator();
        });

        it('should be able to associate object with memento creator', () => {
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
            expect(stateManipulator._memorables.has(dummyMemorable)).to.eql(true);
            expect(stateManipulator._memorables.get(dummyMemorable)).to.eql(dummyCreator);
        });

        it('should be able to cache creators for the same type of memorables (of the same class)', () => {
            let sizeBeforeMemorables = stateManipulator._memorables.size;
            let sizeBeforeCreators = stateManipulator._creators.size;
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
            stateManipulator.registerMemorable(dummyMemorable2);
            expect(stateManipulator._memorables.size).to.eql(sizeBeforeMemorables + 2);
            expect(stateManipulator._creators.size).to.eql(sizeBeforeCreators + 1);
        });

        it('should be able to use cached creator for the same type of memorables (of the same class)', () => {
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
            stateManipulator.registerMemorable(dummyMemorable2);
            expect(stateManipulator._memorables.get(dummyMemorable2)).to.equal(dummyCreator);
        });
    });
});
