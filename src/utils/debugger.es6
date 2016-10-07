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

export default class Debugger {
    constructor(game) {
        this.game = game;
    }

    stateManipulatorInfo(stateManipulator, x = 0, y = 0, color = '#ffffff') {
        const lastSnapshotSize = stateManipulator.roughSnapshotSize(stateManipulator.getLastSnapshot());
        const FRAME_RATE = 60;
        const MBPerSecond = ((lastSnapshotSize * FRAME_RATE) / 1024) / 1024;
        const MBPerHour = MBPerSecond*60*60;
        const memoryFootprint = (stateManipulator.roughMemoryFootprint() / 1024) / 1024;

        this.game.debug.start(x, y, color);

        this.game.debug.line(`Last snapshot size: ${lastSnapshotSize} Bytes`);
        this.game.debug.line(`Memory footprint: ${MBPerSecond.toFixed(4)} MB/s`);
        this.game.debug.line(`Memory footprint: ${MBPerHour.toFixed(2)} MB/hour`);
        this.game.debug.line(`Memory footprint: ${memoryFootprint.toFixed(2)} MB`);

        this.game.debug.stop();
    }
}
