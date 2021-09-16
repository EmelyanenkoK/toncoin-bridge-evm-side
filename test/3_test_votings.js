require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-as-promised"))
  .should();

let utils = require("./utils/utils.js");
let Bridge = artifacts.require("Bridge");

let bridge;

contract("Bridge", ([oracle1, not_oracle, oracle2, oracle3, oracle4, oracle5]) => {
  describe("Bridge::instance", () => {
    it("", async() => {
      bridge = await Bridge.new("Wrapped TON Coin", "TONCOIN", [oracle1, oracle2, oracle3]);
    });
  });
  describe("WrappedTON::minting", () => {
   it("one random address can't mint tokens", async () => {
      let user = oracle5;
      let data = utils.prepareSwapData(user, 1e9);
      await bridge.voteForMinting(data, [await utils.signData(data, not_oracle, bridge.address)], { from: not_oracle }).should.not.be.fulfilled;
    });
   it("random address can't add signatures to authorized ones", async () => {
      let user = oracle5;
      let data = utils.prepareSwapData(user, 1e9);
      let not_oracle2 = oracle4;
      let not_oracle3 = oracle5;
      await bridge.voteForMinting(data, [await utils.signData(data, oracle1, bridge.address),
                                         await utils.signData(data, not_oracle, bridge.address),
                                         await utils.signData(data, not_oracle2, bridge.address),
                                         await utils.signData(data, not_oracle3, bridge.address),], { from: oracle1 }).should.not.be.fulfilled;
    });
    it("2/3 of the set of oracles can mint tokens", async () => {
      let user = oracle5;
      let data = utils.prepareSwapData(user, 1e9);
      let balance = await bridge.balanceOf(user);
      balance.toString().should.be.equal("0");
      let signatureSet = [await utils.signData(data, oracle1, bridge.address),
                          await utils.signData(data, oracle2, bridge.address)];
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.fulfilled;
      balance = await bridge.balanceOf(user);
      balance.toString().should.be.equal(String(1e9));
      let isFinished = await bridge.finishedVotings(utils.hashData(utils.encodeSwapData(data, bridge.address)));
      isFinished.should.be.true;
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.rejected;
    });
    it("check duplications in signature set", async () => {
      let user = oracle5;
      let data = utils.prepareSwapData(user, 1e9);
      let signatureSet = [await utils.signData(data, oracle1, bridge.address),
                          await utils.signData(data, oracle1, bridge.address)];
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.rejected;
      signatureSet = [await utils.signData(data, oracle1, bridge.address),
                          await utils.signData(data, oracle2, bridge.address),
                          await utils.signData(data, oracle1, bridge.address)];
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.rejected;
    });

    it("check unsorted signature set", async () => {
      let user = oracle5;
      let data = utils.prepareSwapData(user, 1e9);
      let signatureSet = [await utils.signData(data, oracle2, bridge.address),
                          await utils.signData(data, oracle1, bridge.address)];
      await bridge.voteForMinting(data, signatureSet, { from: oracle1 }).should.be.rejected;
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
      let signatureSet = [await utils.signSet(13, newSet, oracle1, bridge.address),
                          await utils.signSet(13, newSet, oracle2, bridge.address)];
      await bridge.voteForNewOracleSet(13, newSet, signatureSet, { from: oracle1 }).should.be.fulfilled;

      await bridge.voteForNewOracleSet(14, newSet, [await utils.signSet(14, newSet, oracle1, bridge.address),
          await utils.signSet(14, newSet, oracle2, bridge.address)], { from: oracle1 }).should.be.rejected;

      await bridge.voteForNewOracleSet(14, newSet, [await utils.signSet(14, newSet, oracle3, bridge.address),
          await utils.signSet(14, newSet, oracle5, bridge.address)], { from: oracle1 }).should.be.fulfilled;
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
      let signatureSet = [await utils.signBurnStatus(0, 12, oracle4),
                          await utils.signBurnStatus(0, 12, oracle5)];
      await bridge.voteForSwitchBurn(0, 12, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain:-1, address_hash:"0x00"}, { from: user }).should.be.rejected;
      */
    });
    it("restore burning", async () => {
      let user = oracle5;
      let signatureSet = [await utils.signBurnStatus(1, 13, oracle4, bridge.address),
                          await utils.signBurnStatus(1, 13, oracle5, bridge.address)];
      await bridge.voteForSwitchBurn(1, 13, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user }).should.be.fulfilled;
    });
    it("check replay protection", async () => {
      let user = oracle5;
      let signatureSet = [await utils.signBurnStatus(0, 12, oracle4, bridge.address),
                          await utils.signBurnStatus(0, 12, oracle5, bridge.address)];
      await bridge.voteForSwitchBurn(0, 12, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user }).should.be.rejected;

      signatureSet = [await utils.signBurnStatus(1, 14, oracle4, bridge.address),
                          await utils.signBurnStatus(1, 14, oracle5, bridge.address)];
      await bridge.voteForSwitchBurn(1, 14, signatureSet, { from: oracle1 }).should.be.fulfilled;
      await bridge.burn("1", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user }).should.be.fulfilled;

      signatureSet = [await utils.signBurnStatus(0, 12, oracle4, bridge.address),
                          await utils.signBurnStatus(0, 12, oracle5, bridge.address)];
      await bridge.voteForSwitchBurn(0, 12, signatureSet, { from: oracle1 }).should.be.rejected;
      let isBurnAllowed = await bridge.allowBurn();
      isBurnAllowed.should.be.true;
      await bridge.burn("1", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user }).should.be.fulfilled;
    });

  });
});
