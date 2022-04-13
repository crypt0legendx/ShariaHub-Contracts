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

import EVMRevert from './helpers/EVMRevert'

const {
    BN,
    constants
} = require('@openzeppelin/test-helpers');
const utils = require("web3-utils");
const chai = require('chai');

chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const Arbitrage = artifacts.require('ShariaHubArbitrage');

const MockStorage = artifacts.require('MockStorage');

contract('Arbitrage', function([owner, arbiter, _, lending_contract, not_lending_contract]) {

    beforeEach(async function() {
        await advanceBlock()
        this.storage = await MockStorage.new();
        await this.storage.setAddress(utils.soliditySha3("contract.address", lending_contract), lending_contract)
        this.arbitrage = await Arbitrage.new(this.storage.address, {
            from: owner
        })
    });

    function getArbiterForContract(lendingContract, storage) {
        return storage.getAddress(utils.soliditySha3("arbiter", lendingContract))
    }

    describe('Register Arbiter', function() {
        it('Should not allow null arbiter', async function() {
            await this.arbitrage.assignArbiterForLendingContract(constants.ZERO_ADDRESS, lending_contract).should.be.rejectedWith(EVMRevert);
        });

        it('Should not allow null lending contract', async function() {
            await this.arbitrage.assignArbiterForLendingContract(arbiter, constants.ZERO_ADDRESS).should.be.rejectedWith(EVMRevert);
        });

        it('Should not allow unregistered lending contract', async function() {
            await this.arbitrage.assignArbiterForLendingContract(arbiter, not_lending_contract).should.be.rejectedWith(EVMRevert);
        });

        it('Should not allow not owner to register arbiter', async function() {
            await this.arbitrage.assignArbiterForLendingContract(arbiter, lending_contract, {
                from: arbiter
            }).should.be.rejectedWith(EVMRevert);
        });

        it('Should register correct arbiter', async function() {
            await this.arbitrage.assignArbiterForLendingContract(arbiter, lending_contract, {
                from: owner
            }).should.be.fulfilled;
            let registered = await getArbiterForContract(lending_contract, this.storage);
            registered.should.be.equal(arbiter);
        });

        it('Should show correct arbiter registered', async function() {
            await this.arbitrage.assignArbiterForLendingContract(arbiter, lending_contract).should.be.fulfilled;
            let registered = await getArbiterForContract(lending_contract, this.storage);
            let registeredView = await this.arbitrage.arbiterForLendingContract(lending_contract).should.be.fulfilled;
            registered.should.be.equal(registeredView);
        });
    });


    describe('Revoke Arbiter', function() {

        beforeEach(async function() {
            await advanceBlock();
            await this.arbitrage.assignArbiterForLendingContract(arbiter, lending_contract);
        });

        it('Should not allow null arbiter', async function() {
            await this.arbitrage.revokeArbiterForLendingContract(constants.ZERO_ADDRESS, lending_contract).should.be.rejectedWith(EVMRevert);
        });

        it('Should not allow null lending contract', async function() {
            await this.arbitrage.revokeArbiterForLendingContract(arbiter, constants.ZERO_ADDRESS).should.be.rejectedWith(EVMRevert);
        });

        it('Should not allow unregistered lending contract', async function() {
            await this.arbitrage.revokeArbiterForLendingContract(arbiter, not_lending_contract).should.be.rejectedWith(EVMRevert);
        });

        it('Should not allow not owner to revoke arbiter', async function() {
            await this.arbitrage.revokeArbiterForLendingContract(arbiter, lending_contract, {
                from: arbiter
            }).should.be.rejectedWith(EVMRevert);

        });

        it('Should not allow to revoke non assigned arbiter', async function() {
            await this.arbitrage.revokeArbiterForLendingContract(owner, lending_contract).should.be.rejectedWith(EVMRevert);

        });

        it('Should unregister arbiter', async function() {
            await this.arbitrage.revokeArbiterForLendingContract(arbiter, lending_contract, {
                from: owner
            }).should.be.fulfilled;
            let registered = await getArbiterForContract(lending_contract, this.storage);
            registered.should.be.equal(constants.ZERO_ADDRESS);
        });

        it('Should show unregistered', async function() {
            await this.arbitrage.revokeArbiterForLendingContract(arbiter, lending_contract).should.be.fulfilled;
            let registered = await getArbiterForContract(lending_contract, this.storage);
            let registeredView = await this.arbitrage.arbiterForLendingContract(lending_contract).should.be.fulfilled;
            registered.should.be.equal(registeredView);
        });
    });
});