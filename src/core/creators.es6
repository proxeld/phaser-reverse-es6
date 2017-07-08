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
/* global Phaser */
import MementoCreator from './memento-creator.es6';

const creators = {
    ANIMATION: new MementoCreator({
        custom: {
            frame: {
                create: originator => (originator ? originator.frame : {}),
                restore: (originator, memento) => {
                    if (originator) {
                        originator.frame = originator._frames.indexOf(memento);
                    }
                },
            },
        },
    }),
    BODY_ARCADE: new MementoCreator({
        primitives: ['velocity.x', 'velocity.y', 'enable'],
    }),
    BODY_P2JS: new MementoCreator({
        primitives: ['velocity.x', 'velocity.y', 'data.position.0', 'data.position.1', 'angularForce',
            'angularVelocity', 'damping', 'x', 'y', 'rotation'],
    }),
    BODY_NINJA: new MementoCreator({
        primitives: ['touching', 'wasTouching', 'velocity.x', 'velocity.y', 'x', 'y'],
    }),
    TWEEN_MANAGER: new MementoCreator({
        arrays: {
            _tweens: undefined,
        },
    }),
    TWEEN_DATA: new MementoCreator({
        primitives: ['dt', 'inReverse', 'isRunning', 'percent', 'value', 'repeatCounter', 'vStart', 'vEnd'],
    }),
    TWEEN: new MementoCreator({
        primitives: ['pendingDelete', 'isRunning', 'isPaused', 'current'],
        custom: {
            tweenData: {
                create: originator => creators.TWEEN_DATA.create(originator.timeline[originator.current]),
                restore: (originator, memento) => {
                    // in current version we rely on the fact that primitives are restored earlier than
                    // customs are. This will cause current property on the originator to be already restored.
                    // For now it's fine, but we should not relay on internal implementation of creating memento...
                    creators.TWEEN_DATA.restore(originator.timeline[originator.current], memento);
                    // memento.originator.timeline[memento.data.currentProp].restore(memento.data.tweenDataCustom);
                },
            },
        },
    }),
    CAMERA: new MementoCreator({
        primitives: ['view.x', 'view.y'],
    }),
    WORLD: new MementoCreator({
        primitives: ['x', 'y'],
    }),
    GROUP: new MementoCreator({
        primitives: ['x', 'y', 'exists', 'alive', 'alpha', 'angle'],
    }),
    TEXT: new MementoCreator({
        primitives: ['text'],
    }),
};

creators.ANIMATION_MANAGER = new MementoCreator({
    refs: ['currentAnim'],
    nested: {
        currentAnim: creators.ANIMATION,
    },
    aliases: {
        refs: {
            currentAnim: 'currentAnimRef',
        },
    },
});

creators.SPRITE = new MementoCreator({
    primitives: ['position.x', 'position.y', 'alive', 'exists', 'visible', 'scale.x', 'scale.y', 'angle'],
    nested: {
        animations: creators.ANIMATION_MANAGER,
    },
    custom: {
        body: {
            create: (originator) => {
                switch (originator.body.type) {
                    case Phaser.Physics.ARCADE:
                        return creators.BODY_ARCADE.create(originator.body);
                    case Phaser.Physics.P2JS:
                        return creators.BODY_P2JS.create(originator.body);
                    case Phaser.Physics.NINJA:
                        return creators.BODY_NINJA.create(originator.body);
                    default:
                        throw Error(`Unknown body type: ${originator.body.type}`);
                }
            },
            restore: (originator, memento) => {
                switch (originator.body.type) {
                    case Phaser.Physics.ARCADE:
                        creators.BODY_ARCADE.restore(originator.body, memento);
                        break;
                    case Phaser.Physics.P2JS:
                        creators.BODY_P2JS.restore(originator.body, memento);
                        break;
                    case Phaser.Physics.NINJA:
                        creators.BODY_NINJA.restore(originator.body, memento);
                        break;
                    default:
                        throw Error(`Unknown body type: ${originator.body.type}`);
                }
            },
        },
    },
});

creators.SPRITE_BARE = new MementoCreator({
    primitives: ['position.x', 'position.y', 'alive', 'exists', 'visible', 'scale.x', 'scale.y', 'angle'],
});

export default creators;
