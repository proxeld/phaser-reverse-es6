var dude;
var worldWidth = 3000;
var worldHeight = 900;
var multiplier = new Multiplier();

var obstaclesMeta = [
    {x: 880, y: 750, w: 270, h: 40, type: 'deadzone'},
    {x: 0, y: 780, w: 3000, h: 200, type: 'obstacle'},
    {x: 310, y: 600, w: 240, h: 40, type: 'obstacle'},
    {x: 610, y: 500, w: 240, h: 40, type: 'obstacle'},
    {x: 850, y: 500, w: 30, h: 280, type: 'obstacle'},
    {x: 1150, y: 500, w: 30, h: 280, type: 'obstacle'},
    {x: 1170, y: 500, w: 240, h: 40, type: 'obstacle'}
];

function generateObstacles(group, spec) {
    for (var i = 0; i < spec.length; ++i) {
        var obstacle = spec[i];
        var s = group.create(obstacle.x, obstacle.y, obstacle.type);
        game.physics.arcade.enable(s);
        s.body.immovable = true;

        if (obstacle.scale) {
            s.scale.setTo(obstacle.scale);
        } else {
            var scaleX = (obstacle.w / s.width);
            var scaleY = (obstacle.h / s.height);
            s.scale.setTo(scaleX, scaleY);
        }
        // s.visible = false;
    }
}


var gameState = {

    create: function () {

        game.world.setBounds(0, 0, worldWidth, worldHeight);
        game.add.tileSprite(0, 0, worldWidth, worldHeight, 'world2Bg');

        // groups & physics
        game.physics.startSystem(Phaser.Physics.ARCADE);

        // sprites
        dude = new Dude();
        // game.add.sprite(300, 590, 'platforms', 'platform2.png');
        // game.add.sprite(600, 490, 'platforms', 'platform2.png');
        // game.add.sprite(830, 610, 'platforms', 'platform4.png');



        this.killers = game.add.group();
        this.obstacles = game.add.group();

        // killing elements
        generateObstacles(this.killers, obstaclesMeta.filter(function (o) {
            return o.type == 'deadzone'
        }));

        // obstacles
        generateObstacles(this.obstacles, obstaclesMeta.filter(function (o) {
            return o.type == 'obstacle'
        }));

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

        dude.stopMovement();

        if (!dude.isDead()) {
            var leftDown = this.leftKey.isDown;
            var rightDown = this.rightKey.isDown;

            if (leftDown) {
                dude.moveLeft();
            } else if (rightDown) {
                dude.moveRight();
            }

            // determine animation
            dude.handleAnimation(leftDown, rightDown, this.upKey.isDown);
        }

        this.stateManipulator.takeSnapshot();
        this.debugger.update();
    },

    render: function () {
        game.debug.text(game.time.fps || '--', game.width - 50, game.height - 100, "#00ff00");
        game.debug.spriteInfo(dude.sprite, 300, 200);
        game.debug.bodyInfo(dude.sprite, 700, 200);
        // game.debug.body(dude.sprite);
        this.debugger.stateManipulatorInfo(this.stateManipulator, 50, 120, '#1c1c1c');
    }
};
