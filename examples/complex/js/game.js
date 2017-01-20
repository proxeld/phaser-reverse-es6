var guy, tile;
var worldWidth = 3000;
var worldHeight = 900;

var obstaclesMeta = [
    // {x: 510, y: 610, scale: 1, type: 1},
    // {x: 760, y: 650, scale: 1, type: 2},
    // {x: 920, y: 680, scale: 1, type: 3},
    {x: 0, y: 780, w: 3000, h: 40, type: 1},
    {x: 310, y: 600, w: 240, h: 40, type: 1},
    {x: 610, y: 500, w: 240, h: 40, type: 1},
    {x: 860, y: 650, w: 160, h: 40, type: 1},
    {x: 1100, y: 740, w: 150, h: 40, type: 1},
    {x: 1020, y: 650, scale: 0.8, type: 2},
    // {x: 1560, y: 740, scale: 1, type: 6},
    // {x: 1760, y: 740, scale: 1, type: 7},
];

function generateObstacles(group, spec) {
    for (var i = 0; i < spec.length; ++i) {
        var obstacle = spec[i];
        var s = group.create(obstacle.x, obstacle.y, 'ninja-tiles', obstacle.type);

        if (obstacle.scale) {
            s.scale.setTo(obstacle.scale);
        } else {
            var scaleX = (obstacle.w/s.width);
            var scaleY = (obstacle.h/s.height);
            s.scale.setTo(scaleX, scaleY);
        }

        game.physics.ninja.enableTile(s, s.frame);
        s.visible = false;
    }
}


var gameState = {

    create: function () {

        game.world.setBounds(0, 0, worldWidth, worldHeight);

        var background = game.add.tileSprite(0, 0, worldWidth, worldHeight, 'guy', 'background.png');

        // sprites
        guy = game.add.sprite(40, 695, 'guy', 'walk/0001.png');
        guy.scale.setTo(0.5, 0.5);
        guy.anchor.setTo(0.5);
        game.add.sprite(300, 590, 'platforms', 'platform2.png');
        game.add.sprite(600, 490, 'platforms', 'platform2.png');
        game.add.sprite(830, 610, 'platforms', 'platform4.png');

        // animation
        guy.animations.add('walk', Phaser.Animation.generateFrameNames('walk/', 1, 8, '.png', 4), 10, false, false);

        // groups & physics
        game.physics.startSystem(Phaser.Physics.NINJA);
        game.physics.ninja.enableAABB(guy);
        game.physics.ninja.gravity = 0.1;

        guy.body.aabb.width = 56;
        guy.body.aabb.xw = 28;
        guy.body.aabb.height = 140;
        guy.body.aabb.yw = 70;
        guy.body.bounce = 0.1;
        guy.body.friction = 0.20;

        // guy.body.setSize(80, 300, 50, 20);
        this.obstacles = game.add.group();

        // obstacles
        generateObstacles(this.obstacles, obstaclesMeta);

        // camera
        game.camera.follow(guy);

        this.leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        this.rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
        this.upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        this.downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
        this.shiftKey = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);

        // phaser reverse
        this.sm = new PhaserReverse.StateManipulator();
        this.sm.registerMemorable(guy, PhaserReverse.Creators.SPRITE);
        this.debugger = new PhaserReverse.Debugger(game, this.sm, {toolbar: false});
        this.shiftKey.onUp.add(function () {
            this.sm.discardFutureSnapshots();
        }, this);

    },

    update: function () {

        if (this.shiftKey.isDown) {
            this.sm.shift();
            this.debugger.update();
            return true;
        }

        // var hitPlatform = game.physics.p2.collide(guy, this.obstacles);
        game.physics.ninja.collide(guy, this.obstacles);

        guy.body.velocity.x = 0;

        var speed = 100;
        if (!guy.body.touching.down) {
            speed = 20;
        }

        if (this.leftKey.isDown) {
            guy.body.moveLeft(speed);
            // guy.body.velocity.x = -250;
            guy.animations.play('walk');
            guy.scale.x = -0.5;
        } else if (this.rightKey.isDown) {
            guy.body.moveRight(speed);
            // guy.body.velocity.x = 250;
            guy.animations.play('walk');
            guy.scale.x = 0.5;
        } else {
            guy.animations.stop();
            guy.frame = 1;
        }

        //  Allow the player to jump if they are touching the ground.
        if (this.upKey.isDown && guy.body.touching.down)
        {
            guy.body.moveUp(420);
        }

        this.sm.takeSnapshot();
        this.debugger.update();
    },

    render: function () {
        this.debugger.stateManipulatorInfo(this.sm, 50, 120, '#1c1c1c');
        // game.debug.body(guy);
    }

};
