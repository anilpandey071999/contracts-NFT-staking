// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../claim/VestedClaim.sol";

contract VestedClaimTest is VestedClaim {
    constructor(
        uint256 _claimTime,
        address _rewardToken
    ) VestedClaim(_rewardToken) {
        claimTime = _claimTime;
    }

    function buy(uint256 _amount) external {
        addUserReward(msg.sender, _amount);
    }
}
