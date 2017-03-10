/**
 * Created by proxeld on 18.02.17.
 */

var DudeState = {
    IDLE: 0,
    RUNNING: 1,
    JUMP: 2,
    JUMP_STRAIGHT: 3,
    FALLING: 4,
    FALLING_STRAIGHT: 5,
    CLIMBING: 6,
    DEAD: 7
};


function Dude(data) {
    var speed = 350;

    sprite = game.add.sprite(60, 680, 'dude', 'idle 1.png');
    sprite.anchor.setTo(0.5, 0);

    // enable physics
    game.physics.arcade.enable(sprite);
    sprite.body.gravity.y = 900;
    sprite.body.collideWorldBounds = true;
    sprite.body.setSize(sprite.width, sprite.height, 0, 0);
    sprite.scale.setTo(0.75);
    // sprite.body.setSize(80, 120, 0, 0);

    // animation
    sprite.animations.add('run', Phaser.Animation.generateFrameNames('running ', 1, 27, '.png'), 27);
    sprite.animations.add('death', Phaser.Animation.generateFrameNames('dying ', 1, 6, '.png'), 10);
    sprite.animations.add('deathLoop', Phaser.Animation.generateFrameNames('dying_loop ', 1, 3, '.png'), 6, true);
    sprite.animations.add('idle', Phaser.Animation.generateFrameNames('idle ', 1, 22, '.png'), 10, true);
    sprite.animations.add('jump-prep-straight', Phaser.Animation.generateFrameNames('jump_prep_straight ', 1, 5, '.png'), 10);
    sprite.animations.add('up-down-transition', Phaser.Animation.generateFrameNames('up-down_transition ', 1, 9, '.png'), 20, false);
    sprite.animations.add('up-down-transition-straight', Phaser.Animation.generateFrameNames('up-down_transition_straight ', 1, 4, '.png'), 10);
    sprite.animations.add('falling', Phaser.Animation.generateFrameNames('falling_downward ', 1, 3, '.png'), 10, true);
    sprite.animations.add('flying', Phaser.Animation.generateFrameNames('flying_upward ', 1, 3, '.png'), 10);
    sprite.animations.add('climb-vertical', Phaser.Animation.generateFrameNames('climbing_vertically ', 1, 8, '.png'), 10);
    sprite.animations.add('climb-horizontal', Phaser.Animation.generateFrameNames('climbing_horizontally ', 1, 8, '.png'), 10);

    this.sprite = sprite;
    this.state = DudeState.IDLE;

    this.keys = {
        left: game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
        right: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
        up: game.input.keyboard.addKey(Phaser.Keyboard.UP),
        down: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
        space: game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR)
    };

    this.moveLeft = function () {
        sprite.body.velocity.x = -speed;
        sprite.scale.x = -0.75;
    };

    this.moveRight = function () {
        sprite.body.velocity.x = speed;
        sprite.scale.x = 0.75;
    };

    this.stopMovement = function () {
        sprite.body.velocity.x = 0;
    };

    this.climbUp = function () {
        sprite.body.velocity.y = -speed / 2;
    };

    this.climbDown = function () {
        sprite.body.velocity.y = speed / 2;
    };

    this.climbLeft = function () {
        sprite.body.velocity.x = -speed / 2;
        sprite.scale.x = -0.75;
    };

    this.climbRight = function () {
        sprite.body.velocity.x = speed / 2;
        sprite.scale.x = 0.75;
    };

    this.jump = function () {
        sprite.body.velocity.y = -600;
    };

    this.kill = function () {
        if (!(this.state == DudeState.DEAD)) {
            this.transitionToState(DudeState.DEAD);
        }
    };

    this.overlapsWithAnyLadder = function () {
        return game.physics.arcade.collide(sprite, data.layers.ladders, null);
    };

    this.transitionToState = function (state) {
        console.log('Changing from state', this.state, 'to', state);

        // actions when entering to state
        switch (state) {
            case DudeState.IDLE:
                sprite.animations.play('idle');
                break;
            case DudeState.RUNNING:
                sprite.animations.play('run', null, true);
                break;
            case DudeState.JUMP:
                this.jump();
                sprite.animations.play('flying');
                break;
            case DudeState.JUMP_STRAIGHT:
                this.jump();
                sprite.animations.play('jump-prep-straight');
                break;
            case DudeState.FALLING:
                sprite.animations.play('up-down-transition').onComplete.addOnce(function () {
                    sprite.animations.play('falling');
                });
                break;
            case DudeState.FALLING_STRAIGHT:
                sprite.animations.play('up-down-transition-straight');
                break;
            case DudeState.CLIMBING:
                sprite.body.gravity.y = 0;
                break;
            case DudeState.DEAD:
                sprite.animations.play('death').onComplete.addOnce(function () {
                    sprite.animations.play('deathLoop');
                });
                break;
            default:
                console.warn('No entry action for state', state);
        }

        // actions when exiting state
        switch (this.state) {
            case DudeState.CLIMBING:
                sprite.body.gravity.y = 900;
                break;
            default:
                // console.warn('No exit action for state', state);
                break;
        }

        this.state = state;
    };

    this.handleInput = function () {
        switch (this.state) {
            case DudeState.IDLE:

                if (this.keys.left.isDown || this.keys.right.isDown) {
                    this.transitionToState(DudeState.RUNNING);
                }

                if (this.keys.space.isDown) {
                    if (sprite.body.velocity.x == 0) {
                        this.transitionToState(DudeState.JUMP_STRAIGHT);
                    } else {
                        this.transitionToState(DudeState.JUMP);
                    }
                }

                if (this.keys.up.isDown && this.overlapsWithAnyLadder()) {
                    this.transitionToState(DudeState.CLIMBING);
                }

                break;
            case DudeState.RUNNING:
                var falling = sprite.body.velocity.y > 0;

                if (this.keys.left.isDown) {
                    this.moveLeft();
                } else if (this.keys.right.isDown) {
                    this.moveRight();
                } else {
                    this.transitionToState(DudeState.IDLE);
                }

                if (falling) {
                    if (sprite.body.velocity.x == 0) {
                        this.transitionToState(DudeState.FALLING_STRAIGHT);
                    } else {
                        this.transitionToState(DudeState.FALLING);
                    }
                }

                if (this.keys.space.isDown) {
                    if (sprite.body.velocity.x == 0) {
                        this.transitionToState(DudeState.JUMP_STRAIGHT);
                    } else {
                        this.transitionToState(DudeState.JUMP);
                    }
                }

                break;
            case DudeState.JUMP:
            case DudeState.JUMP_STRAIGHT:
                var falling = sprite.body.velocity.y > 0;

                if (this.keys.left.isDown) {
                    this.moveLeft();
                } else if (this.keys.right.isDown) {
                    this.moveRight();
                }

                if (falling) {
                    if (sprite.body.velocity.x == 0) {
                        this.transitionToState(DudeState.FALLING_STRAIGHT);
                    } else {
                        this.transitionToState(DudeState.FALLING);
                    }
                }

                break;
            case DudeState.FALLING:
            case DudeState.FALLING_STRAIGHT:
                var touchedGround = sprite.body.touching.down;

                if ((this.keys.up.isDown || this.keys.down.isDown) && this.overlapsWithAnyLadder()) {
                    this.transitionToState(DudeState.CLIMBING);
                }

                if (this.keys.left.isDown) {
                    this.moveLeft();
                } else if (this.keys.right.isDown) {
                    this.moveRight();
                }

                if (touchedGround) {
                    this.transitionToState(DudeState.IDLE);
                }

                break;
            case DudeState.CLIMBING:
                var onLadder = this.overlapsWithAnyLadder();

                if (!onLadder) {
                    this.transitionToState(DudeState.FALLING);
                } else {
                    if (this.keys.up.isDown) {
                        sprite.animations.play('climb-vertical');
                        this.climbUp();
                    } else if (this.keys.down.isDown) {
                        sprite.animations.play('climb-vertical');
                        this.climbDown();
                    } else {
                        sprite.body.velocity.y = 0;
                    }

                    if (!sprite.body.velocity.y && this.keys.left.isDown) {
                        this.climbLeft();
                        sprite.animations.play('climb-horizontal');
                    } else if (!sprite.body.velocity.y && this.keys.right.isDown) {
                        this.climbRight();
                        sprite.animations.play('climb-horizontal');
                    }

                    if (this.keys.space.isDown) {
                        this.transitionToState(DudeState.FALLING_STRAIGHT);
                    }
                }

                break;
            case DudeState.DEAD:
                break;
            default:
                console.warn('State not handled!', this.state);
                this.transitionToState(DudeState.IDLE);
        }
    };

    this.update = function () {

        this.stopMovement();

        this.handleInput();
    }
}

var DudeMementoCreator = new PhaserReverse.MementoCreator({
    primitives: ['state']
});