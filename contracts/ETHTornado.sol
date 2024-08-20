// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "./Tornado.sol";

contract ETHTornado is Tornado {
    constructor(
        IVerifier _verifier,
        IHasher _hasher,
        uint256 _denomination,
        uint32 _merkleTreeHeight
    ) Tornado(_verifier, _hasher, _denomination, _merkleTreeHeight) {}

    function _processDeposit() internal override {
        require(
            msg.value == denomination,
            "Please send `mixDenomination` ETH along with transaction"
        );
    }

    function _processWithdraw(
        address payable _recipient,
        address payable _relayer,
        uint256 _fee,
        uint256 _refund
    ) internal override {
        require(msg.value == 0, "Cannot send ETH when withdraw");
        require(_refund == 0, "Refund value cannot be zero");
        (bool success, ) = _recipient.call{value: denomination - _fee}("");
        require(success, "ETH transfer failed!");
        if (_fee > 0) {
            (success, ) = _relayer.call{value: _fee}("");
            require(success, "ETH transfer to _relayer failed!");
        }
    }
}
