import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { PredictionMarket, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PredictionMarket", () => {
  let market: PredictionMarket;
  let usdc: MockUSDC;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;

  const ONE_USDC = 1_000_000n; // 1 USDC in 6-decimal
  const MATCH_DELAY = 3600 * 24; // 24h from now

  beforeEach(async () => {
    [owner, alice, bob, feeRecipient] = await ethers.getSigners();

    // Deploy MockUSDC
    const USDC = await ethers.getContractFactory("MockUSDC");
    usdc = await USDC.deploy();

    // Deploy PredictionMarket
    const PM = await ethers.getContractFactory("PredictionMarket");
    market = await PM.deploy(await usdc.getAddress(), feeRecipient.address);

    // Fund test accounts via faucet
    await usdc.connect(alice).faucet();
    await usdc.connect(bob).faucet();

    // Approve market to spend USDC
    const marketAddr = await market.getAddress();
    await usdc.connect(alice).approve(marketAddr, ethers.MaxUint256);
    await usdc.connect(bob).approve(marketAddr, ethers.MaxUint256);
  });

  // ─────────────────────────────────────────────
  //  Market Creation
  // ─────────────────────────────────────────────

  describe("createMarket", () => {
    it("creates a market with correct metadata", async () => {
      const now = await time.latest();
      const matchTs = now + MATCH_DELAY;

      await expect(
        market.createMarket("Arsenal", "Chelsea", "Premier League", matchTs, "12345")
      )
        .to.emit(market, "MarketCreated")
        .withArgs(1, "Arsenal", "Chelsea", "Premier League", matchTs, "12345");

      const m = await market.getMarket(1);
      expect(m.homeTeam).to.equal("Arsenal");
      expect(m.awayTeam).to.equal("Chelsea");
      expect(m.resolved).to.be.false;
      expect(m.cancelled).to.be.false;
    });

    it("reverts if match is in the past", async () => {
      const past = (await time.latest()) - 100;
      await expect(
        market.createMarket("A", "B", "L", past, "0")
      ).to.be.revertedWith("PredictionMarket: match in past");
    });

    it("only owner can create markets", async () => {
      const ts = (await time.latest()) + MATCH_DELAY;
      await expect(
        market.connect(alice).createMarket("A", "B", "L", ts, "0")
      ).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });
  });

  // ─────────────────────────────────────────────
  //  Odds / LMSR
  // ─────────────────────────────────────────────

  describe("LMSR / Odds", () => {
    beforeEach(async () => {
      const ts = (await time.latest()) + MATCH_DELAY;
      await market.createMarket("Arsenal", "Chelsea", "PL", ts, "1");
    });

    it("returns equal-ish odds on fresh market (~33% each)", async () => {
      const [home, away, draw] = await market.getOdds(1);
      // Each should be ~333333 (33.33%)
      expect(home).to.be.closeTo(333_333n, 5_000n);
      expect(away).to.be.closeTo(333_333n, 5_000n);
      expect(draw).to.be.closeTo(333_334n, 5_000n);
      expect(home + away + draw).to.equal(1_000_000n);
    });

    it("odds shift after a bet on Home", async () => {
      const [, , cost] = await market.previewBet(1, 1, 10n * ONE_USDC);
      await market.connect(alice).bet(1, 1, 10n * ONE_USDC, cost + ONE_USDC);

      const [home, away, draw] = await market.getOdds(1);
      expect(home).to.be.greaterThan(333_333n); // Home prob increased
      expect(away).to.be.lessThan(333_334n);
      expect(home + away + draw).to.equal(1_000_000n);
    });

    it("previewBet matches actual cost", async () => {
      const shares = 5n * ONE_USDC;
      const [, , total] = await market.previewBet(1, 2, shares);

      const aliceBefore = await usdc.balanceOf(alice.address);
      await market.connect(alice).bet(1, 2, shares, total);
      const aliceAfter = await usdc.balanceOf(alice.address);

      expect(aliceBefore - aliceAfter).to.equal(total);
    });
  });

  // ─────────────────────────────────────────────
  //  Betting
  // ─────────────────────────────────────────────

  describe("bet", () => {
    beforeEach(async () => {
      const ts = (await time.latest()) + MATCH_DELAY;
      await market.createMarket("Arsenal", "Chelsea", "PL", ts, "1");
    });

    it("records position correctly", async () => {
      const shares = 10n * ONE_USDC;
      const [, , total] = await market.previewBet(1, 1, shares);
      await market.connect(alice).bet(1, 1, shares, total);

      const pos = await market.getPosition(1, alice.address);
      expect(pos.sharesHome).to.equal(shares);
      expect(pos.sharesAway).to.equal(0n);
    });

    it("reverts on slippage breach", async () => {
      const [, , total] = await market.previewBet(1, 1, 10n * ONE_USDC);
      await expect(
        market.connect(alice).bet(1, 1, 10n * ONE_USDC, total - 1n)
      ).to.be.revertedWith("PredictionMarket: slippage exceeded");
    });

    it("reverts after betting closes", async () => {
      const now = await time.latest();
      const ts = now + 400; // closes in 5 min = 300s, so closing = ts - 300
      await market.createMarket("X", "Y", "L", ts, "2");
      await time.increase(200); // advance past closing time

      await expect(
        market.connect(alice).bet(2, 1, ONE_USDC, 1_000_000_000n)
      ).to.be.revertedWith("PredictionMarket: betting closed");
    });

    it("emits BetPlaced event", async () => {
      const shares = 5n * ONE_USDC;
      const [, , total] = await market.previewBet(1, 1, shares);
      await expect(market.connect(alice).bet(1, 1, shares, total)).to.emit(
        market,
        "BetPlaced"
      );
    });
  });

  // ─────────────────────────────────────────────
  //  Selling Shares
  // ─────────────────────────────────────────────

  describe("sellShares", () => {
    beforeEach(async () => {
      const ts = (await time.latest()) + MATCH_DELAY;
      await market.createMarket("Arsenal", "Chelsea", "PL", ts, "1");
      // Alice buys Home shares
      const shares = 20n * ONE_USDC;
      const [, , total] = await market.previewBet(1, 1, shares);
      await market.connect(alice).bet(1, 1, shares, total);
    });

    it("allows selling partial position", async () => {
      const pos = await market.getPosition(1, alice.address);
      const sell = pos.sharesHome / 2n;

      const balBefore = await usdc.balanceOf(alice.address);
      await market.connect(alice).sellShares(1, 1, sell, 0n);
      const balAfter = await usdc.balanceOf(alice.address);

      expect(balAfter).to.be.greaterThan(balBefore);

      const posAfter = await market.getPosition(1, alice.address);
      expect(posAfter.sharesHome).to.equal(pos.sharesHome - sell);
    });

    it("reverts on insufficient shares", async () => {
      await expect(
        market.connect(bob).sellShares(1, 1, ONE_USDC, 0n)
      ).to.be.revertedWith("PredictionMarket: insufficient shares");
    });
  });

  // ─────────────────────────────────────────────
  //  Resolution & Claims
  // ─────────────────────────────────────────────

  describe("resolution and claims", () => {
    let matchTs: number;

    beforeEach(async () => {
      matchTs = (await time.latest()) + MATCH_DELAY;
      await market.createMarket("Arsenal", "Chelsea", "PL", matchTs, "1");

      // Alice bets Home, Bob bets Away
      const aliceShares = 50n * ONE_USDC;
      const [, , aliceTotal] = await market.previewBet(1, 1, aliceShares);
      await market.connect(alice).bet(1, 1, aliceShares, aliceTotal);

      const bobShares = 30n * ONE_USDC;
      const [, , bobTotal] = await market.previewBet(1, 2, bobShares);
      await market.connect(bob).bet(1, 2, bobShares, bobTotal);
    });

    it("resolves market and pays winner", async () => {
      await time.increaseTo(matchTs + 1);
      await market.resolveMarket(1, 1); // Home wins

      const aliceBefore = await usdc.balanceOf(alice.address);
      await market.connect(alice).claimWinnings(1);
      const aliceAfter = await usdc.balanceOf(alice.address);

      expect(aliceAfter).to.be.greaterThan(aliceBefore);
    });

    it("loser gets nothing", async () => {
      await time.increaseTo(matchTs + 1);
      await market.resolveMarket(1, 1); // Home wins

      await expect(
        market.connect(bob).claimWinnings(1)
      ).to.be.revertedWith("PredictionMarket: no winnings");
    });

    it("cannot double-claim", async () => {
      await time.increaseTo(matchTs + 1);
      await market.resolveMarket(1, 1);
      await market.connect(alice).claimWinnings(1);
      await expect(
        market.connect(alice).claimWinnings(1)
      ).to.be.revertedWith("PredictionMarket: already claimed");
    });

    it("cancels market and allows refund", async () => {
      await market.cancelMarket(1);
      const aliceBefore = await usdc.balanceOf(alice.address);
      await market.connect(alice).claimWinnings(1);
      const aliceAfter = await usdc.balanceOf(alice.address);
      expect(aliceAfter).to.be.greaterThan(aliceBefore);
    });
  });

  // ─────────────────────────────────────────────
  //  Security
  // ─────────────────────────────────────────────

  describe("security", () => {
    it("prevents resolving before match starts", async () => {
      const ts = (await time.latest()) + MATCH_DELAY;
      await market.createMarket("A", "B", "L", ts, "1");
      await expect(market.resolveMarket(1, 1)).to.be.revertedWith(
        "PredictionMarket: match not started"
      );
    });

    it("prevents double resolution", async () => {
      const ts = (await time.latest()) + 10;
      await market.createMarket("A", "B", "L", ts, "1");
      await time.increase(20);
      await market.resolveMarket(1, 1);
      await expect(market.resolveMarket(1, 2)).to.be.revertedWith(
        "PredictionMarket: already resolved"
      );
    });
  });
});
