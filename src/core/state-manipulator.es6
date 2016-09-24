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
import MementoCreator from './memento-creator.es6';
import log from '../utils/logger.es6';

export default class StateManipulator {
    constructor() {
        // Main data structure of state manipulator
        // Contains all recorded snapshots of the game state (consisting of mementos of various objects)
        // Single element has the following structure:
        // {
        //     timestamp: ...,          // timestamp of creating the mementos
        //     mementos: [
        //          {
        //              memorable: ..., // reference to memorable object that was used to create memento
        //              data: ...
        //          },
        //          ...
        //     ]     // mementos (array of mementos)
        // }
        this._snapshots = [];

        // Index of the current state. Most of the time it is equal to _snapshots array length
        // State stack can be traversed. This variable will be updated during traversal
        this._currentStateIndex = -1;

        // object => mementoCreator
        this._memorables = new Map();

        // class => mementoCreator
        this._creators = new Map();
    }

    /**
     * Begins new state pushing new object on the state stack and
     * remembering timestamp of state (a.k.a time of beginning of it's creation)
     * NOTE: This method is used internally. You should never use it by yourself.
     * @return {object} newly created state
     */
    _initNewSnapshot() {
        this._snapshots[++this._currentStateIndex] = {
            // TODO: check old method: timeManager.timeElapsed(),
            // TODO: check if game.time.time isn't more appropriate in here
            timestamp: new Date().getTime(),
            mementos: [],
        };

        return this.getLastSnapshot();
    }

    /**
     * Clears snapshot stack (discards all remembered snapshots)
     */
    discardAllSnapshots() {
        this._snapshots = [];
        this._currentStateIndex = -1;
    }

    /**
     * Discard all taken snapshots that represent the future.
     * It means that we restored snapshot from the past and we do not want to
     * be able to store all snapshots taken after the snapshot we reverted to
     */
    discardFutureSnapshots() {
        this._snapshots.splice(this._currentStateIndex + 1);
    }

    /**
     * By registering object it becomes subject of memento creation through #takeSnapshot() method
     * @param memorable any JavaScript object
     * @param creator creator which will create memento of memorable specified as first argument. This param is not
     * always mandatory. If undefined, StateManipulator will try to find creator which matches
     * memorable's construction function (class). This is done by caching creators for previously registered objects.
     * @throws Error if creator was not specified and cannot be found in cache
     * @see PhaserReverse.Creators for predefined creators for Phaser built-in objects
     */
    registerMemorable(memorable, creator) {
        // check if creator was specified explicitly
        if (creator instanceof MementoCreator) {
            this._memorables.set(memorable, creator);

            // cache creator for latter usage with the same class of memorable object
            this._creators.set(memorable.constructor, creator);
        } else if (creator === undefined) {  // if not, try to find creator associated with memorable class
            let found = false;

            for (const [constructor, cachedCreator] of this._creators.entries()) {
                // check cache of creators - search for creator that matches memorable class
                if (memorable instanceof constructor) {
                    this._memorables.set(memorable, cachedCreator);
                    found = true;
                    break;
                }
            }

            if (!found) {
                throw new Error('Creator not specified and not found in cache. Please specify a creator explicitly.');
            }
        } else { // not valid creator and not undefined
            throw new Error('Specified creator is not instance of MementoCreator class. Creator:', creator);
        }
    }

    /**
     * Creates mementos of the game (registered objects)
     * This method should be called in every frame after all update logic has been done
     * @return {object} snapshot of all memorables
     */
    takeSnapshot() {
        // initialize new snapshot
        const snapshot = this._initNewSnapshot();

        // TODO: save memento of tween manager - it is important for correct tween-reverse handling
        // state.mementos.push({
        //     originator: game.tweens,
        //     memento: game.tweens.createMemento()
        // });

        // create mementos for all memorables
        for (const [memorable, creator] of this._memorables.entries()) {
            snapshot.mementos.push({
                memorable,
                data: creator.create(memorable),
            });
        }

        return snapshot;
    }

    /**
     * Restores state from snapshot taken by #takeSnapshot() method
     * @param snapshot snapshot created by #takeSnapshotMethod
     * @see takeSnapshot
     */
    restoreSnapshot(snapshot) {
        // restore mementos of all memorables
        // NOTE: All the _memorables are still in the memory even if user of this library destroyed them in the game.
        //       This can lead to memory leaks.
        for (const memento of snapshot.mementos) {
            const creator = this._memorables.get(memento.memorable);
            creator.restore(memento.memorable, memento.data);
        }
    }

    /**
     * Changes current state on state situated n steps from current state
     * @param {number} step can be positive (going forward) or negative (going backward)
     */
    shift(step = -1) {
        if (this._snapshots.length === 0) {
            log.trace('No snapshots taken! State will not be change.');
            return undefined;
        }

        const previousStateIndex = this._currentStateIndex;
        let targetStateIndex = this._currentStateIndex;
        let targetSnapshot;
        let statesPath;

        if (step > 0) {
            targetStateIndex = Math.min(previousStateIndex + step, this._snapshots.length - 1);
            statesPath = this._snapshots.slice(previousStateIndex + 1, targetStateIndex + 1);
        } else if (step < 0) {
            targetStateIndex = Math.max(previousStateIndex + step, 0);
            statesPath = this._snapshots.slice(targetStateIndex, previousStateIndex).reverse();
        }

        // Time stopped. Three use-cases:
        // - step parameter is equal 0
        // - shifting forward and already at the end of snapshots
        // - shifting backward and already at the begging of snapshots
        if (targetStateIndex === previousStateIndex) {
            targetSnapshot = this.getCurrentSnapshot();
            this.restoreSnapshot(targetSnapshot);

            // TODO: recalibrate timer
            // timeManager.setTime(targetState.timestamp);
            // if (!timeStoppedDispatched) {
            //     timeManager.onTimeStopped.dispatch();
            //     if (currentStateIdx == stateStack.length - 1) {
            //         timeManager.onTimeStoppedMovingForward.dispatch();
            //     } else if (currentStateIdx == 0) {
            //         timeManager.onTimeStoppedMovingBackward.dispatch();
            //     }
            //
            // }
            // timeStoppedDispatched = true;

            // currentStateIndex didn't change - no need to update
            return targetSnapshot;
        }

        // timeStoppedDispatched = false;

        for (const snapshot of statesPath) {
            targetSnapshot = this.restoreSnapshot(snapshot);
            // TODO: recalibrate timer
            // timeManager.setTime(targetState.timestamp);
        }

        // update current state index
        this._currentStateIndex = targetStateIndex;

        return targetSnapshot;
    }

    /**
     * Returns last state from the state stack. That is the last snapshot that was taken by takeSnapshot method
     * NOTE: last state is not always equal to current state. Last means last element of an array.
     * @return {object}
     */
    getLastSnapshot() {
        if (this._snapshots.length < 1) {
            log.trace('Stack of states is empty. Cannot return last state.');
            return undefined;
        }

        return this._snapshots[this._snapshots.length - 1];
    }

    /**
     * Returns snapshot that was either:
     * - most recently restored by some of the state manipulator methods (shift)
     * - or last taken snapshot by takeSnapshot method
     * Whichever was more recent
     * @returns {*}
     */
    getCurrentSnapshot() {
        if (this._snapshots.length < 1) {
            log.trace('Stack of states is empty. Cannot return last state.');
            return undefined;
        }

        return this._snapshots[this._currentStateIndex];
    }

    /**
     * Current state number getter,
     * @see getCurrentSnapshot for more information about what 'current' means
     * @returns {*}
     */
    getCurrentSnapshotNumber() {
        return this._currentStateIndex;
    }

}
