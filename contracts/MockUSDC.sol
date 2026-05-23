// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Test USDC with 6 decimals — mirrors real USDC interface
 * @dev Faucet function for testnet usage; remove in production
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;

    /// @notice Faucet limit per call: 10,000 USDC
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10 ** 6;

    /// @dev Cooldown between faucet calls per address
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    mapping(address => uint256) public lastFaucet;

    event Faucet(address indexed recipient, uint256 amount);

    constructor() ERC20("Mock USD Coin", "mUSDC") Ownable(msg.sender) {
        // Mint initial supply to deployer (for liquidity seeding)
        _mint(msg.sender, 1_000_000 * 10 ** 6); // 1M USDC
    }

    /// @notice Returns 6 (USDC standard)
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Request test tokens from the faucet
     * @dev Subject to 24h cooldown per address
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucet[msg.sender] + FAUCET_COOLDOWN,
            "MockUSDC: faucet cooldown active"
        );
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Faucet(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Admin mint for testing purposes
     */
    function adminMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
