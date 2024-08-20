const hre = require("hardhat");
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const HasherModule = buildModule("HasherModule", (m) => {

    // const Faucet = await hre.ethers.getContractFactory("Faucet");
    // const hasher = m.contract("Hasher", [], {});

    // return { hasher };
});

const VerifierMoudle = buildModule("VerifierMoudle", (m) => {

    const verifier = m.contract("Groth16Verifier", [], {});

    return { verifier };

});

const ETHModule = buildModule("ETHModule", (m) => {

    const { hasher } = m.useModule(hasherModule);
    const { verifier } = m.useModule(VerifierMoudle);

    const ethtornado = m.contract("ETHTornado", [verifier, hasher, '1000000000000000000', 32], {});

    return { ethtornado };
});


module.exports = buildModule("Tornado", (m) => {
    const { hasher } = m.useModule(HasherModule);
    const { verifier } = m.useModule(VerifierMoudle);
    const { ethtornado } = m.useModule(ETHModule);

    return { hasher, verifier, ethtornado };
});
