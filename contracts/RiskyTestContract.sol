// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RiskyTestContract {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function withdrawAll(address token) external onlyOwner {
    }

    function riskyCall(address target, uint256 amount) external onlyOwner {
        (bool ok, ) = target.call{value: amount}("");
        require(ok, "call failed");
    }

    function proxyCall(address target, bytes calldata data) external onlyOwner {
        (bool ok, ) = target.delegatecall(data);
        require(ok, "delegatecall failed");
    }

    function destroy() external onlyOwner {
        selfdestruct(payable(owner));
    }
}
