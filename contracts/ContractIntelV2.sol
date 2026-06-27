// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFraudRegistry {
    function getFlagCount(address target) external view returns (uint256);
}

contract ContractIntelV2 {
    struct Intel {
        string summary;
        uint8 riskScore;
        uint256 lastScanned;
        address submittedBy;
        bool verified;
        bool sponsored;
    }

    address public owner;
    address public scannerBot;
    address public authorizedSigner;
    IFraudRegistry public fraudRegistry;

    mapping(address => Intel) public intel;
    mapping(bytes32 => bool) public usedSignatures;
    address[] public scannedAddresses;

    event IntelSubmitted(address indexed target, uint8 riskScore, bool verified, bool sponsored, uint256 timestamp);
    event ScannerBotUpdated(address indexed newBot);
    event AuthorizedSignerUpdated(address indexed newSigner);
    event FraudRegistryUpdated(address indexed newRegistry);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyScanner() {
        require(msg.sender == scannerBot || msg.sender == owner, "not authorized scanner");
        _;
    }

    constructor(address _scannerBot, address _authorizedSigner) {
        owner = msg.sender;
        scannerBot = _scannerBot;
        authorizedSigner = _authorizedSigner;
    }

    function submitIntel(
        address target,
        string calldata summary,
        uint8 riskScore,
        bool verified
    ) external onlyScanner {
        _store(target, summary, riskScore, verified, msg.sender, false);
    }

    function submitIntelWithAuth(
        address target,
        string calldata summary,
        uint8 riskScore,
        bool verified,
        uint256 nonce,
        bytes calldata signature
    ) external {
        bytes32 hash = _hashIntel(target, summary, riskScore, verified, nonce);
        require(!usedSignatures[hash], "signature already used");
        require(_recoverSigner(hash, signature) == authorizedSigner, "invalid signature");

        usedSignatures[hash] = true;
        _store(target, summary, riskScore, verified, msg.sender, true);
    }

    function submitIntelBatch(
        address[] calldata targets,
        string[] calldata summaries,
        uint8[] calldata riskScores,
        bool[] calldata verifieds,
        uint256[] calldata nonces,
        bytes[] calldata signatures
    ) external {
        uint256 len = targets.length;
        require(
            len == summaries.length &&
            len == riskScores.length &&
            len == verifieds.length &&
            len == nonces.length &&
            len == signatures.length,
            "array length mismatch"
        );
        require(len > 0, "empty batch");

        for (uint256 i = 0; i < len; i++) {
            bytes32 hash = _hashIntel(targets[i], summaries[i], riskScores[i], verifieds[i], nonces[i]);
            require(!usedSignatures[hash], "signature already used");
            require(_recoverSigner(hash, signatures[i]) == authorizedSigner, "invalid signature");

            usedSignatures[hash] = true;
            _store(targets[i], summaries[i], riskScores[i], verifieds[i], msg.sender, true);
        }
    }

    function _store(
        address target,
        string memory summary,
        uint8 riskScore,
        bool verified,
        address submittedBy,
        bool sponsored
    ) internal {
        require(riskScore <= 100, "score out of range");

        if (intel[target].lastScanned == 0) {
            scannedAddresses.push(target);
        }

        intel[target] = Intel({
            summary: summary,
            riskScore: riskScore,
            lastScanned: block.timestamp,
            submittedBy: submittedBy,
            verified: verified,
            sponsored: sponsored
        });

        emit IntelSubmitted(target, riskScore, verified, sponsored, block.timestamp);
    }

    function _hashIntel(
        address target,
        string memory summary,
        uint8 riskScore,
        bool verified,
        uint256 nonce
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(address(this), block.chainid, target, summary, riskScore, verified, nonce)
        );
    }

    function _recoverSigner(bytes32 hash, bytes calldata signature) internal pure returns (address) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        require(signature.length == 65, "invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;

        return ecrecover(ethSignedHash, v, r, s);
    }

    function getFullIntel(address target)
        external
        view
        returns (
            string memory summary,
            uint8 riskScore,
            uint256 lastScanned,
            bool verified,
            bool sponsored,
            uint256 flagCount
        )
    {
        Intel memory i = intel[target];
        uint256 flags = 0;
        if (address(fraudRegistry) != address(0)) {
            flags = fraudRegistry.getFlagCount(target);
        }
        return (i.summary, i.riskScore, i.lastScanned, i.verified, i.sponsored, flags);
    }

    function totalScanned() external view returns (uint256) {
        return scannedAddresses.length;
    }

    function setScannerBot(address _bot) external onlyOwner {
        scannerBot = _bot;
        emit ScannerBotUpdated(_bot);
    }

    function setAuthorizedSigner(address _signer) external onlyOwner {
        authorizedSigner = _signer;
        emit AuthorizedSignerUpdated(_signer);
    }

    function setFraudRegistry(address _registry) external onlyOwner {
        fraudRegistry = IFraudRegistry(_registry);
        emit FraudRegistryUpdated(_registry);
    }
}
