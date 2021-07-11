require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-as-promised"))
  .should();

// utils

const TON_WORKCHAIN = -1;
const TON_ADDRESS_HASH = '0x2175818712088C0A5F087DF2594A41CB5CB29689EB60FC59F6848D752AF11498';
const TON_TX_HASH = '0x6C79A5432D988FFAD699E60C4A6E9C7E191CBE5A1BD199294C1F3361D0893359';
const TON_TX_LT = 19459352000003;

let prepareSwapData = function(receiver, amount,
                               tonaddress={workchain:TON_WORKCHAIN, address_hash:TON_ADDRESS_HASH},
                               tx_hash=TON_TX_HASH, lt=TON_TX_LT) {
  return {
    receiver:receiver,
    amount:amount,
    tx: {
      address_: tonaddress,
      tx_hash: tx_hash,
      lt: lt
    }
  }
};
let encodeSwapData = function(d) {
  return web3.eth.abi.encodeParameters(['int', 'address', 'uint256', 'int8', 'bytes32', 'bytes32', 'uint64'],
      [0xDA7A, d.receiver, d.amount, d.tx.address_.workchain, d.tx.address_.address_hash, d.tx.tx_hash, d.tx.lt]);
}
let encodeSet = function(setHash, set) {
  return web3.eth.abi.encodeParameters(['int', 'int', 'address[]'], [0x5E7, setHash, set]);
}

let encodeBurnStatus = function(burnStatus, nonce) {
  return web3.eth.abi.encodeParameters(['int', 'bool', 'int'], [0xB012, burnStatus, nonce]);
}

let hashData = function(encoded) {
  return web3.utils.sha3(encoded)
}
let signHash = async function(hash, account) {
  signature =  await web3.eth.sign(hash, account);
  //Fix `v`(ganache returns 0 or 1, while other signers 27 or 28);
  signature = signature.slice(0, 2+2*64)+(parseInt(signature.slice(130),16)+27).toString(16);
  return {
    signer: account,
    signature: signature
  }
};
let signData = async function(swapData, account) {
  return await signHash(hashData(encodeSwapData(swapData)), account);
};
let signSet = async function(setHash, newSet, account) {
  return await signHash(hashData(encodeSet(setHash, newSet)), account);
};
let signBurnStatus = async function(burnStatus, nonce, account) {
  return await signHash(hashData(encodeBurnStatus(burnStatus, nonce)), account);
};

// end utils


let Bridge = artifacts.require("Bridge");

let sigchecker;

contract("SignatureChecker", ([oracle, not_oracle]) => {
  describe("SignatureChecker::instance", async () => {
    sigchecker = await Bridge.deployed("Wrapped TON Coin", "TONCOIN", [oracle]);
  });
  describe("SignatureChecker::checks",  () => {

    it("check wrong account", async () => {
      let hash = "0x59bc6dad67c8be76a7df97fe4da8260070b18abfe6418261354899c30e0f5915";
      let signature = await signHash(hash, not_oracle);
      signature.signer = oracle;
      await sigchecker.checkSignature(hash, signature).should.be.rejected;
    });

    it("check incorrect signature", async () => {
      let hash = "0x59bc6dad67c8be76a7df97fe4da8260070b18abfe6418261354899c30e0f5915";
      let signature = await signHash(hash, oracle);
      signature.signature = signature.signature.slice(0,10)+"00000000"+signature.signature.slice(18);
      await sigchecker.checkSignature(hash, signature).should.be.rejected;
    });
    it("check correct signature", async () => {
      let hash = "0x59bc6dad67c8be76a7df97fe4da8260070b18abfe6418261354899c30e0f5915";
      let signature = await signHash(hash, oracle);
      await sigchecker.checkSignature(hash, signature).should.be.fulfilled;
    });
    it("check correct swapData id generation", async () => {
      let data = prepareSwapData(not_oracle, 10);
      let hash = hashData(encodeSwapData(data));
      let contractHash = await sigchecker.getSwapDataId(data);
      contractHash.toString().should.be.equal(String(hash));
    });
    it("check correct oracleSet id generation", async () => {
      let set = [oracle, not_oracle, oracle];
      let hash = hashData(encodeSet(7, set));
      let contractHash = await sigchecker.getNewSetId(7, set);
      contractHash.toString().should.be.equal(String(hash));
    });
  });
});
