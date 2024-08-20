const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const stringRandom = require('string-random');

const fs = require('fs');

const crypto = require('crypto');
const snarkjs = require('snarkjs')
const circomlib = require('circomlib');
const { ethers } = require("hardhat");
const { buildMimcSponge } = require("circomlibjs");
const { randomBytes } = require("ethers");
const { expect } = require("chai");


describe("ETHTornado", function () {
    // const etherWei = hre.ethers.utils.parseUnits("1000", "ether")

    const thousandthWei = hre.ethers.parseUnits("0.001", "ether")
    const etherWei = hre.ethers.parseUnits("1000", "ether")
    const thousandWei = hre.ethers.parseUnits("1000", "ether")
    const millionWei = hre.ethers.parseUnits("1000000", "ether")
    const ZERO_VALUE = ethers.toBigInt('21663839004416932945382355908790599225266501822907911457504978515578255421292') // = keccak256("tornado") % FIELD_SIZE
    var root;
    async function deployETHTornado() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        var hasherjson = JSON.parse(fs.readFileSync('./scripts/Hasher.json', 'utf8'));
        var hashabi = hasherjson.abi;
        var hashcode = hasherjson.bytecode;

        const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
        const verifier = await Verifier.deploy();

        const MiMCSponge = await hre.ethers.getContractFactory(hashabi, hashcode);
        const mimcSponge = await MiMCSponge.deploy();

        const ETHTornado = await hre.ethers.getContractFactory("ETHTornado");
        const ethtornado = await ETHTornado.deploy(verifier.target, mimcSponge.target, etherWei, 20);

        return { verifier, mimcSponge, ethtornado, owner, otherAccount };
    }

    // async function generatenum() {
    //     const mimc = await buildMimcSponge();
    //     const nullifier = ethers.toBigInt(crypto.randomBytes(31))
    //     const secret = ethers.toBigInt(crypto.randomBytes(31))
    //     const commitment = mimc.F.toString(mimc.multiHash([nullifier, secret]))
    //     const nullifierHash = mimc.F.toString(mimc.multiHash([nullifier]))
    //     return {
    //         nullifier: nullifier,
    //         secret: secret,
    //         commitment: commitment,
    //         nullifierHash: nullifierHash
    //     }
    // }
    async function generateCommitment() {
        const mimc = await buildMimcSponge();
        const nullifier = ethers.toBigInt(crypto.randomBytes(31)).toString()
        const secret = ethers.toBigInt(crypto.randomBytes(31)).toString()
        const commitment = mimc.F.toString(mimc.multiHash([nullifier, secret]))
        const nullifierHash = mimc.F.toString(mimc.multiHash([nullifier]))
        return {
            nullifier: nullifier,
            secret: secret,
            commitment: commitment,
            nullifierHash: nullifierHash
        }
    }

    // async function generateDeposit(nullifier, secret, commitment, nullifierHash) {
    //     return {
    //         nullifier: nullifier.toString(),
    //         secret: secret.toString(),
    //         commitment: commitment.toString(),
    //         nullifierHash: nullifierHash.toString()
    //     }
    // }

    // signal input root;
    // signal input nullifierHash;
    // signal input recipient;
    // signal input relayer;
    // signal input fee;
    // signal input refund;
    function calculatePublicinput(owner) {
        const recipient = owner;
        const relayer = owner;
        const fee = thousandthWei;
        const refund = ethers.toBigInt(0);

        return {
            recipient: recipient,
            relayer: relayer,
            fee: fee,
            refund: refund
        }
    }

    async function calculateMerkleRootAndZKProof(publicinput, contract, levels, commitment, wasm, zkey) {
        const mimc = await buildMimcSponge();
        const rootAndPath = await calculateMerkleRootAndPathFromEvents(mimc, contract, levels, commitment.commitment);
        root = rootAndPath.root;

        // signal input root;
        // signal input nullifierHash;
        // signal input recipient;
        // signal input relayer;
        // signal input fee;
        // signal input refund;

        // signal input nullifier; 
        // signal input secret;
        // signal input pathElements[levels];
        // signal input pathIndices[levels];
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            {
                root: rootAndPath.root,
                nullifierHash: commitment.nullifierHash,
                recipient: publicinput.recipient,
                relayer: publicinput.relayer,
                fee: publicinput.fee,
                refund: publicinput.refund,

                nullifier: commitment.nullifier,
                secret: commitment.secret,
                pathElements: rootAndPath.pathElements,
                pathIndices: rootAndPath.pathIndices
            },
            // getVerifierWASM(),
            wasm,
            zkey);
        const cd = convertCallData(await snarkjs.groth16.exportSolidityCallData(proof, publicSignals));
        return {
            nullifierHash: publicSignals[0],
            root: publicSignals[1],
            proof_a: cd.a,
            proof_b: cd.b,
            proof_c: cd.c
        }
    }
    function convertCallData(calldata) {
        const argv = calldata
            .replace(/["[\]\s]/g, "")
            .split(",")
            .map((x) => ethers.toBigInt(x).toString());

        const a = [argv[0], argv[1]];
        const b = [
            [argv[2], argv[3]],
            [argv[4], argv[5]],
        ];
        const c = [argv[6], argv[7]];
        const input = [argv[8], argv[9]];

        return { a, b, c, input };
    }


    async function calculateMerkleRootAndPathFromEvents(mimc, contract, levels, element) {
        // const abi = [
        //     "event Commit(bytes32 indexed commitment,uint32 leafIndex,uint256 timestamp)"
        // ];
        // const contract = new Contract(address, abi, provider)

        // const events = await ethtornado.queryFilter(ethtornado.filters.Deposit, receipt?.blockNumber, receipt?.blockNumber)
        const events = await contract.queryFilter(contract.filters.Deposit)
        let commitments = []
        for (let event of events) {
            commitments.push(ethers.toBigInt(event.args.commitment))
        }
        return calculateMerkleRootAndPath(mimc, levels, commitments, element)
    }

    function calculateMerkleRootAndPath(mimc, levels, elements, element) {
        const capacity = 2 ** levels
        if (elements.length > capacity) throw new Error('Tree is full')

        const zeros = generateZeros(mimc, levels);
        let layers = []
        layers[0] = elements.slice()
        for (let level = 1; level <= levels; level++) {
            layers[level] = []
            for (let i = 0; i < Math.ceil(layers[level - 1].length / 2); i++) {
                layers[level][i] = calculateHash(
                    mimc,
                    layers[level - 1][i * 2],
                    i * 2 + 1 < layers[level - 1].length ? layers[level - 1][i * 2 + 1] : zeros[level - 1],
                )
            }
        }

        const root = layers[levels].length > 0 ? layers[levels][0] : zeros[levels - 1]

        let pathElements = []
        let pathIndices = []

        if (element) {
            const bne = ethers.toBigInt(element)
            let index = layers[0].findIndex(e => ethers.toBigInt(e) == bne)
            for (let level = 0; level < levels; level++) {
                pathIndices[level] = index % 2
                pathElements[level] = (index ^ 1) < layers[level].length ? layers[level][index ^ 1] : zeros[level]
                index >>= 1
            }
        }

        return {
            root: root.toString(),
            pathElements: pathElements.map((v) => v.toString()),
            pathIndices: pathIndices.map((v) => v.toString())
        }
    }

    function generateZeros(mimc, levels) {
        let zeros = []
        zeros[0] = ZERO_VALUE
        for (let i = 1; i <= levels; i++)
            zeros[i] = calculateHash(mimc, zeros[i - 1], zeros[i - 1]);
        return zeros
    }

    function calculateHash(mimc, left, right) {
        return ethers.toBigInt(mimc.F.toString(mimc.multiHash([left, right])))
    }



    describe("Deposit", function () {
        it("Should Deposit Successfully", async function () {
            const { verifier, mimcSponge, ethtornado } = await loadFixture(deployETHTornado);

            const xL_in = ethers.toBigInt(stringRandom(36, { letters: false }));
            const xR_in = ethers.toBigInt(stringRandom(36, { letters: false }));

            const mimcHash = await mimcSponge.MiMCSponge(xL_in, xR_in);

            await ethtornado.deposit(ethers.toBeHex(mimcHash[0]), { value: etherWei });

        });
    })

    describe("Claim", function () {
        it("Should Claim successfully", async function () {
            const { verifier, mimcSponge, ethtornado, owner } = await loadFixture(deployETHTornado);

            // deposit

            // nullifier
            // secret
            // commitment
            // nullifierHash

            const commitmentL = await generateCommitment();

            // const xL_in = ethers.toBigInt(randomBytes(31));
            // const xR_in = ethers.toBigInt(randomBytes(31));
            // const mimcHash = await mimcSponge.MiMCSponge(xL_in, xR_in);
            // const commitmentR = await generateDeposit(xL_in, xR_in, mimcHash[0], mimcHash[1]);



            // const xL_in = ethers.toBigInt(commitmentL.nullifier);
            // const xR_in = ethers.toBigInt(commitmentL.secret);
            // const mimcHash = await mimcSponge.MiMCSponge(xL_in, xR_in);
            // const commitmentR = await generateDeposit(xL_in, xR_in, mimcHash[0], mimcHash[1]);

            await ethtornado.deposit(ethers.toBeHex(commitmentL.commitment), { value: etherWei });

            const wasmPath = "./circuits/withdraw_js/withdraw.wasm";
            const zkPath = "./circuits/setup_final.zkey";

            const publicinput = await calculatePublicinput(owner.address);

            //build proof
            const proof = await calculateMerkleRootAndZKProof(publicinput, ethtornado, 20, commitmentL, wasmPath, zkPath);

            //claim
            // bytes calldata _proof,
            // bytes32 _root,
            // bytes32 _nullifierHash,
            // address payable _recipient,
            // address payable _relayer,
            // uint256 _fee,
            // uint256 _refund

            expect(await ethers.provider.getBalance(ethtornado.target)).to.equal(etherWei);
            await ethtornado.withdraw(proof.proof_a, proof.proof_b, proof.proof_c, ethers.toBeHex(root), ethers.toBeHex(commitmentL.nullifierHash), publicinput.recipient, publicinput.relayer, publicinput.fee, publicinput.refund);
            expect(await ethers.provider.getBalance(ethtornado.target)).to.equal(0);
        });

    })
})

