// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFraudRegistry {
    function getFlagCount(address target) external view returns (uint256);
}

contract ContractIntel {
    struct Intel {
        string summary;
        uint8 riskScore;
        uint256 lastScanned;
        address scannedBy;
        bool verified;
    }

    address public owner;
    address public scannerBot;
    IFraudRegistry public fraudRegistry;

    mapping(address => Intel) public intel;
    address[] public scannedAddresses;

    event IntelSubmitted(address indexed target, uint8 riskScore, bool verified, uint256 timestamp);
    event ScannerBotUpdated(address indexed newBot);
    event FraudRegistryUpdated(address indexed newRegistry);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyScanner() {
        require(msg.sender == scannerBot || msg.sender == owner, "not authorized scanner");
        _;
    }

    constructor(address _scannerBot) {
        owner = msg.sender;
        scannerBot = _scannerBot;
    }

    function submitIntel(
        address target,
        string calldata summary,
        uint8 riskScore,
        bool verified
    ) external onlyScanner {
        require(riskScore <= 100, "score out of range");

        if (intel[target].lastScanned == 0) {
            scannedAddresses.push(target);
        }

        intel[target] = Intel({
            summary: summary,
            riskScore: riskScore,
            lastScanned: block.timestamp,
            scannedBy: msg.sender,
            verified: verified
        });

        emit IntelSubmitted(target, riskScore, verified, block.timestamp);
    }

    function getFullIntel(address target)
        external
        view
        returns (
            string memory summary,
            uint8 riskScore,
            uint256 lastScanned,
            bool verified,
            uint256 flagCount
        )
    {
        Intel memory i = intel[target];
        uint256 flags = 0;
        if (address(fraudRegistry) != address(0)) {
            flags = fraudRegistry.getFlagCount(target);
        }
        return (i.summary, i.riskScore, i.lastScanned, i.verified, flags);
    }

    function totalScanned() external view returns (uint256) {
        return scannedAddresses.length;
    }

    function setScannerBot(address _bot) external onlyOwner {
        scannerBot = _bot;
        emit ScannerBotUpdated(_bot);
    }

    function setFraudRegistry(address _registry) external onlyOwner {
        fraudRegistry = IFraudRegistry(_registry);
        emit FraudRegistryUpdated(_registry);
    }
}
