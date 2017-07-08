var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update });

function preload() {
    game.load.image('sprite', './img/fellow.png');
}

var sprite;

function create() {

    game.stage.backgroundColor = '#2384e7';

    //	We position the sprite in the middle of the game but off the top
    sprite = game.add.sprite(game.world.centerX, -200, 'sprite');
    sprite.anchor.set(0.5);
    sprite.scale.set(0.5);

    //	It will end up at the middle of the game, as it's tweening TO the value given
    var tween = game.add.tween(sprite).to( { y: game.world.centerY, alpha: 0.2 }, 4000, Phaser.Easing.Bounce.Out, true);

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
    this.stateManipulator.registerMemorable(sprite, PhaserReverse.Creators.SPRITE_BARE);
    this.stateManipulator.registerMemorable(game.tweens, PhaserReverse.Creators.TWEEN_MANAGER);
    this.stateManipulator.registerMemorable(tween, PhaserReverse.Creators.TWEEN);
    document.getElementById('state-slider-wrapper').style.width = game.width + 'px';
    this.stateSlider = document.getElementById('state-slider');
    this.stateSlider.oninput = function (evt) {
        game.paused = true;
        document.getElementById('state-slider-label').innerHTML = this.value;
        stateManipulator.restoreSnapshot(stateManipulator._snapshots[this.value - 1]);
    };

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