/*
    Test integration of the platform contracts.

    Copyright (C) 2018 ShariaHub

    This file is part of platform contracts.

    This is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/*
'use strict';

import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';

const {
    BN,
    time
} = require('@openzeppelin/test-helpers')
const chai = require('chai')
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const utils = require("web3-utils");
const fs = require('fs');

const ShariaHubStorage = artifacts.require('./storage/ShariaHubStorage.sol');
const ShariaHubCMC = artifacts.require('./ShariaHubCMC.sol');
const ShariaHubLending = artifacts.require('./lending/ShariaHubLending.sol');
const ShariaHubDepositManager = artifacts.require('./deposit/ShariaHubDepositManager.sol');
const ShariaHubUser = artifacts.require('./user/ShariaHubUser.sol');
const MockStableCoin = artifacts.require('MockStableCoin')

let storage = null
let lending = null
let cmc = null
let depositManager = null
let stableCoin = null
let userManager = null

const ProjectNotFunded = 4;

let owner = null
let localNode1 = null
let localNode2 = null
let borrower = null
let ShariaHubTeam = null
let investor1 = null
let investor2 = null
let investor3 = null
let community = null
let arbiter = null
let paymentGateway = null

const CHAIN_ID = "666"

async function configureAccounts() {
    const accounts = await web3.eth.getAccounts();

    owner = accounts[0];
    localNode1 = accounts[1];
    localNode2 = accounts[2];
    borrower = accounts[3];
    ShariaHubTeam = accounts[4];
    investor1 = accounts[5];
    investor2 = accounts[6];
    investor3 = accounts[7];
    community = accounts[8];
    arbiter = accounts[9];
    paymentGateway = accounts[10];
}

async function configureContracts() {
    await configureAccounts()

    storage = await ShariaHubStorage.deployed()
    cmc = await ShariaHubCMC.deployed()
    userManager = await ShariaHubUser.deployed()
    stableCoin = await MockStableCoin.new(CHAIN_ID)

    depositManager = await ShariaHubDepositManager.new()
    await depositManager.initialize(storage.address, stableCoin.address)

    await stableCoin.transfer(owner, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(localNode1, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(localNode2, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(borrower, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(investor1, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(investor2, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(investor3, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(ShariaHubTeam, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(community, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(arbiter, ether(100000)).should.be.fulfilled;
    await stableCoin.transfer(paymentGateway, ether(100000)).should.be.fulfilled;

    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: owner
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: localNode1
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: localNode2
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: borrower
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: investor1
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: investor2
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: investor3
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: ShariaHubTeam
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: community
    }).should.be.fulfilled;
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: arbiter
    }).should.be.fulfilled
    await stableCoin.approve(depositManager.address, ether(1000000000), {
        from: paymentGateway
    }).should.be.fulfilled
}

contract('ShariaHubIntegration:', function() {
    before(async () => {
        await configureContracts();
    });

    it('should pass if contract are on storage contract', async function() {
        let userManagerContractAddress = await storage.getAddress(utils.soliditySha3("contract.name", "users"));
        userManagerContractAddress.should.be.equal(userManager.address);
    });

    it('should register local node', async function() {
        await userManager.registerLocalNode(localNode1, {
            from: owner
        });
        let registrationStatus = await userManager.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(true);
    });

    it('should register community', async function() {
        await userManager.registerCommunity(community, {
            from: owner
        });
        let registrationStatus = await userManager.viewRegistrationStatus(community, 'community');
        registrationStatus.should.be.equal(true);
    });

    it('should register investor', async function() {
        await userManager.registerInvestor(investor1, {
            from: owner
        });
        let registrationStatus = await userManager.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });

    it('should register representative', async function() {
        await userManager.registerRepresentative(borrower, {
            from: owner
        });
        let registrationStatus = await userManager.viewRegistrationStatus(borrower, 'representative');
        registrationStatus.should.be.equal(true);
    });

    it('should register paymentGateway', async function() {
        await userManager.registerPaymentGateway(paymentGateway, {
            from: owner
        });
        let registrationStatus = await userManager.viewRegistrationStatus(paymentGateway, 'paymentGateway');
        registrationStatus.should.be.equal(true);
    });

    it('change user status', async function() {
        await userManager.unregisterInvestor(investor1, {
            from: owner
        });
        let registrationStatus = await userManager.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(false);
        await userManager.registerInvestor(investor1, {
            from: owner
        });
        registrationStatus = await userManager.viewRegistrationStatus(investor1, 'localNode');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManager.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });
});

contract('Integration: ShariaHubLending (Lending owner != LocalNode)', function() {
    before(async () => {
        await time.advanceBlock();
        await configureContracts();

        // register first LocalNode necessary on lending contract
        await userManager.registerLocalNode(localNode1, {
            from: owner
        });
        await userManager.registerRepresentative(borrower, {
            from: owner
        });

        const latestTimeValue = await time.latest()

        lending = await ShariaHubLending.new(
            latestTimeValue.add(time.duration.days(1)), // Funding start time
            latestTimeValue.add(time.duration.days(35)), // Funding end time
            10, // Annual interest
            ether(1), // Total lending amount
            2, // Lending days
            3, // Shariahub fee
            4, // LocalNode fee
            borrower, // Borrower
            localNode1, // Local node
            ShariaHubTeam, // Shariahub team
            depositManager.address, // Deposit manager
            storage.address, // Storage
            stableCoin.address, // Stable coin
        )
        await userManager.registerCommunity(community, {
            from: owner
        });
        //Gives set permissions on storage
        await cmc.addNewLendingContract(lending.address, {
            from: owner
        });

        //Lending saves parameters in storage, checks if owner is localNode
        await lending.saveInitialParametersToStorage(
            2, // MaxDefaultDays
            20, // Community members
            community // Community rep wallet
        )
        owner = await lending.owner();
    });

    it('should pass if contract are on storage contract', async function() {
        let lendingContractAddress = await storage.getAddress(utils.soliditySha3("contract.address", lending.address));
        lendingContractAddress.should.be.equal(lending.address);
    });

    describe('The investment flow', function() {
        it('investment reaches goal', async function() {
            const latestTimeValue = await time.latest()
            await time.increaseTo(latestTimeValue.add(time.duration.days(1)));

            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(0.995);
            const investment2 = ether(0.05);
            const investment3 = ether(1.5);

            const totalLendingAmount = await lending.totalLendingAmount();

            // Register all actors
            let transaction = await userManager.registerInvestor(investor1, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManager.registerInvestor(investor2, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor2)', transaction.tx);
            transaction = await userManager.registerInvestor(investor3, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor3)', transaction.tx);

            // Is contribution period
            var isRunning = await lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Contribute
            transaction = await depositManager.contribute(
                lending.address,
                investor1,
                investment1
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'depositManager.contribute', transaction.tx);

            const contribution1 = await lending.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await depositManager.contribute(
                lending.address,
                investor2,
                investment2
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'depositManager.contribute', transaction.tx);

            const contribution2 = await lending.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(totalLendingAmount.sub(investment1));

            // Goal is reached, no accepts more invesments
            transaction = await depositManager.contribute(
                lending.address,
                investor3,
                investment3
            ).should.be.rejectedWith(EVMRevert);

            // Send funds to borrower
            transaction = await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            reportMethodGasUsed('report', 'owner', 'lending.sendFundsToBorrower', transaction.tx);
            transaction = await lending.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lending.setborrowerReturnStableCoinPerFiatRate(finalEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.setborrowerReturnStableCoinPerFiatRate', transaction.tx);

            // Show amounts to return
            const borrowerReturnAmount = await lending.borrowerReturnAmount();
            transaction = await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount
            );
            reportMethodGasUsed('report', 'borrower', 'lending.returnBorrowedEth', transaction.tx);

            // Reclaims amounts
            transaction = await lending.reclaimContributionWithInterest(investor1, {
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lending.reclaimContributionWithInterest', transaction.tx);
            transaction = await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lending.reclaimContributionWithInterest', transaction.tx);
            transaction = await lending.reclaimLocalNodeFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.reclaimLocalNodeFee', transaction.tx);
            transaction = await lending.reclaimShariaHubTeamFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.reclaimShariaHubTeamFee', transaction.tx);
        });
    });
});

contract('Integration: ShariaHubLending (Lending owner == LocalNode)', function() {
    before(async () => {
        await time.advanceBlock();
        await configureContracts();

        // register first LocalNode necessary on lending contract
        await userManager.registerLocalNode(localNode2, {
            from: owner
        });
        await userManager.registerRepresentative(borrower, {
            from: owner
        });

        const latestTimeValue = await time.latest()

        lending = await ShariaHubLending.new(
            latestTimeValue.add(time.duration.days(1)), // Funding start time
            latestTimeValue.add(time.duration.days(35)), // Funding end time
            10, // Annual interest
            ether(1), // Total lending amount
            2, // Lending days
            3, // Shariahub fee
            4, // LocalNode fee
            borrower, // Borrower
            localNode2, // Localnode
            ShariaHubTeam, // Shariahub team
            depositManager.address, // Deposit manager
            storage.address, // Storage
            stableCoin.address // Stable coin
        )
        await userManager.registerCommunity(community, {
            from: owner
        });

        //Gives set permissions on storage
        await cmc.addNewLendingContract(lending.address, {
            from: localNode2
        });

        //Lending saves parameters in storage, checks if owner is localNode
        await lending.saveInitialParametersToStorage(
            2, // MaxDefaultDays
            20, // Community members
            community, // Community rep wallet
            {
                from: localNode2
            }
        )
        owner = await lending.owner();
    });

    it('should pass if contract are on storage contract', async function() {
        let lendingContractAddress = await storage.getAddress(utils.soliditySha3("contract.address", lending.address));
        lendingContractAddress.should.be.equal(lending.address);
    });

    describe('The investment flow', function() {
        it('investment reaches goal', async function() {
            const latestTimeValue = await time.latest()
            await time.increaseTo(latestTimeValue.add(time.duration.days(1)));

            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(0.5);
            const investment2 = ether(0.5);
            const investment3 = ether(1.5);

            // Register all actors
            let transaction = await userManager.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManager.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor2)', transaction.tx);
            transaction = await userManager.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor3)', transaction.tx);

            // Is contribution period
            var isRunning = await lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            //Send transaction
            transaction = await depositManager.contribute(
                lending.address,
                investor1,
                investment1
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'depositManager.contribute', transaction.tx);

            const contribution1 = await lending.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await depositManager.contribute(
                lending.address,
                investor2,
                investment2
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'depositManager.contribute', transaction.tx);

            const contribution2 = await lending.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);

            // Goal is reached, no accepts more invesments
            transaction = await depositManager.contribute(
                lending.address,
                investor3,
                investment3
            ).should.be.rejectedWith(EVMRevert);

            // Send funds to borrower
            transaction = await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.sendFundsToBorrower', transaction.tx);
            transaction = await lending.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lending.setborrowerReturnStableCoinPerFiatRate(finalEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.setborrowerReturnStableCoinPerFiatRate', transaction.tx);

            // Show amounts to return
            const borrowerReturnAmount = await lending.borrowerReturnAmount();
            transaction = await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'borrower', 'lending.returnBorrowedEth', transaction.tx);

            // Reclaims amounts
            transaction = await lending.reclaimContributionWithInterest(investor1, {
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lending.reclaimContributionWithInterest', transaction.tx);
            transaction = await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lending.reclaimContributionWithInterest', transaction.tx);
            transaction = await lending.reclaimLocalNodeFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.reclaimLocalNodeFee', transaction.tx);
            transaction = await lending.reclaimShariaHubTeamFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.reclaimShariaHubTeamFee', transaction.tx);
        });
    });
});

contract('Integration: ShariaHubLending (LocalNode not exists)', function() {
    describe('Local Node != Local Node of lending contract', function() {
        it('should not deploy contract', async function() {
            await time.advanceBlock();
            await configureContracts();

            // register first LocalNode necessary on lending contract
            await userManager.registerLocalNode(localNode1, {
                from: owner
            });
            await userManager.registerRepresentative(borrower, {
                from: owner
            });

            const latestTimeValue = await time.latest()

            lending = await ShariaHubLending.new(
                latestTimeValue.add(time.duration.days(1)), // Funding start time
                latestTimeValue.add(time.duration.days(35)), // Funding end time
                10, // Annual interest
                ether(1), // Total lending amount
                2, // Lending days
                3, // Shariahub fee
                4, // LocalNode fee
                borrower, // Borrower
                localNode1, // Localnode
                ShariaHubTeam, // Shariahub team
                depositManager.address, // Deposit manager
                storage.address, // Storage
                stableCoin.address // Stable coin
            )

            await userManager.registerCommunity(community, {
                from: owner
            });

            //Gives set permissions on storage
            await cmc.addNewLendingContract(lending.address, {
                from: localNode2
            }).should.be.rejectedWith(EVMRevert)

            //Lending saves parameters in storage, checks if owner is localNode
            await lending.saveInitialParametersToStorage(
                2, // MaxDefaultDays
                20, // Community members
                community, // Community rep wallet
                {
                    from: localNode2
                }
            ).should.be.rejectedWith(EVMRevert);

            owner = await lending.owner();
        });
    });
});

contract('Integration: ShariaHubLending not funded', function() {
    before(async () => {
        await configureContracts();
        // register first LocalNode necessary on lending contract
        await userManager.registerLocalNode(localNode1, {
            from: owner
        });
        await userManager.registerRepresentative(borrower, {
            from: owner
        });

        const latestTimeValue = await time.latest();

        lending = await ShariaHubLending.new(
            latestTimeValue.add(time.duration.days(1)), // Funding start time
            latestTimeValue.add(time.duration.days(35)), // Funding end time
            10, // Annual interest
            ether(10), // Total lending amount
            2, // Lending days
            3, // Shariahub fee
            4, // LocalNode fee
            borrower, // Borrower
            localNode1, // Localnode
            ShariaHubTeam, // Shariahub team
            depositManager.address, // Deposit manager
            storage.address, // Storage
            stableCoin.address // Stable coin
        )

        await userManager.registerCommunity(community, {
            from: owner
        });
        await userManager.registerRepresentative(borrower, {
            from: owner
        });

        //Gives set permissions on storage
        await cmc.addNewLendingContract(lending.address, {
            from: owner
        });

        //Lending saves parameters in storage, checks if owner is localNode
        await lending.saveInitialParametersToStorage(
            2, // MaxDefaultDays
            20, // Community members
            community // Community rep wallet
        )
        owner = await lending.owner();
    });

    it('should pass if contract are on storage contract', async function() {
        let lendingContractAddress = await storage.getAddress(utils.soliditySha3("contract.address", lending.address));
        lendingContractAddress.should.be.equal(lending.address);
    });

    describe('The investment flow', function() {
        it('investment not funded', async function() {
            const latestTimeValue = await time.latest()
            await time.increaseTo(latestTimeValue.add(time.duration.days(1)));

            // Some initial parameters
            const investment1 = ether(2);
            const investment2 = ether(2);

            // Register all actors
            let transaction = await userManager.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManager.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor2)', transaction.tx);
            transaction = await userManager.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor3)', transaction.tx);

            // Is contribution period
            var isRunning = await lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Send transaction
            transaction = await depositManager.contribute(
                lending.address,
                investor1,
                investment1
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'depositManager.contribute', transaction.tx);

            const contribution1 = await lending.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);

            transaction = await depositManager.contribute(
                lending.address,
                investor2,
                investment2
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'depositManager.contribute', transaction.tx);

            const contribution2 = await lending.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);

            const endTime = await lending.fundingEndTime()
            await time.increaseTo(endTime.add(time.duration.days(1)));

            // Send funds to borrower
            transaction = await lending.sendFundsToBorrower({
                from: owner
            }).should.be.rejectedWith(EVMRevert);

            // project not funded
            await lending.declareProjectNotFunded({
                from: owner
            })
            let state = await lending.state();
            state.toNumber().should.be.equal(ProjectNotFunded);

            let balance = await stableCoin.balanceOf(lending.address)
            balance.should.be.bignumber.equal(ether(4));
            // can reclaim contribution from everyone
            balance = await stableCoin.balanceOf(lending.address)
            await lending.reclaimContribution(investor1).should.be.fulfilled;
            (await stableCoin.balanceOf(investor1)).should.be.bignumber.above(balance.add(new BN(1)));
            // fail to reclaim from no investor
            await lending.reclaimContribution(investor3).should.be.rejectedWith(EVMRevert);
        });
    });
});

contract('Integration: ShariaHubLending not returned on time', async function() {
    const lendingStartTime = (await time.latest()).add(time.duration.days(1));

    before(async () => {
        await time.advanceBlock();
        await configureContracts();

        // register first LocalNode necessary on lending contract
        await userManager.registerLocalNode(localNode1, {
            from: owner
        });
        await userManager.registerRepresentative(borrower, {
            from: owner
        });

        lending = await ShariaHubLending.new(
            lendingStartTime, // Funding start time
            latestTimeValue.add(time.duration.days(35)), // Funding end time
            10, // Annual interest
            ether(4), // Total lending amount
            2, // Lending days
            3, // Shariahub fee
            4, // LocalNode fee
            borrower, // Borrower
            localNode1, // Localnode
            ShariaHubTeam, // Shariahub team
            depositManager.address, // Deposit manager
            storage.address, // Storage
            stableCoin.address // Stable coin
        )
        await userManager.registerCommunity(community, {
            from: owner
        });

        //Gives set permissions on storage
        await cmc.addNewLendingContract(lending.address, {
            from: owner
        });

        //Lending saves parameters in storage, checks if owner is localNode
        await lending.saveInitialParametersToStorage(
            2, // MaxDefaultDays
            20, // Community members
            community // Community rep wallet
        )
        owner = await lending.owner();
    });

    it('should pass if contract are on storage contract', async function() {
        let lendingContractAddress = await storage.getAddress(utils.soliditySha3("contract.address", lending.address));
        lendingContractAddress.should.be.equal(lending.address);
    });

    describe('The investment flow', function() {
        it('investment not returned on time', async function() {
            await time.advanceBlock();
            await configureContracts();

            const latestTimeValue = await time.latest();
            await time.increaseTo(latestTimeValue.add(time.duration.days(1)));

            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(2);
            const investment2 = ether(2);
            const investment3 = ether(1.5);

            // Register all actors
            let transaction = await userManager.registerInvestor(investor1, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManager.registerInvestor(investor2, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor2)', transaction.tx);
            transaction = await userManager.registerInvestor(investor3, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor3)', transaction.tx);

            await time.increaseTo(lendingStartTime.add(time.duration.minutes(100)));
            await time.advanceBlock();

            // Is contribution period
            var isRunning = await lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part

            // Contribute
            transaction = await depositManager.contribute(
                lending.address,
                investor1,
                investment1
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'depositManager.contribute', transaction.tx);

            const contribution1 = await lending.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);

            transaction = await depositManager.contribute(
                lending.address,
                investor2,
                investment2
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'depositManager.contribute', transaction.tx);

            const contribution2 = await lending.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);

            transaction = await depositManager.contribute(
                lending.address,
                investor1,
                investment1
            ).should.be.fulfilled;

            // Goal is reached, no accepts more invesments
            transaction = await depositManager.contribute(
                lending.address,
                investor3,
                investment3
            ).should.be.rejectedWith(EVMRevert);

            const fundingEndTime = await lending.fundingEndTime()
            await time.increaseTo(fundingEndTime.add(new BN(time.duration.minutes(1))));
            await time.advanceBlock();

            // Send funds to borrower
            transaction = await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.sendFundsToBorrower', transaction.tx);
            transaction = await lending.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lending.setborrowerReturnStableCoinPerFiatRate(finalEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.setborrowerReturnStableCoinPerFiatRate', transaction.tx);

            // Delay to 1 of 2 default days
            var defaultTime = fundingEndTime.add(new BN(time.duration.days(3)));
            await time.increaseTo(defaultTime);
            await time.advanceBlock();

            const borrowerReturnAmount = await lending.borrowerReturnAmount();
            transaction = await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'borrower', 'depositManager.contribute', transaction.tx);

            await lending.declareProjectDefault({
                from: owner
            }).should.be.rejectedWith(EVMRevert);

            var lendingDelayDays = await storage.getUint(utils.soliditySha3("lending.delayDays", lending.address));
            lendingDelayDays.toNumber().should.be.equal(1);
        });
    });
});

contract('Integration: ShariaHubLending declare default', async function() {

    before(async () => {
        await time.advanceBlock();
        await configureContracts();

        // register first LocalNode necessary on lending contract
        await userManager.registerLocalNode(localNode1, {
            from: owner
        });
        await userManager.registerRepresentative(borrower, {
            from: owner
        });

        const latestTimeValue = await time.latest()

        lending = await ShariaHubLending.new(
            latestTimeValue.add(time.duration.days(1)), // Funding start time
            latestTimeValue.add(time.duration.days(35)), // Funding end time
            10, // Annual interest
            ether(4), // Total lending amount
            2, // Lending days
            3, // Shariahub fee
            4, // LocalNode fee
            borrower, // Borrower
            localNode1, // Localnode
            ShariaHubTeam, // Shariahub team
            depositManager.address, // Deposit manager
            storage.address, // Storage
            stableCoin.address // Stable coin
        )

        await userManager.registerCommunity(community, {
            from: owner
        });

        // Gives set permissions on storage
        await cmc.addNewLendingContract(lending.address, {
            from: owner
        });

        // Lending saves parameters in storage, checks if owner is localNode
        await lending.saveInitialParametersToStorage(
            2, // MaxDefaultDays
            20, // Community members
            community // Community rep wallet
        )

        owner = await lending.owner();
    });

    it('should pass if contract are on storage contract', async function() {
        let lendingContractAddress = await storage.getAddress(utils.soliditySha3("contract.address", lending.address));
        lendingContractAddress.should.be.equal(lending.address);
    });

    describe('The investment flow', function() {
        it('declared project default', async function() {
            const latestTimeValue = await time.latest()

            await time.increaseTo(latestTimeValue.add(time.duration.days(1)));
            await time.advanceBlock();

            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(2);
            const investment2 = ether(2);
            const investment3 = ether(1.5);

            // Register all actors
            let transaction = await userManager.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManager.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor2)', transaction.tx);
            transaction = await userManager.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor3)', transaction.tx);

            await time.increaseTo(latestTimeValue.add(time.duration.days(1)).add(time.duration.minutes(100)));
            await time.advanceBlock();

            // Is contribution period
            var isRunning = await lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part

            // Send transaction
            transaction = await depositManager.contribute(
                lending.address,
                investor1,
                investment1
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'depositManager.contribute', transaction.tx);
            const contribution1 = await lending.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);

            transaction = await depositManager.contribute(
                lending.address,
                investor2,
                investment2
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'depositManager.contribute', transaction.tx);
            const contribution2 = await lending.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);

            // Goal is reached, no accepts more invesments
            transaction = await depositManager.contribute(
                lending.address,
                investor3,
                investment3
            ).should.be.rejectedWith(EVMRevert);

            const fundingEndTime = await lending.fundingEndTime()
            await time.increaseTo(fundingEndTime.add(new BN(time.duration.minutes(1))));

            // Send funds to borrower
            transaction = await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.sendFundsToBorrower', transaction.tx);
            transaction = await lending.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lending.setborrowerReturnStableCoinPerFiatRate(finalEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.setborrowerReturnStableCoinPerFiatRate', transaction.tx);

            // This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = fundingEndTime.add(new BN(time.duration.days(4))).add(new BN(time.duration.days(1)));
            await time.increaseTo(defaultTime);

            await lending.declareProjectDefault({
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount();
            transaction = await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount
            ).should.be.rejectedWith(EVMRevert);

            var lendingDelayDays = await storage.getUint(utils.soliditySha3("lending.delayDays", lending.address));
            lendingDelayDays.toNumber().should.be.equal(2);
        });
    });
});

contract('Integration: ShariaHubLending do a payment with paymentGateway', function() {
    before(async () => {
        await time.advanceBlock();
        await configureContracts();

        // register first LocalNode necessary on lending contract
        await userManager.registerLocalNode(localNode1, {
            from: owner
        });
        await userManager.registerRepresentative(borrower, {
            from: owner
        });

        const latestTimeValue = await time.latest();

        lending = await ShariaHubLending.new(
            latestTimeValue.add(time.duration.days(1)), // Funding start time
            latestTimeValue.add(time.duration.days(35)), // Funding end time
            10, // Annual interest
            ether(1), // Total lending amount
            2, // Lending days
            3, // Shariahub fee
            4, // LocalNode fee
            borrower, // Borrower
            localNode1, // Localnode
            ShariaHubTeam, // Shariahub team
            depositManager.address, // Deposit manager
            storage.address, // Storage
            stableCoin.address // Stable coin
        )
        await userManager.registerCommunity(community, {
            from: owner
        });
        // Gives set permissions on storage
        await cmc.addNewLendingContract(lending.address, {
            from: owner
        });

        // Lending saves parameters in storage, checks if owner is localNode
        await lending.saveInitialParametersToStorage(
            2, // MaxDefaultDays
            20, // Community members
            community // Community rep wallet
        )
        owner = await lending.owner();
    });

    it('should pass if contract are on storage contract', async function() {
        let lendingContractAddress = await storage.getAddress(utils.soliditySha3("contract.address", lending.address));
        lendingContractAddress.should.be.equal(lending.address);
    });

    describe('The investment flow', function() {
        it('investment reaches goal', async function() {
            const latestTimeValue = await time.latest();
            await time.increaseTo(latestTimeValue.add(time.duration.days(1)));

            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(0.5);
            const investment2 = ether(0.5);
            const investment3 = ether(1.5);

            // Register all actors
            let transaction = await userManager.registerPaymentGateway(paymentGateway);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerPaymentGateway(paymentGateway)', transaction.tx, true);
            transaction = await userManager.registerInvestor(investor1, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManager.registerInvestor(investor2, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor2)', transaction.tx);
            transaction = await userManager.registerInvestor(investor3, {
                from: owner
            });
            reportMethodGasUsed('report', 'ownerUserManager', 'userManager.registerInvestor(investor3)', transaction.tx);

            // Show balances

            // Is contribution period
            var isRunning = await lending.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part

            // Send transaction
            transaction = await depositManager.contribute(
                lending.address,
                investor1,
                investment1, {
                    from: paymentGateway
                }
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'depositManager.contributeForAddress', transaction.tx);
            const contribution1 = await lending.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: paymentGateway
                }
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'depositManager.contribute', transaction.tx);
            const contribution2 = await lending.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);
            // Goal is reached, no accepts more invesments
            transaction = await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: paymentGateway
                }).should.be.rejectedWith(EVMRevert);

            // Send funds to borrower
            transaction = await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.sendFundsToBorrower', transaction.tx);
            transaction = await lending.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lending.setborrowerReturnStableCoinPerFiatRate(finalEthPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.setborrowerReturnStableCoinPerFiatRate', transaction.tx);

            // Show amounts to return
            const borrowerReturnAmount = await lending.borrowerReturnAmount();

            transaction = await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;
            reportMethodGasUsed('report', 'borrower', 'lending.returnBorrowedEth', transaction.tx);
            // Reclaims amounts
            transaction = await lending.reclaimContributionWithInterest(investor1, {
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lending.reclaimContributionWithInterest', transaction.tx);
            transaction = await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lending.reclaimContributionWithInterest', transaction.tx);
            transaction = await lending.reclaimLocalNodeFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.reclaimLocalNodeFee', transaction.tx);
            transaction = await lending.reclaimShariaHubTeamFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'owner', 'lending.reclaimShariaHubTeamFee', transaction.tx);
        });
    });
});

function reportMethodGasUsed(filename, role, methodName, txHash, remove = false) {
    if (remove)
        fs.openSync(filename + '.csv', 'w');
    const gasUsed = web3.eth.getTransactionReceipt(txHash).gasUsed;
    fs.appendFileSync(filename + '.csv', role + ',' + methodName + ',' + gasUsed + '\n');
}
*/