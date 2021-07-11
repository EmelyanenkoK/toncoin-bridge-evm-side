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
  let  signature =  await web3.eth.sign(hash, account);
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
      let data = prepareSwapData(user, 1e9);
      let balance = await token.balanceOf(user);
      balance.toString().should.be.equal("0");
      await token.voteForMinting(data, [await signData(data, single_oracle)], { from: not_oracle }).should.be.fulfilled;
      balance = await token.balanceOf(user);
      balance.toString().should.be.equal(String(1e9));
    });

    it("not oracle cant mint tokens", async () => {
      let data = prepareSwapData(user3, 1e9);
      let balance = await token.balanceOf(user3);
      balance.toString().should.be.equal("0");
      await token.voteForMinting(data, [await signData(data, not_oracle)], { from: not_oracle }).should.be.rejected;
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
      await token.burn("1000", {workchain: TON_WORKCHAIN, address_hash: TON_ADDRESS_HASH}, { from: user }).should.be.rejected;

      await token.voteForSwitchBurn(true, 41, [await signBurnStatus(true, 41, single_oracle)], { from: not_oracle }).should.be.fulfilled;
      let initialBalance = await token.balanceOf(user);
      await token.burn("1000", {workchain: TON_WORKCHAIN, address_hash: TON_ADDRESS_HASH}, { from: user }).should.be.fulfilled;
      let finalBalance = await token.balanceOf(user);
      (initialBalance-finalBalance).toString().should.be.equal("1000");
    });

    it("user 3 cant burn tokens", async () => {
      await token.burn("1000", {workchain: TON_WORKCHAIN, address_hash: TON_ADDRESS_HASH}, { from: user3 }).should.be.rejected;
      let finalBalance = await token.balanceOf(user3);
      finalBalance.toString().should.be.equal("0");
    });

    it("user2 can burn tokens on behalf of user", async () => {
      await token.approve(user2, "1200", { from: user });
      let initialBalance = await token.balanceOf(user);
      await token.burnFrom(user, "1100", {workchain: TON_WORKCHAIN, address_hash: TON_ADDRESS_HASH}, { from: user2 }).should.be
        .fulfilled;
      let allowance = await token.allowance(user, user2);
      allowance.toString().should.be.equal("100");
      let finalBalance = await token.balanceOf(user);
      (initialBalance-finalBalance).toString().should.be.equal("1100");
    });
  });

});
