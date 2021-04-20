pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./BridgeInterface.sol";
import "./SignatureChecker.sol";
import "./WrappedTON.sol";


contract Bridge is SignatureChecker, BridgeInterface, WrappedTON {
    address[] public oraclesSet; //Note: not used in logic, only for public getters
    mapping(address => bool) public isOracle;
    mapping(bytes32 => mapping(address => bool)) public unfinishedVotings;
    mapping(bytes32 => uint) public receivedVotes;
    mapping(bytes32 => bool) public finishedVotings;

    constructor (string memory name_, string memory symbol_, address[] memory initialSet) ERC20(name_, symbol_) {
        updateOracleSet(initialSet);
    }
    
    function generalVote(bytes32 digest, Signature[] memory signatures) internal returns (uint countedVotes){
      uint signum = signatures.length;
      countedVotes = receivedVotes[digest];
      for(uint i=0; i<signum; i++) {
        address signer = signatures[i].signer;
        require(isOracle[signer], "Unauthorized signer");
        checkSignature(digest, signatures[i]);
        if(!unfinishedVotings[digest][signer]) {
          countedVotes += 1;
          unfinishedVotings[digest][signer] = true;
        }
      }
      receivedVotes[digest] = countedVotes;
    }

    function voteForMinting(SwapData memory data, Signature[] memory signatures) override public {
      bytes32 _id = getSwapDataId(data);
      uint countedVotes = generalVote(_id, signatures);
      if( countedVotes >= 2 * oraclesSet.length / 3 && !finishedVotings[_id]) {
          executeMinting(data);
          finishedVotings[_id] = true;
      }
    }

    function voteForNewOracleSet(address[] memory newOracles, Signature[] memory signatures) override  public {
      bytes32 _id = getNewSetId(newOracles);
      uint countedVotes = generalVote(_id, signatures);
      if( countedVotes >= 2 * oraclesSet.length / 3 && !finishedVotings[_id]) {
          updateOracleSet(newOracles);
          finishedVotings[_id] = true;
      }
    }

    function executeMinting(SwapData memory data) internal {
      mint(data);
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
