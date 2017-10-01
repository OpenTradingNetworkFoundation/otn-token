pragma solidity ^0.4.11;


import './StandardToken.sol';
import '../ownership/Shareable.sol';


/**
 * @title MintableToken
 * @dev Simple ERC20 Token example, with mintable token creation.
 */
contract MintableToken is StandardToken, Shareable {
    event Mint(uint256 iteration, address indexed to, uint256 amount);

    // total supply limit
    uint256 public totalSupplyLimit;

    // the number of blocks to the next supply
    uint256 public numberOfBlocksBetweenSupplies;

    // mint is available after the block number
    uint256 public nextSupplyAfterBlock;

    // the current iteration of the supply
    uint256 public currentIteration = 1;

    // the amount of tokens available supply in prev iteration
    uint256 private prevIterationSupplyLimit = 0;

    /**
     * @dev Throws if minting are not allowed.
     * @param _amount The amount of tokens to mint.
     */
    modifier canMint(uint256 _amount) {
        // check block height
        require(block.number >= nextSupplyAfterBlock);

        // check total supply limit
        require(totalSupply.add(_amount) <= totalSupplyLimit);

        // check supply amount in current iteration
        require(_amount <= currentIterationSupplyLimit());

        _;
    }

    /**
     * @dev Constructor
     * @param _initialSupplyAddress The address that will recieve the initial minted tokens.
     * @param _initialSupply The amount of tokens to initial mint.
     * @param _firstIterationSupplyLimit The amount of token to limit first iteration.
     * @param _totalSupplyLimit The amount of tokens to finish mint.
     * @param _numberOfBlocksBetweenSupplies Number of blocks for the next mint.
     * @param _additionalOwners A list of owners.
     * @param _required The amount required for a transaction to be approved.
     */
    function MintableToken(
        address _initialSupplyAddress,
        uint256 _initialSupply,
        uint256 _firstIterationSupplyLimit,
        uint256 _totalSupplyLimit,
        uint256 _numberOfBlocksBetweenSupplies,
        address[] _additionalOwners,
        uint256 _required
    )
        Shareable(_additionalOwners, _required)
    {
        require(_initialSupplyAddress != address(0) && _initialSupply > 0);

        prevIterationSupplyLimit = _firstIterationSupplyLimit;
        totalSupplyLimit = _totalSupplyLimit;
        numberOfBlocksBetweenSupplies = _numberOfBlocksBetweenSupplies;
        nextSupplyAfterBlock = block.number.add(_numberOfBlocksBetweenSupplies);

        totalSupply = totalSupply.add(_initialSupply);
        balances[_initialSupplyAddress] = balances[_initialSupplyAddress].add(_initialSupply);
    }

    /**
     * @dev Returns the limit on the supply in the current iteration.
     */
    function currentIterationSupplyLimit()
        public
        constant
        returns (uint256 maxSupply)
    {
        if (currentIteration == 1) {
            maxSupply = prevIterationSupplyLimit;
        } else {
            maxSupply = prevIterationSupplyLimit.mul(9881653713).div(10000000000);

            if (maxSupply > (totalSupplyLimit.sub(totalSupply))) {
                maxSupply = totalSupplyLimit.sub(totalSupply);
            }
        }
    }

    /**
     * @dev Function to init minting tokens
     * @param _to The address that will recieve the minted tokens.
     * @param _amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address _to, uint256 _amount)
        external
        canMint(_amount)
        onlyManyOwners(keccak256("mint", _to, _amount))
        returns (bool)
    {
        prevIterationSupplyLimit = currentIterationSupplyLimit();
        nextSupplyAfterBlock = block.number.add(numberOfBlocksBetweenSupplies);

        totalSupply = totalSupply.add(_amount);
        balances[_to] = balances[_to].add(_amount);

        Mint(currentIteration, _to, _amount);
        Transfer(0x0, _to, _amount);

        currentIteration = currentIteration.add(1);

        clearPending();

        return true;
    }
}
