/*
    Smart contract of user status.

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
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../ShariaHubBase.sol";
import "../reputation/ShariaHubReputationInterface.sol";

/* @title User
@dev This is an extension to add user
*/
contract ShariaHubUser is Ownable, ShariaHubBase {


    event UserStatusChanged(address target, string profile, bool isRegistered);

    constructor(address _storageAddress)
        ShariaHubBase(_storageAddress)
        
    {
        // Version
        version = 1;
    }

    /**
     * @dev Changes registration status of an address for participation.
     * @param target Address that will be registered/deregistered.
     * @param profile profile of user.
     * @param isRegistered New registration status of address.
     */
    function changeUserStatus(address target, string memory profile, bool isRegistered)
        public
        onlyOwner
    {
        require(target != address(0));
        require(bytes(profile).length != 0);
        ShariaHubStorage.setBool(keccak256(abi.encodePacked("user", profile, target)), isRegistered);
        emit UserStatusChanged(target, profile, isRegistered);
    }

    /**
     * @dev Changes registration statuses of addresses for participation.
     * @param targets Addresses that will be registered/deregistered.
     * @param profile profile of user.
     * @param isRegistered New registration status of addresses.
     */
    function changeUsersStatus(address[] memory targets, string memory profile, bool isRegistered)
        public
        onlyOwner
    {
        require(targets.length > 0);
        require(bytes(profile).length != 0);
        for (uint i = 0; i < targets.length; i++) {
            changeUserStatus(targets[i], profile, isRegistered);
        }
    }

    /**
     * @dev View registration status of an address for participation.
     * @return isRegistered boolean registration status of address for a specific profile.
     */
    function viewRegistrationStatus(address target, string memory profile)
        view public
        returns(bool isRegistered)
    {
        require(target != address(0));
        require(bytes(profile).length != 0);
        isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", profile, target)));
    }

    /**
     * @dev register a localNode address.
     */
    function registerLocalNode(address target)
        external
        onlyOwner
    {
        require(target != address(0));
        bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", target)));
        if (!isRegistered) {
            ShariaHubStorage.setBool(keccak256(abi.encodePacked("user", "localNode", target)), true);
            ShariaHubReputationInterface rep = ShariaHubReputationInterface (ShariaHubStorage.getAddress(keccak256(abi.encodePacked("contract.name", "reputation"))));
            rep.initLocalNodeReputation(target);
        }
    }

    /**
     * @dev register a community address.
     */
    function registerCommunity(address target)
        external
        onlyOwner
    {
        require(target != address(0));
        bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "community", target)));
        if (!isRegistered) {
            ShariaHubStorage.setBool(keccak256(abi.encodePacked("user", "community", target)), true);
            ShariaHubReputationInterface rep = ShariaHubReputationInterface(ShariaHubStorage.getAddress(keccak256(abi.encodePacked("contract.name", "reputation"))));
            rep.initCommunityReputation(target);
        }
    }

    /**
     * @dev register a invertor address.
     */
    function registerInvestor(address target)
        external
        onlyOwner
    {
        require(target != address(0));
        ShariaHubStorage.setBool(keccak256(abi.encodePacked("user", "investor", target)), true);
    }

    /**
     * @dev register a community representative address.
     */
    function registerRepresentative(address target)
        external
        onlyOwner
    {
        require(target != address(0));
        ShariaHubStorage.setBool(keccak256(abi.encodePacked("user", "representative", target)), true);
    }


}
