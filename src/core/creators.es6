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
import MementoCreator from './memento-creator.es6';

const creators = {
    ANIMATION: new MementoCreator({
        custom: {
            frame: {
                create: function (orignator) {
                    return orignator.frame;
                },
                restore: function (memento) {
                    memento.originator.frame = memento.originator._frames.indexOf(memento.data.frameCustom);
                }
            }
        }
    }),
    BODY_ARCADE: new MementoCreator({
        primitives: ['velocity.x', 'velocity.y', 'enable']
    }),
    BODY_P2: new MementoCreator({
        primitives: ['velocity.x', 'velocity.y', 'data.position.0', 'data.position.1', 'angularForce',
            'angularVelocity', 'damping', 'x', 'y', 'rotation']
    }),
    TWEEN_MANAGER: new MementoCreator({
        custom: {
            tweens: {
                create: function (originator) {
                    var tweens = [];

                    // save information about tweens that are currently active
                    for (var i = 0; i < originator._tweens.length; ++i)
                        tweens.push(originator._tweens[i])

                    return tweens;
                },
                restore: function (memento) {
                    memento.originator._tweens = memento.data.tweensCustom;
                }
            }
        }
    }),
    TWEEN_DATA: new MementoCreator({
        primitives: ['dt', 'inReverse', 'isRunning', 'percent', 'value', 'repeatCounter', 'vStart', 'vEnd']
    }),
    TWEEN: new MementoCreator({
        primitives: ['pendingDelete', 'isRunning', 'isPaused', 'current'],
        custom: {
            tweenData: {
                create: function (originator) {
                    return originator.timeline[originator.current].createMemento()
                },
                restore: function (memento) {
                    memento.originator.timeline[memento.data.currentProp].restoreMemento(memento.data['tweenDataCustom']);
                }
            }
        }
    }),
    CAMERA: new MementoCreator({
        primitives: ['view.x', 'view.y']
    }),
    WORLD: new MementoCreator({
        primitives: ['x', 'y']
    }),
    GROUP: new MementoCreator({
        primitives: ['x', 'y', 'exists', 'alive', 'alpha', 'angle']
    }),
    TEXT: new MementoCreator({
        primitives: ['text']
    }),
};

creators['SPRITE_ARCADE'] = new MementoCreator({
    primitives: ['position.x', 'position.y', 'alive', 'exists', 'visible', 'scale.x', 'scale.y', 'angle'],
    nested: {
        body: creators.BODY_ARCADE,
        animations: creators.ANIMATION
    }
});

creators['SPRITE_P2'] = new MementoCreator({
    primitives: ['position.x', 'position.y', 'alive', 'exists', 'visible', 'scale.x', 'scale.y', 'angle'],
    nested: {
        body: creators.BODY_P2,
        animations: creators.ANIMATION
    }
});

creators['ANIMATION_MANAGER'] = new MementoCreator({
    // TODO: find a way to pass the same property as ref and nested
    refs: ['currentAnim'],
    nested: {
        currentAnim: creators.ANIMATION
    },
});

export default creators;
