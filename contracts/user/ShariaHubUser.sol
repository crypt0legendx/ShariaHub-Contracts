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

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../storage/ShariaHubStorageInterface.sol";

/* @title User
@dev This is an extension to add user
*/
contract ShariaHubUser is Ownable {

    uint8 public version;
    ShariaHubStorageInterface public ShariaHubStorage;

    event UserStatusChanged(address target, string profile, bool isRegistered);

    constructor(address _ShariaHubStorage) {
        require(address(_ShariaHubStorage) != address(0), "Storage address cannot be zero address");

        ShariaHubStorage = ShariaHubStorageInterface(_ShariaHubStorage);
        version = 4;

        // Ownable.initialize(msg.sender);
    }

    /**
     * @dev Changes registration status of an address for participation.
     * @param target Address that will be registered/deregistered.
     * @param profile profile of user.
     * @param isRegistered New registration status of address.
     */
    function changeUserStatus(
        address target,
        string memory profile,
        bool isRegistered
        ) public onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        require(bytes(profile).length != 0);
        ShariaHubStorage.setBool(keccak256(abi.encodePacked("user", profile, target)), isRegistered);
        emit UserStatusChanged(target, profile, isRegistered);
    }


    /**
     * @dev delete an address for participation.
     * @param target Address that will be deleted.
     * @param profile profile of user.
     */
    function deleteUserStatus(address target, string memory profile) internal onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        require(bytes(profile).length != 0);
        ShariaHubStorage.deleteBool(keccak256(abi.encodePacked("user", profile, target)));
        emit UserStatusChanged(target, profile, false);
    }


    /**
     * @dev View registration status of an address for participation.
     * @return isRegistered boolean registration status of address for a specific profile.
     */
    function viewRegistrationStatus(address target, string memory profile) public view returns(bool isRegistered) {
        require(target != address(0), "Target address cannot be undefined");
        require(bytes(profile).length != 0);
        isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", profile, target)));
    }

    /**
     * @dev register a localNode address.
     */
    // function registerLocalNode(address target) external onlyOwner {
    //     require(target != address(0), "Target address cannot be undefined");
    //     bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", target)));
    //     if (!isRegistered) {
    //         changeUserStatus(target, "localNode", true);
    //     }
    // }

    /**
     * @dev unregister a localNode address.
     */
    // function unregisterLocalNode(address target) external onlyOwner {
    //     require(target != address(0), "Target address cannot be undefined");
    //     bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", target)));
    //     if (isRegistered) {
    //         deleteUserStatus(target, "localNode");
    //     }
    // }

    /**
     * @dev register a community address.
     */
    function registerCommunity(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "community", target)));
        if (!isRegistered) {
            changeUserStatus(target, "community", true);
        }
    }

    /**
     * @dev unregister a community address.
     */
    function unregisterCommunity(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "community", target)));
        if (isRegistered) {
            deleteUserStatus(target, "community");
        }
    }

    /**
     * @dev register a invertor address.
     */
    function registerInvestor(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        changeUserStatus(target, "investor", true);
    }

    /**
     * @dev unregister a investor address.
     */
    function unregisterInvestor(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", target)));
        if (isRegistered) {
            deleteUserStatus(target, "investor");
        }
    }

    /**
     * @dev register a community representative address.
     */
    function registerRepresentative(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        changeUserStatus(target, "representative", true);
    }

    /**
     * @dev unregister a representative address.
     */
    function unregisterRepresentative(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", target)));
        if (isRegistered) {
            deleteUserStatus(target, "representative");
        }
    }

    /**
     * @dev register a paymentGateway address.
     */
    function registerPaymentGateway(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        changeUserStatus(target, "paymentGateway", true);
    }

    /**
     * @dev unregister a paymentGateway address.
     */
    function unregisterPaymentGateway(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "paymentGateway", target)));
        if (isRegistered) {
            deleteUserStatus(target, "paymentGateway");
        }
    }
}
