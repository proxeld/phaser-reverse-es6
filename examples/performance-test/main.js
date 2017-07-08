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

var OBJECTS = 80;
var OBJECTS_INVARIABLE = 0;
var sprites = [];
var stateManipulator;
var multiplier;

function getRandomFromRange(min, max) {
    return Math.random() * (max - min) + min;
}


var preload = function () {
    game.load.image('fellow', './img/fellow.png');
    game.time.advancedTiming = true;
};

var create = function () {
    game.stage.backgroundColor = '#182d3b';
    game.world.setBounds(0, 0, 1600, 900);
    game.physics.startSystem(Phaser.Physics.ARCADE);
    stateManipulator = new PhaserReverse.StateManipulator();
    multiplier = new PhaserReverse.Multiplier([-16, -8, -4, -2, -1, 0, 1, 2, 4, 8, 16], 4);


    for (var i = 0; i < OBJECTS + OBJECTS_INVARIABLE; ++i) {
        var sprite = game.add.sprite(getRandomFromRange(0, 1600), getRandomFromRange(0, 900), 'fellow');
        sprite.scale.setTo(0.5);
        sprite.anchor.setTo(0.5);
        game.physics.arcade.enable(sprite);
        if (i < OBJECTS)
            stateManipulator.registerMemorable(sprite, PhaserReverse.Creators.SPRITE);
        sprites.push(sprite);
    }

    this.leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    this.rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
    this.upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    this.downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    this.shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);


    this.shiftKey.onUp.add(function () {
        stateManipulator.discardFutureSnapshots();
        multiplier.reset();
    }, this);

    this.downKey.onDown.add(function () {
        if (this.shiftKey.isDown) {
            multiplier.previous();
        }
    }, this);

    this.upKey.onDown.add(function () {
        if (this.shiftKey.isDown) {
            multiplier.next();
        }
    }, this);

    this.debugger = new PhaserReverse.Debugger(game, stateManipulator, {bindKeys:  false, toolbar: false});
};


var update = function () {
    sprites.forEach(function (sprite) {
        sprite.angle += getRandomFromRange(0, 3);
    });
};

var wrappedUpdate = function () {

    update.call(this);

    if (this.shiftKey.isDown) {
        stateManipulator.shift(multiplier.current());
        this.debugger.update();
        return true;
    }


    stateManipulator.takeSnapshot();
    this.debugger.update();
};

var render = function () {
    this.debugger.stateManipulatorInfo(stateManipulator, 1300, 100);
    game.debug.text(game.time.fps || '--', game.width - 50, game.height - 100, null);
};

var game = new Phaser.Game(1600, 900, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: wrappedUpdate,
    render: render
});
