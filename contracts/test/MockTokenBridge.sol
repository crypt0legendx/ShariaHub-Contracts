pragma solidity 0.5.13;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import '../interfaces/ITokenBridge.sol';

contract MockTokenBridge {

    IERC20 public stableCoin;
    event LogAddress(address log);
    event LogUint (uint256 log);

    constructor(address _stableCoinAddress) public {
        stableCoin = IERC20(_stableCoinAddress);
    }

    function relayTokens(address _sender, address _receiver, uint256 _amount) external {
        require(stableCoin.transferFrom(_sender, address(this), _amount), "dai transfer failed");

        emit LogAddress(_sender);
        emit LogAddress(_receiver);
        emit LogUint(_amount);
    }

}
