// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../contracts/nft/Pill.sol";


contract PillTest is Test {
    Pill public Pill;

    function setUp() public {
        Pill = new Pill();
        Pill.initialize(
            "Layer AI Pill",
            "LAIC",
            "https://store.layerai.com/nfts/Pills/contract.json",
            "https://store.layerai.com/nfts/Pills/"
        );
    }

    function testSetTierExpiration(uint256[] calldata _tierExpiration) public {
        if (_tierExpiration.length > 1) {
            Pill.setTierExpiration(_tierExpiration);
        }
    }

    function testMint(address _minting, uint256 _tier) public {
        if (_tier < Pill.getTierCount()) {
            Pill.mint(_minting, _tier);
        }
    }

    function chackingArg(uint256[] memory _tier) public view returns (bool) {
        uint getTierCount = Pill.getTierCount();
        for (uint256 i = 0; i < _tier.length; i++) {
            if (_tier[i] == getTierCount) {
                return false;
            }
        }
        return true;
    }

    function testMintMultiple(
        address[] memory _minting,
        uint256[] calldata _tier
    ) public {
        testSetTierExpiration(_tier);
        for(uint i =0 ; i <_minting.length; i++ ){
            if(_minting[i] == address(0)){
                return ;
            }
        }
        if (_minting.length != 0 && _tier.length != 0) {
            if (_minting.length == _tier.length) {
                bool checkTier = chackingArg(_tier);
                if (checkTier) {
                    Pill.mintMultiple(_minting, _tier);
                }
            }
        }
    }
}
