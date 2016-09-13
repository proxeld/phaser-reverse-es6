import { expect } from 'chai';
import clone from 'clone';
import MementoCreator from '../src/js/modules/memento-creator.es6';


describe('Memento Creator', () => {
    let creator;
    let obj;
    let objCopy;

    before(() => {
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

    describe('#create()', () => {
        it('should be able to extract shallow property', () => {
            creator = new MementoCreator({
                primitives: ['alpha'],
            });
            const memento = creator.create(obj);

            expect(memento).to.eql({ alpha: 0.41 });
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
                    },
                },
            });
            const memento = creator.create(obj);

            expect(memento).to.eql({
                constant: 'Hello, World!',
            });
        });

        it('should support creating specified property with another memento creator', () => {
            const obj = {
                position: {
                    x: 10,
                    y: 20,
                },
                alpha: 0.14,
            };

            const subCreator = new MementoCreator({
                primitives: ['x', 'y'],
            });

            const creator = new MementoCreator({
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
                    y: 20
                }
            };

            expect(memento).to.eql(expectedResult);
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
            });
            const memento = creator.create(obj);

            obj.position.x = 51;
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

            const creator = new MementoCreator({
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
    });
});
