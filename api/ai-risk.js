module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  // Extract data from prompt
  const reportMatch = prompt.match(/Reports: (\d+)/);
  const scoreMatch = prompt.match(/Score: (\d+)/);
  const catsMatch = prompt.match(/Categories: ([^,\n]+)/);
  const addrMatch = prompt.match(/Analyze wallet: (\S+)/);

  const reports = parseInt(reportMatch?.[1] || "0");
  const score = parseInt(scoreMatch?.[1] || "0");
  const cats = catsMatch?.[1]?.trim() || "none";
  const addr = addrMatch?.[1] || "unknown";

  // Determine verdict
  let verdict, signals, tags, recommendation;

  if (score >= 80 || reports >= 5) {
    verdict = "CRITICAL";
    signals = [
      `${reports} community reports filed against this address`,
      `Risk score ${score}/100 — exceeds critical threshold`,
      `Reported categories: ${cats}`
    ];
    tags = ["high-risk", "flagged", cats.split(",")[0].trim().toLowerCase()];
    recommendation = "Avoid all interaction with this address immediately.";
  } else if (score >= 50 || reports >= 3) {
    verdict = "HIGH";
    signals = [
      `${reports} reports on record — pattern suggests malicious activity`,
      `Score ${score}/100 indicates elevated threat level`,
      `Categories flagged: ${cats}`
    ];
    tags = ["suspicious", "monitor", "reported"];
    recommendation = "Exercise extreme caution — do not send funds to this address.";
  } else if (score >= 20 || reports >= 1) {
    verdict = "MEDIUM";
    signals = [
      `${reports} report(s) found — activity warrants attention`,
      `Score ${score}/100 — moderate risk detected`,
      `Reported as: ${cats}`
    ];
    tags = ["caution", "low-reports", "verify"];
    recommendation = "Verify this address through multiple sources before transacting.";
  } else if (score > 0) {
    verdict = "LOW";
    signals = [
      "Minimal on-chain risk signals detected",
      `Score ${score}/100 — low threat level`,
      "No significant community flags"
    ];
    tags = ["low-risk", "unverified", "new"];
    recommendation = "Proceed with standard caution and verify address ownership.";
  } else {
    verdict = "CLEAN";
    signals = [
      "No reports found for this address",
      "Score 0/100 — no known threat signals",
      "Address appears clean in FraudWatch registry"
    ];
    tags = ["clean", "no-reports", "verified"];
    recommendation = "No known threats detected — always verify before large transactions.";
  }

  const summary = verdict === "CLEAN"
    ? `No threat signals detected for ${addr.slice(0,10)}... in the FraudWatch registry. Address currently appears safe based on community data.`
    : `Address ${addr.slice(0,10)}... has been flagged with ${reports} report(s) and a risk score of ${score}/100. Threat category: ${cats}.`;

  res.json({
    content: [{
      type: "text",
      text: JSON.stringify({ verdict, score, summary, signals, recommendation, tags })
    }]
  });
};
