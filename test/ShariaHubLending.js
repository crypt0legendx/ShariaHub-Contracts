'use strict'
import ether from './helpers/ether'
import {
    advanceBlock
} from './helpers/advanceToBlock'
import {
    increaseTimeTo,
    duration
} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'

const {
    BN
} = require('@openzeppelin/test-helpers')

const Uninitialized = 0
const AcceptingContributions = 1
const Funded = 2
const AwatingReturn = 3
const ProjectNotFunded = 4
const ContributionReturned = 5
const Default = 6
const LatestVersion = 11

const utils = require("web3-utils")

const chai = require('chai')
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const ShariaHubLending = artifacts.require('ShariaHubLending')
const MockStorage = artifacts.require('MockStorage')
const LeakGasContract = artifacts.require('LeakGasContract')

contract('ShariaHubLending', function([owner, borrower, investor, investor2, investor3, investor4, localNode, ShariaHubTeam, community, arbiter, systemFeesCollector]) {
    beforeEach(async function() {
        await advanceBlock()

        const latestTimeValue = await latestTime()

        this.loanParams = {
            'fundingStartTime': latestTimeValue + duration.days(1),
            'fundingEndTime': latestTimeValue + duration.days(41),
            'annualInterest': 15,
            'totalLendingAmount' : ether(3).toString(),
            'lendingDays': 90,
            'ShariaHubFee': 3,
            'systemFees': 4,
            'maxDelayDays': 90
        }

        this.actors = {
            'borrower': borrower,
            'localNode': localNode,
            'ShariaHubTeam': ShariaHubTeam,
            'systemFeesCollector': systemFeesCollector
        }

        this.members = new BN(20)

        this.mockStorage = await MockStorage.new()

        await this.mockStorage.setBool(utils.soliditySha3("user", "localNode", localNode), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", borrower), true)

        this.lending = await ShariaHubLending.new(
            this.mockStorage.address,
            this.loanParams,
            this.actors
        )

        await this.mockStorage.setAddress(utils.soliditySha3("contract.address", this.lending.address), this.lending.address)
        await this.mockStorage.setAddress(utils.soliditySha3("arbiter", this.lending.address), arbiter)

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor3), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor4), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "community", community), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "arbiter", arbiter), true)

    })

    describe('initializing', function() {
        it('should not allow to invest before initializing', async function() {
            var someLending = await ShariaHubLending.new(
                this.mockStorage.address,
                this.loanParams,
                this.actors
            )

            await increaseTimeTo(this.loanParams.fundingStartTime - duration.days(0.5))

            var isRunning = await someLending.isContribPeriodRunning()
            var state = await someLending.state()

            state.toNumber().should.be.equal(AcceptingContributions)
            isRunning.should.be.equal(false)
            await someLending.deposit(investor, {value:ether(1), from: investor}).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow create projects with unregistered local nodes', async function() {
            this.actors.localNode = arbiter
            await ShariaHubLending.new(
                this.mockStorage.address,
                this.loanParams,
                this.actors
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to invest with unregistered representatives', async function() {
            this.actors.borrower = arbiter
            await ShariaHubLending.new(
                this.mockStorage.address,
                this.loanParams,
                this.actors
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should be in latest version', async function() {
            let version = await this.lending.version()
            let expectedVersion = new BN(LatestVersion)
            version.should.be.bignumber.equal(expectedVersion)
        })
    })

    describe('contributing', function() {
        it('should not allow to invest before contribution period', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime - duration.days(0.5))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to invest after contribution period', async function() {
            await increaseTimeTo(this.loanParams.fundingEndTime + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.rejectedWith(EVMRevert)
        })

        it('should allow to check investor contribution amount', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled
            const contributionAmount = await this.lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(ether(1))
        })

        it('should allow to invest in contribution period', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled
        })

        it('should not allow to invest with cap fulfilled', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await this.lending.deposit(investor2, {value: ether(1), from: investor2}).should.be.fulfilled
            isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await this.lending.deposit(investor3, {value: ether(1), from: investor3}).should.be.fulfilled
            isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await this.lending.deposit(investor4, {value: ether(1), from: investor4}).should.be.rejectedWith(EVMRevert)
        })

        it('should return extra value over cap to last investor', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: ether(2), from: investor}).should.be.fulfilled
            await this.lending.deposit(investor2, {value: ether(1.5), from: investor2}).should.be.fulfilled
        })

        it('should allow to invest throught paymentGateway', async function () {
            const paymentGateway = owner
            const GWBeforeSendBalance = await web3.eth.getBalance(paymentGateway)
            const investorBeforeSendBalance = await web3.eth.getBalance(investor)
            var gasCost = new BN(0)
            await this.mockStorage.setBool(utils.soliditySha3("user", "paymentGateway", paymentGateway),true)
            await increaseTimeTo(this.loanParams.fundingStartTime  + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            var tx = await this.lending.deposit(investor, {value:ether(1), from: paymentGateway}).should.be.fulfilled

            const contributionAmount = await this.lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(new BN(ether(1)))

            gasCost = accumulateTxCost(tx, gasCost)
            const GWAfterSendBalance = await web3.eth.getBalance(paymentGateway)
            const investorAfterSendBalance = await web3.eth.getBalance(investor)
            investorBeforeSendBalance.should.be.bignumber.equal(investorAfterSendBalance)
            const expectedBalance = new BN(GWBeforeSendBalance).sub(new BN(ether(1))).sub(gasCost)
            checkLostinTransactions(expectedBalance, GWAfterSendBalance)
        })

    })


    describe('Days calculator', function() {
        it('should calculate correct days', async function() {
            const expectedDaysPassed = 55
            const daysPassed = await this.lending.getDaysPassedBetweenDates(this.loanParams.fundingStartTime, this.loanParams.fundingStartTime + duration.days(expectedDaysPassed))
            daysPassed.should.be.bignumber.equal(new BN(expectedDaysPassed))
            const sameAsLendingDays = await this.lending.getDaysPassedBetweenDates(this.loanParams.fundingStartTime, this.loanParams.fundingStartTime + duration.days(this.loanParams.lendingDays))
            new BN(this.loanParams.lendingDays).should.be.bignumber.equal(sameAsLendingDays)
            const lessThanADay = await this.lending.getDaysPassedBetweenDates(this.loanParams.fundingStartTime, this.loanParams.fundingStartTime + duration.hours(23))
            new BN(0).should.be.bignumber.equal(lessThanADay)
        })

        it('should fail to operate for time travelers (sorry)', async function() {
            await this.lending.getDaysPassedBetweenDates(this.loanParams.fundingStartTime, this.loanParams.fundingStartTime - duration.days(2)).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Partial returning of funds', function() {
        it('full payment of the loan in several transfers should be allowed', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount.div(new BN(2)), from: borrower}).should.be.fulfilled
            await this.lending.returnBorrowed({value: borrowerReturnAmount.div(new BN(2)), from: borrower}).should.be.fulfilled
            const state = await this.lending.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('partial payment of the loan should be still default', async function() {
            await increaseTimeTo(this.loanParams.fundingEndTime - duration.minutes(1))
            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) + duration.days(10)
            await increaseTimeTo(defaultTime)
            const trueBorrowerReturnAmount = await this.lending.borrowerReturnAmount() // actual returnAmount
            await this.lending.returnBorrowed({value: trueBorrowerReturnAmount.div(new BN(2)), from: borrower}).should.be.fulfilled
            await this.lending.returnBorrowed({value: trueBorrowerReturnAmount.div(new BN(5)), from: borrower}).should.be.fulfilled

            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) + duration.days(this.loanParams.maxDelayDays + 1)
            await increaseTimeTo(defaultTime)
            await this.lending.declareProjectDefault({from: owner}).should.be.fulfilled
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Default)
        })

        it('partial payment of the loan should allow to recover contributions', async function() {
            await increaseTimeTo(this.loanParams.fundingEndTime - duration.minutes(1))

            var investorSendAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(1)).div(new BN(3))
            var investor1GasCost = new BN(0)
            var tx = await this.lending.deposit(investor, {value: investorSendAmount, from: investor}).should.be.fulfilled
            investor1GasCost = accumulateTxCost(tx, investor1GasCost)
            const investorAfterSendBalance = await web3.eth.getBalance(investor)

            var investor2SendAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(2)).div(new BN(3))
            var investor2GasCost = new BN(0)
            tx = await this.lending.deposit(investor2, {value: investor2SendAmount, from: investor2}).should.be.fulfilled
            const investor2AfterSendBalance = await web3.eth.getBalance(investor2)
            investor2GasCost = accumulateTxCost(tx, investor2GasCost)
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled

            // Reclaims fees
            await this.lending.reclaimSystemFees().should.be.fulfilled
            await this.lending.reclaimShariaHubTeamFee().should.be.fulfilled

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) + duration.days(10)
            await increaseTimeTo(defaultTime)
            const trueBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await this.lending.returnBorrowed({value: notFullAmount, from: borrower}).should.be.fulfilled
            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) + duration.days(this.loanParams.maxDelayDays + 1)
            await increaseTimeTo(defaultTime)
            await this.lending.declareProjectDefault({from: owner}).should.be.fulfilled
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Default)
            tx = await this.lending.reclaimContributionDefault(investor, {from: investor}).should.be.fulfilled
            investor1GasCost = accumulateTxCost(tx, investor1GasCost)
            const investorFinalBalance = await web3.eth.getBalance(investor)
            var expected = new BN(investorAfterSendBalance).add(investorSendAmount.div(new BN(4)).mul(new BN(3))).sub(investor1GasCost)
            checkLostinTransactions(expected, investorFinalBalance)
            tx = await this.lending.reclaimContributionDefault(investor2, {from: investor2}).should.be.fulfilled
            investor2GasCost = accumulateTxCost(tx, investor2GasCost)
            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            var expected2 = new BN(investor2AfterSendBalance).add(investor2SendAmount.div(new BN(4)).mul(new BN(3))).sub(investor2GasCost)
            checkLostinTransactions(expected2, investor2FinalBalance)
            var contractBalance = await web3.eth.getBalance(this.lending.address)
            contractBalance.should.be.bignumber.equal(new BN(0))
        })

        it('partial payment of the loan should not allow to recover interest, local node and team fees', async function() {
            await increaseTimeTo(this.loanParams.fundingEndTime - duration.minutes(1))

            var investorSendAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(1)).div(new BN(3))
            await this.lending.deposit(investor, {value: investorSendAmount, from: investor}).should.be.fulfilled

            var investor2SendAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(2)).div(new BN(3))
            await this.lending.deposit(investor2, {value: investor2SendAmount, from: investor2}).should.be.fulfilled

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) + duration.days(10)
            await increaseTimeTo(defaultTime)

            const trueBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await this.lending.returnBorrowed({value: notFullAmount, from: borrower}).should.be.fulfilled

            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) + duration.days(this.loanParams.maxDelayDays + 1)
            await increaseTimeTo(defaultTime)
            await this.lending.declareProjectDefault({from: owner}).should.be.fulfilled
            var state = await this.lending.state()

            state.toNumber().should.be.equal(Default)
            // Reclaims amounts
            await this.lending.reclaimContributionWithInterest(investor, {from: investor}).should.be.rejectedWith(EVMRevert)

            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.rejectedWith(EVMRevert)
            await this.lending.reclaimSystemFees().should.be.rejectedWith(EVMRevert)
            await this.lending.reclaimShariaHubTeamFee().should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Retrieving contributions', function() {
        it('should allow to retrieve contributions after declaring project not funded', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled
            var balance = await web3.eth.getBalance(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await increaseTimeTo(this.loanParams.fundingEndTime + duration.days(1))
            await this.lending.declareProjectNotFunded({from: owner})
            var state = await this.lending.state()
            // project not funded
            state.toNumber().should.be.equal(ProjectNotFunded)

            var balance = await web3.eth.getBalance(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))
            // can reclaim contribution from everyone
            balance = await web3.eth.getBalance(investor)
            await this.lending.reclaimContribution(investor).should.be.fulfilled
            // fail to reclaim from no investor
            await this.lending.reclaimContribution(investor2).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to retrieve contributions if not contributor paid', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled

            var balance = await web3.eth.getBalance(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await increaseTimeTo(this.loanParams.fundingEndTime + duration.days(1))
            await this.lending.declareProjectNotFunded({from: owner})
            var state = await this.lending.state()
            // project not funded
            state.toNumber().should.be.equal(ProjectNotFunded)
            await this.lending.reclaimContribution(investor3).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to retrieve contributions before declaring project not funded', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled

            var balance = await web3.eth.getBalance(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await increaseTimeTo(this.loanParams.fundingEndTime + duration.days(1))
            // can reclaim contribution from everyone
            balance = await web3.eth.getBalance(investor)
            await this.lending.reclaimContribution(investor).should.be.rejectedWith(EVMRevert)
        })
    })


    describe('Borrower return', function() {

        it('returning in same date should amount to totalLendingAmount plus fees', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            borrowerReturnAmount.should.be.bignumber.equal(this.loanParams.totalLendingAmount)
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            const state = await this.lending.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('returning in half total date without fees', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(1).toString(), 
                'lendingDays': 183,
                'ShariaHubFee': 0,
                'systemFees': 0,
                'maxDelayDays': this.loanParams.maxDelayDays
            }
            
            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let noFeesLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            ).should.be.fulfilled

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", noFeesLending.address), noFeesLending.address)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            await noFeesLending.deposit(investor, {value: loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await noFeesLending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(noFeesLending, loanParams.lendingDays)
            const now = await latestTime()
            let lendingIncrement = await noFeesLending.lendingInterestRatePercentage()
            lendingIncrement.toNumber().should.be.above(10750)
            lendingIncrement.toNumber().should.be.below(10755)
        })

        it('returning in half total date with fees', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(1).toString(), 
                'lendingDays': 183,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }
            
            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let feesLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            ).should.be.fulfilled

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", feesLending.address), feesLending.address)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            await feesLending.deposit(investor, {value: loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await feesLending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(feesLending, loanParams.lendingDays)

            let lendingIncrement = await feesLending.lendingInterestRatePercentage()
            lendingIncrement.should.be.bignumber.equal(new BN(11452))
        })


        it('should calculate correct return amount based on return time', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(this.lending, this.loanParams.lendingDays)
            var state = await this.lending.state()
            state.toNumber().should.be.equal(AwatingReturn)

            var interest = parseInt((this.loanParams.annualInterest * 100) * (this.loanParams.lendingDays) / (365))
            var borrowerReturnAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(interest + 10000)).div(new BN(10000))
            var contractBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)

            var defaultTime = this.lending.fundingEndTime() + duration.days(this.loanParams.lendingDays) + duration.days(90)

            await increaseTimeTo(defaultTime)

            interest = parseInt((this.loanParams.annualInterest * 100) * (this.loanParams.lendingDays) / (365))
            borrowerReturnAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(interest + 10000)).div(new BN(10000))
            contractBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)
        })


        it('should not allow to stablish return in other state', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
        })

        it('should allow the return of proper amount', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
        })
    })

    describe('Default', async function() {
        it('should calculate correct time difference', async function() {
            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays)
            for (var delayDays = 0; delayDays <= 10; delayDays++) {
                var resultDays = await this.lending.getDelayDays(defaultTime + duration.days(delayDays))
                resultDays.toNumber().should.be.equal(delayDays)
            }
        })

        it('should count half a day as full day', async function() {
            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays)
            var resultDays = await this.lending.getDelayDays(defaultTime + duration.days(1.5))
            resultDays.toNumber().should.be.equal(1)
        })

        it('should be 0 days if not yet ended', async function() {
            var defaultTime = this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) - duration.seconds(1)
            var resultDays = await this.lending.getDelayDays(defaultTime)
            resultDays.toNumber().should.be.equal(0)
        })

        it('should not allow to declare project as default before lending period ends', async function() {
            await increaseTimeTo(this.loanParams.fundingEndTime - duration.minutes(1))
            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimeTo(this.loanParams.fundingEndTime + duration.days(this.loanParams.lendingDays) + duration.days(this.loanParams.maxDelayDays) - duration.days(1))
            await this.lending.declareProjectDefault().should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Retrieve contribution with interest', async function() {
        it('Should return investors contributions with interests', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Funded)

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled

            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            const investorInterest = await this.lending.investorInterest()
            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.lending.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.lending.reclaimContributionWithInterest(investor4, {from: investor4})
            await this.lending.reclaimSystemFees().should.be.fulfilled
            await this.lending.reclaimShariaHubTeamFee().should.be.fulfilled

            const balance = await web3.eth.getBalance(this.lending.address)
            new BN(balance).toNumber().should.be.below(2)
            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)
            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)
            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })


        it('Should show same returns for investors different time after returned', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(this.lending, this.loanParams.lendingDays)

            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            let firstCheck = await this.lending.checkInvestorReturns(investor2).should.be.fulfilled
            await increaseTimePastEndingTime(this.lending, this.loanParams.lendingDays + 20)

            let secondCheck = await this.lending.checkInvestorReturns(investor2).should.be.fulfilled
            firstCheck.should.be.bignumber.equal(secondCheck)
        })

        it('Should return investors with excess contribution', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(2)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            let investor4Contribution = await this.lending.checkInvestorContribution(investor4)
            investor4Contribution.should.be.bignumber.equal(ether(1.5))
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            const investorInterest = await this.lending.investorInterest()
            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.lending.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.lending.reclaimContributionWithInterest(investor4, {from: investor4})

            await this.lending.reclaimSystemFees().should.be.fulfilled
            await this.lending.reclaimShariaHubTeamFee().should.be.fulfilled

            const balance = await web3.eth.getBalance(this.lending.address)
            new BN(balance).toNumber().should.be.below(2)

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investor4Contribution, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })

        it('Should not allow to send funds back if not borrower', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: investor2}).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow reclaim twice the funds', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(2)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow returns when contract have balance in other state', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            const investment2 = ether(1)
            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.reclaimContributionWithInterest(investor2).should.be.rejectedWith(EVMRevert)
        })

        it('Should return correct platform fees', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(this.lending, this.loanParams.lendingDays)
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()

            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.lending.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.lending.reclaimContributionWithInterest(investor4, {from: investor4})

            const systemFeesCollectorBalance = await web3.eth.getBalance(systemFeesCollector)
            const teamBalance = await web3.eth.getBalance(ShariaHubTeam)

            await this.lending.reclaimSystemFees().should.be.fulfilled
            await this.lending.reclaimShariaHubTeamFee().should.be.fulfilled

            const systemFeesCollectorFinalBalance = await web3.eth.getBalance(systemFeesCollector)
            const expectedsystemFeesCollectorBalance = new BN(systemFeesCollectorBalance).add(new BN(this.loanParams.totalLendingAmount).mul(new BN(this.loanParams.systemFees)).div(new BN(100)))
            checkLostinTransactions(expectedsystemFeesCollectorBalance, systemFeesCollectorFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamBalance).add(new BN(this.loanParams.totalLendingAmount).mul(new BN(this.loanParams.ShariaHubFee)).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)
        })

        it('Should return remaining platform fees if inexact', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(3.5).toString(), 
                'lendingDays': this.loanParams.lendingDays,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let realAmountLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            )
            
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountLending.deposit(investor, {value: investment, from: investor}).should.be.fulfilled
            await realAmountLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await realAmountLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await realAmountLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await realAmountLending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(realAmountLending, loanParams.lendingDays)
            await realAmountLending.returnBorrowed({value: "220056000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "188440380000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "8657779357692697862", from: borrower}).should.be.fulfilled

            await realAmountLending.reclaimContributionWithInterest(investor3, {from: investor3})
            await realAmountLending.reclaimContributionWithInterest(investor4, {from: investor4})
            await realAmountLending.reclaimContributionWithInterest(investor, {from: investor})
            await realAmountLending.reclaimContributionWithInterest(investor2, {from: investor2})

            const systemFeesCollectorBalance = await web3.eth.getBalance(systemFeesCollector)
            const teamBalance = await web3.eth.getBalance(ShariaHubTeam)
            await realAmountLending.reclaimSystemFees().should.be.fulfilled
            await realAmountLending.reclaimShariaHubTeamFee().should.be.fulfilled

            const systemFeesCollectorFinalBalance = await web3.eth.getBalance(systemFeesCollector)
            const expectedSystemFeesCollectorBalance = new BN(systemFeesCollectorBalance).add(new BN(loanParams.totalLendingAmount).mul(new BN(loanParams.systemFees)).div(new BN(100)))

            checkLostinTransactions(expectedSystemFeesCollectorBalance, systemFeesCollectorFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamBalance).add(new BN(loanParams.totalLendingAmount).mul(new BN(loanParams.ShariaHubFee)).div(new BN(100)))

            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)
        })

        it('should be interest 0% if the project is repaid on the same day', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()

            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            // Get the contribution 3 years later
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(109500))
            // borrowerReturnDays = 0 and interest = 10000
            const borrowerReturnDays = await this.lending.borrowerReturnDays()
            borrowerReturnDays.toNumber().should.be.equal(0)
            const investorInterest = await this.lending.investorInterest()
            investorInterest.toNumber().should.be.equal(10000)
            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.lending.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.lending.reclaimContributionWithInterest(investor4, {from: investor4})

            await this.lending.reclaimSystemFees().should.be.fulfilled
            await this.lending.reclaimShariaHubTeamFee().should.be.fulfilled

            const balance = await web3.eth.getBalance(this.lending.address)
            new BN(balance).toNumber().should.be.below(2)

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })

    })

    describe('Reclaim leftover eth', async function() {
        it('should send leftover dai to team if its correct state, all parties have reclaimed theirs', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(3.5).toString(), 
                'lendingDays': this.loanParams.lendingDays,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let realAmountLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            )

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountLending.deposit(investor, {value: investment, from: investor}).should.be.fulfilled
            await realAmountLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await realAmountLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await realAmountLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await realAmountLending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(realAmountLending, loanParams.lendingDays)

            await realAmountLending.returnBorrowed({value: "220056000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "188440380000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "8657779357692697862", from: borrower}).should.be.fulfilled


            await realAmountLending.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor4, {from: investor4}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            await realAmountLending.reclaimSystemFees().should.be.fulfilled
            await realAmountLending.reclaimShariaHubTeamFee().should.be.fulfilled
            const teamBalance = await web3.eth.getBalance(ShariaHubTeam)
            await realAmountLending.reclaimLeftover({from: arbiter}).should.be.fulfilled

            const newBalance = await web3.eth.getBalance(ShariaHubTeam)
            newBalance.should.be.bignumber.least(teamBalance)
        })

        it('should fail to send leftover dai to team if its correct state, without all contributors reclaimed', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(3.5).toString(), 
                'lendingDays': this.loanParams.lendingDays,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let realAmountLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            )

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountLending.deposit(investor, {value: investment, from: investor}).should.be.fulfilled
            await realAmountLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await realAmountLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await realAmountLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await realAmountLending.sendFundsToBorrower({from: owner}).should.be.fulfilled

            await increaseTimePastEndingTime(realAmountLending, loanParams.lendingDays)

            await realAmountLending.returnBorrowed({value: "220056000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "188440380000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "8657779357692697862", from: borrower}).should.be.fulfilled


            await realAmountLending.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor4, {from: investor4}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountLending.reclaimSystemFees().should.be.fulfilled
            await realAmountLending.reclaimShariaHubTeamFee().should.be.fulfilled
            await realAmountLending.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)
        })
        it('should fail to send leftover dai to team if its correct state, without local node reclaimed', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(3.5).toString(), 
                'lendingDays': this.loanParams.lendingDays,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let realAmountLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            )

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountLending.deposit(investor, {value: investment, from: investor}).should.be.fulfilled
            await realAmountLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await realAmountLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await realAmountLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await realAmountLending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(realAmountLending, loanParams.lendingDays)

            await realAmountLending.returnBorrowed({value: "220056000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "188440380000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "8657779357692697862", from: borrower}).should.be.fulfilled

            await realAmountLending.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor4, {from: investor4}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            await realAmountLending.reclaimShariaHubTeamFee().should.be.fulfilled
            await realAmountLending.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)

        })
        it('should fail to send leftover dai to team if its correct state, without team reclaimed', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(3.5).toString(), 
                'lendingDays': this.loanParams.lendingDays,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let realAmountLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            )

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountLending.deposit(investor, {value: investment, from: investor}).should.be.fulfilled
            await realAmountLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await realAmountLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await realAmountLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await realAmountLending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await increaseTimePastEndingTime(realAmountLending, loanParams.lendingDays)

            await realAmountLending.returnBorrowed({value: "220056000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "188440380000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "8657779357692697862", from: borrower}).should.be.fulfilled

            await realAmountLending.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor4, {from: investor4}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            await realAmountLending.reclaimSystemFees().should.be.fulfilled
            await realAmountLending.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)
        })

        it('should fail to send leftover dai to team if its correct state if not arbiter', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(3.5).toString(), 
                'lendingDays': this.loanParams.lendingDays,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let realAmountLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            )

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountLending.deposit(investor, {value: investment, from: investor}).should.be.fulfilled
            await realAmountLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await realAmountLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await realAmountLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await realAmountLending.sendFundsToBorrower({from: owner}).should.be.fulfilled

            await increaseTimePastEndingTime(realAmountLending, loanParams.lendingDays)

            await realAmountLending.returnBorrowed({value: "220056000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "188440380000000000", from: borrower}).should.be.fulfilled
            await realAmountLending.returnBorrowed({value: "8657779357692697862", from: borrower}).should.be.fulfilled

            await realAmountLending.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor4, {from: investor4}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountLending.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled

            await realAmountLending.reclaimSystemFees().should.be.fulfilled
            await realAmountLending.reclaimShariaHubTeamFee().should.be.fulfilled
            await realAmountLending.reclaimLeftover({from: investor}).should.be.rejectedWith(EVMRevert)

        })

        it('should fail to send leftover dai to team if not correct state', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': this.loanParams.annualInterest,
                'totalLendingAmount' : ether(3.5).toString(), 
                'lendingDays': this.loanParams.lendingDays,
                'ShariaHubFee': this.loanParams.ShariaHubFee,
                'systemFees': this.loanParams.systemFees,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let realAmountLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            )

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountLending.deposit(investor, {value: investment, from: investor}).should.be.fulfilled
            await realAmountLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await realAmountLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await realAmountLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled

            await realAmountLending.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Send partial return', async function() {

        it('Should allow to send partial return before the rate is set', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
        })

        it('Should only allow borrower to send partial return', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            await this.lending.deposit(investor, {value: this.loanParams.totalLendingAmount, from: investor}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            await this.lending.deposit(investor2, {value: ether(1), from: investor2}).should.be.rejectedWith(EVMRevert)
        })

        it('Should allow to reclaim partial return from contributor', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investorInvestment = ether(1)
            const investor2Investment = ether(2)
            await this.lending.deposit(investor, {value: investorInvestment, from: investor}).should.be.fulfilled
            await this.lending.deposit(investor2, {value: investor2Investment, from: investor2}).should.be.fulfilled
            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled

            var investorInitialBalance = await web3.eth.getBalance(investor)

            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()

            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            var investorInitialBalance = await web3.eth.getBalance(investor)

            const investorInterest = await this.lending.investorInterest()

            await this.lending.reclaimContributionWithInterest(investor).should.be.fulfilled
            await this.lending.reclaimContributionWithInterest(investor2).should.be.fulfilled

            let reclaimStatus = await this.lending.getUserContributionReclaimStatus(investor)
            reclaimStatus.should.be.equal(true)
            reclaimStatus = await this.lending.getUserContributionReclaimStatus(investor2)
            reclaimStatus.should.be.equal(true)

            var investorFinalBalance = await web3.eth.getBalance(investor)
            var expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, investorInvestment.sub(ether(1).div(new BN(3))), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            var investor2FinalBalance = await web3.eth.getBalance(investor2)
            var expectedInvestor2Balance = getExpectedInvestorBalance(investorInitialBalance, investor2Investment.sub(ether(2).div(new BN(3))), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)
        })
    })

    describe('Change borrower', async function() {

        it('Should allow to change borrower with registered arbiter', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "representative", investor3), true)
            await this.lending.setBorrower(investor3, {from: arbiter}).should.be.fulfilled
            let borrower = await this.lending.borrower()
            borrower.should.be.equal(investor3)
        })

        it('Should not allow to change borrower with unregistered arbiter', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.lending.setBorrower(investor3, {from: owner}).should.be.rejectedWith(EVMRevert)
        })

    })

    describe('Change investor', async function() {

        it('Should allow to change investor with registered arbiter', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled
            await this.lending.changeInvestorAddress(investor, investor2, {from: arbiter}).should.be.fulfilled

            var contributionAmount = await this.lending.checkInvestorContribution(investor2)
            contributionAmount.should.be.bignumber.equal(ether(1))
            contributionAmount = await this.lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(new BN(0))
        })

        it('Should not allow to change investor to unregistered investor', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), false)
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled
            await this.lending.changeInvestorAddress(investor, investor2, {from: arbiter}).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow to change new investor who have already invested', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.lending.deposit(investor, {value: ether(1), from: investor}).should.be.fulfilled
            await this.lending.deposit(investor2, {value: ether(1), from: investor2}).should.be.fulfilled
            await this.lending.changeInvestorAddress(investor, investor2, {from: arbiter}).should.be.rejectedWith(EVMRevert)
       })


        it('Should not allow to change borrower with unregistered arbiter', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.lending.changeInvestorAddress(investor, investor2, {from: owner}).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Fees collected when project is funded', async function() {
        it('Should be able to get the fees before the return', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Funded)

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            state = await this.lending.state()
            state.toNumber().should.be.equal(AwatingReturn)

            const systemFeesCollectorBalance = await web3.eth.getBalance(systemFeesCollector)
            const teamBalance = await web3.eth.getBalance(ShariaHubTeam)
            await this.lending.reclaimSystemFees().should.be.fulfilled
            await this.lending.reclaimShariaHubTeamFee().should.be.fulfilled
            const systemFeesCollectorFinalBalance = await web3.eth.getBalance(systemFeesCollector)
            const expectedSystemFeesCollectorBalance = new BN(systemFeesCollectorBalance).add(new BN(this.loanParams.totalLendingAmount).mul(new BN(this.loanParams.systemFees)).div(new BN(100)))
            checkLostinTransactions(expectedSystemFeesCollectorBalance, systemFeesCollectorFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamBalance).add(new BN(this.loanParams.totalLendingAmount).mul(new BN(this.loanParams.ShariaHubFee)).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)
        })

        it('Should be sent to borrower amount without the fees', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            const borrowerBalance = await web3.eth.getBalance(borrower)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Funded)

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            state = await this.lending.state()
            state.toNumber().should.be.equal(AwatingReturn)

            const borrowerFinalBalance = await web3.eth.getBalance(borrower)
            const systemFeesAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(this.loanParams.systemFees)).div(new BN(100))
            const teamFeesAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(this.loanParams.ShariaHubFee)).div(new BN(100))
            const expectedBorrowerBalance = new BN(borrowerBalance).sub(systemFeesAmount).sub(teamFeesAmount)
            checkLostinTransactions(expectedBorrowerBalance, borrowerFinalBalance)
        })

        it('Should be borrower return amount without the fees', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            const borrowerBalance = await web3.eth.getBalance(borrower)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Funded)

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            state = await this.lending.state()
            state.toNumber().should.be.equal(AwatingReturn)

            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(365))

            const lendingDays = await this.lending.getDaysPassedBetweenDates(this.loanParams.fundingStartTime, this.loanParams.fundingStartTime + duration.days(365))
            const interestGenerated = parseInt((this.loanParams.annualInterest * 100) * (lendingDays.toNumber()) / (365))
            const borrowerReturnAmount = new BN(this.loanParams.totalLendingAmount).mul(new BN(interestGenerated + 10000)).div(new BN(10000))
            const contractBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            checkLostinTransactions(contractBorrowerReturnAmount, borrowerReturnAmount)
        })

        it('Should be the same the investor reclaims', async function() {
            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            const borrowerBalance = await web3.eth.getBalance(borrower)

            await this.lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await this.lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await this.lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Funded)

            await this.lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            state = await this.lending.state()
            state.toNumber().should.be.equal(AwatingReturn)

            await increaseTimeTo(this.loanParams.fundingStartTime + duration.days(365))
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.lending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            state = await this.lending.state()
            state.toNumber().should.be.equal(ContributionReturned)
            const investorInterest = await this.lending.investorInterest()
            await this.lending.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.lending.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.lending.reclaimContributionWithInterest(investor4, {from: investor4})

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)
            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)
            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })
    })

    describe('Calculate fees', async function() {
        it('Should reclaims system fees and team fees before lending period', async function() {
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': 8,
                'totalLendingAmount' : ether(10).toString(), 
                'lendingDays': 366,
                'ShariaHubFee': 4,
                'systemFees': 4,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': ShariaHubTeam,
                'systemFeesCollector': systemFeesCollector
            }

            let feesLending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            ).should.be.fulfilled

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(2)
            const investment3 = ether(3)
            const investment4 = ether(5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)

            await feesLending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await feesLending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await feesLending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled
            var state = await feesLending.state()
            state.toNumber().should.be.equal(Funded)

            await feesLending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            state = await feesLending.state()
            state.toNumber().should.be.equal(AwatingReturn)


            const systemFeesCollectorBalance = await web3.eth.getBalance(systemFeesCollector)
            await feesLending.reclaimSystemFees()
            const expectedSystemFeesCollectorBalance = new BN(systemFeesCollectorBalance).add(new BN(loanParams.totalLendingAmount).mul(new BN(loanParams.systemFees)).div(new BN(100)))
            const systemFeesCollectorBalanceAfter = await web3.eth.getBalance(systemFeesCollector)
            checkLostinTransactions(expectedSystemFeesCollectorBalance, systemFeesCollectorBalanceAfter)
            
            const ShariaHubTeamBalance = await web3.eth.getBalance(ShariaHubTeam)
            await feesLending.reclaimShariaHubTeamFee()
            const expectedShariaHubTeamBalance = new BN(ShariaHubTeamBalance).add(new BN(loanParams.totalLendingAmount).mul(new BN(loanParams.ShariahubFees)).div(new BN(100)))
            const ShariaHubTeamBalanceAfter = await web3.eth.getBalance(ShariaHubTeam)
            checkLostinTransactions(expectedShariaHubTeamBalance, ShariaHubTeamBalanceAfter)

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(366))
            const borrowerReturnAmount = await feesLending.borrowerReturnAmount()
            await feesLending.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            state = await feesLending.state()
            state.toNumber().should.be.equal(ContributionReturned)
            const investorInterest = await feesLending.investorInterest()
            await feesLending.reclaimContributionWithInterest(investor2, {from: investor2})
            await feesLending.reclaimContributionWithInterest(investor3, {from: investor3})
            await feesLending.reclaimContributionWithInterest(investor4, {from: investor4})

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)
            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)
            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })
    })

    describe('Fix transfer function to call function', async function() {
        it('Should reclaim team fees', async function() {
            let leakGasContract = await LeakGasContract.new()
            let loanParams = {
                'fundingStartTime': this.loanParams.fundingStartTime,
                'fundingEndTime': this.loanParams.fundingEndTime,
                'annualInterest': 8,
                'totalLendingAmount' : ether(10).toString(), 
                'lendingDays': 366,
                'ShariaHubFee': 4,
                'systemFees': 4,
                'maxDelayDays': this.loanParams.maxDelayDays
            }

            let actors = {
                'borrower': borrower,
                'localNode': localNode,
                'ShariaHubTeam': leakGasContract.address,
                'systemFeesCollector': systemFeesCollector
            }

            let lending = await ShariaHubLending.new(
                this.mockStorage.address,
                loanParams,
                actors
            ).should.be.fulfilled

            await increaseTimeTo(loanParams.fundingStartTime + duration.days(1))

            const investment2 = ether(2)
            const investment3 = ether(3)
            const investment4 = ether(5)

            await lending.deposit(investor2, {value: investment2, from: investor2}).should.be.fulfilled
            await lending.deposit(investor3, {value: investment3, from: investor3}).should.be.fulfilled
            await lending.deposit(investor4, {value: investment4, from: investor4}).should.be.fulfilled
            var state = await lending.state()
            state.toNumber().should.be.equal(Funded)

            await lending.sendFundsToBorrower({from: owner}).should.be.fulfilled
            state = await lending.state()
            state.toNumber().should.be.equal(AwatingReturn)
            
            const ShariaHubTeamBalance = await web3.eth.getBalance(leakGasContract.address)
            let tx = await lending.reclaimShariaHubTeamFee()
            let reclaimEHFeeGasCost = accumulateTxCost(tx, reclaimEHFeeGasCost)
            tx.receipt.gasUsed.should.be.above(100000)
            const expectedShariaHubTeamBalance = new BN(ShariaHubTeamBalance).add(new BN(loanParams.totalLendingAmount).mul(new BN(loanParams.ShariahubFees)).div(new BN(100)))
            const ShariaHubTeamBalanceAfter = await web3.eth.getBalance(leakGasContract.address)
            checkLostinTransactions(expectedShariaHubTeamBalance, ShariaHubTeamBalanceAfter)
        })
    })


    async function increaseTimePastEndingTime(lendingContract, increaseDays) {
        const fundingEndTime = await lendingContract.fundingEndTime()
        const returnDate = fundingEndTime.add(new BN(duration.days(increaseDays)))
        await increaseTimeTo(returnDate)
    }


    function getExpectedInvestorBalance(initialAmount, contribution, interest, testEnv) {
        const contributionBN = new BN(contribution)
        const received = contributionBN.mul(interest).div(new BN(10000))
        const initialAmountBN = new BN(initialAmount)
        return initialAmountBN.sub(new BN(contribution)).add(received)
    }

    function accumulateTxCost(tx, cost) {
        const bnCost = new BN(cost)
        return bnCost.add(new BN(tx.receipt.gasUsed).mul(new BN(web3.eth.gasPrice)))
    }

    function checkLostinTransactions(expected, actual) {
        const expectedBN = new BN(expected)
        const lost = expectedBN.sub(new BN(actual))
        // /* Should be below 0.02 eth */
        lost.should.be.bignumber.below('20000000000000000')
    }
})