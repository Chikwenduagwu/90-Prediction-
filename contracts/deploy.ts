import { ethers, run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for PredictionMarket + MockUSDC
 * Target: X Layer Mainnet / Testnet
 *
 * Usage:
 *   npx hardhat run contracts/deploy.ts --network xlayer
 *   npx hardhat run contracts/deploy.ts --network xlayer_testnet
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n🚀 Deploying with account:", deployer.address);
  console.log("   Network:", network.name);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("   Balance:", ethers.formatEther(balance), "OKB\n");

  // ── 1. Deploy MockUSDC (testnet only; use real USDC on mainnet) ──────────
  let usdcAddress: string;

  if (network.name === "xlayer_testnet" || network.name === "hardhat") {
    console.log("📦 Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("   MockUSDC deployed →", usdcAddress);

    // Verify on explorer
    if (network.name !== "hardhat") {
      await verifyContract(usdcAddress, []);
    }
  } else {
    // X Layer Mainnet: use official USDC address
    usdcAddress = process.env.USDC_ADDRESS || "";
    if (!usdcAddress) throw new Error("USDC_ADDRESS env var required for mainnet");
    console.log("   Using existing USDC at:", usdcAddress);
  }

  // ── 2. Deploy PredictionMarket ──────────────────────────────────────────
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  console.log("\n📦 Deploying PredictionMarket...");
  console.log("   USDC address:", usdcAddress);
  console.log("   Fee recipient:", feeRecipient);

  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(usdcAddress, feeRecipient);
  await predictionMarket.waitForDeployment();
  const marketAddress = await predictionMarket.getAddress();
  console.log("   PredictionMarket deployed →", marketAddress);

  // Verify on explorer
  if (network.name !== "hardhat") {
    await verifyContract(marketAddress, [usdcAddress, feeRecipient]);
  }

  // ── 3. Seed with sample markets (testnet only) ─────────────────────────
  if (network.name === "xlayer_testnet" || network.name === "hardhat") {
    console.log("\n🌱 Seeding sample markets...");
    const now = Math.floor(Date.now() / 1000);

    const sampleMatches = [
      {
        home: "Arsenal",
        away: "Chelsea",
        league: "Premier League",
        timestamp: now + 3600 * 24, // tomorrow
        externalId: "484135",
      },
      {
        home: "Real Madrid",
        away: "Barcelona",
        league: "La Liga",
        timestamp: now + 3600 * 48,
        externalId: "484136",
      },
      {
        home: "Bayern Munich",
        away: "Borussia Dortmund",
        league: "Bundesliga",
        timestamp: now + 3600 * 72,
        externalId: "484137",
      },
    ];

    for (const match of sampleMatches) {
      const tx = await predictionMarket.createMarket(
        match.home,
        match.away,
        match.league,
        match.timestamp,
        match.externalId
      );
      const receipt = await tx.wait();
      console.log(
        `   Created: ${match.home} vs ${match.away} (tx: ${receipt?.hash.slice(0, 10)}...)`
      );
    }
  }

  // ── 4. Save deployment artifacts ──────────────────────────────────────
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    contracts: {
      MockUSDC:
        network.name !== "xlayer" ? usdcAddress : "N/A (real USDC used)",
      PredictionMarket: marketAddress,
    },
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  const outPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment saved to deployments.json");

  // Print summary
  console.log("\n" + "═".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("═".repeat(60));
  console.log("PredictionMarket:", marketAddress);
  if (network.name !== "xlayer") {
    console.log("MockUSDC:", usdcAddress);
  }
  console.log("\nAdd to your .env:");
  console.log(`VITE_CONTRACT_ADDRESS=${marketAddress}`);
  if (network.name !== "xlayer") {
    console.log(`VITE_USDC_ADDRESS=${usdcAddress}`);
  }
  console.log("═".repeat(60) + "\n");
}

async function verifyContract(address: string, args: unknown[]) {
  console.log(`\n🔍 Verifying ${address}...`);
  try {
    await new Promise((res) => setTimeout(res, 15000)); // wait for propagation
    await run("verify:verify", {
      address,
      constructorArguments: args,
    });
    console.log("   ✅ Verified on explorer");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified");
    } else {
      console.warn("   ⚠️  Verification failed:", message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
