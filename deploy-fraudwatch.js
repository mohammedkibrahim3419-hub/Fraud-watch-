const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const abi = JSON.parse(fs.readFileSync("/data/data/com.termux/files/home/fraudwatch/artifacts/contracts_FraudWatch_sol_FraudWatch.abi", "utf8"));
const bin = fs.readFileSync("/data/data/com.termux/files/home/fraudwatch/artifacts/contracts_FraudWatch_sol_FraudWatch.bin", "utf8");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying from:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const factory = new ethers.ContractFactory(abi, "0x" + bin, wallet);
  console.log("Deploying FraudWatch...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("FraudWatch deployed at:", address);
  fs.writeFileSync("/data/data/com.termux/files/home/fraudwatch/.fraudwatch-address", address);
  console.log("Address saved to .fraudwatch-address");
}

main().catch(console.error);
