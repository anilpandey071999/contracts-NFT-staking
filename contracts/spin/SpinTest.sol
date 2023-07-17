// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./Spin.sol";

contract SpinTest is Spin {
    constructor(
        address _paymentToken,
        uint256 _spinPrice
    ) Spin("Test Token", "tSPIN", _paymentToken, _spinPrice, msg.sender) {}

    function draw() public view returns (RollOption memory) {
        return _draw();
    }
}
