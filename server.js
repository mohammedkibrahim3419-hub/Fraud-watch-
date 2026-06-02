const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());

const CONTRACT_ADDRESS = "0x623593FA516EAF368369A073E5de9B6504f85607";
const ABI = [
  "function getStats() external view returns (uint256 total, uint256 today, uint256 flagged, uint256 totalUpvotes)"
];

const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

app.get("/api/stats", async (req, res) => {
  try {
    const [total, today, flagged, upvotes] = await contract.getStats();
    res.json({
      total: total.toString(),
      today: today.toString(),
      flagged: flagged.toString(),
      upvotes: upvotes.toString()
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stats API running on port ${PORT}`));
