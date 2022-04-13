// SPDX-License-Identifier: gpl-3.0
pragma solidity 0.8.3;

contract LeakGasContract {

    uint public leak;
    
    // Function to receive Ether. msg.data must be empty
    receive() external payable {
        leak = 0;

        for (uint i = 0; i < 10000; i++) {
            leak = leak + 1;
            
        }
    }

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}
}
