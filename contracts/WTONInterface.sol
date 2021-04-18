pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./IERC20.sol";
import "./TonUtils.sol";


interface WrappedTON is IERC20, TonUtils {

    //function mint(uint256 amount, TonTxID memory swap_tx) internal;

    /**
     * @dev Destroys `amount` tokens from the caller and request transder to `addr`
     *
     * See {ERC20-_burn}.
     */
    function burn(uint256 amount, TonAddress memory addr) external;

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's
     * allowance and request transder to `addr`
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     */
    function burnFrom(address account, uint256 amount, TonAddress memory addr) external;
}
