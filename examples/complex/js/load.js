var loadState = {

    preload: function () {

        /*
        Load all game assets
        Place your load bar, some messages.
        In this case of loading, only text is placed...
        */

        var loadingLabel = game.add.text(80, 150, 'loading...', {font: '30px Courier', fill: '#fff'});

        //Load your images, spritesheets, bitmaps...
        game.load.image('obstacle', 'assets/obstacle.png');

        game.load.spritesheet('ninja-tiles', 'assets/ninja-tiles128.png', 128, 128, 34);

        game.load.atlasJSONHash('guy', 'assets/guy.png', 'assets/guy.json');
        game.load.atlasJSONHash('platforms', 'assets/platforms.png', 'assets/platforms.json');

        //Load your sounds, efx, music...
        //Example: game.load.audio('rockas', 'assets/snd/rockas.wav');

        //Load your data, JSON, Querys...
        //Example: game.load.json('version', 'http://phaser.io/version.json');

    },

    create: function () {
        game.stage.setBackgroundColor('#000');
        game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
        game.scale.setResizeCallback(loadState.windowResize, this);
        game.state.start('game');
    },

    windowResize: function () {
        var ratioW = window.innerWidth / game.width;
        var ratioH = window.innerHeight / game.height;
        game.scale.setUserScale(ratioW, ratioH);
        //game.scale.setGameSize(game.width, game.height);
    },
};
