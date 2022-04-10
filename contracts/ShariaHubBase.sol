//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./storage/ShariaHubStorageInterface.sol";


contract ShariaHubBase {

    uint8 public version;

    ShariaHubStorageInterface public ShariaHubStorage;

    constructor(address _storageAddress) {
        require(_storageAddress != address(0));
        ShariaHubStorage = ShariaHubStorageInterface(_storageAddress);
    }

}
