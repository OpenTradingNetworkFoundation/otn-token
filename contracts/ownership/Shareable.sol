pragma solidity ^0.4.11;


/**
 * @title Shareable
 * @dev inheritable "property" contract that enables methods to be protected by requiring the
 * acquiescence of either a single, or, crucially, each of a number of, designated owners.
 * @dev Usage: use modifiers onlyOwner (just own owned) or onlyManyOwners(hash), whereby the same hash must be provided by some number (specified in constructor) of the set of owners (specified in the constructor) before the interior is executed.
 */
contract Shareable {

    event Confirmation(address owner, bytes32 operation);
    event Revoke(address owner, bytes32 operation);
    event RequirementChange(uint required);
    event OwnerAddition(address indexed owner);
    event OwnerRemoval(address indexed owner);

    // struct for the status of a pending operation.
    struct PendingState {
        uint256 index;
        uint256 yetNeeded;
        mapping (address => bool) ownersDone;
    }

    // the number of owners that must confirm the same operation before it is run.
    uint256 public required;

    // list of owners by index
    address[] owners;

    // hash table of owners by address
    mapping (address => bool) internal isOwner;

    // the ongoing operations.
    mapping (bytes32 => PendingState) internal pendings;

    // the ongoing operations by index
    bytes32[] internal pendingsIndex;

    /**
     * @dev Throws if address is null.
     * @param _address The address for check
     */
    modifier addressNotNull(address _address) {
        require(_address != address(0));
        _;
    }

    /**
     * @dev Throws if owners count less then quorum.
     * @param _ownersCount New owners count
     * @param _required New or old required param, min: 2
     */
    modifier validRequirement(uint256 _ownersCount, uint _required) {
        require(_required > 1 && _ownersCount >= _required);
        _;
    }

    /**
     * @dev Throws if owner does not exists.
     * @param owner The address for check
     */
    modifier ownerExists(address owner) {
        require(isOwner[owner]);
        _;
    }

    /**
     * @dev Throws if owner exists.
     * @param owner The address for check
     */
    modifier ownerDoesNotExist(address owner) {
        require(!isOwner[owner]);
        _;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner {
        require(isOwner[msg.sender]);
        _;
    }

    /**
     * @dev Modifier for multisig functions.
     * @param _operation The operation must have an intrinsic hash in order that later attempts can be
     * realised as the same underlying operation and thus count as confirmations.
     */
    modifier onlyManyOwners(bytes32 _operation) {
        if (confirmAndCheck(_operation)) {
            _;
        }
    }

    /**
     * @dev Constructor is given the number of sigs required to do protected "onlyManyOwners"
     * transactions as well as the selection of addresses capable of confirming them.
     * @param _additionalOwners A list of owners.
     * @param _required The amount required for a operation to be approved.
     */
    function Shareable(address[] _additionalOwners, uint256 _required)
        validRequirement(_additionalOwners.length + 1, _required)
    {
        owners.push(msg.sender);
        isOwner[msg.sender] = true;

        for (uint i = 0; i < _additionalOwners.length; i++) {
            require(!isOwner[_additionalOwners[i]] && _additionalOwners[i] != address(0));

            owners.push(_additionalOwners[i]);
            isOwner[_additionalOwners[i]] = true;
        }

        required = _required;
    }

    /**
     * @dev Allows to change the number of required confirmations.
     * @param _required Number of required confirmations.
     */
    function changeRequirement(uint _required)
        external
        validRequirement(owners.length, _required)
        onlyManyOwners(keccak256("change-requirement", _required))
    {
        required = _required;

        RequirementChange(_required);
    }

    /**
     * @dev Allows owners to add new owner with quorum.
     * @param _owner The address to join for ownership.
     */
    function addOwner(address _owner)
        external
        addressNotNull(_owner)
        ownerDoesNotExist(_owner)
        onlyManyOwners(keccak256("add-owner", _owner))
    {
        owners.push(_owner);
        isOwner[_owner] = true;

        OwnerAddition(_owner);
    }

    /**
     * @dev Allows owners to remove owner with quorum.
     * @param _owner The address to remove from ownership.
     */
    function removeOwner(address _owner)
        external
        addressNotNull(_owner)
        ownerExists(_owner)
        onlyManyOwners(keccak256("remove-owner", _owner))
        validRequirement(owners.length - 1, required)
    {
        // clear all pending operation list
        clearPending();

        isOwner[_owner] = false;

        for (uint256 i = 0; i < owners.length - 1; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                break;
            }
        }

        owners.length -= 1;

        OwnerRemoval(_owner);
    }

    /**
     * @dev Revokes a prior confirmation of the given operation.
     * @param _operation A string identifying the operation.
     */
    function revoke(bytes32 _operation)
        external
        onlyOwner
    {
        var pending = pendings[_operation];

        if (pending.ownersDone[msg.sender]) {
            pending.yetNeeded++;
            pending.ownersDone[msg.sender] = false;

            uint256 count = 0;
            for (uint256 i = 0; i < owners.length; i++) {
                if (hasConfirmed(_operation, owners[i])) {
                    count++;
                }
            }

            if (count <= 0) {
                pendingsIndex[pending.index] = pendingsIndex[pendingsIndex.length - 1];
                pendingsIndex.length--;
                delete pendings[_operation];
            }

            Revoke(msg.sender, _operation);
        }
    }

    /**
     * @dev Function to check is specific owner has already confirme the operation.
     * @param _operation The operation identifier.
     * @param _owner The owner address.
     * @return True if the owner has confirmed and false otherwise.
     */
    function hasConfirmed(bytes32 _operation, address _owner)
        constant
        addressNotNull(_owner)
        onlyOwner
        returns (bool)
    {
        return pendings[_operation].ownersDone[_owner];
    }

    /**
     * @dev Confirm and operation and checks if it's already executable.
     * @param _operation The operation identifier.
     * @return Returns true when operation can be executed.
     */
    function confirmAndCheck(bytes32 _operation)
        internal
        onlyOwner
        returns (bool)
    {
        var pending = pendings[_operation];

        // if we're not yet working on this operation, switch over and reset the confirmation status.
        if (pending.yetNeeded == 0) {
            clearOwnersDone(_operation);
            // reset count of confirmations needed.
            pending.yetNeeded = required;
            // reset which owners have confirmed (none).
            pendingsIndex.length++;
            pending.index = pendingsIndex.length++;
            pendingsIndex[pending.index] = _operation;
        }

        // make sure we (the message sender) haven't confirmed this operation previously.
        if (!hasConfirmed(_operation, msg.sender)) {
            Confirmation(msg.sender, _operation);

            // ok - check if count is enough to go ahead.
            if (pending.yetNeeded <= 1) {
                // enough confirmations: reset and run interior.
                clearOwnersDone(_operation);
                pendingsIndex[pending.index] = pendingsIndex[pendingsIndex.length - 1];
                pendingsIndex.length--;
                delete pendings[_operation];

                return true;
            } else {
                // not enough: record that this owner in particular confirmed.
                pending.yetNeeded--;
                pending.ownersDone[msg.sender] = true;
            }
        } else {
            revert();
        }

        return false;
    }

    /**
     * @dev Clear ownersDone in operation.
     * @param _operation The operation identifier.
     */
    function clearOwnersDone(bytes32 _operation)
        internal
        onlyOwner
    {
        for (uint256 i = 0; i < owners.length; i++) {
            if (pendings[_operation].ownersDone[owners[i]]) {
                pendings[_operation].ownersDone[owners[i]] = false;
            }
        }
    }

    /**
     * @dev Clear the pending list.
     */
    function clearPending()
        internal
        onlyOwner
    {
        uint256 length = pendingsIndex.length;

        for (uint256 i = 0; i < length; ++i) {
            clearOwnersDone(pendingsIndex[i]);
            delete pendings[pendingsIndex[i]];
        }

        pendingsIndex.length = 0;
    }
}
