require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-as-promised"))
  .should();

let Bridge = artifacts.require("Bridge");

let bridge;

// Helpers TODO: move to module
    let prepareSwapData = function(receiver, amount, 
                                   tonaddress={workchain:-1, address_hash:"0x00"}, 
                                   tx_hash="0x00", lt=0) {
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

// ===================== Tests =====================

contract("Bridge", ([oracle1, not_oracle, oracle2, oracle3, oracle4, oracle5]) => {
  describe("Bridge::instance", () => {
    it("", async() => {
      bridge = await Bridge.new("Wrapped TON Coin", "TONCOIN", [oracle1, oracle2, oracle3]);
    });
  });
  describe("WrappedTON::minting", () => {
   it("one random address can't mint tokens", async () => {
      let user = oracle5;
      let data = prepareSwapData(user, 1e9);
      await bridge.voteForMinting(data, [await signData(data, not_oracle)], { from: not_oracle }).should.not.be.fulfilled;
    });
   it("random address can't add signatures to authorized ones", async () => {
      let user = oracle5;
      let data = prepareSwapData(user, 1e9);
      let not_oracle2 = oracle4;
      let not_oracle3 = oracle5;
      await bridge.voteForMinting(data, [await signData(data, oracle1),
                                         await signData(data, not_oracle),
                                         await signData(data, not_oracle2),
                                         await signData(data, not_oracle3),], { from: oracle1 }).should.not.be.fulfilled;
    });
    it("2/3 of the set of oracles can mint tokens", async () => {
      let user = oracle5;
      let data = prepareSwapData(user, 1e9);
      let balance = await bridge.balanceOf(user);
      balance.toString().should.be.equal("0");
      let signatureSet = [await signData(data, oracle1),
                          await signData(data, oracle2)];
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.fulfilled;
      balance = await bridge.balanceOf(user);
      balance.toString().should.be.equal(String(1e9));
      let isFinished = await bridge.finishedVotings(hashData(encodeSwapData(data)));
      isFinished.should.be.true;
    });
    it("check replay against the same swap and signature set", async () => {
      let user = oracle5;
      let data = prepareSwapData(user, 1e9);
      let initialBalance = await bridge.balanceOf(user);
      let receivedVotes = await bridge.receivedVotes(hashData(encodeSwapData(data)));
      receivedVotes.toString().should.be.equal("2");
      let signatureSet = [await signData(data, oracle1),
                          await signData(data, oracle2)];
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.fulfilled;
      let finalBalance = await bridge.balanceOf(user);
      (finalBalance-initialBalance).toString().should.be.equal(String(0));
      receivedVotes = await bridge.receivedVotes(hashData(encodeSwapData(data)));
      receivedVotes.toString().should.be.equal("2");
    });
    it("check replay against the same swap, but different signature set", async () => {
      let user = oracle5;
      let data = prepareSwapData(user, 1e9);
      let initialBalance = await bridge.balanceOf(user);
      let receivedVotes = await bridge.receivedVotes(hashData(encodeSwapData(data)));
      receivedVotes.toString().should.be.equal("2");
      let signatureSet = [await signData(data, oracle2),
                          await signData(data, oracle3)];
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.fulfilled;
      let finalBalance = await bridge.balanceOf(user);
      (finalBalance-initialBalance).toString().should.be.equal(String(0));
      receivedVotes = await bridge.receivedVotes(hashData(encodeSwapData(data)));
      receivedVotes.toString().should.be.equal("3");
    });

    it("oracles can mint tokens by aggregating signatures onchain", async () => {
      let user = oracle5;
      let data = prepareSwapData(user, 2e9);
      let initialBalance = await bridge.balanceOf(user);
      let receivedVotes = await bridge.receivedVotes(hashData(encodeSwapData(data)));
      receivedVotes.toString().should.be.equal("0");
      let signatureSet1 = [await signData(data, oracle1)];
      await bridge.voteForMinting(data, signatureSet1, { from: oracle1 }).should.be.fulfilled;
      let middleBalance = await bridge.balanceOf(user);
      (middleBalance-initialBalance).toString().should.be.equal(String(0));
      let isFinished = await bridge.finishedVotings(hashData(encodeSwapData(data)));
      isFinished.should.not.be.true;
      receivedVotes = await bridge.receivedVotes(hashData(encodeSwapData(data)));
      receivedVotes.toString().should.be.equal("1");
      let signatureSet2 = [await signData(data, oracle2),
                           await signData(data, oracle3)];
      await bridge.voteForMinting(data, signatureSet2, { from: not_oracle }).should.be.fulfilled;
      let finalBalance = await bridge.balanceOf(user);
      (finalBalance-initialBalance).toString().should.be.equal(String(2e9));
      receivedVotes = await bridge.receivedVotes(hashData(encodeSwapData(data)));
      receivedVotes.toString().should.be.equal("3");
    });
  });

  describe("WrappedTON::oracles_rotation", () => {
    it("check initial oracles", async () => {
      // list
      let _oracle1 = await bridge.oraclesSet(0);
      _oracle1.toString().should.be.equal(String(oracle1));
      let _oracle2 = await bridge.oraclesSet(1);
      _oracle2.toString().should.be.equal(String(oracle2));
      let _oracle3 = await bridge.oraclesSet(2);
      _oracle3.toString().should.be.equal(String(oracle3));
      await bridge.oraclesSet(3).should.be.rejected;
      // mapping
      isOracle = await bridge.isOracle(oracle1);
      isOracle.should.be.true;
      isOracle = await bridge.isOracle(oracle2);
      isOracle.should.be.true;
      isOracle = await bridge.isOracle(oracle3);
      isOracle.should.be.true;
      isOracle = await bridge.isOracle(not_oracle);
      isOracle.should.be.false;
    });
    it("initial oracles can set new set", async () => {
      let newSet = [oracle3, oracle4, oracle5];
      let signatureSet = [await signSet(13, newSet, oracle1),
                          await signSet(13, newSet, oracle2)];
      await bridge.voteForNewOracleSet(13, newSet, signatureSet, { from: oracle1 }).should.be.fulfilled;
    });
    it("check correctness of new set", async () => {
      // list
      let _oracle1 = await bridge.oraclesSet(0);
      _oracle1.toString().should.be.equal(String(oracle3));
      let _oracle2 = await bridge.oraclesSet(1);
      _oracle2.toString().should.be.equal(String(oracle4));
      let _oracle3 = await bridge.oraclesSet(2);
      _oracle3.toString().should.be.equal(String(oracle5));
      await bridge.oraclesSet(3).should.be.rejected;
      // mapping
      isOracle = await bridge.isOracle(oracle1);
      isOracle.should.not.be.true;
      isOracle = await bridge.isOracle(oracle2);
      isOracle.should.not.be.true;
      isOracle = await bridge.isOracle(oracle3);
      isOracle.should.be.true;
      isOracle = await bridge.isOracle(oracle4);
      isOracle.should.be.true;
      isOracle = await bridge.isOracle(oracle5);
      isOracle.should.be.true;
      isOracle = await bridge.isOracle(not_oracle);
      isOracle.should.be.false;
    });
  });
  describe("WrappedTON::burn control", () => {
    it("stop burning", async () => {
      let isBurnAllowed = await bridge.allowBurn();
      isBurnAllowed.should.be.false;
      /*
      let user = oracle5;
      let signatureSet = [await signBurnStatus(0, 12, oracle4),
                          await signBurnStatus(0, 12, oracle5)];
      await bridge.voteForSwitchBurn(0, 12, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain:-1, address_hash:"0x00"}, { from: user }).should.be.rejected;
      */
    });
    it("restore burning", async () => {
      let user = oracle5;
      let signatureSet = [await signBurnStatus(1, 13, oracle4),
                          await signBurnStatus(1, 13, oracle5)];
      await bridge.voteForSwitchBurn(1, 13, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain:-1, address_hash:"0x00"}, { from: user }).should.be.fulfilled;
    });
    it("check replay protection", async () => {
      let user = oracle5;
      let signatureSet = [await signBurnStatus(0, 12, oracle4),
                          await signBurnStatus(0, 12, oracle5)];
      await bridge.voteForSwitchBurn(0, 12, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain:-1, address_hash:"0x00"}, { from: user }).should.be.rejected;

      signatureSet = [await signBurnStatus(1, 14, oracle4),
                          await signBurnStatus(1, 14, oracle5)];
      await bridge.voteForSwitchBurn(1, 14, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain:-1, address_hash:"0x00"}, { from: user }).should.be.fulfilled;

      signatureSet = [await signBurnStatus(0, 12, oracle4),
                          await signBurnStatus(0, 12, oracle5)];
      await bridge.voteForSwitchBurn(0, 12, signatureSet, { from: oracle1 }).should.be.fulfilled;
      let isBurnAllowed = await bridge.allowBurn();
      isBurnAllowed.should.be.true;
      await bridge.burn("1", {workchain:-1, address_hash:"0x00"}, { from: user }).should.be.fulfilled;
    });

  });
});
