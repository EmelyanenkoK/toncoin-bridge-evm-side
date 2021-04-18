pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./BridgeInterface.sol";
import "./SignatureChecker.sol";
import "./ERC20.sol";

contract Bridge is SignatureChecker, BridgeInterface {
    address[] public oraclesSet; //Note: not used in logic, only for public getters
    mapping(address => bool) isOracle;
    mapping(bytes32 => mapping(address => bool)) public unfinishedVotings;
    mapping(bytes32 => uint) public receivedVotes;
    
    function generalVote(bytes32 digest, Signature[] memory signatures) internal returns (uint countedVotes){
      uint signum = signatures.length;
      countedVotes = receivedVotes[digest];
      for(uint i=0; i<signum; i++) {
        address signer = signatures[i].signer;
        require(isOracle[signer], "Unathorized signer");
        checkSignature(digest, signatures[i]);
        if(!unfinishedVotings[digest][signer]) {
          countedVotes += 1;
          unfinishedVotings[digest][signer] = true;
        }
      }
      receivedVotes[digest] = countedVotes;
    }

    function voteForMinting(SwapData memory data, Signature[] memory signatures) override public {
      uint countedVotes = generalVote(getSwapDataId(data), signatures);
      if( countedVotes >= 2 * oraclesSet.length / 3 ) {
          executeMinting(data);
      }
    }

    function voteForNewOracleSet(address[] memory newOracles, Signature[] memory signatures) override  public {
      uint countedVotes = generalVote(getNewSetId(newOracles), signatures);
      if( countedVotes >= 2 * oraclesSet.length / 3 ) {
          updateOracleSet(newOracles);
      }
    }

    function executeMinting(SwapData memory data) internal {
    }

    function updateOracleSet(address[] memory newSet) internal {
      uint oldSetLen = oraclesSet.length;
      for(uint i = 0; i < oldSetLen; i++) {
        isOracle[oraclesSet[i]] = false;
      }
      oraclesSet = newSet;
      uint newSetLen = oraclesSet.length;
      for(uint i = 0; i < newSetLen; i++) {
        isOracle[newSet[i]] = true;
      }
    }
    
}
