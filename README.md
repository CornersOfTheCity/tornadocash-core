# Tornado Cash
本项目按照自己的思路实现了一个Tornado Cash合约。
## 存款
Tornada Cash的存款就是通过两个输入（nullifier + secret）组成的哈希存入到merkle tree中。为什么需要两个输入，这是因为我们在取款时需要根据sercet来生成一个Proof，而这个sercet是一个私有输入，不会暴露在交易过程中，这样就可以保证取款和存款的连接有效断开。

## 电路
```
电路编译：
circom withdraw.circom --r1cs --wasm

使用Grot16创建仪式文件：
snarkjs powersoftau new bn128 16 ceremony_0000.ptau

为仪式文件贡献随机性：
snarkjs powersoftau contribute ceremony_0000.ptau ceremony_0001.ptau
snarkjs powersoftau contribute ceremony_0001.ptau ceremony_0002.ptau
snarkjs powersoftau contribute ceremony_0002.ptau ceremony_0003.ptau

文件随机性贡献完成后，生成最终文件：
snarkjs powersoftau prepare phase2 ceremony_0003.ptau ceremony_final.ptau

验证最终文件完整性：
snarkjs powersoftau verify ceremony_final.ptau

下面将编译文件与电路交织在一起：
生成密钥（zkey文件）：
snarkjs groth16 setup withdraw.r1cs ceremony_final.ptau setup_0000.zkey

为这个ZKey文件贡献一次额外的随机性：
snarkjs zkey contribute setup_0000.zkey setup_final.zkey

验证最后的zkey文件：
snarkjs zkey verify withdraw.r1cs ceremony_final.ptau setup_final.zkey

最后生成solidity verify文件：
snarkjs zkey export solidityverifier setup_final.zkey Verifier.sol
```

## Hasher
hasher是通过abi和bytecode部署的，生成的命令为：
```
node scripts/helper/compileHasher.js
```


# Address - Sepolia
```
Verifier: 0x5Ab05adEbA5546f0bf9919B7D72674EAED69fA38
Hasher: 0xfFF8709D673B6D7ADB2EB2507eF4de414c6C3fE7
Tornado Cash: 0x96bF88311E62cd6Ffa69E8FD8B2782aFD9387DAC
```

