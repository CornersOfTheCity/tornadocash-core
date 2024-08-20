pragma circom 2.0.0;

// include "../node_modules/circomlib/circuits/bitify.circom";
// include "../node_modules/circomlib/circuits/pedersen.circom";

include "merkleTree.circom";
include "commitmentHasher.circom";

// computes Pedersen(nullifier + secret)
// template CommitmentHasher() {
//     signal input nullifier;
//     signal input secret;
//     signal output commitment;
//     signal output nullifierHash;

//     component commitmentHasher = Pedersen(496);
//     component nullifierHasher = Pedersen(248);
//     component nullifierBits = Num2Bits(248);
//     component secretBits = Num2Bits(248);
//     nullifierBits.in <== nullifier;
//     secretBits.in <== secret;
//     for (var i = 0; i < 248; i++) {
//         nullifierHasher.in[i] <== nullifierBits.out[i];
//         commitmentHasher.in[i] <== nullifierBits.out[i];
//         commitmentHasher.in[i + 248] <== secretBits.out[i];
//     }

//     commitment <== commitmentHasher.out[0];
//     nullifierHash <== nullifierHasher.out[0];
// }

template Withdraw(levels){
    signal input root;
    signal input nullifierHash;
    signal input recipient;
    signal input relayer;
    signal input fee;
    signal input refund;

    signal input nullifier; //所有的private signal 意味着变量会被隐藏到证明中
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;
    hasher.nullifierHash === nullifierHash;

    component tree = MerkleTreeChecker(levels);
    tree.leaf <== hasher.commitment;
    
    for (var i = 0; i < levels; i++){
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    tree.root === root;

    //预防取款时发生的抢跑(frontrunning)攻击
    signal recipientSquare;
    signal feeSquare;
    signal relayerSquare;
    signal refundSquare;
    recipientSquare <== recipient * recipient;
    feeSquare <== fee * fee;
    relayerSquare <== relayer * relayer;
    refundSquare <== refund * refund;
}

component main{public [root,nullifierHash,recipient,relayer,fee,refund]} = Withdraw(20);