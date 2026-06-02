const { ethers } = require("ethers");

const CONTRACT_ADDRESS = "0x623593FA516EAF368369A073E5de9B6504f85607";
const ABI = [
  "function getStats() external view returns (uint256 total, uint256 today, uint256 flagged, uint256 totalUpvotes)"
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const [total, today, flagged, upvotes] = await contract.getStats();
    res.json({
      total: total.toString(),
      today: today.toString(),
      flagged: flagged.toString(),
      upvotes: upvotes.toString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
