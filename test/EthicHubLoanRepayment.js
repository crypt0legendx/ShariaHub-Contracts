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
const AwaitingReturn = 3
const ProjectNotFunded = 4
const ContributionReturned = 5
const Default = 6
const LatestVersion = 11

const utils = require("web3-utils")

const chai = require('chai')
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const ShariaHubLoanRepayment = artifacts.require('ShariaHubLoanRepayment')
const MockStorage = artifacts.require('MockStorage')

contract('ShariaHubLoanRepayment', function([owner, borrower, investor, investor2, investor3, investor4, ShariaHubTeam, community, arbiter]) {
    beforeEach(async function() {
        await advanceBlock()

        const latestTimeValue = await latestTime()
        this.fundingEndTime = latestTimeValue + duration.days(41)
        this.lendingInterestRatePercentage = new BN(15)
        this.totalLendingAmount = ether(3)

        this.ShariahubFee = new BN(3)
        // this.localNodeFee = new BN(4)

        this.initialStableCoinPerFiatRate = new BN(538520)
        this.finalStableCoinPerFiatRate = new BN(600000)
        this.lendingDays = new BN(90)
        this.delayMaxDays = new BN(90)
        this.members = new BN(20)

        this.mockStorage = await MockStorage.new()

        // await this.mockStorage.setBool(utils.soliditySha3("user", "localNode", localNode), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", borrower), true)

        this.repayment = await ShariaHubLoanRepayment.new(
            this.fundingEndTime,
            this.lendingInterestRatePercentage,
            this.totalLendingAmount,
            this.lendingDays,
            this.ShariahubFee,
            // this.localNodeFee,
            this.initialStableCoinPerFiatRate,
            borrower,
            // localNode,
            ShariaHubTeam,
            this.mockStorage.address
         )

        await this.mockStorage.setAddress(utils.soliditySha3("contract.address", this.repayment.address), this.repayment.address)
        await this.mockStorage.setAddress(utils.soliditySha3("arbiter", this.repayment.address), arbiter)

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor3), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor4), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "community", community), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "arbiter", arbiter), true)

        await this.repayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
    })

    describe('initializing', function() {
        it('should not allow to invest before initializing', async function() {
            var someLending = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                this.totalLendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await increaseTimeTo(this.fundingEndTime - duration.days(0.5))

            var state = await someLending.state()

            // project not funded
            state.toNumber().should.be.equal(Uninitialized)
        })

        it('should not allow create projects with unregistered local nodes', async function() {
            const unknow_person = arbiter
            await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                this.totalLendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                borrower,
                unknow_person,
                ShariaHubTeam,
                this.mockStorage.address
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to invest with unregistered representatives', async function() {
            const unknow_person = arbiter
            await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                this.totalLendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                unknow_person,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should be in latest version', async function() {
            let version = await this.repayment.version()
            let expectedVersion = new BN(LatestVersion)
            version.should.be.bignumber.equal(expectedVersion)
        })
    })

    describe('Days calculator', function() {
        it('should calculate correct days', async function() {
            const expectedDaysPassed = 55
            const daysPassed = await this.repayment.getDaysPassedBetweenDates(this.fundingEndTime, this.fundingEndTime + duration.days(expectedDaysPassed))
            daysPassed.should.be.bignumber.equal(new BN(expectedDaysPassed))
            const sameAsLendingDays = await this.repayment.getDaysPassedBetweenDates(this.fundingEndTime, this.fundingEndTime + duration.days(this.lendingDays))
            this.lendingDays.should.be.bignumber.equal(sameAsLendingDays)
            const lessThanADay = await this.repayment.getDaysPassedBetweenDates(this.fundingEndTime, this.fundingEndTime + duration.hours(23))
            new BN(0).should.be.bignumber.equal(lessThanADay)
        })

        it('should fail to operate for time travelers (sorry)', async function() {
            await this.repayment.getDaysPassedBetweenDates(this.fundingEndTime, this.fundingEndTime - duration.days(2)).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Partial returning of funds', function() {
        it('full payment of the loan in several transfers should be allowed', async function() {
            await increaseTimeTo(this.fundingEndTime + duration.days(1))
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnFiatAmount = await this.repayment.borrowerReturnFiatAmount()
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            await this.repayment.returnBorrowed({value: borrowerReturnAmount.div(new BN(2)), from: borrower}).should.be.fulfilled
            await this.repayment.returnBorrowed({value: borrowerReturnAmount.div(new BN(2)), from: borrower}).should.be.fulfilled
            const state = await this.repayment.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('partial payment of the loan should be still default', async function() {
            await increaseTimeTo(this.fundingEndTime - duration.minutes(1))
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(10)
            await increaseTimeTo(defaultTime)
            const trueBorrowerReturnAmount = await this.repayment.borrowerReturnAmount() // actual returnAmount
            await this.repayment.returnBorrowed({value: trueBorrowerReturnAmount.div(new BN(2)), from: borrower}).should.be.fulfilled
            await this.repayment.returnBorrowed({value: trueBorrowerReturnAmount.div(new BN(5)), from: borrower}).should.be.fulfilled

            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber() + 1)
            await increaseTimeTo(defaultTime)
            await this.repayment.declareProjectDefault({from: owner}).should.be.fulfilled
            var state = await this.repayment.state()
            state.toNumber().should.be.equal(Default)
        })

        it('partial payment of the loan should allow to recover contributions', async function() {
            await increaseTimeTo(this.fundingEndTime  - duration.minutes(1))

            var investorSendAmount = this.totalLendingAmount.mul(new BN(1)).div(new BN(4))
            await this.repayment.setInvestorState(investor, investorSendAmount).should.be.fulfilled
            const investorAfterSendBalance = await web3.eth.getBalance(investor)

            var investor2SendAmount = this.totalLendingAmount.mul(new BN(3)).div(new BN(4))
            await this.repayment.setInvestorState(investor2, investor2SendAmount).should.be.fulfilled
            const investor2AfterSendBalance = await web3.eth.getBalance(investor2)

            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.initialStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(10)
            await increaseTimeTo(defaultTime)
            const trueBorrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await this.repayment.returnBorrowed({value: notFullAmount, from: borrower}).should.be.fulfilled
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber() + 1)
            await increaseTimeTo(defaultTime)

            await this.repayment.declareProjectDefault({from: owner}).should.be.fulfilled
            var state = await this.repayment.state()
            state.toNumber().should.be.equal(Default)

            await this.repayment.reclaimContributionDefault(investor, {from: investor}).should.be.fulfilled
            const investorFinalBalance = await web3.eth.getBalance(investor)
            var expected = new BN(investorAfterSendBalance).add(investorSendAmount.div(new BN(4)).mul(new BN(3)))
            checkLostinTransactions(expected, investorFinalBalance)
            await this.repayment.reclaimContributionDefault(investor2, {from: investor2}).should.be.fulfilled
            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            var expected2 = new BN(investor2AfterSendBalance).add(investor2SendAmount.div(new BN(4)).mul(new BN(3)))
            checkLostinTransactions(expected2, investor2FinalBalance)
            var contractBalance = await web3.eth.getBalance(this.repayment.address)
            contractBalance.should.be.bignumber.equal(new BN(0))
        })

        it('partial payment of the loan should not allow to recover interest, local node and team fees', async function() {
            await increaseTimeTo(this.fundingEndTime - duration.minutes(1))

            var investorSendAmount = this.totalLendingAmount.mul(new BN(1)).div(new BN(3))
            await this.repayment.setInvestorState(investor, investorSendAmount).should.be.fulfilled

            var investor2SendAmount = this.totalLendingAmount.mul(new BN(2)).div(new BN(3))
            await this.repayment.setInvestorState(investor2, investor2SendAmount).should.be.fulfilled

            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.initialStableCoinPerFiatRate, {from: owner}).should.be.fulfilled

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(10)
            await increaseTimeTo(defaultTime)

            const trueBorrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await this.repayment.returnBorrowed({value: notFullAmount, from: borrower}).should.be.fulfilled

            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber() + 1)
            await increaseTimeTo(defaultTime)
            await this.repayment.declareProjectDefault({from: owner}).should.be.fulfilled
            var state = await this.repayment.state()
            state.toNumber().should.be.equal(Default)
            // Reclaims amounts
            await this.repayment.reclaimContributionWithInterest(investor, {from: investor}).should.be.rejectedWith(EVMRevert)

            await this.repayment.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.rejectedWith(EVMRevert)
            // await this.repayment.reclaimLocalNodeFee().should.be.rejectedWith(EVMRevert)
            await this.repayment.reclaimShariaHubTeamFee().should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Retrieving contributions', function() {
        it('should not allow to retrieve contributions before declaring project contribution returned or default', async function() {
            await increaseTimeTo(this.fundingEndTime + duration.days(1))
            await this.repayment.setInvestorState(investor, ether(1)).should.be.fulfilled

            var balance = await web3.eth.getBalance(this.repayment.address)
            balance.should.be.bignumber.equal(ether(0))

            // can reclaim contribution from everyone
            balance = await web3.eth.getBalance(investor)
            await this.repayment.reclaimContributionWithInterest(investor).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Borrower return', function() {

        it('returning in same date should amount to totalLendingAmount plus fees', async function() {
            await increaseTimeTo(this.fundingEndTime)
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.initialStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            // const localNodeFeeForAmount = this.totalLendingAmount.mul(this.localNodeFee).div(new BN(100))
            const ShariahubFeeForAmount = this.totalLendingAmount.mul(this.ShariahubFee).div(new BN(100))
            // const expectedAmount = this.totalLendingAmount.add(ShariahubFeeForAmount).add(localNodeFeeForAmount)
            borrowerReturnAmount.should.be.bignumber.equal(expectedAmount)
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            const state = await this.repayment.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('returning in half total date without fees', async function() {
            let lendingAmount = ether(1)
            let lendingDays = new BN(183) //half year
            let noFeesRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                0,
                0,
                100,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            ).should.be.fulfilled

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", noFeesRepayment.address), noFeesRepayment.address)

            await noFeesRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            increaseTimePastEndingTime(noFeesRepayment, lendingDays)
            await noFeesRepayment.setborrowerReturnStableCoinPerFiatRate(100, {from: owner})

            let lendingIncrement = await noFeesRepayment.lendingInterestRatePercentage()
            lendingIncrement.toNumber().should.be.above(10750)
            lendingIncrement.toNumber().should.be.below(10755)
        })

        it('returning in half total date with fees', async function() {
            let lendingAmount = ether(1)
            let lendingDays = 183 //half year
            let feesRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                new BN(4),
                new BN(3),
                100,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            ).should.be.fulfilled

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", feesRepayment.address), feesRepayment.address)

            await feesRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            increaseTimePastEndingTime(feesRepayment, lendingDays)
            await feesRepayment.setborrowerReturnStableCoinPerFiatRate(100, {from: owner})

            let lendingIncrement = await feesRepayment.lendingInterestRatePercentage()
            lendingIncrement.should.be.bignumber.equal(new BN(11452))
        })


        it('should calculate correct return fiat amount based on return time', async function() {
            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            var state = await this.repayment.state()
            state.toNumber().should.be.equal(Uninitialized)
            const borrowerReturnStableCoinPerFiatRate = await this.repayment.borrowerReturnStableCoinPerFiatRate()
            borrowerReturnStableCoinPerFiatRate.should.be.bignumber.equal(this.finalStableCoinPerFiatRate)
            const lendingFiatAmount = this.initialStableCoinPerFiatRate.mul(this.totalLendingAmount)

            // var interest = parseInt((this.lendingInterestRatePercentage.toNumber() * 100) * (this.lendingDays.toNumber()) / (365)) + this.ShariahubFee * 100 + this.localNodeFee.toNumber() * 100
            var borrowerReturnFiatAmount = lendingFiatAmount.mul(new BN(interest + 10000)).div(new BN(10000))
            var borrowerReturnAmount = borrowerReturnFiatAmount.div(this.finalStableCoinPerFiatRate)
            var contractBorrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)

            var defaultTime = this.repayment.fundingEndTime() + duration.days(this.lendingDays.toNumber()) + duration.days(90)

            await increaseTimeTo(defaultTime)

            // interest = parseInt((this.lendingInterestRatePercentage.toNumber() * 100) * (this.lendingDays.toNumber()) / (365)) + this.ShariahubFee * 100 + this.localNodeFee.toNumber() * 100
            borrowerReturnFiatAmount = lendingFiatAmount.mul(new BN(interest + 10000)).div(new BN(10000))
            borrowerReturnAmount = borrowerReturnFiatAmount.div(this.finalStableCoinPerFiatRate)
            contractBorrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)
        })

        it('should allow the return of proper amount', async function() {
            await increaseTimeTo(this.fundingEndTime)
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
        })
    })

    describe('Default', async function() {
        it('should calculate correct time difference', async function() {
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber())
            for (var delayDays = 0; delayDays <= 10; delayDays++) {
                var resultDays = await this.repayment.getDelayDays(defaultTime + duration.days(delayDays))
                resultDays.toNumber().should.be.equal(delayDays)
            }
        })

        it('should count half a day as full day', async function() {
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber())
            var resultDays = await this.repayment.getDelayDays(defaultTime + duration.days(1.5))
            resultDays.toNumber().should.be.equal(1)
        })

        it('should be 0 days if not yet ended', async function() {
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) - duration.seconds(1)
            var resultDays = await this.repayment.getDelayDays(defaultTime)
            resultDays.toNumber().should.be.equal(0)
        })

        it('should not allow to declare project as default before lending period ends', async function() {
            await increaseTimeTo(this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber()) - duration.days(1))
            await this.repayment.declareProjectDefault().should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Retrieve contribution with interest', async function() {
        it('Should return investors contributions with interests', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)

            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled
            var state = await this.repayment.state()
            state.toNumber().should.be.equal(Uninitialized)

            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            const investorInterest = await this.repayment.investorInterest()
            await this.repayment.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.repayment.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.repayment.reclaimContributionWithInterest(investor4, {from: investor4})
            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const balance = await web3.eth.getBalance(this.repayment.address)
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
            await increaseTimeTo(this.fundingEndTime)

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled

            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled

            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            let firstCheck = await this.repayment.checkInvestorReturns(investor2).should.be.fulfilled
            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber() + 20)

            let secondCheck = await this.repayment.checkInvestorReturns(investor2).should.be.fulfilled
            firstCheck.should.be.bignumber.equal(secondCheck)
        })

        it('Should not allow to send funds back if not borrower', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled

            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: investor2}).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow reclaim twice the funds', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investment2 = ether(1)
            const investment3 = ether(2)

            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow returns when contract have balance in other state', async function() {
            await increaseTimeTo(this.fundingEndTime)
            const investment2 = ether(1)
            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2).should.be.rejectedWith(EVMRevert)
        })

        it('Should return correct platform fees', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled

            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()

            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            await this.repayment.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.repayment.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.repayment.reclaimContributionWithInterest(investor4, {from: investor4})

            // const localNodeBalance = await web3.eth.getBalance(localNode)
            const teamBalance = await web3.eth.getBalance(ShariaHubTeam)

            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const localNodeFinalBalance = await web3.eth.getBalance(localNode)
            const expectedLocalNodeBalance = new BN(localNodeBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            // checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ShariahubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)
        })

        it('Should return remainding platform fees if inexact', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                538701,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await realAmountRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountRepayment.address), realAmountRepayment.address)

            await increaseTimeTo(this.fundingEndTime)
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000"
            const investment3 = "2068378226800210000"
            const investment4 = "0340000000000000000"

            await realAmountRepayment.setInvestorState(investor, investment).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            increaseTimePastEndingTime(realAmountRepayment, this.lendingDays.toNumber())
            await realAmountRepayment.setborrowerReturnStableCoinPerFiatRate("242925", {from: owner}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "8657779357692697862", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "220056000000000", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "188440380000000000", from: borrower}).should.be.fulfilled
            const borrowerReturnAmount = await realAmountRepayment.borrowerReturnAmount()

            await realAmountRepayment.reclaimContributionWithInterest(investor3, {from: investor3})
            await realAmountRepayment.reclaimContributionWithInterest(investor, {from: investor})
            await realAmountRepayment.reclaimContributionWithInterest(investor2, {from: investor2})

            // const localNodeBalance = await web3.eth.getBalance(localNode)
            // await realAmountRepayment.reclaimLocalNodeFee().should.be.fulfilled
            // const localNodeFinalBalance = await web3.eth.getBalance(localNode)
            // const expectedLocalNodeBalance = new BN(localNodeBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            // checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamBalance = await web3.eth.getBalance(ShariaHubTeam)
            await realAmountRepayment.reclaimShariaHubTeamFee().should.be.fulfilled
            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ShariahubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)
        })

        it('should be interest 0% if the project is repaid on the same day', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)

            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled

            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()

            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            // Get the contribution 3 years later
            await increaseTimeTo(this.fundingEndTime + duration.days(109500))
            // borrowerReturnDays = 0 and interest = 10000
            const borrowerReturnDays = await this.repayment.borrowerReturnDays()
            borrowerReturnDays.toNumber().should.be.equal(0)
            const investorInterest = await this.repayment.investorInterest()
            investorInterest.toNumber().should.be.equal(10000)
            await this.repayment.reclaimContributionWithInterest(investor2, {from: investor2})
            await this.repayment.reclaimContributionWithInterest(investor3, {from: investor3})
            await this.repayment.reclaimContributionWithInterest(investor4, {from: investor4})

            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const balance = await web3.eth.getBalance(this.repayment.address)
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
            let lendingAmount = new BN("353923822680020850")
            let realAmountRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                538701,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await realAmountRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountRepayment.address), realAmountRepayment.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountRepayment.address), arbiter)

            await increaseTimeTo(this.fundingEndTime)
            const investment = "100000000000000000"
            const investment2 = "026172000000000000"
            const investment3 = "206837822680021000"
            const investment4 = "034000000000000000"

            await realAmountRepayment.setInvestorState(investor, investment).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            increaseTimePastEndingTime(realAmountRepayment, this.lendingDays.toNumber())
            await realAmountRepayment.setborrowerReturnStableCoinPerFiatRate("242925", {from: owner}).should.be.fulfilled

            await realAmountRepayment.returnBorrowed({value: "865777935769269786", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "22005600000002", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "18844038000000000", from: borrower}).should.be.fulfilled

            const initialTeamBalance = await web3.eth.getBalance(ShariaHubTeam)
            await realAmountRepayment.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            // await realAmountRepayment.reclaimLocalNodeFee().should.be.fulfilled
            await realAmountRepayment.reclaimShariaHubTeamFee().should.be.fulfilled
            const teamBalance = await web3.eth.getBalance(ShariaHubTeam)
            await realAmountRepayment.reclaimLeftover({from: arbiter}).should.be.fulfilled

            const newBalance = await web3.eth.getBalance(ShariaHubTeam)
            newBalance.should.be.bignumber.above(teamBalance)
        })

        it('should fail to send leftover dai to team if its correct state, without all contributors reclaimed', async function() {
            let lendingAmount = new BN("353923822680020850")
            let realAmountRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await realAmountRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountRepayment.address), realAmountRepayment.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountRepayment.address), arbiter)

            await increaseTimeTo(this.fundingEndTime)
            const investment = "100000000000000000"
            const investment2 = "026172000000000000"
            const investment3 = "206837822680021000"
            const investment4 = "034000000000000000"

            await realAmountRepayment.setInvestorState(investor, investment).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            increaseTimePastEndingTime(realAmountRepayment, this.lendingDays.toNumber())
            await realAmountRepayment.setborrowerReturnStableCoinPerFiatRate("242925", {from: owner}).should.be.fulfilled

            await realAmountRepayment.returnBorrowed({value: "865777935769269786", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "22005600000002", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "18844038000000000", from: borrower}).should.be.fulfilled

            await realAmountRepayment.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            // await realAmountRepayment.reclaimLocalNodeFee().should.be.fulfilled
            await realAmountRepayment.reclaimShariaHubTeamFee().should.be.fulfilled
            await realAmountRepayment.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)
        })
        it('should fail to send leftover dai to team if its correct state, without local node reclaimed', async function() {
            let lendingAmount = new BN("353923822680020850")
            let realAmountRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await realAmountRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountRepayment.address), realAmountRepayment.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountRepayment.address), arbiter)

            await increaseTimeTo(this.fundingEndTime)
            const investment = "100000000000000000"
            const investment2 = "026172000000000000"
            const investment3 = "206837822680021000"
            const investment4 = "034000000000000000"

            await realAmountRepayment.setInvestorState(investor, investment).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            increaseTimePastEndingTime(realAmountRepayment, this.lendingDays.toNumber())
            await realAmountRepayment.setborrowerReturnStableCoinPerFiatRate("242925", {from: owner}).should.be.fulfilled

            await realAmountRepayment.returnBorrowed({value: "865777935769269786", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "22005600000002", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "18844038000000000", from: borrower}).should.be.fulfilled

            await realAmountRepayment.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            await realAmountRepayment.reclaimShariaHubTeamFee().should.be.fulfilled
            await realAmountRepayment.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)

        })
        it('should fail to send leftover dai to team if its correct state, without team reclaimed', async function() {
            let lendingAmount = new BN("353923822680020850")
            let realAmountRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await realAmountRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountRepayment.address), realAmountRepayment.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountRepayment.address), arbiter)

            await increaseTimeTo(this.fundingEndTime)
            const investment = "100000000000000000"
            const investment2 = "026172000000000000"
            const investment3 = "206837822680021000"
            const investment4 = "034000000000000000"

            await realAmountRepayment.setInvestorState(investor, investment).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            increaseTimePastEndingTime(realAmountRepayment, this.lendingDays.toNumber())
            await realAmountRepayment.setborrowerReturnStableCoinPerFiatRate("242925", {from: owner}).should.be.fulfilled

            await realAmountRepayment.returnBorrowed({value: "865777935769269786", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "22005600000002", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "18844038000000000", from: borrower}).should.be.fulfilled

            await realAmountRepayment.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled
            // await realAmountRepayment.reclaimLocalNodeFee().should.be.fulfilled
            await realAmountRepayment.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)
        })

        it('should fail to send leftover dai to team if its correct state if not arbiter', async function() {
            let lendingAmount = new BN("353923822680020850")
            let realAmountRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await realAmountRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountRepayment.address), realAmountRepayment.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountRepayment.address), arbiter)

            await increaseTimeTo(this.fundingEndTime)
            const investment = "100000000000000000"
            const investment2 = "026172000000000000"
            const investment3 = "206837822680021000"
            const investment4 = "034000000000000000"

            await realAmountRepayment.setInvestorState(investor, investment).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            increaseTimePastEndingTime(realAmountRepayment, this.lendingDays.toNumber())
            await realAmountRepayment.setborrowerReturnStableCoinPerFiatRate("242925", {from: owner}).should.be.fulfilled

            await realAmountRepayment.returnBorrowed({value: "865777935769269786", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "22005600000002", from: borrower}).should.be.fulfilled
            await realAmountRepayment.returnBorrowed({value: "18844038000000000", from: borrower}).should.be.fulfilled

            await realAmountRepayment.reclaimContributionWithInterest(investor3, {from: investor3}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor, {from: investor}).should.be.fulfilled
            await realAmountRepayment.reclaimContributionWithInterest(investor2, {from: investor2}).should.be.fulfilled

            await realAmountRepayment.reclaimLocalNodeFee().should.be.fulfilled
            await realAmountRepayment.reclaimShariaHubTeamFee().should.be.fulfilled
            await realAmountRepayment.reclaimLeftover({from: investor}).should.be.rejectedWith(EVMRevert)

        })

        it('should fail to send leftover dai to team if not correct state', async function() {
            let lendingAmount = new BN("353923822680020850")
            let realAmountRepayment = await ShariaHubLoanRepayment.new(
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ShariahubFee,
                // this.localNodeFee,
                this.initialStableCoinPerFiatRate,
                borrower,
                // localNode,
                ShariaHubTeam,
                this.mockStorage.address
            )

            await realAmountRepayment.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountRepayment.address), realAmountRepayment.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountRepayment.address), arbiter)

            await increaseTimeTo(this.fundingEndTime)
            const investment = "100000000000000000"
            const investment2 = "026172000000000000"
            const investment3 = "206837822680021000"
            const investment4 = "034000000000000000"

            await realAmountRepayment.setInvestorState(investor, investment).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await realAmountRepayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            await realAmountRepayment.reclaimLeftover({from: arbiter}).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Send partial return', async function() {

        it('Should not allow to send partial return before the borrower rate is set', async function() {
            await increaseTimeTo(this.fundingEndTime)

            await this.repayment.setInvestorState(investor, this.totalLendingAmount).should.be.fulfilled
            await this.repayment.returnBorrowed({value: this.totalLendingAmount.add(ether(1)), from: borrower}).should.be.rejectedWith(EVMRevert)
        })

        it('Should allow to reclaim partial return from contributor', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investorInvestment = ether(1)
            const investor2Investment = ether(2)
            await this.repayment.setInvestorState(investor, investorInvestment).should.be.fulfilled
            await this.repayment.setInvestorState(investor2, investor2Investment).should.be.fulfilled
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled

            var investorInitialBalance = await web3.eth.getBalance(investor)

            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount()

            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            var investorInitialBalance = await web3.eth.getBalance(investor)

            const investorInterest = await this.repayment.investorInterest()

            await this.repayment.reclaimContributionWithInterest(investor).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2).should.be.fulfilled

            let reclaimStatus = await this.repayment.getUserContributionReclaimStatus(investor)
            reclaimStatus.should.be.equal(true)
            reclaimStatus = await this.repayment.getUserContributionReclaimStatus(investor2)
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
            await increaseTimeTo(this.fundingEndTime)
            await this.mockStorage.setBool(utils.soliditySha3("user", "representative", investor3), true)
            await this.repayment.setBorrower(investor3, {from: arbiter}).should.be.fulfilled
            let borrower = await this.repayment.borrower()
            borrower.should.be.equal(investor3)
        })

        it('Should not allow to change borrower with unregistered arbiter', async function() {
            await increaseTimeTo(this.fundingEndTime)
            await this.repayment.setBorrower(investor3, {from: owner}).should.be.rejectedWith(EVMRevert)
        })

    })

    describe('Change investor', async function() {

        it('Should allow to change investor with registered arbiter', async function() {
            await increaseTimeTo(this.fundingEndTime)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.repayment.setInvestorState(investor, ether(1)).should.be.fulfilled
            await this.repayment.changeInvestorAddress(investor, investor2, {from: arbiter}).should.be.fulfilled

            var contributionAmount = await this.repayment.checkInvestorContribution(investor2)
            contributionAmount.should.be.bignumber.equal(ether(1))
            contributionAmount = await this.repayment.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(new BN(0))
        })

        it('Should not allow to change investor to unregistered investor', async function() {
            await increaseTimeTo(this.fundingEndTime)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), false)
            await this.repayment.setInvestorState(investor, ether(1)).should.be.fulfilled
            await this.repayment.changeInvestorAddress(investor, investor2, {from: arbiter}).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow to change new investor who have already invested', async function() {
            await increaseTimeTo(this.fundingEndTime)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.repayment.setInvestorState(investor, ether(1)).should.be.fulfilled
            await this.repayment.setInvestorState(investor2, ether(1)).should.be.fulfilled
            await this.repayment.changeInvestorAddress(investor, investor2, {from: arbiter}).should.be.rejectedWith(EVMRevert)
       })


        it('Should not allow to change borrower with unregistered arbiter', async function() {
            await increaseTimeTo(this.fundingEndTime)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.repayment.changeInvestorAddress(investor, investor2, {from: owner}).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('set investor state', async function() {
        it('Set investors one to one without excess', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investorInitialBalance = await web3.eth.getBalance(investor)
            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            // const localNodeInitialBalance = await web3.eth.getBalance(localNode)
            const teamInitialBalance = await web3.eth.getBalance(ShariaHubTeam)
            const contractInitialBalance = await web3.eth.getBalance(this.repayment.address)
            contractInitialBalance.should.be.bignumber.equal(new BN(0))


            const investment = this.totalLendingAmount.div(new BN(2))
            const investment2 = this.totalLendingAmount.div(new BN(4))
            const investment3 = this.totalLendingAmount.div(new BN(8))
            const investment4 = this.totalLendingAmount.div(new BN(8))

            await this.repayment.setInvestorState(investor, investment).should.be.fulfilled
            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled

            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount();
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            await this.repayment.reclaimContributionWithInterest(investor).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor3).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor4).should.be.fulfilled

            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const investorInterest = await this.repayment.investorInterest()

            const investorFinalBalance = await web3.eth.getBalance(investor)
            const expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, this.totalLendingAmount.div(new BN(2)), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, this.totalLendingAmount.div(new BN(4)), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)


            // const localNodeFinalBalance = await web3.eth.getBalance(localNode)
            // const expectedLocalNodeBalance = new BN(localNodeInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            // checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ShariahubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)

            const contractFinalBalance = await web3.eth.getBalance(this.repayment.address)
            contractFinalBalance.should.be.bignumber.equal(new BN(0))
        })

        it('Set investors one to one with excess', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investorInitialBalance = await web3.eth.getBalance(investor)
            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            // const localNodeInitialBalance = await web3.eth.getBalance(localNode)
            const teamInitialBalance = await web3.eth.getBalance(ShariaHubTeam)
            const contractInitialBalance = await web3.eth.getBalance(this.repayment.address)
            contractInitialBalance.should.be.bignumber.equal(new BN(0))


            const investment = this.totalLendingAmount.div(new BN(2))
            const investment2 = this.totalLendingAmount.div(new BN(4))
            const investment3 = this.totalLendingAmount.div(new BN(8))
            // excess amount set state
            const investment4 = this.totalLendingAmount

            await this.repayment.setInvestorState(investor, investment).should.be.fulfilled
            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)

            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount();
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            await this.repayment.reclaimContributionWithInterest(investor).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor3).should.be.fulfilled

            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const investorInterest = await this.repayment.investorInterest()

            const investorFinalBalance = await web3.eth.getBalance(investor)
            const expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, this.totalLendingAmount.div(new BN(2)), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, this.totalLendingAmount.div(new BN(4)), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            // const localNodeFinalBalance = await web3.eth.getBalance(localNode)
            // const expectedLocalNodeBalance = new BN(localNodeInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            // checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ShariahubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)
        })

        it('Set investors one to one with excess and change this excess', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investorInitialBalance = await web3.eth.getBalance(investor)
            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            // const localNodeInitialBalance = await web3.eth.getBalance(localNode)
            const teamInitialBalance = await web3.eth.getBalance(ShariaHubTeam)
            const contractInitialBalance = await web3.eth.getBalance(this.repayment.address)
            contractInitialBalance.should.be.bignumber.equal(new BN(0))


            const investment = this.totalLendingAmount.div(new BN(2))
            const investment2 = this.totalLendingAmount.div(new BN(4))
            const investment3 = this.totalLendingAmount.div(new BN(6))
            const investment4 = this.totalLendingAmount.div(new BN(8))

            await this.repayment.setInvestorState(investor, investment).should.be.fulfilled
            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.rejectedWith(EVMRevert)
            await this.repayment.changeInvestorState(investor3, this.totalLendingAmount.div(new BN(8))).should.be.fulfilled
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled


            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount();
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            await this.repayment.reclaimContributionWithInterest(investor).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor3).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor4).should.be.fulfilled

            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const investorInterest = await this.repayment.investorInterest()

            const investorFinalBalance = await web3.eth.getBalance(investor)
            const expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, this.totalLendingAmount.div(new BN(2)), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, this.totalLendingAmount.div(new BN(4)), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)

            // const localNodeFinalBalance = await web3.eth.getBalance(localNode)
            // const expectedLocalNodeBalance = new BN(localNodeInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            // checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ShariahubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)

            const contractFinalBalance = await web3.eth.getBalance(this.repayment.address)
            contractFinalBalance.should.be.bignumber.equal(new BN(0))
        })

        it('Set investors one to one with excess and should not change the investment if not set yet', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investorInitialBalance = await web3.eth.getBalance(investor)
            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            // const localNodeInitialBalance = await web3.eth.getBalance(localNode)
            const teamInitialBalance = await web3.eth.getBalance(ShariaHubTeam)
            const contractInitialBalance = await web3.eth.getBalance(this.repayment.address)
            contractInitialBalance.should.be.bignumber.equal(new BN(0))


            const investment = this.totalLendingAmount.div(new BN(2))
            const investment2 = this.totalLendingAmount.div(new BN(4))
            // excess amount set state
            const investment3 = this.totalLendingAmount
            const investment4 = this.totalLendingAmount.div(new BN(8))

            await this.repayment.setInvestorState(investor, investment).should.be.fulfilled
            await this.repayment.setInvestorState(investor2, investment2).should.be.fulfilled
            await this.repayment.setInvestorState(investor3, investment3).should.be.rejectedWith(EVMRevert)
            await this.repayment.setInvestorState(investor4, investment4).should.be.fulfilled
            await this.repayment.changeInvestorState(investor3, this.totalLendingAmount.div(new BN(8))).should.be.rejectedWith(EVMRevert)
            await this.repayment.setInvestorState(investor3, this.totalLendingAmount.div(new BN(8))).should.be.fulfilled


            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount();
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            await this.repayment.reclaimContributionWithInterest(investor).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor3).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor4).should.be.fulfilled

            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const investorInterest = await this.repayment.investorInterest()

            const investorFinalBalance = await web3.eth.getBalance(investor)
            const expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, this.totalLendingAmount.div(new BN(2)), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, this.totalLendingAmount.div(new BN(4)), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)

            // const localNodeFinalBalance = await web3.eth.getBalance(localNode)
            // const expectedLocalNodeBalance = new BN(localNodeInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            // checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ShariahubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)

            const contractFinalBalance = await web3.eth.getBalance(this.repayment.address)
            contractFinalBalance.should.be.bignumber.equal(new BN(0))
        })

        it('Set investors in array', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investorInitialBalance = await web3.eth.getBalance(investor)
            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            // const localNodeInitialBalance = await web3.eth.getBalance(localNode)
            const teamInitialBalance = await web3.eth.getBalance(ShariaHubTeam)
            const contractInitialBalance = await web3.eth.getBalance(this.repayment.address)
            contractInitialBalance.should.be.bignumber.equal(new BN(0))

            const investment = this.totalLendingAmount.div(new BN(2))
            const investment2 = this.totalLendingAmount.div(new BN(4))
            const investment3 = this.totalLendingAmount.div(new BN(8))
            const investment4 = this.totalLendingAmount.div(new BN(8))

            const addresses = [investor, investor2, investor3, investor4]
            const amounts = [investment, investment2, investment3, investment4]

            await this.repayment.setInvestorsStates(addresses, amounts).should.be.fulfilled

            increaseTimePastEndingTime(this.repayment, this.lendingDays.toNumber())
            await this.repayment.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {from: owner}).should.be.fulfilled
            const borrowerReturnAmount = await this.repayment.borrowerReturnAmount();
            await this.repayment.returnBorrowed({value: borrowerReturnAmount, from: borrower}).should.be.fulfilled

            await this.repayment.reclaimContributionWithInterest(investor).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor2).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor3).should.be.fulfilled
            await this.repayment.reclaimContributionWithInterest(investor4).should.be.fulfilled

            // await this.repayment.reclaimLocalNodeFee().should.be.fulfilled
            await this.repayment.reclaimShariaHubTeamFee().should.be.fulfilled

            const investorInterest = await this.repayment.investorInterest()

            const investorFinalBalance = await web3.eth.getBalance(investor)
            const expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, this.totalLendingAmount.div(new BN(2)), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            const investor2FinalBalance = await web3.eth.getBalance(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, this.totalLendingAmount.div(new BN(4)), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await web3.eth.getBalance(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await web3.eth.getBalance(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, this.totalLendingAmount.div(new BN(8)), investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)


            // const localNodeFinalBalance = await web3.eth.getBalance(localNode)
            // const expectedLocalNodeBalance = new BN(localNodeInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            // checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await web3.eth.getBalance(ShariaHubTeam)
            const expectedShariaHubTeamBalance = new BN(teamInitialBalance).add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ShariahubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedShariaHubTeamBalance, teamFinalBalance)

            const contractFinalBalance = await web3.eth.getBalance(this.repayment.address)
            contractFinalBalance.should.be.bignumber.equal(new BN(0))
        })

        it('Set investors and amounts with distinct arrays length', async function() {
            await increaseTimeTo(this.fundingEndTime)

            const investorInitialBalance = await web3.eth.getBalance(investor)
            const investor2InitialBalance = await web3.eth.getBalance(investor2)
            const investor3InitialBalance = await web3.eth.getBalance(investor3)
            const investor4InitialBalance = await web3.eth.getBalance(investor4)
            // const localNodeInitialBalance = await web3.eth.getBalance(localNode)
            const teamInitialBalance = await web3.eth.getBalance(ShariaHubTeam)
            const contractInitialBalance = await web3.eth.getBalance(this.repayment.address)
            contractInitialBalance.should.be.bignumber.equal(new BN(0))

            const investment = this.totalLendingAmount.div(new BN(2))
            const investment2 = this.totalLendingAmount.div(new BN(4))
            const investment3 = this.totalLendingAmount.div(new BN(8))
            const investment4 = this.totalLendingAmount.div(new BN(8))

            const addresses = [investor, investor2, investor3]
            const amounts = [investment, investment2, investment3, investment4]

            await this.repayment.setInvestorsStates(addresses, amounts).should.be.rejectedWith(EVMRevert)

        })

    })

    async function increaseTimePastEndingTime(lendingContract, increaseDays) {
        const fundingEnd = await lendingContract.fundingEndTime()
        const returnDate = fundingEnd.add(new BN(duration.days(increaseDays)))
        increaseTimeTo(returnDate)
    }


    function getExpectedInvestorBalance(initialAmount, contribution, interest, testEnv) {
        const contributionBN = new BN(contribution)
        const received = contributionBN.mul(new BN(testEnv.initialStableCoinPerFiatRate))
            .mul(interest)
            .div(testEnv.finalStableCoinPerFiatRate).div(new BN(10000))
        const initialAmountBN = new BN(initialAmount)
        return initialAmountBN.add(received)
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