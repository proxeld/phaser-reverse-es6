import { expect } from 'chai';
import clone from 'clone';
import MementoCreator from '../../src/core/memento-creator.es6';


describe('Memento Creator', () => {
    let creator;
    let obj;
    let objCopy;

    beforeEach(() => {
        obj = {
            position: {
                x: 10,
                y: 29,
            },
            alpha: 0.41,
            visible: true,
        };

        objCopy = clone(obj);
    });

    describe('#constructor()', () => {
        it('should validate initial config', () => {
            expect(() => {
                creator = new MementoCreator({
                    primitives: {},
                });
            }).to.throw(Error);

            expect(() => {
                creator = new MementoCreator({
                    refs: {},
                });
            }).to.throw(Error);

            expect(() => {
                creator = new MementoCreator({
                    nested: [],
                });
            }).to.throw(Error);

            expect(() => {
                creator = new MementoCreator({
                    custom: {
                        create: () => {},
                        restore: () => {},
                    },
                });
            }).to.throw(Error);

            expect(() => {
                creator = new MementoCreator({
                    custom: {
                        position: {
                            create: () => {},
                        },
                    },
                });
            }).to.throw(Error);

            expect(() => {
                creator = new MementoCreator({
                    arrays: [],
                });
            }).to.throw(Error);
        });
    });

    describe('#create()', () => {
        it('should be able to extract shallow property', () => {
            creator = new MementoCreator({
                primitives: ['alpha'],
            });
            const memento = creator.create(obj);

            expect(memento).to.eql({ alpha: 0.41 });
        });

        it('should return empty object if memorable is undefined', () => {
            creator = new MementoCreator({});
            const memento = creator.create(undefined);
            expect(memento).to.eql({});
        });

        it('should be able to extract deep property', () => {
            creator = new MementoCreator({
                primitives: ['position.x'],
            });
            const memento = creator.create(obj);

            expect(memento).to.eql({ position: { x: 10 } });
        });

        it('should be able to extract multiple primitives on different levels', () => {
            creator = new MementoCreator({
                primitives: ['position.x', 'position.y', 'visible'],
            });
            const memento = creator.create(obj);

            expect(memento).to.eql({ position: { x: 10, y: 29 }, visible: true });
        });

        it('should clone primitives which are objects', () => {
            creator = new MementoCreator({
                primitives: ['position'],
            });
            const memento = creator.create(obj);

            expect(memento.position).not.to.equal(obj.position);
            expect(memento).to.eql({
                position: {
                    x: 10,
                    y: 29,
                },
            });
        });

        it('should not clone references', () => {
            creator = new MementoCreator({
                refs: ['position'],
            });
            const memento = creator.create(obj);

            expect(memento.position).to.equal(obj.position);
            expect(memento).to.eql({
                position: {
                    x: 10,
                    y: 29,
                },
            });
        });

        it('should support custom memento creation routine for existing property', () => {
            creator = new MementoCreator({
                custom: {
                    position: {
                        create: (memorable) =>
                            `${memorable.position.x}, ${memorable.position.y}`,
                        restore: () => {},
                    },
                },
            });
            const memento = creator.create(obj);

            expect(memento).to.eql({
                position: '10, 29',
            });
        });

        it('should support custom memento routine for new property', () => {
            creator = new MementoCreator({
                custom: {
                    constant: {
                        create: () => 'Hello, World!',
                        restore: () => {},
                    },
                },
            });
            const memento = creator.create(obj);

            expect(memento).to.eql({
                constant: 'Hello, World!',
            });
        });

        it('should support creating specified property with another memento creator', () => {
            obj = {
                position: {
                    x: 10,
                    y: 20,
                },
                alpha: 0.14,
            };

            const subCreator = new MementoCreator({
                primitives: ['x'],
                custom: {
                    y: {
                        create: (originator) => {
                            expect(originator).to.equal(obj.position);
                            return originator.y;
                        },
                        restore: () => {},
                    },
                },
            });

            creator = new MementoCreator({
                primitives: ['alpha'],
                nested: {
                    position: subCreator,
                },
            });

            const memento = creator.create(obj);

            const expectedResult = {
                alpha: 0.14,
                position: {
                    x: 10,
                    y: 20,
                },
            };

            expect(memento).to.eql(expectedResult);
        });

        it('should support defining aliases for properties', () => {
            creator = new MementoCreator({
                primitives: ['x'],
                refs: ['x'],
                custom: {
                    x: {
                        create: originator => originator.x,
                        restore: (originator, memento) => (originator.x = memento.x),
                    },
                },
                aliases: {
                    primitives: {
                        x: 'primX',
                    },
                    refs: {
                        x: 'refX',
                    },
                    custom: {
                        x: 'customX',
                    },
                },
            });

            const memorable = {
                x: 100,
            };

            const memento = creator.create(memorable);

            expect(memento).to.eql({
                primX: 100,
                refX: 100,
                customX: 100,
            });
        });
    });

    describe('#restore()', () => {
        it('should be able to restore shallow property', () => {
            creator = new MementoCreator({
                primitives: ['alpha'],
            });
            const memento = creator.create(obj);

            obj.alpha = 0.62;
            creator.restore(obj, memento);
            expect(obj.alpha).to.eql(0.41);
        });

        it('should be able to restore deep property', () => {
            creator = new MementoCreator({
                primitives: ['position.x'],
                refs: ['position.y'],
            });
            const memento = creator.create(obj);

            obj.position.x = 51;
            obj.position.y = 10;
            creator.restore(obj, memento);
            expect(obj.position).to.eql({
                x: 10,
                y: 29,
            });
        });

        it('should be able to restore multiple primitives on different levels', () => {
            creator = new MementoCreator({
                primitives: ['position.x', 'position.y', 'visible'],
            });
            const memento = creator.create(obj);

            obj.position.x = 51;
            obj.position.y = 4;
            obj.visible = false;
            creator.restore(obj, memento);

            expect(obj).to.eql(objCopy);
        });

        it('should clone primitives which are objects', () => {
            creator = new MementoCreator({
                primitives: ['position'],
            });
            const memento = creator.create(obj);

            obj.position.x = 51;
            obj.position.y = 4;
            creator.restore(obj, memento);

            expect(obj.position).not.to.equal(memento.position);
            expect(obj).to.eql(objCopy);
        });

        it('should not clone references', () => {
            creator = new MementoCreator({
                refs: ['position'],
            });
            const memento = creator.create(obj);

            obj.position = {
                x: 1,
                y: 2,
            };

            creator.restore(obj, memento);

            expect(obj.position).to.equal(memento.position);
            expect(obj.position).to.eql(objCopy.position);
        });

        it('should support custom memento restore routine for a property', () => {
            creator = new MementoCreator({
                custom: {
                    position: {
                        create: (memorable) =>
                            `${memorable.position.x}, ${memorable.position.y}`,
                        restore: (memorable, value) => {
                            const parts = value.split(', ');
                            const orig = memorable;
                            orig.position.x = parseInt(parts[0], 10);
                            orig.position.y = parseInt(parts[1], 10);
                        },
                    },
                },
            });
            const memento = creator.create(obj);
            obj.position = {};
            creator.restore(obj, memento);

            expect(obj.position).to.eql({
                x: 10,
                y: 29,
            });
        });

        it('should support restoring specified property with another memento creator', () => {
            const subCreator = new MementoCreator({
                primitives: ['x', 'y'],
            });

            creator = new MementoCreator({
                primitives: ['alpha'],
                nested: {
                    position: subCreator,
                },
            });

            const memento = creator.create(obj);

            obj.position.x = 0;
            obj.position.y = 0;
            obj.alpha = 0;

            creator.restore(obj, memento);

            expect(obj).to.eql(objCopy);
        });

        it('should retain nested references', () => {
            const inner = {
                z: 10,
            };

            const position = {
                x: 10,
                y: 29,
                inner,
            };

            obj = {
                alpha: 0.41,
                visible: true,
                position,
            };

            objCopy = clone(obj);

            const subCreator = new MementoCreator({
                primitives: ['x', 'y'],
                nested: {
                    inner: new MementoCreator({ primitives: ['z'] }),
                },
            });

            creator = new MementoCreator({
                primitives: ['alpha'],
                nested: {
                    position: subCreator,
                },
            });

            const memento = creator.create(obj);

            obj.position.x = 0;
            obj.position.y = 0;
            obj.position.inner.z = 52;
            obj.alpha = 0;

            creator.restore(obj, memento);

            expect(obj).to.eql(objCopy);
            expect(obj.position).to.equal(position);
            expect(obj.position.inner).to.equal(inner);
        });

        it('should handle creating mementos for elements of an array and restoring them. ' +
            'Array reference should be retained along with element references.', () => {
            obj = {};
            const tweens = [
                { progress: 0.4, inReverse: false },
                { progress: 1, inReverse: true },
            ];
            obj.tweens = tweens;
            objCopy = clone(obj);

            const tweenMementoCreator = new MementoCreator({
                primitives: ['progress'],
            });
            creator = new MementoCreator({
                arrays: {
                    tweens: tweenMementoCreator,
                },
            });

            const snap1 = creator.create(obj);
            obj.tweens.pop();
            obj.tweens[0].progress = 0.53;
            const snap2 = creator.create(obj);
            obj.tweens.pop();

            creator.restore(obj, snap2);
            creator.restore(obj, snap1);

            expect(obj).to.eql(objCopy);
            expect(obj.tweens[0]).to.equal(tweens[0]);
            expect(obj.tweens[1]).to.equal(tweens[1]);
        });

        it('should support defining aliases for properties', () => {
            creator = new MementoCreator({
                primitives: ['x'],
                refs: ['x'],
                custom: {
                    x: {
                        create: originator => originator.x,
                        restore: (originator, memento) => (originator.x = memento),
                    },
                },
                aliases: {
                    primitives: {
                        x: 'primX',
                    },
                    refs: {
                        x: 'refX',
                    },
                    custom: {
                        x: 'customX',
                    },
                },
            });

            const memorable = {
                x: 100,
            };

            const memento = creator.create(memorable);

            expect(memento).to.eql({
                primX: 100,
                refX: 100,
                customX: 100,
            });

            creator.restore(memorable, memento);

            expect(memorable).to.eql({ x: 100 });
        });

        it('should not affect memorable object\'s property if that property is missing from memento object', () => {
            creator = new MementoCreator({
                primitives: ['x'],
                refs: ['y'],
                nested: {
                    scale: new MementoCreator({
                        primitives: ['x'],
                    }),
                },
                custom: {
                    'rot.angle': {
                        create: (originator) => originator.rot.angle - 1,
                        restore: (originator, value) => originator.rot = value,
                    },
                },
                arrays: {
                    tweens: new MementoCreator({
                        primitives: ['x'],
                    }),
                },
            });

            const memorableState1 = {
                x: 100,
                y: 200,
                scale: {
                    x: 1,
                },
                rot: 90,
                tweens: [{ x: 0 }, { x: 1 }],
            };

            const memorableState2 = {
                x: 10,
                y: 20,
                scale: {
                    x: 2,
                },
                rot: 180,
                tweens: [{ x: 2 }, { x: 3 }],
            };

            const memorableState2Copy = {
                x: 10,
                y: 20,
                scale: {
                    x: 2,
                },
                rot: 180,
                tweens: [{ x: 2 }, { x: 3 }],
            };

            let mementoOfState1 = creator.create(memorableState1);

            // delete some properties from memento - possibly as a result from minification
            mementoOfState1 = {};

            // sanity check
            expect(mementoOfState1).to.eql({});

            // restore object state
            creator.restore(memorableState2, mementoOfState1);

            // nothing should change, because memento no longer remembers any properties
            expect(memorableState2).to.eql(memorableState2Copy);
        });
    });
});
