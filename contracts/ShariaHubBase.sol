//SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "./storage/ShariaHubStorageInterface.sol";

contract ShariaHubBase is Initializable {

    uint8 public version;

    ShariaHubStorageInterface public shariaHubStorage;

    function initialize(address _shariaHubStorage, uint8 _version) public initializer {
        require(address(_shariaHubStorage) != address(0), "Storage address cannot be zero address");
        shariaHubStorage = ShariaHubStorageInterface(_shariaHubStorage);
        version = _version;
    }
}
