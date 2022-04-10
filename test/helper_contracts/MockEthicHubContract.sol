pragma solidity ^0.4.20;

import "../../contracts/ShariaHubBase.sol";


contract MockShariaHubContract is ShariaHubBase {

    /// @dev constructor
    function MockShariaHubContract(address _storageAddress, uint8 _version) ShariaHubBase(_storageAddress) public {
      // Version
        version = _version;
    }

    function getStorageAddress() public view returns (address) {
        return ShariaHubStorage;
    }

}
