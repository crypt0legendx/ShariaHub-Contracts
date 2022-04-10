'use strict';
import ether from './helpers/ether'
import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'

const BigNumber = web3.BigNumber
const utils = web3._extend.utils;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()


const ShariaHubBase = artifacts.require('ShariaHubBase');
const MockStorage = artifacts.require('./helper_contracts/MockStorage.sol')
const MockShariaHubContract = artifacts.require('./helper_contracts/MockShariaHubContract.sol')

contract('ShariaHubBase', function (accounts) {
    beforeEach(async function () {
        await advanceBlock();
        this.mockStorage = await MockStorage.new();
    });
    

    describe('Storage setting', function() {
        it('should set correct address', async function() {
            const ShariaHubContract = await MockShariaHubContract.new(this.mockStorage.address,1);
            const storageAddress = await ShariaHubContract.getStorageAddress();
            storageAddress.should.be.equal(this.mockStorage.address);
        });

        it('should set correct version', async function() {
            const ShariaHubContract = await MockShariaHubContract.new(this.mockStorage.address,3);
            const version = await ShariaHubContract.version();
            version.should.be.bignumber.equal(3);
        });
    });
});
