/*
    Test of smart contract of a Whitelisted Accounts.

    Copyright (C) 2018 ShariaHub

    This file is part of platform contracts.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

import {
    advanceBlock
} from './helpers/advanceToBlock'
import {
    duration
} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import EVMRevert from './helpers/EVMRevert'

const {
    BN
} = require('@openzeppelin/test-helpers');

const utils = require("web3-utils");
const chai = require('chai');
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const User = artifacts.require('ShariaHubUser');
const Storage = artifacts.require('ShariaHubStorage');
const ShariaHubCMC = artifacts.require('ShariaHubCMC');

contract('User', function(whitelisted_accounts) {

    const owner = whitelisted_accounts.pop();

    describe('whitelisted accounts', function() {
        beforeEach(async function() {
            await advanceBlock();
            this.profile = 'whitelist';
            this.storage = await Storage.new();
            this.cmc = await ShariaHubCMC.new(this.storage.address)

            const latestTimeValue = await latestTime()
            this.start = latestTimeValue + duration.minutes(2); // +2 minute so it starts after contract instantiation
            this.end = this.start + duration.days(40);
            await this.storage.setAddress(utils.soliditySha3("contract.address", this.cmc.address), this.cmc.address)
            await this.storage.setAddress(utils.soliditySha3("contract.name", 'cmc'), this.cmc.address)

            this.users = await User.new(this.storage.address, {
                from: owner
            });

            await this.cmc.upgradeContract(this.users.address, 'users')
        });

        it('onlyOwner can change status', async function() {
            // let prof = "localNode";
            let is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
            // await this.users.registerLocalNode(whitelisted_accounts[0], {
                from: whitelisted_accounts[0]
            }).should.be.rejectedWith(EVMRevert);
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
        });

        // it('register/unregister localNode', async function() {
            // let prof = "localNode";
            let is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
            // await this.users.registerLocalNode(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(true);
            // await this.users.unregisterLocalNode(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
        });

        it('register/unregister community', async function() {
            let prof = "community";
            let is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
            await this.users.registerCommunity(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(true);
            await this.users.unregisterCommunity(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
        });

        it('register/unregister investor', async function() {
            let prof = "investor";
            let is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
            await this.users.registerInvestor(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(true);
            await this.users.unregisterInvestor(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
        });

        it('register/unregister representative', async function() {
            let prof = "representative";
            let is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
            await this.users.registerRepresentative(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(true);
            await this.users.unregisterRepresentative(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
        });

        it('register/unregister paymentGateway', async function() {
            let prof = "paymentGateway";
            let is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
            await this.users.registerPaymentGateway(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(true);
            await this.users.unregisterPaymentGateway(whitelisted_accounts[0], {
                from: owner
            }).should.be.fulfilled;
            is_registered = await this.users.viewRegistrationStatus(whitelisted_accounts[0], prof);
            is_registered.should.be.equal(false);
        });
    });
});
