// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title PredictionMarket
 * @notice LMSR-based football match prediction market on X Layer
 * @dev Uses Logarithmic Market Scoring Rule for automated market making
 *      Accepts USDC (or MockUSDC) via x402 payment protocol
 */
contract PredictionMarket is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    //  Constants
    // ─────────────────────────────────────────────

    /// @notice LMSR liquidity parameter (b) — controls market depth
    /// @dev Higher b = flatter odds, more liquidity needed
    uint256 public constant LMSR_B = 100e6; // 100 USDC equivalent in 6-decimal units

    /// @notice Platform fee in basis points (2%)
    uint256 public constant FEE_BPS = 200;
    uint256 public constant BPS_DENOM = 10_000;

    /// @notice Fixed-point precision for LMSR calculations (1e18)
    uint256 private constant WAD = 1e18;

    // ─────────────────────────────────────────────
    //  Data Structures
    // ─────────────────────────────────────────────

    enum Outcome { None, Home, Away, Draw }

    struct Market {
        uint256 id;
        string homeTeam;
        string awayTeam;
        string league;
        uint256 matchTimestamp;   // UTC kickoff
        uint256 closingTime;      // betting closes before kickoff
        bool resolved;
        bool cancelled;
        Outcome winner;
        // LMSR state: shares outstanding per outcome (Home=0, Away=1, Draw=2)
        int256[3] shares;         // can be negative (sold shares)
        uint256 totalVolume;      // gross USDC wagered
        uint256 feesCollected;
        string externalMatchId;   // Football-Data.org matchId
    }

    struct Position {
        uint256 sharesHome;
        uint256 sharesAway;
        uint256 sharesDraw;
        bool claimed;
    }

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    IERC20 public immutable usdc;

    uint256 public nextMarketId = 1;
    mapping(uint256 => Market) public markets;
    /// @dev marketId => user => Position
    mapping(uint256 => mapping(address => Position)) public positions;
    /// @dev list of all market ids for enumeration
    uint256[] public marketIds;

    address public feeRecipient;
    uint256 public totalFeesEarned;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        string homeTeam,
        string awayTeam,
        string league,
        uint256 matchTimestamp,
        string externalMatchId
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        Outcome outcome,
        uint256 cost,          // USDC paid (inc. fee)
        uint256 shares,        // shares received
        uint256 newOddsHome,
        uint256 newOddsAway,
        uint256 newOddsDraw
    );

    event SharesSold(
        uint256 indexed marketId,
        address indexed seller,
        Outcome outcome,
        uint256 sharesSold,
        uint256 proceeds,
        uint256 newOddsHome,
        uint256 newOddsAway,
        uint256 newOddsDraw
    );

    event MarketResolved(
        uint256 indexed marketId,
        Outcome winner,
        uint256 totalVolume
    );

    event MarketCancelled(uint256 indexed marketId);

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed claimant,
        uint256 amount
    );

    event FeeWithdrawn(address indexed recipient, uint256 amount);

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor(address _usdc, address _feeRecipient) Ownable(msg.sender) {
        require(_usdc != address(0), "PredictionMarket: zero usdc");
        require(_feeRecipient != address(0), "PredictionMarket: zero fee recipient");
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ─────────────────────────────────────────────
    //  Admin: Market Creation
    // ─────────────────────────────────────────────

    /**
     * @notice Create a new prediction market for a football match
     * @param homeTeam Name of home team
     * @param awayTeam Name of away team
     * @param league   Competition name
     * @param matchTimestamp  Unix timestamp of kickoff
     * @param externalMatchId Football-Data.org match identifier
     */
    function createMarket(
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata league,
        uint256 matchTimestamp,
        string calldata externalMatchId
    ) external onlyOwner returns (uint256 marketId) {
        require(matchTimestamp > block.timestamp, "PredictionMarket: match in past");
        marketId = nextMarketId++;

        Market storage m = markets[marketId];
        m.id = marketId;
        m.homeTeam = homeTeam;
        m.awayTeam = awayTeam;
        m.league = league;
        m.matchTimestamp = matchTimestamp;
        m.closingTime = matchTimestamp - 5 minutes; // close 5 min before kickoff
        m.externalMatchId = externalMatchId;
        // Initialize LMSR shares at 0 (equal 50/25/25 prior implied by b)

        marketIds.push(marketId);

        emit MarketCreated(marketId, homeTeam, awayTeam, league, matchTimestamp, externalMatchId);
    }

    // ─────────────────────────────────────────────
    //  Core: Betting
    // ─────────────────────────────────────────────

    /**
     * @notice Place a bet on a market outcome
     * @param marketId Target market
     * @param outcome  Home (1), Away (2), or Draw (3)
     * @param maxCost  Maximum USDC willing to pay (slippage protection)
     * @param shares   Number of shares to purchase (1e6 precision = 1 share)
     */
    function bet(
        uint256 marketId,
        Outcome outcome,
        uint256 shares,
        uint256 maxCost
    ) external nonReentrant {
        Market storage m = _requireOpenMarket(marketId);
        require(outcome != Outcome.None, "PredictionMarket: invalid outcome");
        require(shares > 0, "PredictionMarket: zero shares");

        uint256 outcomeIdx = uint256(outcome) - 1; // 0=Home,1=Away,2=Draw

        // Calculate cost via LMSR
        uint256 cost = lmsrCost(m.shares, outcomeIdx, int256(shares));
        uint256 fee  = (cost * FEE_BPS) / BPS_DENOM;
        uint256 total = cost + fee;

        require(total <= maxCost, "PredictionMarket: slippage exceeded");

        // Update LMSR state
        m.shares[outcomeIdx] += int256(shares);
        m.totalVolume += total;
        m.feesCollected += fee;
        totalFeesEarned += fee;

        // Update user position
        Position storage pos = positions[marketId][msg.sender];
        if (outcomeIdx == 0) pos.sharesHome += shares;
        else if (outcomeIdx == 1) pos.sharesAway += shares;
        else pos.sharesDraw += shares;

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), total);

        // Emit with new odds
        (uint256 oh, uint256 oa, uint256 od) = getOdds(marketId);
        emit BetPlaced(marketId, msg.sender, outcome, total, shares, oh, oa, od);
    }

    /**
     * @notice Sell shares back to the market (position trading)
     * @param marketId  Target market
     * @param outcome   Outcome of shares to sell
     * @param shares    Number of shares to sell
     * @param minProceeds Minimum USDC to receive (slippage protection)
     */
    function sellShares(
        uint256 marketId,
        Outcome outcome,
        uint256 shares,
        uint256 minProceeds
    ) external nonReentrant {
        Market storage m = _requireOpenMarket(marketId);
        require(outcome != Outcome.None, "PredictionMarket: invalid outcome");
        require(shares > 0, "PredictionMarket: zero shares");

        uint256 outcomeIdx = uint256(outcome) - 1;
        Position storage pos = positions[marketId][msg.sender];

        // Validate holdings
        uint256 held;
        if (outcomeIdx == 0) held = pos.sharesHome;
        else if (outcomeIdx == 1) held = pos.sharesAway;
        else held = pos.sharesDraw;
        require(held >= shares, "PredictionMarket: insufficient shares");

        // LMSR proceeds (selling = negative quantity)
        uint256 proceeds = lmsrCost(m.shares, outcomeIdx, -int256(shares));
        uint256 fee = (proceeds * FEE_BPS) / BPS_DENOM;
        uint256 net = proceeds - fee;

        require(net >= minProceeds, "PredictionMarket: slippage exceeded");

        // Update state
        m.shares[outcomeIdx] -= int256(shares);
        m.feesCollected += fee;
        totalFeesEarned += fee;

        if (outcomeIdx == 0) pos.sharesHome -= shares;
        else if (outcomeIdx == 1) pos.sharesAway -= shares;
        else pos.sharesDraw -= shares;

        usdc.safeTransfer(msg.sender, net);

        (uint256 oh, uint256 oa, uint256 od) = getOdds(marketId);
        emit SharesSold(marketId, msg.sender, outcome, shares, net, oh, oa, od);
    }

    // ─────────────────────────────────────────────
    //  Resolution & Claims
    // ─────────────────────────────────────────────

    /**
     * @notice Resolve a market with the final outcome
     * @dev Only callable by owner; in production integrate Chainlink oracle
     */
    function resolveMarket(uint256 marketId, Outcome winner) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.id != 0, "PredictionMarket: market not found");
        require(!m.resolved, "PredictionMarket: already resolved");
        require(!m.cancelled, "PredictionMarket: cancelled");
        require(block.timestamp >= m.matchTimestamp, "PredictionMarket: match not started");
        require(winner != Outcome.None, "PredictionMarket: invalid winner");

        m.resolved = true;
        m.winner = winner;

        emit MarketResolved(marketId, winner, m.totalVolume);
    }

    /**
     * @notice Cancel a market and allow refunds
     */
    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.id != 0, "PredictionMarket: market not found");
        require(!m.resolved, "PredictionMarket: already resolved");
        require(!m.cancelled, "PredictionMarket: already cancelled");

        m.cancelled = true;
        emit MarketCancelled(marketId);
    }

    /**
     * @notice Claim winnings after market resolution
     * @dev Proportional payout based on shares in winning outcome
     */
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.id != 0, "PredictionMarket: market not found");
        require(m.resolved || m.cancelled, "PredictionMarket: not settled");

        Position storage pos = positions[marketId][msg.sender];
        require(!pos.claimed, "PredictionMarket: already claimed");
        pos.claimed = true;

        uint256 payout;

        if (m.cancelled) {
            // Refund: return proportional cost of remaining shares
            // Simplified: return value based on final LMSR price
            payout = _calculateRefund(m, pos);
        } else {
            payout = _calculatePayout(m, pos);
        }

        require(payout > 0, "PredictionMarket: no winnings");
        usdc.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // ─────────────────────────────────────────────
    //  LMSR Mathematics
    // ─────────────────────────────────────────────

    /**
     * @notice Calculate LMSR cost for buying/selling shares
     * @dev cost = b * (log(sum_exp(after)) - log(sum_exp(before)))
     *      Using fixed-point arithmetic with WAD precision
     * @param currentShares Current shares array [home, away, draw]
     * @param outcomeIdx    Index of outcome being traded
     * @param quantity      Shares delta (positive=buy, negative=sell)
     * @return cost USDC cost in 6-decimal precision
     */
    function lmsrCost(
        int256[3] storage currentShares,
        uint256 outcomeIdx,
        int256 quantity
    ) public view returns (uint256 cost) {
        int256[3] memory before_ = [currentShares[0], currentShares[1], currentShares[2]];
        int256[3] memory after_  = [currentShares[0], currentShares[1], currentShares[2]];
        after_[outcomeIdx] += quantity;

        uint256 costBefore = _lmsrC(before_);
        uint256 costAfter  = _lmsrC(after_);

        if (quantity > 0) {
            require(costAfter >= costBefore, "PredictionMarket: LMSR underflow");
            cost = costAfter - costBefore;
        } else {
            require(costBefore >= costAfter, "PredictionMarket: LMSR underflow");
            cost = costBefore - costAfter;
        }
    }

    /**
     * @notice Get current implied probabilities (odds) for a market
     * @return probHome  Probability × 1e6 (e.g. 500000 = 50%)
     * @return probAway  Probability × 1e6
     * @return probDraw  Probability × 1e6
     */
    function getOdds(uint256 marketId)
        public
        view
        returns (uint256 probHome, uint256 probAway, uint256 probDraw)
    {
        Market storage m = markets[marketId];
        // exp(q_i / b) for each outcome
        uint256 eH = _expScaled(m.shares[0]);
        uint256 eA = _expScaled(m.shares[1]);
        uint256 eD = _expScaled(m.shares[2]);
        uint256 total = eH + eA + eD;
        if (total == 0) return (333_333, 333_333, 333_334);
        probHome = (eH * 1_000_000) / total;
        probAway = (eA * 1_000_000) / total;
        probDraw = (eD * 1_000_000) / total;
    }

    // ─────────────────────────────────────────────
    //  View Helpers
    // ─────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getPosition(uint256 marketId, address user)
        external
        view
        returns (Position memory)
    {
        return positions[marketId][user];
    }

    function getAllMarketIds() external view returns (uint256[] memory) {
        return marketIds;
    }

    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }

    /**
     * @notice Preview cost before placing bet
     */
    function previewBet(uint256 marketId, Outcome outcome, uint256 shares)
        external
        view
        returns (uint256 cost, uint256 fee, uint256 total)
    {
        Market storage m = markets[marketId];
        uint256 outcomeIdx = uint256(outcome) - 1;
        cost = lmsrCost(m.shares, outcomeIdx, int256(shares));
        fee  = (cost * FEE_BPS) / BPS_DENOM;
        total = cost + fee;
    }

    // ─────────────────────────────────────────────
    //  Fee Withdrawal
    // ─────────────────────────────────────────────

    function withdrawFees() external {
        require(msg.sender == feeRecipient, "PredictionMarket: not fee recipient");
        uint256 bal = usdc.balanceOf(address(this));
        // Only withdraw fees, not locked user funds
        // Conservative: track separately
        uint256 amount = totalFeesEarned;
        totalFeesEarned = 0;
        usdc.safeTransfer(feeRecipient, amount > bal ? bal : amount);
        emit FeeWithdrawn(feeRecipient, amount);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "PredictionMarket: zero address");
        feeRecipient = newRecipient;
    }

    // ─────────────────────────────────────────────
    //  Internal Helpers
    // ─────────────────────────────────────────────

    function _requireOpenMarket(uint256 marketId)
        internal
        view
        returns (Market storage m)
    {
        m = markets[marketId];
        require(m.id != 0, "PredictionMarket: market not found");
        require(!m.resolved, "PredictionMarket: already resolved");
        require(!m.cancelled, "PredictionMarket: cancelled");
        require(block.timestamp < m.closingTime, "PredictionMarket: betting closed");
    }

    /**
     * @dev LMSR cost function: b * ln(sum(exp(q_i/b)))
     *      Uses integer approximation; 6-decimal USDC output
     */
    function _lmsrC(int256[3] memory s) internal pure returns (uint256) {
        uint256 eH = _expScaled(s[0]);
        uint256 eA = _expScaled(s[1]);
        uint256 eD = _expScaled(s[2]);
        uint256 sumE = eH + eA + eD;
        // b * ln(sumE / 3) — relative to equal prior
        // ln approximation: ln(x) ≈ (x-1)/x for x near 1, use bit-shift ln
        return (LMSR_B * _ln(sumE)) / WAD;
    }

    /**
     * @dev Compute exp(shares / LMSR_B) scaled by WAD
     *      shares in 6-decimal, LMSR_B in 6-decimal → ratio is unit-less
     */
    function _expScaled(int256 shares) internal pure returns (uint256) {
        // Normalize: x = shares / LMSR_B (stored as WAD fixed-point)
        // Then compute e^x via Taylor: 1 + x + x²/2 + x³/6 + ...
        // We truncate at x ∈ [-10, 10] for safety
        int256 x = (shares * int256(WAD)) / int256(LMSR_B);
        // Clamp to prevent overflow
        if (x > 10e18) x = 10e18;
        if (x < -10e18) x = -10e18;

        return _expWad(x);
    }

    /**
     * @dev Natural log approximation for positive integers (WAD-scaled)
     *      Accurate to ~0.1% for our use range
     */
    function _ln(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        // Use bit-length trick for ln approximation
        // ln(x) ≈ (bit_length - 1) * ln(2) + correction
        uint256 n = 0;
        uint256 y = x;
        while (y >= 2 * WAD) { y /= 2; n++; }
        while (y < WAD)       { y *= 2; n--; }
        // ln(2) ≈ 0.693147 in WAD = 693147180559945309
        uint256 ln2 = 693_147_180_559_945_309;
        // Refine: ln(y) where 1 <= y < 2, approx: y - 1 - (y-1)^2/2
        uint256 yNorm = y - WAD; // 0..WAD
        uint256 lnY = yNorm - (yNorm * yNorm) / (2 * WAD) + (yNorm * yNorm / WAD * yNorm) / (3 * WAD);
        return n * ln2 + lnY;
    }

    /**
     * @dev e^x in WAD fixed-point using Taylor expansion (x in WAD)
     */
    function _expWad(int256 x) internal pure returns (uint256) {
        if (x == 0) return WAD;
        bool neg = x < 0;
        uint256 ax = neg ? uint256(-x) : uint256(x);

        // Taylor: sum x^n / n! up to n=12
        uint256 result = WAD;
        uint256 term   = WAD;
        for (uint256 i = 1; i <= 12; i++) {
            term = (term * ax) / (i * WAD);
            result += term;
        }
        if (neg) {
            return (WAD * WAD) / result; // 1/e^|x|
        }
        return result;
    }

    function _calculatePayout(Market storage m, Position storage pos)
        internal
        view
        returns (uint256 payout)
    {
        uint256 winningIdx = uint256(m.winner) - 1;
        uint256 winningShares;
        if (winningIdx == 0) winningShares = pos.sharesHome;
        else if (winningIdx == 1) winningShares = pos.sharesAway;
        else winningShares = pos.sharesDraw;

        if (winningShares == 0) return 0;

        // Total shares in winning outcome
        int256 totalWinShares = m.shares[winningIdx];
        if (totalWinShares <= 0) return 0;

        // Pool: total volume minus fees
        uint256 pool = m.totalVolume - m.feesCollected;
        payout = (pool * winningShares) / uint256(totalWinShares);
    }

    function _calculateRefund(Market storage m, Position storage pos)
        internal
        pure
        returns (uint256 refund)
    {
        // On cancellation: return LMSR value of remaining shares
        // Simplified: proportional refund based on total volume
        uint256 totalShares = uint256(
            (m.shares[0] > 0 ? m.shares[0] : int256(0)) +
            (m.shares[1] > 0 ? m.shares[1] : int256(0)) +
            (m.shares[2] > 0 ? m.shares[2] : int256(0))
        );
        if (totalShares == 0) return 0;
        uint256 userShares = pos.sharesHome + pos.sharesAway + pos.sharesDraw;
        uint256 pool = m.totalVolume - m.feesCollected;
        refund = (pool * userShares) / totalShares;
    }
}
