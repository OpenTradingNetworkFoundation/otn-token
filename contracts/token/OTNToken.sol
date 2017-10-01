pragma solidity ^0.4.11;


import './MintableToken.sol';


/**
 * @title OTN ERC20 token
 */
contract OTNToken is MintableToken {
    // token name
    string public name = "Open Trading Network";

    // token symbol
    string public symbol = "OTN";

    // token decimals
    uint256 public decimals = 18;

    /**
     * @dev Constructor
     * @param _initialSupplyAddress The address that will recieve the initial minted tokens.
     * @param _additionalOwners A list of owners.
     */
    function OTNToken(
        address _initialSupplyAddress,
        address[] _additionalOwners
    )
        MintableToken(
            _initialSupplyAddress,
            79000000e18,            // initial supply
            350000e18,              // first iteration max supply
            100000000e18,           // max supply for all time
            100,                    // supply iteration every 100 blocks (17 sec per block)
            _additionalOwners,      // additional owners
            2                       // required number for a operations to be approved
        )
    {

    }

}
