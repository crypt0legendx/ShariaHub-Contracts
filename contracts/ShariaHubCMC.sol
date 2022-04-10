//SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ShariaHubBase.sol";

/**
 * @title ShariahubCMC
 * @dev This contract manage Shariahub contracts creation and update.
 */

contract ShariaHubCMC is ShariaHubBase, Ownable {

    event ContractUpgraded (
        address indexed _oldContractAddress,                    // Address of the contract being upgraded
        address indexed _newContractAddress,                    // Address of the new contract
        uint256 created                                         // Creation timestamp
    );

    modifier onlyOwner() {
        bool isLocalNode = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", msg.sender)));
        require(isLocalNode || owner() == msg.sender);
        _;
    }

    constructor(address _storageAddress) ShariaHubBase(_storageAddress) {
        // Version
        version = 1;
    }

    function addNewLendingContract(address _lendingAddress) public onlyOwner {
        require(_lendingAddress != address(0));
        ShariaHubStorage.setAddress(keccak256(abi.encodePacked("contract.address", _lendingAddress)), _lendingAddress);
    }

    function upgradeContract(address _newContractAddress, string memory _contractName) public onlyOwner {
        require(_newContractAddress != address(0));
        require(keccak256(abi.encodePacked("contract.name","")) != keccak256(abi.encodePacked("contract.name",_contractName)));
        address oldAddress = ShariaHubStorage.getAddress(keccak256(abi.encodePacked("contract.name", _contractName)));
        ShariaHubStorage.setAddress(keccak256(abi.encodePacked("contract.address", _newContractAddress)), _newContractAddress);
        ShariaHubStorage.setAddress(keccak256(abi.encodePacked("contract.name", _contractName)), _newContractAddress);
        ShariaHubStorage.deleteAddress(keccak256(abi.encodePacked("contract.address", oldAddress)));
        emit ContractUpgraded(oldAddress, _newContractAddress, block.timestamp);
    }
}
