import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const MARKET_ADDRESS = "0x41Fc662F6e64D4FAC4fBC6308647d0C79BDf787A";
  const market = await ethers.getContractAt("PredictionMarket", MARKET_ADDRESS);

  const matchTime = Math.floor(Date.now() / 1000) + 60 * 60 * 48; // 48hrs from now

  const tx = await market.createMarket(
    "Manchester City",
    "Arsenal",
    "Premier League",
    matchTime,
    "match_001"
  );
  await tx.wait();
  console.log("✅ Market created!");
}

main().catch(console.error);
