// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Pill is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    PausableUpgradeable,
    AccessControlEnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    ERC721RoyaltyUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    string public contractURI;
    string public baseTokenURI;

    mapping(uint256 => string) public _tokenURI;
    uint256 public uriScheme;

    // Overrides paused()
    mapping(address => bool) public allowlisted;

    // Overrides when !paused()
    mapping(address => bool) public blocklisted;

    // NFT tiers
    uint256[] public tierExpiration; // index explicitly defines the tier

    uint256 private _lastId;

    uint256 public expiryCountStart;

    struct Expiry {
        uint256 tier;
        uint256 time;
    }
    mapping(uint256 => Expiry) public expiryOf; // tokenId => Expiry

    event Allowlisted(address, bool);
    event Blocklisted(address, bool);
    event URISchemeUpdated(uint256);
    event ExpiryCountStartUpdated(uint256);

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _contractURI,
        string memory _baseTokenURI
    ) public initializer {
        __ERC721_init(_name, _symbol);
        __ERC721Enumerable_init();
        __Pausable_init();
        __AccessControlEnumerable_init();
        __ERC721Burnable_init();
        __ERC721Royalty_init();

        contractURI = _contractURI;
        baseTokenURI = _baseTokenURI;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());

        _allowlist(msg.sender, true);
    }

    //////////
    // Pause
    //////////
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    //////////
    // Allow/block lists
    //////////

    function allowlist(
        address _address,
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _allowlist(_address, _status);
    }

    function allowlistMultiple(
        address[] calldata _addresses,
        bool[] calldata _statuses
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_addresses.length == _statuses.length, "Invalid lengths");

        for (uint256 i = 0; i < _addresses.length; ++i) {
            _allowlist(_addresses[i], _statuses[i]);
        }
    }

    function _allowlist(address _address, bool _status) internal {
        allowlisted[_address] = _status;
        emit Allowlisted(_address, _status);
    }

    function blocklist(
        address _address,
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _blocklist(_address, _status);
    }

    function blocklistMultiple(
        address[] calldata _addresses,
        bool[] calldata _statuses
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_addresses.length == _statuses.length, "Invalid lengths");

        for (uint256 i = 0; i < _addresses.length; ++i) {
            _blocklist(_addresses[i], _statuses[i]);
        }
    }

    function _blocklist(address _address, bool _status) internal {
        blocklisted[_address] = _status;
        emit Blocklisted(_address, _status);
    }

    //////////
    // Tiers
    //////////
    function getTierExpiration() external view returns (uint256[] memory) {
        return tierExpiration;
    }

    function getTierCount() external view returns (uint256) {
        return tierExpiration.length;
    }

    /**
     * @dev Sets the expiration duration (in seconds) for each tier.
     * @param _tierExpiration The array containing the expiration duration for each tier.
     *
     * @notice Only the contract's default admin can call this function.
     * @notice The length of the `_tierExpiration` array must be greater than 0 and less than or equal to 256.
     * @notice Upon successful execution, the `tierExpiration` array is updated with the provided values.
     */
    function setTierExpiration(
        uint256[] calldata _tierExpiration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_tierExpiration.length > 0, "Invalid length");
        require(_tierExpiration.length <= 256, "Invalid length");

        delete tierExpiration;

        tierExpiration = _tierExpiration;
    }

    function setExpiryStart(
        uint256 _expiryCountStart
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        expiryCountStart = _expiryCountStart;
        emit ExpiryCountStartUpdated(_expiryCountStart);
    }

    function getExpiry(
        uint256 _tokenId
    ) external view returns (uint256 tier, uint256 time) {
        tier = expiryOf[_tokenId].tier;

        if (expiryCountStart > block.timestamp) {
            return (tier, 0);
        }

        if (expiryOf[_tokenId].time - tierExpiration[tier] < expiryCountStart) {
            time = expiryCountStart + tierExpiration[tier];
        } else {
            time = expiryOf[_tokenId].time;
        }

        return (tier, time);
    }

    //////////
    // Metadata URIs
    //////////
    function setUriScheme(
        uint256 _scheme
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uriScheme = _scheme;
        emit URISchemeUpdated(_scheme);
    }

    function tokenURI(
        uint256 _tokenId
    ) public view virtual override returns (string memory) {
        return _getTokenURI(_tokenId);
    }

    function _getTokenURI(
        uint256 _tokenId
    ) internal view returns (string memory) {
        // 0 - based on token id; overwriteable by setting specific _tokenURI
        // 1 - static
        // 2 - based on token tier

        if (uriScheme == 1) {
            // static
            return string(abi.encodePacked(baseTokenURI, "Pill.json"));
        } else if (uriScheme == 0) {
            // based on token id; overwriteable by setting specific _tokenURI
            return
                bytes(_tokenURI[_tokenId]).length == 0
                    ? string(
                        abi.encodePacked(
                            baseTokenURI,
                            StringsUpgradeable.toString(_tokenId),
                            ".json"
                        )
                    )
                    : _tokenURI[_tokenId];
        } else if (uriScheme == 2) {
            // based on token tier
            return
                string(
                    abi.encodePacked(
                        baseTokenURI,
                        "tier/",
                        StringsUpgradeable.toString(expiryOf[_tokenId].tier),
                        ".json"
                    )
                );
        }
        revert("Invalid URI scheme");
    }

    function setContractURI(
        string calldata uri_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        contractURI = uri_;
    }

    function setTokenURI(
        uint256 _tokenId,
        string calldata uri_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenURI[_tokenId] = uri_;
    }

    function setBaseTokenURI(
        string calldata uri_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseTokenURI = uri_;
    }

    function removeTokenURI(
        uint256 _tokenId
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _removeTokenURI(_tokenId);
    }

    function _removeTokenURI(uint256 _tokenId) internal {
        delete _tokenURI[_tokenId];
    }

    //////////
    // Minting
    //////////

    /**
     * @dev Mints a single NFT token of the specified tier and assigns it to the given address.
     * @param _to The address to which the NFT token will be assigned.
     * @param _tier The tier of the NFT token to mint.
     * @return The ID of the minted NFT token.
     * @notice Only the contract's designated minter can call this function.
     */
    function mint(
        address _to,
        uint256 _tier
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        return _mintTier(_to, _tier);
    }

    function mintMultiple(
        address[] calldata _to,
        uint256[] calldata _tier
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory) {
        require(_to.length == _tier.length, "Pill: Invalid lengths");

        uint256[] memory tokenIds = new uint256[](_to.length);
        for (uint256 i = 0; i < _to.length; ++i) {
            tokenIds[i] = _mintTier(_to[i], _tier[i]);
        }

        return tokenIds;
    }

    /**
     * @dev Mints multiple NFT tokens of different tiers and assigns them to the corresponding addresses.
     * @param _to The array of addresses to which the NFT tokens will be assigned.
     * @param _tier The array of tiers of the NFT tokens to mint.
     * @return An array of the IDs of the minted NFT tokens.
     * @notice Only the contract's designated minter can call this function.
     * @notice The lengths of `_to` and `_tier` arrays must be the same.
     */
    function _mintTier(address _to, uint256 _tier) internal returns (uint256) {
        require(_tier < tierExpiration.length, "Pill: Invalid tier");

        uint256 tokenId = ++_lastId;
        _mint(_to, tokenId);
        expiryOf[tokenId] = Expiry(
            _tier,
            block.timestamp + tierExpiration[_tier]
        );

        return tokenId;
    }

    //////////
    // Royalty
    //////////
    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function deleteDefaultRoyalty() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _deleteDefaultRoyalty();
    }

    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function resetTokenRoyalty(
        uint256 tokenId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _resetTokenRoyalty(tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _burn(
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721RoyaltyUpgradeable) {
        super._burn(tokenId);
        _removeTokenURI(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        require(
            !paused() || allowlisted[msg.sender] || allowlisted[to],
            "Pausable: paused"
        );
        require(
            !blocklisted[msg.sender] && !blocklisted[from] && !blocklisted[to],
            "Blocklisted"
        );
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            ERC721RoyaltyUpgradeable,
            AccessControlEnumerableUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
