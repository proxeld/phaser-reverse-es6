var w = 1600,
    h = 900;

/*
 For Fullscreen put this code:

 var w = window.innerWidth * window.devicePixelRatio,
 h = window.innerHeight * window.devicePixelRatio;
 */

var game = new Phaser.Game(w, h, Phaser.AUTO, 'gameContainer');

game.state.add('boot', bootState);
game.state.add('load', loadState);
game.state.add('game', gameState);

game.state.start('boot');
