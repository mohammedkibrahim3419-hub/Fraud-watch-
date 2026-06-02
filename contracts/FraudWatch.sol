// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FraudWatch {
    struct Report {
        address reporter;
        address target;
        string category;
        string riskLevel;
        string evidence;
        uint256 upvotes;
        bool flagged;
        uint256 timestamp;
    }

    Report[] public reports;
    uint256 public todayStart;
    uint256 public todayCount;

    event ReportSubmitted(uint256 indexed id, address indexed target, string category);
    event Upvoted(uint256 indexed id, address indexed voter);

    constructor() {
        todayStart = block.timestamp - (block.timestamp % 86400);
    }

    function submitReport(
        address _target,
        string memory _category,
        string memory _riskLevel,
        string memory _evidence
    ) external {
        if (block.timestamp >= todayStart + 86400) {
            todayStart = block.timestamp - (block.timestamp % 86400);
            todayCount = 0;
        }
        reports.push(Report({
            reporter: msg.sender,
            target: _target,
            category: _category,
            riskLevel: _riskLevel,
            evidence: _evidence,
            upvotes: 0,
            flagged: keccak256(bytes(_riskLevel)) == keccak256(bytes("Critical")) ||
                     keccak256(bytes(_riskLevel)) == keccak256(bytes("High")),
            timestamp: block.timestamp
        }));
        todayCount++;
        emit ReportSubmitted(reports.length - 1, _target, _category);
    }

    function upvote(uint256 _id) external {
        require(_id < reports.length, "Invalid ID");
        reports[_id].upvotes++;
        emit Upvoted(_id, msg.sender);
    }

    function getStats() external view returns (
        uint256 total,
        uint256 today,
        uint256 flagged,
        uint256 totalUpvotes
    ) {
        total = reports.length;
        today = todayCount;
        uint256 f = 0;
        uint256 u = 0;
        for (uint256 i = 0; i < reports.length; i++) {
            if (reports[i].flagged) f++;
            u += reports[i].upvotes;
        }
        return (total, todayCount, f, u);
    }

    function getReports(uint256 offset, uint256 limit) external view returns (Report[] memory) {
        uint256 end = offset + limit > reports.length ? reports.length : offset + limit;
        Report[] memory result = new Report[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = reports[i];
        }
        return result;
    }
}
