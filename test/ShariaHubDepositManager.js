'use strict';

import ether from './helpers/ether'
import assertSentViaGSN from './helpers/assertSentViaGSN'
import EVMRevert from './helpers/EVMRevert'

const {
    BN,
    time
} = require('@openzeppelin/test-helpers')
const {
    fundRecipient,
} = require('@openzeppelin/gsn-helpers')
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
    ZWeb3
} = require('@openzeppelin/upgrades');

ZWeb3.initialize(web3.currentProvider);

const ShariaHubLending = artifacts.require('ShariaHubLending')
const ShariaHubDepositManager = Contracts.getFromLocal('ShariaHubDepositManager');
const MockStorage = artifacts.require('MockStorage')
const MockStableCoin = artifacts.require('MockStableCoin')
const CHAIN_ID = "666"

contract('ShariaHubDepositManager v1', function ([owner, investor, relayer, testTarget]) {
    beforeEach(async function () {
        await time.advanceBlock()

        const latestTimeValue = await time.latest()
        this.fundingStartTime = latestTimeValue.add(time.duration.days(1))
        this.fundingEndTime = this.fundingStartTime.add(time.duration.days(40))

        this.mockStorage = await MockStorage.new()
        this.stableCoin = await MockStableCoin.new(CHAIN_ID)

        // await this.mockStorage.setBool(utils.soliditySha3("user", "localNode", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", owner), true)

        this.project = await TestHelper();
        this.depositManager = await this.project.createProxy(ShariaHubDepositManager, {
            initMethod: 'initialize',
            initArgs: [
                this.mockStorage.address,
                this.stableCoin.address
            ]
        });

        await this.stableCoin.transfer(owner, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), {
            from: owner
        }).should.be.fulfilled;

        await this.stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), {
            from: investor
        }).should.be.fulfilled;

        this.lending = await ShariaHubLending.new(
            this.fundingStartTime,
            this.fundingEndTime,
            15,
            ether(3),
            90,
            3,
            4,
            owner,
            owner,
            owner,
            this.depositManager.address,
            this.mockStorage.address,
            this.stableCoin.address
        )

        await this.mockStorage.setAddress(utils.soliditySha3("contract.address", this.lending.address), this.lending.address)
        await this.mockStorage.setAddress(utils.soliditySha3("arbiter", this.lending.address), owner)

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "community", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "arbiter", owner), true)

        await this.lending.saveInitialParametersToStorage(90, 20, owner)

        /*await fundRecipient(web3, {
            recipient: this.depositManager.address
        })*/
    })

    it('only owner can change relayer', async function () {
        await this.depositManager.methods.setRelayHubAddress(investor).send({
            from: investor
        }).should.be.rejectedWith(EVMRevert)
    })

    it('check can contribute using GSN', async function () {
        await time.increaseTo(this.fundingStartTime.add(time.duration.days(1)))
        const investment = ether(1)
        const result = await this.depositManager.methods.contribute(
            this.lending.address,
            investor,
            investment.toString(10)
        ).send({
            from: investor,
            useGSN: true
        }).should.be.fulfilled
        await assertSentViaGSN(web3, result);

        const investorContribution = await this.lending.checkInvestorContribution(investor)
        investorContribution.should.be.bignumber.equal(investment)
    })

    it('check can contribute without using GSN', async function () {
        await time.increaseTo(this.fundingStartTime.add(time.duration.days(1)))

        const investment = ether(1)
        await this.depositManager.methods.contribute(
            this.lending.address,
            investor,
            investment.toString(10)
        ).send(
            {
                from: investor,
                useGSN: false
            }
        ).should.be.fulfilled

        const investorContribution = await this.lending.checkInvestorContribution(investor)
        investorContribution.should.be.bignumber.equal(investment)
    })

  it('check cannot contribute 0', async function () {
      await time.increaseTo(this.fundingStartTime + time.duration.days(1))
      await this.depositManager.methods.contribute(
          this.lending.address,
          investor,
          0
      ).send(
          {
              from: investor,
          }
      ).should.be.rejectedWith(EVMRevert)
  })

  
})
