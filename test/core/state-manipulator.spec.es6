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
            const sizeBeforeMemorables = stateManipulator._memorables.size;
            const sizeBeforeCreators = stateManipulator._creators.size;
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

    describe('#restoreSnapshot()', () => {
        let stateManipulator;
        let dummyMemorable;
        let dummyCreator;

        beforeEach(() => {
            stateManipulator = new StateManipulator();
            dummyMemorable = {
                x: 10,
            };
            dummyCreator = new MementoCreator({
                primitives: ['x'],
            });
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
        });

        it('should be able to restore snapshot from previous state', () => {
            const snapshot = stateManipulator.takeSnapshot();
            dummyMemorable.x = 0;
            stateManipulator.restoreSnapshot(snapshot);
            expect(dummyMemorable.x).to.eql(10);
        });

        it('should be able to restore snapshot from any point in time', () => {
            dummyMemorable.x = 10;
            const snapshot1 = stateManipulator.takeSnapshot();
            dummyMemorable.x = 0;
            const snapshot2 = stateManipulator.takeSnapshot();
            dummyMemorable.x = 5;
            const snapshot3 = stateManipulator.takeSnapshot();
            dummyMemorable.x = 3;

            stateManipulator.restoreSnapshot(snapshot2);
            expect(dummyMemorable.x).to.eql(0);
            stateManipulator.restoreSnapshot(snapshot3);
            expect(dummyMemorable.x).to.eql(5);
            stateManipulator.restoreSnapshot(snapshot1);
            expect(dummyMemorable.x).to.eql(10);
        });
    });

    describe('#shift()', () => {
        let stateManipulator;
        let dummyMemorable;
        let dummyCreator;

        beforeEach(() => {
            stateManipulator = new StateManipulator();
            dummyMemorable = {
                x: 10,
            };
            dummyCreator = new MementoCreator({
                primitives: ['x'],
            });
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 0;
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 5;
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 3;
            stateManipulator.takeSnapshot();
        });

        it('should handle shifting forward', () => {
            stateManipulator.shift(-100);
            expect(stateManipulator.getCurrentSnapshotNumber()).to.eql(0);
            stateManipulator.shift(1);
            expect(dummyMemorable.x).to.eql(0);
            stateManipulator.shift(2);
            expect(dummyMemorable.x).to.eql(3);
            stateManipulator.shift(200);
            expect(dummyMemorable.x).to.eql(3);
        });

        it('should handle shifting backward', () => {
            stateManipulator.shift(-1);
            expect(dummyMemorable.x).to.eql(5);
            stateManipulator.shift(-2);
            expect(dummyMemorable.x).to.eql(10);
            stateManipulator.shift(-100);
            expect(dummyMemorable.x).to.eql(10);
        });

        it('should handle zero step', () => {
            stateManipulator.shift(-100);
            expect(stateManipulator.getCurrentSnapshotNumber()).to.eql(0);
            stateManipulator.shift(1);
            stateManipulator.shift(0);
            expect(dummyMemorable.x).to.eql(0);
        });

        it('should stop on first snapshot when going backward', () => {
            stateManipulator.shift(-100);
            expect(dummyMemorable.x).to.eql(10);
            stateManipulator.shift(-1);
            expect(dummyMemorable.x).to.eql(10);
            stateManipulator.shift(-100);
            expect(dummyMemorable.x).to.eql(10);
        });

        it('should stop on last snapshot when going forward', () => {
            stateManipulator.shift(100);
            expect(dummyMemorable.x).to.eql(3);
            stateManipulator.shift(0);
            expect(dummyMemorable.x).to.eql(3);
            stateManipulator.shift(10);
            expect(dummyMemorable.x).to.eql(3);
        });
    });

    describe('#discardAllSnapshots()', () => {
        let stateManipulator;
        let dummyMemorable;
        let dummyCreator;

        beforeEach(() => {
            stateManipulator = new StateManipulator();
            dummyMemorable = { x: 10 };
            dummyCreator = new MementoCreator({
                primitives: ['x'],
            });
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
        });

        it('should cause StateManipulator to have zero snapshots', () => {
            stateManipulator.discardAllSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(0);
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(4);
            stateManipulator.discardAllSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(0);
        });
    });

    describe('#discardFutureSnapshots()', () => {
        let stateManipulator;
        let dummyMemorable;
        let dummyCreator;

        beforeEach(() => {
            stateManipulator = new StateManipulator();
            dummyMemorable = { x: 10 };
            dummyCreator = new MementoCreator({
                primitives: ['x'],
            });
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
        });

        it('should cause StateManipulator to have zero snapshots', () => {
            stateManipulator.discardAllSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(0);
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            const amount = stateManipulator.getSnapshotsAmount();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(amount);
            stateManipulator.shift(-1);
            stateManipulator.discardFutureSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(amount - 1);
            stateManipulator.shift(-2);
            stateManipulator.discardFutureSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(amount - 3);
        });

        it('should not change snapshots amount when called multiple times in succession', () => {
            stateManipulator.discardAllSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(0);
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            const amount = stateManipulator.getSnapshotsAmount();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(amount);
            stateManipulator.shift(-1);
            stateManipulator.discardFutureSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(amount - 1);
            stateManipulator.discardFutureSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(amount - 1);
        });

        it('should always leave at least one snapshot (the one that is present)', () => {
            stateManipulator.discardAllSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(0);
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.takeSnapshot();
            stateManipulator.shift(-100);
            stateManipulator.discardFutureSnapshots();
            expect(stateManipulator.getSnapshotsAmount()).to.eql(1);
        });
    });

    describe('#getLastSnapshot()', () => {
        let stateManipulator;
        let dummyMemorable;
        let dummyCreator;

        beforeEach(() => {
            stateManipulator = new StateManipulator();
            dummyMemorable = { x: 10 };
            dummyCreator = new MementoCreator({
                primitives: ['x'],
            });
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
        });

        it('should return last snapshot event after shifting current snapshot', () => {
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 0;
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 5;
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 3;
            const snapshot = stateManipulator.takeSnapshot();
            stateManipulator.shift(-2);
            expect(snapshot).to.equal(stateManipulator.getLastSnapshot());
        });
    });

    describe('#getCurrentSnapshot()', () => {
        let stateManipulator;
        let dummyMemorable;
        let dummyCreator;

        beforeEach(() => {
            stateManipulator = new StateManipulator();
            dummyMemorable = { x: 10 };
            dummyCreator = new MementoCreator({
                primitives: ['x'],
            });
            stateManipulator.registerMemorable(dummyMemorable, dummyCreator);
        });

        it('should return last current snapshot after shifting', () => {
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 0;
            const snapshot = stateManipulator.takeSnapshot();
            dummyMemorable.x = 5;
            stateManipulator.takeSnapshot();
            dummyMemorable.x = 3;
            stateManipulator.takeSnapshot();
            stateManipulator.shift(-2);
            expect(snapshot).to.equal(stateManipulator.getCurrentSnapshot());
        });
    });
});
