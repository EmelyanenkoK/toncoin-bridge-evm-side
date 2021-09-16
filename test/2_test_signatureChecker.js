require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-as-promised"))
  .should();

let utils = require("./utils/utils.js");


let Bridge = artifacts.require("Bridge");

let sigchecker;

contract("SignatureChecker", ([oracle, not_oracle]) => {
  describe("SignatureChecker::instance", async () => {
    sigchecker = await Bridge.deployed("Wrapped TON Coin", "TONCOIN", [oracle]);
  });
  describe("SignatureChecker::checks",  () => {

    it("check wrong account", async () => {
      let hash = "0x59bc6dad67c8be76a7df97fe4da8260070b18abfe6418261354899c30e0f5915";
      let signature = await utils.signHash(hash, not_oracle);
      signature.signer = oracle;
      await sigchecker.checkSignature(hash, signature).should.be.rejected;
    });

    it("check incorrect signature", async () => {
      let hash = "0x59bc6dad67c8be76a7df97fe4da8260070b18abfe6418261354899c30e0f5915";
      let signature = await utils.signHash(hash, oracle);
      signature.signature = signature.signature.slice(0,10)+"00000000"+signature.signature.slice(18);
      await sigchecker.checkSignature(hash, signature).should.be.rejected;
    });
    it("check correct signature", async () => {
      let hash = "0x59bc6dad67c8be76a7df97fe4da8260070b18abfe6418261354899c30e0f5915";
      let signature = await utils.signHash(hash, oracle);
      await sigchecker.checkSignature(hash, signature).should.be.fulfilled;
    });
    it("check correct swapData id generation", async () => {
      let data = utils.prepareSwapData(not_oracle, 10);
      let hash = utils.hashData(utils.encodeSwapData(data, sigchecker.address));
      let contractHash = await sigchecker.getSwapDataId(data);
      contractHash.toString().should.be.equal(String(hash));
    });
    it("check correct oracleSet id generation", async () => {
      let set = [oracle, not_oracle, oracle];
      let hash = utils.hashData(utils.encodeSet(7, set, sigchecker.address));
      let contractHash = await sigchecker.getNewSetId(7, set);
      contractHash.toString().should.be.equal(String(hash));
    });
    it("check correct newBurnStatus id generation", async () => {
      let hash = utils.hashData(utils.encodeBurnStatus(true, 7, sigchecker.address));
      let contractHash = await sigchecker.getNewBurnStatusId(true, 7);
      contractHash.toString().should.be.equal(String(hash));
    });
  });
});
