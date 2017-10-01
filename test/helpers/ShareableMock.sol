pragma solidity ^0.4.11;


import "../../contracts/ownership/Shareable.sol";


contract ShareableMock is Shareable {

    uint public count = 0;

    function ShareableMock(address[] _owners, uint _required) Shareable(_owners, _required) {

    }

    function increaseCount(bytes32 action) onlyManyOwners(action) {
        count = count + 1;
    }

    function getIsOwner(address _owner) constant returns (bool) {
        return isOwner[_owner];
    }

    function hasOperation(bytes32 action) constant returns (bool) {
        if (pendings[action].index > 0 && pendings[action].yetNeeded > 0 && !ownersCleaned(action)) {
            for (uint256 i = 0; i < pendingsIndex.length; i++) {
                if (pendingsIndex[i] == action) {
                    return true;
                }
            }
        }

        return false;
    }

    function ownersCleaned(bytes32 action) constant returns (bool) {
        var pending = pendings[action];

        uint256 cnt = 0;
        for (uint256 i = 0; i < owners.length; i++) {
            if (pending.ownersDone[owners[i]]) {
                cnt++;
            }
        }

        return cnt == 0;
    }

    function getHashForAddingOwner(address owner) constant returns (bytes32) {
        return keccak256("add-owner", owner);
    }

    function getHashForRemovingOwner(address owner) constant returns (bytes32) {
        return keccak256("remove-owner", owner);
    }

    function getOwners() constant returns (address[]) {
        return owners;
    }
}
