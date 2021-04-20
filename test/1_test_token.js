require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-as-promised"))
  .should();

let Bridge = artifacts.require("Bridge");

let token;

contract("WrappedTON", ([single_oracle, not_oracle, user, user2]) => {
  describe("WrappedTON::instance", async () => {
    token = await Bridge.deployed("Wrapped TON Coin", "TONCOIN", [single_oracle]);
  });

  describe("WrappedTON::details", () => {
    it("has correct symbol", async () => {
      let _symbol = await token.symbol();
      _symbol.should.be.equal("TONCOIN", "incorrect symbol");
    });

    it("has correct decimals", async () => {
      let _decimals = await token.decimals();
      _decimals.toNumber().should.be.equal(9, "incorrect decimals");
    });

    it("has correct supply", async () => {
      let _supply = await token.totalSupply();
      _supply.toNumber().should.be.equal(0, "incorrect supply");
    });
  });

  describe("WrappedTON::simple_minting", () => {
    it("check oracles", async () => {
      // list
      let first_oracle = await token.oraclesSet(0);
      first_oracle.toString().should.be.equal(String(single_oracle));
      await token.oraclesSet(1).should.be.rejected;
      // mapping
      isOracle = await token.isOracle(single_oracle);
      isOracle.should.be.true;
      isOracle = await token.isOracle(not_oracle);
      isOracle.should.be.false;
    });
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
    let signData = async function(swapData, account) {
      let hash = await token.getSwapDataId(swapData);
      signature =  await web3.eth.sign(hash, account);
      signature = signature.slice(0, 2+2*64)+(parseInt(signature.slice(130),16)+27).toString(16)
      return {
        signer: account,
        signature: signature
      }
    };
    it("random address can't mint tokens", async () => {
      let data = prepareSwapData(user, 1e9);
      await token.voteForMinting(data, [await signData(data, not_oracle)], { from: not_oracle }).should.not.be.fulfilled;
    });

    it("single oracle can mint tokens", async () => {
      let data = prepareSwapData(user, 1e9);
      let balance = await token.balanceOf(user);
      balance.toString().should.be.equal("0");
      await token.voteForMinting(data, [await signData(data, single_oracle)], { from: not_oracle }).should.be.fulfilled;
      balance = await token.balanceOf(user);
      balance.toString().should.be.equal(String(1e9));
    });

  });

  describe("WrappedTON::transfering", () => {
    it("user 1 can transfer tokens", async () => {
      await token.transfer(user2, "1000", { from: user }).should.be.fulfilled;
    });

    it("using approve and transferFrom", async () => {
      await token.approve(user2, "1000", { from: user });
      await token.transferFrom(user, user2, "1000", { from: user2 }).should.be
        .fulfilled;
      let allowance = await token.allowance(user, user2);
      allowance.toString().should.be.equal("0");
    });
  });

  describe("WrappedTON::burning", () => {
    it("user 1 can burn tokens", async () => {
      let initialBalance = await token.balanceOf(user);
      await token.burn("1000", {workchain:-1, address_hash:"0x00"}, { from: user }).should.be.fulfilled;
      let finalBalance = await token.balanceOf(user);
      (initialBalance-finalBalance).toString().should.be.equal("1000");
    });

    it("user2 can burn tokens on behalf of user", async () => {
      await token.approve(user2, "1200", { from: user });
      let initialBalance = await token.balanceOf(user);
      await token.burnFrom(user, "1100", {workchain:-1, address_hash:"0x00"}, { from: user2 }).should.be
        .fulfilled;
      let allowance = await token.allowance(user, user2);
      allowance.toString().should.be.equal("100");
      let finalBalance = await token.balanceOf(user);
      (initialBalance-finalBalance).toString().should.be.equal("1100");
    });
  });

});
