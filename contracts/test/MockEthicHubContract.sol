pragma solidity 0.5.13;

import "../ShariaHubBase.sol";
import "../storage/ShariaHubStorageInterface.sol";

contract MockShariaHubContract is ShariaHubBase {

    /// @dev constructor
    constructor(address _ShariaHubStorage, uint8 _version) public {
        ShariaHubBase.initialize(_ShariaHubStorage, _version);
    }

    function getStorageAddress() public view returns (address) {
        return address(ShariaHubStorage);
    }
}
