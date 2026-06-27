const ARCSCAN_API = 'https://testnet.arcscan.app/api/v2';
const ARC_RPC = 'https://rpc.testnet.arc.network';

const RISK_RULES = [
  { pattern: /selfdestruct\s*\(/i, weight: 35, label: 'contains selfdestruct' },
  { pattern: /delegatecall\s*\(/i, weight: 20, label: 'uses delegatecall (proxy/upgrade risk)' },
  { pattern: /onlyOwner[\s\S]{0,60}(withdraw|transfer)\s*\(\s*\)/i, weight: 15, label: 'owner can withdraw with no parameters (full drain pattern)' },
  { pattern: /function\s+withdraw(All)?\s*\([^)]*\)\s*(external|public)/i, weight: 10, label: 'has a withdrawAll-style function' },
  { pattern: /approve\s*\(\s*[^,]+,\s*type\(uint256\)\.max/i, weight: 15, label: 'grants unlimited token approval' },
  { pattern: /\.call\{value:/i, weight: 8, label: 'uses low-level .call{value:} (reentrancy risk if unguarded)' },
  { pattern: /nonReentrant/i, weight: -10, label: 'has reentrancy guard (positive signal)' },
  { pattern: /Ownable2Step|TimelockController/i, weight: -10, label: 'uses timelock/2-step ownership (positive signal)' },
  { pattern: /onlyOwner/i, weight: 5, label: 'has centralized owner-gated functions' },
  { pattern: /pragma solidity \^?0\.[0-5]\./i, weight: 8, label: 'old compiler version (pre-0.6)' },
  { pattern: /mint\s*\([^)]*\)\s*(external|public)[\s\S]{0,40}onlyOwner/i, weight: 6, label: 'owner can mint new tokens at will' },
];

async function fetchContractData(address) {
  const res = await fetch(`${ARCSCAN_API}/smart-contracts/${address}`);

  if (res.status === 404) {
    const codeRes = await fetch(ARC_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getCode', params: [address, 'latest'], id: 1 }),
    });
    const codeData = await codeRes.json();
    return { verified: false, sourceCode: null, bytecode: codeData.result, contractName: null, proxyType: null };
  }

  if (!res.ok) throw new Error(`ArcScan fetch failed: ${res.status}`);

  const data = await res.json();
  const hasSource = typeof data.source_code === 'string' && data.source_code.length > 0;

  return {
    verified: hasSource,
    sourceCode: hasSource ? data.source_code : null,
    bytecode: data.deployed_bytecode || null,
    contractName: data.name || null,
    proxyType: data.proxy_type || null,
  };
}

function analyzeContract(address, contractData) {
  if (contractData.proxyType && !contractData.verified) {
    return {
      summary: `Contract at ${address} is a proxy (${contractData.proxyType}) with no source indexed on ArcScan. Check its implementation address for full analysis.`,
      riskScore: 55,
      riskFactors: ['proxy contract', 'source on implementation not proxy', 'cannot inspect logic directly'],
      confidence: 'low',
    };
  }

  if (!contractData.verified || !contractData.sourceCode) {
    return {
      summary: `Contract at ${address} has no verified source on ArcScan — only bytecode available. Lack of verification is itself a risk signal.`,
      riskScore: 60,
      riskFactors: ['unverified / no source code', 'cannot inspect logic directly'],
      confidence: 'low',
    };
  }

  const src = contractData.sourceCode;
  let score = 10;
  const matched = [];

  for (const rule of RISK_RULES) {
    if (rule.pattern.test(src)) {
      score += rule.weight;
      matched.push(rule.label);
    }
  }

  score = Math.max(0, Math.min(100, score));
  const name = contractData.contractName || 'This contract';
  const summary = matched.length > 0
    ? `${name} is verified on ArcScan. Pattern scan flagged: ${matched.slice(0, 3).join('; ')}.`
    : `${name} is verified on ArcScan. No high-risk patterns detected; standard structure.`;

  return { summary, riskScore: score, riskFactors: matched.length > 0 ? matched : ['no flagged patterns'], confidence: 'medium' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.body;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid or missing address' });
  }

  try {
    const contractData = await fetchContractData(address);
    const result = analyzeContract(address, contractData);

    return res.status(200).json({
      address,
      verified: contractData.verified,
      contractName: contractData.contractName,
      proxyType: contractData.proxyType || null,
      method: 'rule-based-v1',
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Scan failed', detail: err.message });
  }
}
