require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-as-promised"))
  .should();

let Bridge = artifacts.require("Bridge");

let token;

const TON_WORKCHAIN = -1;
const TON_ADDRESS_HASH = '0x2175818712088C0A5F087DF2594A41CB5CB29689EB60FC59F6848D752AF11498';
const TON_TX_HASH = '0x6C79A5432D988FFAD699E60C4A6E9C7E191CBE5A1BD199294C1F3361D0893359';
const TON_TX_LT = 19459352000003;

contract("WrappedTON", ([single_oracle, not_oracle, user, user2]) => {
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
    let prepareSwapData = function(receiver, amount, 
                                   tonaddress={workchain: TON_WORKCHAIN, address_hash: TON_ADDRESS_HASH},
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
    let signData = async function(swapData, account) {
      let hash = await token.getSwapDataId(swapData);
      signature =  await web3.eth.sign(hash, account);
      signature = signature.slice(0, 2+2*64)+(parseInt(signature.slice(130),16)+27).toString(16)
      return {
        signer: account,
        signature: signature
      }
    };
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
    let signAllowBurn = async function(allow, nonce, account) {
      let hash = await token.getNewBurnStatusId(allow, nonce);
      signature =  await web3.eth.sign(hash, account);
      signature = signature.slice(0, 2+2*64)+(parseInt(signature.slice(130),16)+27).toString(16);
      return {
        signer: account,
        signature: signature
      }
    };
    it("user 1 can burn tokens", async () => {
      await token.voteForSwitchBurn(true, 41, [await signAllowBurn(true, 41, single_oracle)], { from: not_oracle }).should.be.fulfilled;
      let initialBalance = await token.balanceOf(user);
      await token.burn("1000", {workchain: TON_WORKCHAIN, address_hash: TON_ADDRESS_HASH}, { from: user }).should.be.fulfilled;
      let finalBalance = await token.balanceOf(user);
      (initialBalance-finalBalance).toString().should.be.equal("1000");
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
