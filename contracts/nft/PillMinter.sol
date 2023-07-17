// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IPill {
    function getTierCount() external view returns (uint256);

    function mint(address, uint256) external returns (uint256);
}

contract PillMinter is AccessControlEnumerable, ReentrancyGuard, Pausable {
    address public constant NATIVE_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    using SafeERC20 for IERC20;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256[] public tierWeights;
    uint256 public totalWeights;

    address public PillAddress;

    uint256 public totalDraws;

    // define nonces
    mapping(address => uint256) public nonces;

    struct PaymentToken {
        address address_;
        uint256 price_;
    }
    mapping(address => uint256) public priceInToken;
    PaymentToken[] public paymentTokens;

    address public treasury;

    event PillAddressChanged(address oldAddress, address newAddress);
    event PillMinted(address indexed to, uint256 id, uint256 tier);
    event TierWeightsUpdated();
    event PaymentTokensUpdated();
    event TreasuryUpdated(address treasury);
    event Buy(
        address indexed buyer,
        address indexed paymentToken,
        uint256 amount
    );

    event MintHashUsed(address indexed user, bytes32 msgHash);
    mapping(bytes32 => bool) public usedHashes;

    constructor(address _PillAddress, address _treasury) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());

        PillAddress = _PillAddress;
        treasury = _treasury;
    }

    // Pause
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // Update Pill address
    function setPillAddress(
        address _PillAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit PillAddressChanged(PillAddress, _PillAddress);
        PillAddress = _PillAddress;
    }

    // Tiers/Weights
    function getTierWeights() public view returns (uint256[] memory) {
        return tierWeights;
    }

    function getTierCount() public view returns (uint256) {
        return tierWeights.length;
    }

    function setTierWeights(
        uint256[] calldata _tierWeights
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tierWeights = _tierWeights;

        // iterate and sum weights
        uint256 _totalWeights = 0;
        for (uint256 i = 0; i < tierWeights.length; i++) {
            _totalWeights += tierWeights[i];
        }
        totalWeights = _totalWeights;

        emit TierWeightsUpdated();
    }

    // Get payment tokens
    function getPaymentTokens() public view returns (PaymentToken[] memory) {
        return paymentTokens;
    }

    // Set payment tokens
    function setPaymentTokens(
        address[] calldata _paymentTokens,
        uint256[] calldata _prices
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _paymentTokens.length == _prices.length,
            "PillMinter: payment tokens and prices must be the same length"
        );

        // clear existing payment tokens
        for (uint256 i = 0; i < paymentTokens.length; i++) {
            delete priceInToken[paymentTokens[i].address_];
        }
        delete paymentTokens;

        // add new payment tokens
        for (uint256 i = 0; i < _paymentTokens.length; i++) {
            address _paymentToken = _paymentTokens[i];
            uint256 _price = _prices[i];
            paymentTokens.push(PaymentToken(_paymentToken, _price));
            priceInToken[_paymentToken] = _price;
        }
        emit PaymentTokensUpdated();
    }

    // Set treasury
    function setTreasury(
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = _treasury;

        emit TreasuryUpdated(_treasury);
    }

    // Buying
    function buy(
        address _paymentToken, // use NATIVE_ADDRESS for native token
        uint256 _amount // amount of Pills to buy
    ) external payable nonReentrant whenNotPaused {
        require(
            priceInToken[_paymentToken] > 0,
            "PillMinter: payment token not supported"
        );
        require(_amount > 0, "PillMinter: amount must be greater than 0");
        require(
            _amount <= 10,
            "PillMinter: amount must be less than or equal to 10"
        );

        uint256 _price = priceInToken[_paymentToken];
        uint256 _totalPrice = _price * _amount;

        _transfer(_paymentToken, msg.sender, treasury, _totalPrice);

        _mintMultipleTo(msg.sender, _amount);

        emit Buy(msg.sender, _paymentToken, _amount);
    }

    // minting
    function mint(
        address _to
    ) external nonReentrant whenNotPaused onlyRole(MINTER_ROLE) {
        _mint(_to);
    }

    function mintMultipleTo(
        address _to,
        uint256 _amount
    ) external nonReentrant whenNotPaused onlyRole(MINTER_ROLE) {
        _mintMultipleTo(_to, _amount);
    }

    function mintWithSignature(
        uint256 _amount,
        uint256 _nonce,
        uint256 _deadline,
        bytes calldata _signature
    ) external nonReentrant whenNotPaused {
        bytes32 _messageHash = getMessageHash(
            msg.sender,
            _amount,
            _nonce,
            _deadline
        );

        require(
            block.timestamp <= _deadline,
            "PillMinter: signature expired"
        );
        require(nonces[msg.sender] == _nonce, "PillMinter: invalid nonce");

        address signer = ECDSA.recover(
            ECDSA.toEthSignedMessageHash(_messageHash),
            _signature
        );

        require(
            hasRole(MINTER_ROLE, signer),
            "PillMinter: invalid signature"
        );

        nonces[msg.sender] = _nonce + 1;

        emit MintHashUsed(msg.sender, _messageHash);
        usedHashes[_messageHash] = true;

        _mintMultipleTo(msg.sender, _amount);
    }

    function getMessageHash(
        address _to,
        uint256 _amount,
        uint256 _nonce,
        uint256 _deadline
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_to, _amount, _nonce, _deadline));
    }

    function _mintMultipleTo(address _to, uint256 _amount) internal {
        for (uint256 i = 0; i < _amount; i++) {
            _mint(_to);
        }
    }

    function _mint(address _to) internal returns (uint256) {
        uint256 _tier = _draw();
        totalDraws += 1;
        uint256 _id = IPill(PillAddress).mint(_to, _tier);
        emit PillMinted(_to, _id, _tier);
        return _id;
    }

    // pseudo random draw
    function _draw() internal view returns (uint256) {
        uint256 seed = uint256(
            keccak256(abi.encodePacked(block.timestamp, totalDraws))
        );
        uint256 randomNumber = seed % totalWeights;
        uint256 weightSum = 0;
        for (uint i = 0; i < tierWeights.length; i++) {
            weightSum += tierWeights[i];
            if (randomNumber < weightSum) {
                return i;
            }
        }

        revert();
    }

    // Wrapper to transfer either ERC20 or native token
    function _transfer(
        address _token,
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        if (_token == NATIVE_ADDRESS) {
            require(msg.value == _amount, "PillMinter: incorrect amount");
            (bool success, ) = _to.call{value: msg.value}("");
            require(success, "PillMinter: failed to send ETH");
        } else {
            IERC20(_token).safeTransferFrom(_from, _to, _amount);
        }
    }

    // emergency withdraw
    function emergencyWithdrawERC20(
        IERC20 _token,
        address _to
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _token.safeTransfer(_to, _token.balanceOf(address(this)));
    }

    function emergencyWithdrawNative(
        address payable _to
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "PillMinter: no balance to withdraw");

        (bool success, ) = _to.call{value: balance}("");
        require(success, "PillMinter: failed to send ETH");
    }
}
