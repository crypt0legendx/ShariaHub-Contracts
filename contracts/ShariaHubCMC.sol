//SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ShariaHubBase.sol";
import "./storage/ShariaHubStorageInterface.sol";

/**
 * @title ShariahubCMC
 * @dev This contract manage Shariahub contracts creation and update.
 */

contract ShariaHubCMC is Ownable {

    uint8 public version;
    ShariaHubStorageInterface public ShariaHubStorage;

    event ContractUpgraded (
        address indexed _oldContractAddress, // Address of the contract being upgraded
        address indexed _newContractAddress, // Address of the new contract
        uint256 created // Creation timestamp
    );

    event ContractRemoved (
        address indexed _contractAddress, // Address of the contract being removed
        uint256 removed // Remove timestamp
    );

    event LendingContractAdded (
        address indexed _newContractAddress, // Address of the new contract
        uint256 created // Creation timestamp
    );


    // modifier onlyOwner() {
    //     // bool isLocalNode = ShariaHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", msg.sender)));
    //     require(owner() == msg.sender);
    //     _;
    // }

    constructor(address _ShariaHubStorage) {
        require(address(_ShariaHubStorage) != address(0), "Storage address cannot be zero address");

        // Ownable.initialize(msg.sender);

        ShariaHubStorage = ShariaHubStorageInterface(_ShariaHubStorage);
        version = 1;
    }

    function addNewLendingContract(address _lendingAddress) public onlyOwner {
        require(_lendingAddress != address(0));
        ShariaHubStorage.setAddress(keccak256(abi.encodePacked("contract.address", _lendingAddress)), _lendingAddress);
        emit LendingContractAdded(_lendingAddress, block.timestamp);
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

    function removeContract(address _contractAddress, string memory _contractName) public onlyOwner {
        require(_contractAddress != address(0));
        address contractAddress = ShariaHubStorage.getAddress(keccak256(abi.encodePacked("contract.name", _contractName)));
        require(_contractAddress == contractAddress);
        ShariaHubStorage.deleteAddress(keccak256(abi.encodePacked("contract.address", _contractAddress)));
        ShariaHubStorage.deleteAddress(keccak256(abi.encodePacked("contract.name", _contractName)));
        emit ContractRemoved(_contractAddress, block.timestamp);
    }
}
