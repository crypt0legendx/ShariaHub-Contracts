'use strict';
import {
    advanceBlock
} from './helpers/advanceToBlock'

const {
    BN
} = require('@openzeppelin/test-helpers');

const chain = require('chai');

chain.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()


const MockStorage = artifacts.require('MockStorage')
const MockShariaHubContract = artifacts.require('MockShariaHubContract')

contract('ShariaHubBase', function(accounts) {
    beforeEach(async function() {
        await advanceBlock();
        this.mockStorage = await MockStorage.new();
    });

    describe('Storage setting', function() {
        it('should set correct address', async function() {
            const ShariaHubContract = await MockShariaHubContract.new(this.mockStorage.address, 1);
            const storageAddress = await ShariaHubContract.getStorageAddress();
            storageAddress.should.be.equal(this.mockStorage.address);
        });

        it('should set correct version', async function() {
            const ShariaHubContract = await MockShariaHubContract.new(this.mockStorage.address, 3);
            const version = await ShariaHubContract.version();
            version.should.be.bignumber.equal(new BN(3));
        });
    });
});