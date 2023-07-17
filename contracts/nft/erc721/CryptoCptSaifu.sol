// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;

import "../ERC721Base.sol";

contract CryptoCptSaifu is ERC721Base {
    constructor()
        ERC721Base(
            "CryptoCPT Waifu",
            "GPT",
            "https://store.cryptogpt.org/nfts/waifu/pre/contract.json",
            "https://store.cryptogpt.org/nfts/waifu/pre-data/"
        )
    {}
}
