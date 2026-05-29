import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy MockUSDC
  const Token = await ethers.getContractFactory("MockUSDC");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ MockUSDC deployed to:", tokenAddress);

  // Deploy PredictionMarket with usdc + feeRecipient
  const Market = await ethers.getContractFactory("PredictionMarket");
  const market = await Market.deploy(tokenAddress, deployer.address);
  await market.waitForDeployment();
  console.log("✅ PredictionMarket deployed to:", await market.getAddress());

  console.log("\n🚀 DEPLOYMENT COMPLETE");
  console.log("PredictionMarket:", await market.getAddress());
  console.log("MockUSDC:", tokenAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
