//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../ShariaHubBase.sol";
import "../storage/ShariaHubStorageInterface.sol";

/**
 * @title ShariaHubArbitrage
 * @dev This contract will assign an arbiter for a lending contract.
 * The arbiter is the only role allowed to change the borrower address for a lending contract
 * The nature of the arbiter (wallet, voting contract...) will be determined each case.
 * This is an emergency mechanism only, in case of compromised or lost borrower accounts.
 */

contract ShariaHubArbitrage is ShariaHubBase, Ownable {

    // uint8 public version;
    // ShariaHubStorageInterface public ShariaHubStorage;

    event ArbiterAssigned (
        address indexed _arbiter, // Address of the arbiter
        address indexed _lendingContract // Address of the lending contract
    );

    event ArbiterRevoked (
        address indexed _arbiter, // Address of the arbiter
        address indexed _lendingContract // Address of the lending contract
    );

    constructor(address _shariaHubStorage)  {
        require(address(_shariaHubStorage) != address(0), "Storage address cannot be zero address");

        shariaHubStorage = ShariaHubStorageInterface(_shariaHubStorage);
        version = 1;

        // Ownable.initialize(msg.sender);
    }

    function assignArbiterForLendingContract(address _arbiter, address _lendingContract) public onlyOwner {
        require(_arbiter != address(0), "Aribter address is not valid");
        require(_lendingContract != address(0), "Lending contract address is not valid");
        require(_lendingContract == shariaHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", _lendingContract))));
        shariaHubStorage.setAddress(keccak256(abi.encodePacked("arbiter", _lendingContract)), _arbiter);
        emit ArbiterAssigned(_arbiter, _lendingContract);
    }

    function revokeArbiterForLendingContract(address _arbiter, address _lendingContract) public onlyOwner {
        require(_arbiter != address(0), "Aribter address is not valid");
        require(_lendingContract != address(0), "Lending contract address is not valid");
        require(_lendingContract == shariaHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", _lendingContract))));
        require(arbiterForLendingContract(_lendingContract) == _arbiter);
        shariaHubStorage.deleteAddress(keccak256(abi.encodePacked("arbiter", _lendingContract)));
        emit ArbiterRevoked(_arbiter, _lendingContract);
    }

    function arbiterForLendingContract(address _lendingContract) public view returns(address) {
        return shariaHubStorage.getAddress(keccak256(abi.encodePacked("arbiter", _lendingContract)));
    }
}
