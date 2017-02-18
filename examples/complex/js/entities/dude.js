/**
 * Created by proxeld on 18.02.17.
 */

function Dude() {

    sprite = game.add.sprite(60, 680, 'dude', 'idle 1.png');
    sprite.scale.setTo(0.75);
    sprite.anchor.setTo(0.5, 0);

    // enable physics
    game.physics.arcade.enable(sprite);
    sprite.body.gravity.y = 900;
    sprite.body.collideWorldBounds = true;
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

    this.sprite = sprite;

    this.moveLeft = function () {
        sprite.body.velocity.x = -250;
        sprite.scale.x = -0.75;
    };

    this.moveRight = function () {
        sprite.body.velocity.x = 250;
        sprite.scale.x = 0.75;
    };

    this.stopMovement = function () {
        sprite.body.velocity.x = 0;
    };

    this.handleAnimation = function (leftDown, rightDown, upDown) {
        var currentAnimName = sprite.animations.currentAnim.name;
        var inAir = !sprite.body.touching.down;
        var falling = sprite.body.velocity.y > 0;
        var movesHorizon = (sprite.body.velocity.x != 0);

        if (inAir) {
            if (falling && currentAnimName != 'falling' && movesHorizon) {
                sprite.animations.play('up-down-transition').onComplete.addOnce(function () {
                    sprite.animations.play('falling');
                });
            }
        } else {

            if (leftDown) {
                sprite.animations.play('run');

            } else if (rightDown) {
                sprite.animations.play('run');

            } else {
                sprite.animations.stop('run');
            }

            //  Allow the player to jump if they are touching the ground.
            if (upDown) {
                if (movesHorizon) {
                    sprite.animations.play('flying', 20).onComplete.addOnce(function () {
                        if (sprite.body.velocity.y < 0) {
                            sprite.animations.play('flying');
                        }
                    });
                } else {
                    sprite.animations.play('jump-prep-straight', 10).onComplete.addOnce(function () {
                        if (sprite.body.velocity.y < 0) {
                            sprite.animations.play('up-down-transition-straight');
                        }
                    });
                }
                sprite.body.velocity.y = -600;
            }

            if (sprite.animations.currentAnim.isFinished || currentAnimName == 'falling') {
                sprite.animations.play('idle');
            }
        }
    };

    this.isDead = function () {
        var caName = sprite.animations.currentAnim.name;
        return caName === 'death' || caName === 'deathLoop';
    }

    this.kill = function () {
        if (!this.isDead()) {
            sprite.animations.play('death').onComplete.addOnce(function () {
                sprite.animations.play('deathLoop');
            });
        }
    }
}