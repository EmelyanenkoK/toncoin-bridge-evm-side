require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-as-promised"))
  .should();

let utils = require("./utils/utils.js");

let Bridge = artifacts.require("Bridge");

let token;

contract("WrappedTON", ([single_oracle, not_oracle, user, user2, user3]) => {
  describe("WrappedTON::instance", async () => {
    token = await Bridge.deployed("Wrapped TON Coin", "TONCOIN", [single_oracle]);
  });

  describe("WrappedTON::details", () => {
    it("has correct symbol", async () => {
      let _symbol = await token.symbol();
      _symbol.should.be.equal("TONCOIN", "incorrect symbol");
      let _name = await token.name();
      _name.should.be.equal("Wrapped TON Coin", "incorrect name");
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

    it("single oracle can mint tokens", async () => {
      let data = utils.prepareSwapData(user, 1e9);
      let balance = await token.balanceOf(user);
      balance.toString().should.be.equal("0");
      await token.voteForMinting(data, [await utils.signData(data, single_oracle, token.address)], { from: not_oracle }).should.be.fulfilled;
      balance = await token.balanceOf(user);
      balance.toString().should.be.equal(String(1e9));
    });

    it("not oracle cant mint tokens", async () => {
      let data = utils.prepareSwapData(user3, 1e9);
      let balance = await token.balanceOf(user3);
      balance.toString().should.be.equal("0");
      await token.voteForMinting(data, [await utils.signData(data, not_oracle, token.address)], { from: not_oracle }).should.be.rejected;
      balance = await token.balanceOf(user3);
      balance.toString().should.be.equal("0");
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
      await token.burn("1000", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user }).should.be.rejected;

      await token.voteForSwitchBurn(true, 41, [await utils.signBurnStatus(true, 41, single_oracle, token.address)], { from: not_oracle }).should.be.fulfilled;
      let initialBalance = await token.balanceOf(user);
      await token.burn("1000", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user }).should.be.fulfilled;
      let finalBalance = await token.balanceOf(user);
      (initialBalance-finalBalance).toString().should.be.equal("1000");
    });

    it("user 3 cant burn tokens", async () => {
      await token.voteForSwitchBurn(true, 42, [await utils.signBurnStatus(true, 42, single_oracle, token.address)], { from: not_oracle }).should.be.fulfilled;
      await token.burn("1000", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user3 }).should.be.rejected;
      let finalBalance = await token.balanceOf(user3);
      finalBalance.toString().should.be.equal("0");
    });

    it("user2 can burn tokens on behalf of user", async () => {
      await token.approve(user2, "1200", { from: user });
      let initialBalance = await token.balanceOf(user);

      await token.voteForSwitchBurn(false, 43, [await utils.signBurnStatus(false, 43, single_oracle, token.address)], { from: not_oracle }).should.be.fulfilled;

      await token.burnFrom(user, "1100", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user2 }).should.be
          .rejected;

      await token.voteForSwitchBurn(true, 44, [await utils.signBurnStatus(true, 44, single_oracle, token.address)], { from: not_oracle }).should.be.fulfilled;

      await token.burnFrom(user3, "1100", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user2 }).should.be
        .rejected;
      await token.approve(user2, "1200", { from: user3 });
      await token.burnFrom(user3, "1100", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user2 }).should.be
          .rejected;

      await token.burnFrom(user, "1100", {workchain: utils.TON_WORKCHAIN, address_hash: utils.TON_ADDRESS_HASH}, { from: user2 }).should.be
        .fulfilled;
      let allowance = await token.allowance(user, user2);
      allowance.toString().should.be.equal("100");
      let finalBalance = await token.balanceOf(user);
      (initialBalance-finalBalance).toString().should.be.equal("1100");
    });
  });

});
