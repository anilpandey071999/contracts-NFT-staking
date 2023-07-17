// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../contracts/nft/Pill.sol";
import "../../contracts/nft/PillMinter.sol";
import "../../contracts/tests/ERC20Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PillMinterTest is Test {
    Pill public Pill;
    PillMinter public PillMinter;
    IERC20 ERC20Token1;

    function setUp() public {
        Pill = new Pill();
        Pill.initialize(
            "Layer AI Pill",
            "LAIC",
            "https://store.layerai.com/nfts/Pills/contract.json",
            "https://store.layerai.com/nfts/Pills/"
        );

        address treasury = 0xA38D3Bb1b0F9C4dbB205E49FAD16F4B595224AAB;
        PillMinter = new PillMinter(address(Pill), treasury);
        ERC20Token1 = new ERC20Test("Test1", "T1", 18);
        IERC20(ERC20Token1).approve(msg.sender, 1000 ether);

        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        Pill.grantRole(MINTER_ROLE, address(PillMinter));
    }

    function testSetTierWeights() public {
        uint256[] memory _setTierWeights  = new uint256[](5);
        _setTierWeights [0] = 1;
        _setTierWeights [1] = 10;
        _setTierWeights [2] = 50;
        _setTierWeights [3] = 60;
        _setTierWeights [4] = 11;
        // If total is within the range of uint256, set tier weights
        PillMinter.setTierWeights(_setTierWeights );
    }

    function getTiersetup() internal {
        testSetTierWeights();
        uint[] memory expiration = new uint256[](5);
        expiration[0] = 10;
        expiration[1] = 20;
        expiration[2] = 30;
        expiration[3] = 40;
        expiration[4] = 50;
        Pill.setTierExpiration(expiration);
    }

    function testMint(address _to) public {
        getTiersetup();
        PillMinter.mint(_to);
    }

    function testMultipleMint(address _to, uint256 _amount) public {
        getTiersetup();
        if (_to != address(0) && _amount < 1000) {
            PillMinter.mintMultipleTo(_to, _amount);
        }
    }

    function testSetPaymentTokens(
        address[] calldata _paymentTokens,
        uint256[] calldata _prices
    ) public {
        if (_paymentTokens.length == _prices.length) {
            PillMinter.setPaymentTokens(_paymentTokens, _prices);
        }
    }

    function testBuy(uint32 _amount) public {
        if (_amount != 0 && _amount < 11) {
            getTiersetup();
            address[] memory addresses = new address[](1);
            addresses[0] = address(ERC20Token1);
            uint256[] memory prices = new uint256[](1);
            prices[0] = 0.1 ether;
            IERC20(ERC20Token1).approve(address(PillMinter), 1000 ether);
            PillMinter.setPaymentTokens(addresses, prices);
            PillMinter.buy(address(ERC20Token1), _amount);
        }
    }
}
