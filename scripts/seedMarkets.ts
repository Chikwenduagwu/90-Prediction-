import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const MARKET_ADDRESS = "0x41Fc662F6e64D4FAC4fBC6308647d0C79BDf787A";
  const market = await ethers.getContractAt("PredictionMarket", MARKET_ADDRESS);
  const t = Math.floor(Date.now() / 1000) + 60 * 60 * 48;

  const matches = [
    ["Real Madrid", "Barcelona", "La Liga", "match_002"],
    ["PSG", "Bayern Munich", "Champions League", "match_003"],
    ["Liverpool", "Chelsea", "Premier League", "match_004"],
  ];

  for (const [home, away, league, id] of matches) {
    const tx = await market.createMarket(home, away, league, t, id);
    await tx.wait();
    console.log(`✅ ${home} vs ${away} created`);
  }
}

main().catch(console.error);
