pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./TonUtils.sol";


interface BridgeInterface is TonUtils {
  function voteForMinting(SwapData memory data, Signature[] memory signatures) external;
  function voteForNewOracleSet(address[] memory newOracles, Signature[] memory signatures) external;
  event NewOracleSet(address[] newOracles);
}
