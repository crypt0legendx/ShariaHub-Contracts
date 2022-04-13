'use strict';

import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'

const {
    BN,
    time
} = require('@openzeppelin/test-helpers')

const utils = require("web3-utils")

const chai = require('chai')
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const {
    TestHelper
} = require('@openzeppelin/cli');
const {
    Contracts,
} = require('@openzeppelin/upgrades');


const ShariaHubLending = artifacts.require('ShariaHubLending')
const ShariaHubDepositManager = Contracts.getFromLocal('ShariaHubDepositManager');
const MockStorage = artifacts.require('MockStorage')
const MockStableCoin = artifacts.require('MockStableCoin')
const MockTokenBridge = artifacts.require('MockTokenBridge')
const CHAIN_ID = "666"


contract('ShariaHubDepositManager v2', function ([owner, investor, relayer, tokenBridge]) {
    beforeEach(async function () {
        //await time.advanceBlock()

        this.mockStorage = await MockStorage.new()
        this.stableCoin = await MockStableCoin.new(CHAIN_ID)

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", owner), true)
        this.project = await TestHelper();
        this.depositManager = await this.project.createProxy(ShariaHubDepositManager, {
            initMethod: 'initialize',
            initArgs: [
                this.mockStorage.address,
                this.stableCoin.address
            ]
        });
        console.log(this.depositManager)
        await this.depositManager.methods.setTrustedRelayer(
            relayer
        ).send(
            {
                from: owner
            }
        )
        let settedRelayer = await this.depositManager.methods.relayer().call()
        settedRelayer.should.be.equal(relayer)
    })
    
    it('only owner can set relayer', async function () {
        console.log(this.depositManager.methods)
        await this.depositManager.methods.setTrustedRelayer(
            relayer
        ).send(
            {
                from: investor
            }
        ).should.be.rejectedWith(EVMRevert)
    })
    it.only('send to bridge', async function () {

        await this.depositManager.methods.setTokenBridge(tokenBridge)

        let resultTokenBridgeAddress = await this.depositManager.methods.tokenBridge.call()
        resultTokenBridgeAddress.should.be.equal(tokenBridge)
        
        await this.stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), {
            from: investor
        }).should.be.fulfilled;

        const investment = ether(1)
        
        let tx = await this.depositManager.methods.sendToBridge(investor, investment.toString()).send({
            from: relayer
        })
        console.log(tx)
        let bridgeBalance = await this.stableCoin.balanceOf(tokenBridge).call()
        bridgeBalance.should.be.bignumber.equal(investment)

    })



    
})