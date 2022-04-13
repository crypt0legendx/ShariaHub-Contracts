'use strict';

import EVMRevert from './helpers/EVMRevert'

const {
    BN
} = require('@openzeppelin/test-helpers');
import {
    BN0_05,
    BN1,
} from './constants'

const utils = require("web3-utils");
const chai = require('chai');
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const ShariaHubReputation = artifacts.require('ShariaHubReputation');

const MockStorage = artifacts.require('MockStorage');

contract('ShariaHubReputation --> Deprecated', function([owner, community, lendingContract]) {
    beforeEach(async function() {
        this.maxDelayDays = new BN(100);

        //10 with 2 decimals
        this.maxReputation = new BN(1000);
        this.reputationStep = new BN(100);
        this.initialReputation = this.maxReputation.mul(BN0_05);

        this.minimumPeopleCommunity = new BN(20);
        this.minimumTier = new BN(1);
        this.minimumProject = new BN(1).mul(this.minimumPeopleCommunity);

        //0.05
        // this.incrLocalNodeMultiplier = new BN(5);

        this.mockStorage = await MockStorage.new();
        this.reputation = await ShariaHubReputation.new(this.mockStorage.address);
        await this.reputation.initialize(this.mockStorage.address, 1);
    });

    describe('Community decrement', function() {
        it.skip('should burn 1% per day passed after 100 days max', async function() {
            const initialReputation = this.maxReputation.mul(BN0_05);
            for (var delayDays = 1; delayDays <= 100; delayDays++) {
                const bnDelayDays = new BN(delayDays)
                const newRep = await this.reputation.burnCommunityReputation(bnDelayDays, this.maxDelayDays, initialReputation).should.be.fulfilled;
                var expectedRep = initialReputation.sub(initialReputation.mul(bnDelayDays).div(this.maxDelayDays)).toNumber();
                expectedRep = new BN(Math.floor(expectedRep));
                newRep.should.be.bignumber.equal(expectedRep);
            }

        });
        it.skip('should burn 10% per day passed after 100 days max', async function() {
            const delayDays = new BN(10);
            const initialReputation = this.maxReputation.mul(BN0_05);
            const newRep = await this.reputation.burnCommunityReputation(delayDays, this.maxDelayDays, initialReputation).should.be.fulfilled;
            var expectedRep = initialReputation.sub(initialReputation.mul(delayDays).div(this.maxDelayDays)).toNumber();
            expectedRep = new BN((Math.floor(expectedRep)));
            newRep.should.be.bignumber.equal(expectedRep);
        });
        it.skip('should burn 100% per day passed after 100 days max', async function() {
            const delayDays = this.maxReputation;
            const newRep = await this.reputation.burnCommunityReputation(delayDays, this.maxDelayDays, 100).should.be.fulfilled;
            newRep.should.be.bignumber.equal(new BN(0));
        });
    });

    describe('Community increment', function() {
        it.skip('should add 1/CompletedSameTierProjects', async function() {
            var rep = this.initialReputation;
            for (var succesfulSameTierProjects = 1; succesfulSameTierProjects < 100; succesfulSameTierProjects++) {
                const bnsuccesfulSameTierProjects = new BN(succesfulSameTierProjects);
                const prevRep = rep;
                rep = await this.reputation.incrementCommunityReputation(prevRep, bnsuccesfulSameTierProjects).should.be.fulfilled;
                const increment = new BN(100).div(bnsuccesfulSameTierProjects);
                const expectedRep = new BN(Math.floor(prevRep.add(increment).toNumber()));
                rep.should.be.bignumber.equal(expectedRep);
            }
        });

        it.skip('should not assign more than max reputation', async function() {
            var prevRep = this.maxReputation.sub(new BN(1));
            var newRep = await this.reputation.incrementCommunityReputation(prevRep, 1).should.be.fulfilled;
            newRep.should.be.bignumber.equal(this.maxReputation);
        });

        it.skip('should fail to set reputation with no succesful projects in a tier', async function() {
            await this.reputation.incrementCommunityReputation(500, 0).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('Local node increment', function() {
        it.skip('should increment correct number', async function() {
            var prevRep = this.initialReputation;
            var community = this.minimumPeopleCommunity;
            for (var tier = 1; tier <= 5; tier++) {
                const bnTier = new BN(tier)
                // var newRep = await this.reputation.incrementLocalNodeReputation(prevRep, bnTier, community).should.be.fulfilled;
                var increment = (bnTier.mul(community).div(this.minimumProject)).mul(this.incrLocalNodeMultiplier);
                var expectedRep = prevRep.add(increment);
                newRep.should.be.bignumber.equal(expectedRep);
            }
        });

        it.skip('should increment correct number with more members in the community', async function() {
            var prevRep = this.initialReputation;
            var community = new BN(100);
            var tier = 3;
            // var newRep = await this.reputation.incrementLocalNodeReputation(prevRep, 3, community).should.be.fulfilled;
            // var increment = (new BN(tier).mul(community).div(this.minimumProject)).mul(this.incrLocalNodeMultiplier);
            var expectedRep = prevRep.add(increment);
            newRep.should.be.bignumber.equal(expectedRep);

        });

        it.skip('should not increment over max rep', async function() {
            var prevRep = this.maxReputation.sub(BN1);
            // var newRep = await this.reputation.incrementLocalNodeReputation(prevRep, 1, 40).should.be.fulfilled;
            newRep.should.be.bignumber.equal(this.maxReputation);
        });
    });

    describe('Local node decrement', function() {
        it.skip('should burn same as commnity, max 1 step (100) ', async function() {
            const initialReputation = this.maxReputation.mul(BN0_05);
            var delayDays = new BN(1);
            // var newRep = await this.reputation.burnLocalNodeReputation(delayDays, this.maxDelayDays, initialReputation).should.be.fulfilled;
            var decrement = initialReputation.mul(delayDays).div(this.maxDelayDays);
            var expectedRep = initialReputation.sub(decrement).toNumber();
            expectedRep = new BN(Math.floor(expectedRep));
            newRep.should.be.bignumber.equal(expectedRep);

            delayDays = new BN(10);
            // newRep = await this.reputation.burnLocalNodeReputation(delayDays, this.maxDelayDays, initialReputation).should.be.fulfilled;
            decrement = initialReputation.mul(delayDays).div(this.maxDelayDays);
            expectedRep = initialReputation.sub(decrement).toNumber();
            expectedRep = new BN(Math.floor(expectedRep));
            newRep.should.be.bignumber.equal(expectedRep);

            delayDays = new BN(60);
            // newRep = await this.reputation.burnLocalNodeReputation(delayDays, this.maxDelayDays, initialReputation).should.be.fulfilled;
            decrement = this.reputationStep;
            console.log(initialReputation.sub(decrement).toNumber());
            console.log(this.reputationStep);
            expectedRep = initialReputation.sub(decrement).toNumber();
            expectedRep = new BN(Math.floor(expectedRep));
            newRep.should.be.bignumber.equal(expectedRep);

            delayDays = this.maxDelayDays.add(1);
            // newRep = await this.reputation.burnLocalNodeReputation(delayDays, this.maxDelayDays, initialReputation).should.be.fulfilled;
            expectedRep = new BN(0);
            newRep.should.be.bignumber.equal(expectedRep);
        });

        it.skip('should not burn less than 0', async function() {
            const initialReputation = new BN(0);
            var delayDays = 1;
            // var newRep = await this.reputation.burnLocalNodeReputation(delayDays, this.maxDelayDays, initialReputation).should.be.fulfilled;

            newRep.should.be.bignumber.equal(initialReputation);
        });
    });

    describe('From storage -> burn', function() {
        it.skip('should not decrement another that is not lending contract', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            const delayDays = new BN(0);
            await this.reputation.burnReputation(delayDays, {
                from: owner
            }).should.be.rejectedWith(EVMRevert);
        });
        it.skip('Should burn reputation', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract), this.maxDelayDays);
            const delayDays = new BN(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract), delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            // await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {
                from: lendingContract
            }).should.be.fulfilled;

            //Community rep
            const rep = await this.reputation.getCommunityReputation(community).should.be.fulfilled;
            var expectedRep = initialCommunityReputation.sub(initialCommunityReputation.mul(delayDays).div(this.maxDelayDays)).toNumber();
            expectedRep = new BN(Math.floor(expectedRep));
            rep.should.be.bignumber.equal(expectedRep);

            //Local Node rep
            // var newRep = await this.reputation.getLocalNodeReputation(localNode).should.be.fulfilled;
            // var decrement = initialLocalNodeReputation.mul(delayDays).div(this.maxDelayDays);
            // var expectedRep = initialLocalNodeReputation.sub(decrement).toNumber();
            expectedRep = new BN(Math.floor(expectedRep));
            newRep.should.be.bignumber.equal(expectedRep);
        });

        it.skip('Lending contract should have a community', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract), this.maxDelayDays);
            const delayDays = new BN(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract), delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });

        // it.skip('Lending contract should have a localNode', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract), this.maxDelayDays);
            const delayDays = new BN(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract), delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });

        // it.skip('Lending should have a maxDelayDays localNode', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            const delayDays = new BN(1);
            await this.mockStorage.setUint(utils.soliditySha3("lending.delayDays", lendingContract), delayDays);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            // await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });

        it.skip('Lending contract should be in default', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.maxDelayDays", lendingContract), this.maxDelayDays);
            const delayDays = new BN(0);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            // await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.burnReputation(delayDays, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });

    });

    describe('From storage -> increase', function() {
        it.skip('should not increment another that is not lending contract', async function() {
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            const completedProjectsByTier = new BN(0);
            this.reputation.incrementReputation(completedProjectsByTier, {
                from: owner
            }).should.be.rejectedWith(EVMRevert);
        });
        it.skip('Should increase reputation', async function() {
            const projectTier = new BN(1);
            const previouslyCompletedProjects = new BN(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract), projectTier);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);
            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract), this.minimumPeopleCommunity);
            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            // await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {
                from: lendingContract
            }).should.be.fulfilled;

            //Community rep
            var rep = await this.reputation.getCommunityReputation(community).should.be.fulfilled;
            var increment = new BN(100).div(previouslyCompletedProjects);
            var expectedRep = new BN(Math.floor(initialCommunityReputation.add(increment).toNumber()));
            rep.should.be.bignumber.equal(expectedRep);

            //Local Node rep
            // var newLocalRep = await this.reputation.getLocalNodeReputation(localNode).should.be.fulfilled;
            increment = (new BN(projectTier).mul(this.minimumPeopleCommunity).div(this.minimumProject)).mul(this.incrLocalNodeMultiplier); //.div(1000);
            // expectedRep = initialLocalNodeReputation.add(increment);
            newLocalRep.should.be.bignumber.equal(expectedRep);
        });
        it.skip('Should fail without a community', async function() {
            const projectTier = new BN(1);
            const previouslyCompletedProjects = new BN(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract), projectTier);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract), this.minimumPeopleCommunity);

            // await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });

        // it.skip('Should fail without a localNode', async function() {
            const projectTier = new BN(1);
            const previouslyCompletedProjects = new BN(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract), projectTier);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract), this.minimumPeopleCommunity);

            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });

        it.skip('Should fail without an assigned tier in lending', async function() {
            const projectTier = new BN(1);
            const previouslyCompletedProjects = new BN(3);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("community.completedProjectsByTier", lendingContract, projectTier), previouslyCompletedProjects);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract), this.minimumPeopleCommunity);

            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            // await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });

        it.skip('Should fail without a succesful project', async function() {
            const projectTier = new BN(1);
            const previouslyCompletedProjects = new BN(0);
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", lendingContract), lendingContract);
            await this.mockStorage.setUint(utils.soliditySha3("lending.tier", lendingContract), projectTier);

            await this.mockStorage.setUint(utils.soliditySha3("lending.communityMembers", lendingContract), this.minimumPeopleCommunity);

            await this.mockStorage.setAddress(utils.soliditySha3("lending.community", lendingContract), community);
            // await this.mockStorage.setAddress(utils.soliditySha3("lending.localNode", lendingContract), localNode);
            const initialCommunityReputation = new BN(500);
            await this.mockStorage.setUint(utils.soliditySha3("community.reputation", community), initialCommunityReputation);
            // const initialLocalNodeReputation = new BN(500);
            // await this.mockStorage.setUint(utils.soliditySha3("localNode.reputation", localNode), initialLocalNodeReputation);

            await this.reputation.incrementReputation(previouslyCompletedProjects, {
                from: lendingContract
            }).should.be.rejectedWith(EVMRevert);
        });
    });

    describe('reputation default values', function() {
        // it.skip('Should initialize localNode reputation', async function() {
            // set fake user contract using owner
            await this.mockStorage.setAddress(utils.soliditySha3("contract.name", "users"), owner);
            // await this.reputation.initLocalNodeReputation(localNode).should.be.fulfilled;
            const default_rep = await this.reputation.initReputation();
            // var rep = await this.reputation.getLocalNodeReputation(localNode).should.be.fulfilled;
            default_rep.should.be.bignumber.equal(rep);
        });

        it.skip('Should initialize community reputation', async function() {
            // set fake user contract using owner
            await this.mockStorage.setAddress(utils.soliditySha3("contract.name", "users"), owner);
            await this.reputation.initCommunityReputation(community).should.be.fulfilled;
            const default_rep = await this.reputation.initReputation();
            const rep = await this.reputation.getCommunityReputation(community).should.be.fulfilled;
            default_rep.should.be.bignumber.equal(rep);
        });

    });
});