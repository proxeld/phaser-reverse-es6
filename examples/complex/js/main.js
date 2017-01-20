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
    game.load.image('fellow', '../img/fellow.png');
    game.load.spritesheet('tim', '../img/tim.png', 131, 151);
    game.time.advancedTiming = true;
};

var create = function () {
    game.stage.backgroundColor = '#182d3b';
    game.world.setBounds(0, 0, 1000, 1000);

    this.fellow = game.add.sprite(game.world.centerX, game.world.centerY, 'fellow');
    this.fellow.scale.setTo(0.5);
    this.tim = game.add.sprite(100, 150, 'tim');
    this.tim.animations.add('right', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]);
    this.tim.animations.add('left', [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]);

    this.fadeOutTween = game.add.tween(this.fellow);
    this.fadeInTween = game.add.tween(this.fellow);
    this.fadeOutTween.to({alpha: 0}, 1000, Phaser.Easing.Quadratic.Out, true, 1000, 1, true);

    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.enable(this.fellow);
    game.physics.p2.enable(this.tim);
    game.camera.follow(this.tim);

    this.sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
    this.leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    this.rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
    this.upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    this.downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    this.shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);
    this.shiftKey.onUp.add(function () {
        this.stateManipulator.discardFutureSnapshots();
    }, this);

    this.sKey.onDown.add(function () {
        game.paused = !game.paused;
        stateManipulator.discardFutureSnapshots();
    });


    var stateManipulator = new PhaserReverse.StateManipulator();
    this.stateManipulator = stateManipulator;
    this.stateManipulator.registerMemorable(this.fellow, PhaserReverse.Creators.SPRITE);
    this.stateManipulator.registerMemorable(this.tim, PhaserReverse.Creators.SPRITE);
    this.stateManipulator.registerMemorable(this.fadeOutTween, PhaserReverse.Creators.TWEEN);
    this.debugger = new PhaserReverse.Debugger(game, stateManipulator, {bindKeys:  true});
    window.mainState = this;
};

// nasz update wykonuje się zawsze:
// - po wszystkich preUpdate'ach Phaserowych obiektów
// - przed wszystkimi update'ami Phaserowych obietków
var update = function () {

    if (this.shiftKey.isDown) {
        this.stateManipulator.shift();
        this.debugger.update();
        return true;
    }

    this.fellow.body.velocity.x = 0;
    this.fellow.body.velocity.y = 0;
    this.fellow.angle += 0.2;
    this.tim.body.velocity.x = 0;
    this.tim.body.velocity.y = 0;

    if (this.leftKey.isDown) {
        this.tim.body.velocity.x = -100;
        this.tim.animations.play('left', 10)
    } else if (this.rightKey.isDown) {
        this.tim.body.velocity.x = 100;
        this.tim.animations.play('right', 20)
    }

    if (this.upKey.isDown) {
        this.tim.body.velocity.y = -100;
    } else if (this.downKey.isDown) {
        this.tim.body.velocity.y = 100;
    }

    this.stateManipulator.takeSnapshot();
    this.debugger.update();
};

var preRender = function () {
    //log.debug('Custom preRender begin');

    if (this.shiftKey.isDown) {
        //this.stateManager.revertToPreviousState();
    }
};

var render = function () {
    game.debug.text('FPS: ' + game.time.fps || '--', game.width - 64, game.height - 16, "#00ff00", '16px Verdana');
    game.debug.text('Suggested FPS: ' + game.time.suggestedFps || '--', game.width - 128, game.height - 32, "#00ff00", '16px Verdana');
    game.debug.text('Current state: ' + this.stateManipulator.getSnapshotsAmount(), game.width - 250, 64, '#ffffff', '26px Verdana');
    game.debug.text('Phaser Time: ' + game.time.totalElapsedSeconds().toFixed(2), 16, 64, '#ffffff', '26px Verdana');
    game.debug.text('World x: ' + game.world.x + ' y: ' + game.world.y, 20, 350, '#fff', '24px');
    game.debug.cameraInfo(game.camera, 20, 500);
    game.debug.spriteInfo(this.fellow, 20, 400);
    this.debugger.stateManipulatorInfo(this.stateManipulator, 20, 240);
};

var game = new Phaser.Game(800, 600, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update,
    preRender: preRender,
    render: render
});
