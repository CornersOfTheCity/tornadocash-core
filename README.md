# Tornado Cash
本项目按照自己的思路实现了一个Tornado Cash合约。

## 存款
Tornada Cash的存款就是通过两个输入（nullifier + secret）组成的哈希存入到merkle tree中。为什么需要两个输入，这是因为我们在取款时需要根据sercet来生成一个Proof，而这个sercet是一个私有输入，不会暴露在交易过程中，这样就可以保证取款和存款的连接有效断开。

# 部署
部署前需要先编译电路生成`Verifier.sol`并转移到`contracts`里面。
### Hasher
hasher是通过abi和bytecode部署的，生成的命令为：
```
node scripts/helper/compileHasher.js
```
完成后将json文件转移到deploy目录下。

### 部署：
```
npx hardhat run scripts/deploy.js --network sepolia
```

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
完成后将生成的`Verifier.sol`中转移到`contracts`里面。

## 测试
测试之前需要先讲电路编译好，然后运行：
```
npx hardhat test
```

# Address - Sepolia
```
Verifier: 0x2610AF4Fe2b322a306b9BC99e9adb533F5736C63
Hasher: 0xAC2813589CF6E8bF7e50929106a7e92ece0186DF
Tornado Cash: 0xd2d0681f7653326b324C7084416Efa3F14e542cd
```

