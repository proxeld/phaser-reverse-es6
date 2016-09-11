import { expect } from 'chai';
import bo, * as operations from '../src/js/modules/code.es6';

describe('Configuration check', () => {
    it('should pass', () => {
        expect(true).to.eql(true);
    });
});

describe('Some module', () => {
    describe('#ourFunction', () => {
        it('should be able to do all kinds of stuff', () => {
            expect(bo(1, 1, operations.sum)).to.eql(2);
            expect(bo(1, 1, operations.diff)).to.eql(0);
            expect(bo(1, 1, operations.mul)).to.eql(1);
            expect(bo(1, 1, operations.div)).to.eql(1);
        });
    });
});
