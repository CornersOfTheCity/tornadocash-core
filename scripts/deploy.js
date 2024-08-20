const hre = require("hardhat");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const fs = require('fs');

async function main() {
    var hasherjson = JSON.parse(fs.readFileSync('./scripts/Hasher.json', 'utf8'));
    var hashabi = hasherjson.abi;
    var hashcode = hasherjson.bytecode;

    console.log(`====== Verifier Deploying ======`);
    var verifier = await ethers.deployContract("Groth16Verifier");
    await verifier.waitForDeployment();
    console.log("Verifier address:", verifier.target);

    console.log(`====== Hasher Deploying ======`);
    const Hasher = await hre.ethers.getContractFactory(hashabi, hashcode);
    const hasher = await Hasher.deploy();
    await hasher.waitForDeployment();

    console.log("Hasher address:", hasher.target);

    console.log(`====== ETHTornado Deploying ======`);
    var ethtornado = await ethers.deployContract("ETHTornado", [verifier.target, hasher.target, '1000000000000000000', 20]);
    await ethtornado.waitForDeployment();
    console.log("ETHTornado address:", ethtornado.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
