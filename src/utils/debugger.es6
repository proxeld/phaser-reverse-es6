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
import './debugger.less';

const toolbarMarkup = `
    <div id="state-slider-wrapper">
        <label for="state-slider" id="slider-current-label" class="label" title="Current state">1</label>
        <label class="label">/</label>
        <label class="label" id="slider-max-label" title="States amount">10</label>
        <input type="range" value="0" min="1" max="10" step="1" id="state-slider"/>
        <div class="btn" id="manipulator-first">&#8676;</div>
        <div class="btn" id="manipulator-previous">❮</div>
        <div class="btn" id="manipulator-pause">&#9654;</div>
        <div class="btn" id="manipulator-next">❯</div>
        <div class="btn" id="manipulator-last">&#8677;</div>
    </div>
`;

const defaults = {
    toolbar: true,
};

export default class Debugger {

    constructor(game, stateManipulator, options) {
        if (!game || !stateManipulator) {
            throw Error('Game or StateManipulator arguments are missing');
        }
        this.game = game;
        this.stateManipulator = stateManipulator;
        this.options = Object.assign({}, defaults, options);

        this._nodes = {
            toolbarDiv: null,
            slider: null,
            currentLabel: null,
            maxLabel: null,
            manipulatorFirst: null,
            manipulatorPrevious: null,
            manipulatorPause: null,
            manipulatorNext: null,
            manipulatorLast: null,
        };

        // toolbar module
        if (this.options.toolbar) {
            this._createToolbar();
        }
    }

    /**
     * Construct all the markup associated with toolbar
     * @private
     */
    _createToolbar() {
        this._nodes.toolbarDiv = document.createElement('div');
        this._nodes.toolbarDiv.id = 'debug-toolbar';
        this._nodes.toolbarDiv.innerHTML = toolbarMarkup;

        document.body.appendChild(this._nodes.toolbarDiv);

        this._bindNodes();

        // attach events
        this._attachEvents();

        // show toolbar
        this.show();
    }

    /**
     * Binds DOM elements with JS variables
     * @private
     */
    _bindNodes() {
        this._nodes.slider = document.getElementById('state-slider');
        this._nodes.maxLabel = document.getElementById('slider-max-label');
        this._nodes.currentLabel = document.getElementById('slider-current-label');
        this._nodes.manipulatorFirst = document.getElementById('manipulator-first');
        this._nodes.manipulatorPrevious = document.getElementById('manipulator-previous');
        this._nodes.manipulatorPause = document.getElementById('manipulator-pause');
        this._nodes.manipulatorNext = document.getElementById('manipulator-next');
        this._nodes.manipulatorLast = document.getElementById('manipulator-last');
    }

    _attachEvents() {
        const { slider, manipulatorPause, manipulatorFirst, manipulatorPrevious,
            manipulatorNext, manipulatorLast } = this._nodes;

        // update label showing current state and pause game
        // and restore given snapshot
        slider.addEventListener('input', () => {
            this.game.paused = true;
            this._restoreWithLabelUpdate(slider.value - 1);
        });

        // pause/resume game and discard future states
        manipulatorPause.addEventListener('click', () => {
            this.game.paused = !this.game.paused;
            this.stateManipulator.discardFutureSnapshots();
        });

        // pause game and restore first existing snapshot
        manipulatorFirst.addEventListener('click', () => {
            this.game.paused = true;
            this._restoreWithLabelUpdate(0);
        });

        // pause game and restore previous snapshot
        manipulatorPrevious.addEventListener('click', () => {
            // previous snapshot number
            const targetSnapshotNumber = Math.max(0, slider.value - 2);
            this.game.paused = true;
            this._restoreWithLabelUpdate(targetSnapshotNumber);
        });

        // pause game and restore next snapshot
        manipulatorNext.addEventListener('click', () => {
            // next snapshot number
            const targetSnapshotNumber = Math.min(this.stateManipulator.getSnapshotsAmount() - 1, slider.value);
            this.game.paused = true;
            this._restoreWithLabelUpdate(targetSnapshotNumber);
        });

        // pause game and restore last existing snapshot
        manipulatorLast.addEventListener('click', () => {
            const targetSnapshotNumber = Math.min(this.stateManipulator.getSnapshotsAmount() - 1);
            this.game.paused = true;
            this._restoreWithLabelUpdate(targetSnapshotNumber);
        });
    }

    /**
     * Convenient function for restoring certain snapshot and updating the slider labels
     *
     * @param number number of snapshot
     * @private
     */
    _restoreWithLabelUpdate(number) {
        const { currentLabel, slider } = this._nodes;

        this.stateManipulator.restoreSnapshot(this.stateManipulator._snapshots[number]);

        // add one to handle 0-indexed array
        currentLabel.innerHTML = number + 1;
        slider.value = number + 1;
    }

    /**
     * Show toolbar on the screen
     * Use only if toolbar has been created during construction
     */
    show() {
        this._nodes.toolbarDiv.style.display = 'block';
    }

    /**
     * Hide toolbar
     * Use only if toolbar has been created during construction
     */
    hide() {
        this._nodes.toolbarDiv.style.display = 'none';
    }

    /**
     * Updates labels/input values
     * Should be called in game's update function
     */
    update() {
        if (this.options.toolbar) {
            const snapshotsAmount = this.stateManipulator.getSnapshotsAmount();
            const currentSnapshot = this.stateManipulator.getCurrentSnapshotNumber();
            const { slider, maxLabel, currentLabel } = this._nodes;

            currentLabel.innerHTML = currentSnapshot + 1;
            maxLabel.innerHTML = slider.max = slider.value = snapshotsAmount;
        }
    }

    /**
     * Draw debug information on the screen
     * @param stateManipulator
     * @param x
     * @param y
     * @param color
     */
    stateManipulatorInfo(stateManipulator, x = 0, y = 0, color = '#ffffff') {
        if (!stateManipulator.getLastSnapshot()) {
            return;
        }

        const lastSnapshotSize = stateManipulator.roughSnapshotSize(stateManipulator.getLastSnapshot());
        const FRAME_RATE = 60;
        const MBPerSecond = ((lastSnapshotSize * FRAME_RATE) / 1024) / 1024;
        const MBPerHour = MBPerSecond * 60 * 60;
        const memoryFootprint = (stateManipulator.roughMemoryFootprint() / 1024) / 1024;

        this.game.debug.start(x, y, color);

        this.game.debug.line(`Last snapshot size: ${lastSnapshotSize} Bytes`);
        this.game.debug.line(`Memory footprint: ${MBPerSecond.toFixed(4)} MB/s`);
        this.game.debug.line(`Memory footprint: ${MBPerHour.toFixed(2)} MB/hour`);
        this.game.debug.line(`Memory footprint: ${memoryFootprint.toFixed(2)} MB`);

        this.game.debug.stop();
    }
}
