var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update });

function preload() {

    game.load.image('beball', '../../img/fellow.png');
    game.load.image('bikkuriman', '../../img/fellow.png');
    game.load.image('darkwing_crazy', '../../img/fellow.png');

}

var sprites;
var tween;

function create() {

    game.stage.backgroundColor = '#2384e7';

    sprites = game.add.group();

    var s1 = sprites.create(100, 100, 'beball');
    var s2 = sprites.create(200, 100, 'bikkuriman');
    var s3 = sprites.create(300, 100, 'darkwing_crazy');
    var s4 = sprites.create(400, 100, 'beball');
    var s5 = sprites.create(500, 100, 'bikkuriman');
    var s6 = sprites.create(600, 100, 'darkwing_crazy');
    sprites.scale.setTo(0.5);

    //  We will use the same reference over each time, rather than creating new ones
    tween = game.add.tween(sprites.getAt(0)).to( { y: 500 }, 2000, Phaser.Easing.Bounce.Out, true);
    tween.onComplete.add(tween2, this);

    ///////////////////////
    // Added
    this.sKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
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
    // TODO: in the first snapshot tween managers has empty array of tweens - think it through
    this.stateManipulator.registerMemorable(s1, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(s2, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(s3, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(s4, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(s5, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(s6, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(game.tweens, PhaserReverse.Creators.TWEEN_MANAGER);
    this.stateManipulator.registerMemorable(tween, PhaserReverse.Creators.TWEEN);
    document.getElementById('state-slider-wrapper').style.width = game.width + 'px';
    this.stateSlider = document.getElementById('state-slider');
    this.stateSlider.oninput = function (evt) {
        game.paused = true;
        document.getElementById('state-slider-label').innerHTML = this.value;
        stateManipulator.restoreSnapshot(stateManipulator._snapshots[this.value - 1]);
    };

    window.sprites = sprites;
    window.mainState = this;

    // End Added
    //////////////////////////
}

function update() {

    if (this.shiftKey.isDown) {
        this.stateManipulator.shift();
        return true;
    }


    this.stateManipulator.takeSnapshot();
    this.stateSlider.max = this.stateManipulator.getSnapshotsAmount();
    this.stateSlider.value = this.stateManipulator.getSnapshotsAmount();
    document.getElementById('state-slider-label').innerHTML = this.stateSlider.value;
}

function tween2() {

    //  The second tween alphs to nothing
    tween = game.add.tween(sprites.getAt(1)).to( { alpha: 0 }, 2000, Phaser.Easing.Bounce.Out, true);
    tween.onComplete.add(tween3, this);
    this.stateManipulator.registerMemorable(tween, PhaserReverse.Creators.TWEEN);

}

function tween3() {

    //  The third tween scales up
    tween = game.add.tween(sprites.getAt(2).scale).to( { x: 2, y: 2 }, 2000, Phaser.Easing.Bounce.Out, true);
    tween.onComplete.add(tween4, this);
    this.stateManipulator.registerMemorable(tween, PhaserReverse.Creators.TWEEN);
}

function tween4() {

    sprites.next();

    //  The fourth tween does y pos + alpha
    tween = game.add.tween(sprites.getAt(3)).to( { y: 500, alpha: 0.2 }, 2000, Phaser.Easing.Bounce.Out, true);
    tween.onComplete.add(tween5, this);
    this.stateManipulator.registerMemorable(tween, PhaserReverse.Creators.TWEEN);
}

function tween5() {

    sprites.next();

    //  The fifth tween moves left
    tween = game.add.tween(sprites.getAt(4)).to( { x: 100 }, 2000, Phaser.Easing.Bounce.Out, true);
    tween.onComplete.add(tween6, this);
    this.stateManipulator.registerMemorable(tween, PhaserReverse.Creators.TWEEN);
}

function tween6() {

    sprites.next();

    //  The sixth tween moves left
    tween = game.add.tween(sprites.getAt(5)).to( { x: 300, y: 400 }, 2000, Phaser.Easing.Bounce.Out, true);
    this.stateManipulator.registerMemorable(tween, PhaserReverse.Creators.TWEEN);
}