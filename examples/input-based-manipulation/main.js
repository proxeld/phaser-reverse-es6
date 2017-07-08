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

var preload = function () {
    game.load.image('fellow', './img/fellow.png');
    game.load.spritesheet('tim', './img/tim.png', 131, 151);
    game.time.advancedTiming = true;
};

var create = function () {
    game.stage.backgroundColor = '#182d3b';
    game.world.setBounds(0, 0, 1600, 900);

    this.fellow = game.add.sprite(game.world.centerX, game.world.centerY, 'fellow');
    this.fellow.scale.setTo(0.5);
    this.fellow.anchor.setTo(0.5);

    this.fellowWalking = game.add.sprite(game.world.centerX - 500, game.world.centerY + 300, 'fellow');
    this.fellowWalking.scale.setTo(0.5);
    this.fellowWalking.anchor.setTo(0.5);

    this.tim = game.add.sprite(100, 150, 'tim');
    this.tim.animations.add('run', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], 20);
    this.tim.anchor.setTo(0.5);

    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.physics.arcade.enable(this.fellow);
    game.physics.arcade.enable(this.fellowWalking);
    game.physics.arcade.enable(this.tim);
    game.camera.follow(this.tim);

    this.sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
    this.leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    this.rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
    this.upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    this.downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    this.shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);

    var stateManipulator = new PhaserReverse.StateManipulator();
    this.stateManipulator = stateManipulator;
    this.stateManipulator.registerMemorable(this.fellow, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(this.fellowWalking);
    this.debugger = new PhaserReverse.Debugger(game, stateManipulator, {bindKeys:  false, toolbar: false});
};

var preupdate = function () {
    this.tim.body.velocity.x = 0;
    this.tim.body.velocity.y = 0;

    if (this.leftKey.isDown) {
        this.tim.body.velocity.x = -200;
        this.tim.animations.play('run');
        this.tim.scale.x = -1;
    } else if (this.rightKey.isDown) {
        this.tim.body.velocity.x = 200;
        this.tim.animations.play('run');
        this.tim.scale.x = 1;
    } else {
        this.tim.animations.stop();
    }
};

var update = function () {
    this.fellow.angle += 0.5;
    this.fellowWalking.x += 2;
};

var wrappedUpdate = function () {
    preupdate.call(this);

    if (this.leftKey.isDown) {
        this.stateManipulator.shift();
        this.stateManipulator.discardFutureSnapshots();
        this.debugger.update();
        return true;
    } else if (this.rightKey.isDown) {
        update.call(this);

        this.stateManipulator.takeSnapshot();
        this.debugger.update();
    } else {
        return true;
    }
};

var render = function () {
    this.debugger.stateManipulatorInfo(this.stateManipulator, 1300, 100);
};

var game = new Phaser.Game(1600, 900, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: wrappedUpdate,
    render: render
});
