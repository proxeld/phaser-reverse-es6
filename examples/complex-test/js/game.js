var dude;
var worldWidth = 3000;
var worldHeight = 900;
var multiplier = new Multiplier();

var objectsMeta = [
    {x: 880, y: 750, w: 270, h: 40, type: 'deadzone'},
    {x: 0, y: 780, w: 3000, h: 200, type: 'obstacle'},
    {x: 310, y: 600, w: 240, h: 40, type: 'obstacle'},
    {x: 610, y: 500, w: 240, h: 40, type: 'obstacle'},
    {x: 850, y: 500, w: 30, h: 280, type: 'obstacle'},
    {x: 1150, y: 500, w: 30, h: 280, type: 'obstacle'},
    {x: 1170, y: 500, w: 240, h: 40, type: 'obstacle'},
    {x: 200, y: 530, scale: 0.6, type: 'ladder', bb: [32, 300, 40, 50]},
    {x: 500, y: 540, scale: 0.75, type: 'fence', bb: [370, 240, 50, 50]}
];

function generateObjects(group, spec) {
    for (var i = 0; i < spec.length; ++i) {
        var object = spec[i];
        var s = group.create(object.x, object.y, object.type);
        game.physics.arcade.enable(s);
        s.body.immovable = true;

        if (object.scale) {
            s.scale.setTo(object.scale);
        } else {
            var scaleX = (object.w / s.width);
            var scaleY = (object.h / s.height);
            s.scale.setTo(scaleX, scaleY);
        }

        if (object.bb) {
            s.body.setSize(object.bb[0], object.bb[1], object.bb[2], object.bb[3]);
        }

        s.visible = object.visible == undefined ? true : object.visible;
    }
}


var gameState = {

    create: function () {

        game.world.setBounds(0, 0, worldWidth, worldHeight);
        this.background = game.add.tileSprite(0, 0, worldWidth, worldHeight, 'world2Bg');

        // groups & physics
        game.physics.startSystem(Phaser.Physics.ARCADE);

        // sprites
        // game.add.sprite(300, 590, 'platforms', 'platform2.png');
        // game.add.sprite(600, 490, 'platforms', 'platform2.png');
        // game.add.sprite(830, 610, 'platforms', 'platform4.png');


        this.killers = game.add.group();
        this.ladders = game.add.group();
        this.obstacles = game.add.group();

        // killing elements
        generateObjects(this.killers, objectsMeta.filter(function (o) {
            return o.type == 'deadzone'
        }));

        // obstacles
        generateObjects(this.obstacles, objectsMeta.filter(function (o) {
            return o.type == 'obstacle'
        }));

        // ladders
        generateObjects(this.ladders, objectsMeta.filter(function (o) {
            return o.type == 'ladder' || o.type == 'fence';
        }));

        // hero
        dude = new Dude({
            layers: {
                ladders: this.ladders
            }
        });

        // text
        this.multiplierLbl = game.add.text(dude.sprite.left, dude.sprite.top - 30, '');

        // camera
        game.camera.follow(dude.sprite);

        this.leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        this.rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
        this.upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        this.downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
        this.shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);

        // phaser reverse
        this.stateManipulator = new PhaserReverse.StateManipulator();
        this.stateManipulator.registerMemorable(dude.sprite, PhaserReverse.Creators.SPRITE);
        this.stateManipulator.registerMemorable(dude, DudeMementoCreator);
        this.debugger = new PhaserReverse.Debugger(game, this.stateManipulator, {toolbar: true});
        this.shiftKey.onUp.add(function () {
            this.stateManipulator.discardFutureSnapshots();
            multiplier.reset();
            this.multiplierLbl.visible = false;
        }, this);

        this.downKey.onDown.add(function () {
            if (this.shiftKey.isDown) {
                multiplier.prev();
            }
        }, this);

        this.upKey.onDown.add(function () {
            if (this.shiftKey.isDown) {
                multiplier.next();
            }
        }, this);

        window.dude = dude;

    },

    update: function () {

        if (this.shiftKey.isDown) {
            this.stateManipulator.shift(multiplier.currnet());
            this.debugger.update();
            this.multiplierLbl.visible = true;
            this.multiplierLbl.x = dude.sprite.centerX;
            this.multiplierLbl.y = dude.sprite.top - 30;
            this.multiplierLbl.text = 'x' + multiplier.currnet();
            return true;
        }

        game.physics.arcade.collide(dude.sprite, this.obstacles);
        game.physics.arcade.collide(dude.sprite, this.killers, dude.kill, null, dude);

        dude.update();

        // this.background.tilePosition.x = game.camera.position.x * 0.1;

        this.stateManipulator.takeSnapshot();
        this.debugger.update();
    },

    render: function () {
        game.debug.text(game.time.fps || '--', game.width - 50, game.height - 100, "#00ff00");
        game.debug.spriteInfo(dude.sprite, 300, 200);
        game.debug.bodyInfo(dude.sprite, 700, 200);
        // game.debug.body(dude.sprite);
        // game.debug.body(this.ladders.getAt(1));
        this.debugger.stateManipulatorInfo(this.stateManipulator, 50, 120, '#1c1c1c');
    }
};
