'use strict';

const assertJump = require('./helpers/assertJump');
var ShareableMock = artifacts.require("./helpers/ShareableMock.sol");

contract('Shareable', function (accounts) {

    it('should construct fail with incorrect required = 1', async function () {
        try {
            await ShareableMock.new([
                accounts[1],
                accounts[2],
            ], 1);
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');

    });

    it('should construct fail with incorrect owners', async function () {
        try {
            await ShareableMock.new([], 2);
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');

    });

    it('should construct fail with incorrect required', async function () {
        try {
            await ShareableMock.new([
                accounts[1],
                accounts[2]
            ], 4);
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');

    });

    it('should construct with correct owners and number of sigs required', async function () {
        let requiredSigs = 3;
        let owners = accounts.slice(1, 3);
        let shareable = await ShareableMock.new(owners, requiredSigs);

        let required = await shareable.required();
        assert.equal(required, requiredSigs);

        assert.equal(await shareable.getIsOwner(accounts[0]), true);
        assert.equal(await shareable.getIsOwner(owners[0]), true);
        assert.equal(await shareable.getIsOwner(owners[1]), true);
        assert.equal(await shareable.getIsOwner(accounts[6]), false);
    });

    it('should only perform multisig function with enough sigs', async function () {
        let requiredSigs = 3;
        let owners = accounts.slice(1, 3);
        let shareable = await ShareableMock.new(owners, requiredSigs);
        let hash = 1234;

        let initCount = await shareable.count();
        initCount = initCount.toString();

        for (let i = 0; i < requiredSigs; i++) {
            await shareable.increaseCount(hash, {from: accounts[i]});
            let count = await shareable.count();
            if (i == requiredSigs - 1) {
                assert.equal(Number(initCount) + 1, count.toString());
            } else {
                assert.equal(initCount, count.toString());
            }
        }
    });

    it('should require approval from different owners', async function () {
        let requiredSigs = 2;
        let owners = accounts.slice(1, 3);
        let shareable = await ShareableMock.new(owners, requiredSigs);
        let hash = 1234;

        let initCount = await shareable.count();
        initCount = initCount.toString();


        await shareable.increaseCount(hash);
        assert.equal(initCount, (await shareable.count()).toString());

        try {
            await shareable.increaseCount(hash);
        } catch (error) {
            assert.equal(initCount, (await shareable.count()).toString());

            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });

    it('should reset sig count after operation is approved', async function () {
        let requiredSigs = 3;
        let owners = accounts.slice(1, 4);
        let shareable = await ShareableMock.new(owners, requiredSigs);
        let hash = 1234;

        let initCount = await shareable.count();

        for (let i = 0; i < requiredSigs * 3; i++) {
            await shareable.increaseCount(hash, {from: accounts[i % 4]});
            let count = await shareable.count();
            if ((i % (requiredSigs)) == requiredSigs - 1) {
                initCount = Number(initCount) + 1;
                assert.equal(initCount, count);
            } else {
                assert.equal(initCount.toString(), count);
            }
        }
    });

    it('should not perform multisig function after an owner revokes', async function () {
        let requiredSigs = 3;
        let owners = accounts.slice(1, 4);
        let shareable = await ShareableMock.new(owners, requiredSigs);
        let hash = 1234;

        let initCount = await shareable.count();

        for (let i = 0; i < requiredSigs; i++) {
            if (i == 1) {
                await shareable.revoke(hash, {from: accounts[i - 1]});
            }
            await shareable.increaseCount(hash, {from: accounts[i]});
            let count = await shareable.count();
            assert.equal(initCount.toString(), count);
        }
    });

    it('should delete pending operation if all revokes', async function () {
        let requiredSigs = 3;
        let owners = accounts.slice(1, 3);
        let shareable = await ShareableMock.new(owners, requiredSigs);
        let hash = 1234;

        await shareable.increaseCount(hash, {from: accounts[0]});
        assert.equal(await shareable.hasConfirmed(hash, accounts[0]), true);
        await shareable.increaseCount(hash, {from: accounts[1]});
        assert.equal(await shareable.hasConfirmed(hash, accounts[1]), true);
        await shareable.revoke(hash, {from: accounts[1]});
        assert.equal(await shareable.hasConfirmed(hash, accounts[1]), false);
        await shareable.revoke(hash, {from: accounts[0]});
        assert.equal(await shareable.hasOperation(hash), false);
    });

    it('should add new owner with quorum', async function () {
        let shareable = await ShareableMock.new(accounts.slice(1, 3), 3);

        await shareable.addOwner(accounts[5]);
        assert.equal(await shareable.hasConfirmed(await shareable.getHashForAddingOwner(accounts[5]), accounts[0]), true);

        await shareable.addOwner(accounts[5], {from: accounts[1]});
        assert.equal(await shareable.hasConfirmed(await shareable.getHashForAddingOwner(accounts[5]), accounts[1]), true);

        await shareable.addOwner(accounts[5], {from: accounts[2]});

        assert.equal(await shareable.getIsOwner(accounts[5], {from: accounts[1]}), true);
    });

    it('should add new owner failed not owner', async function () {
        let shareable = await ShareableMock.new(accounts.slice(1, 3), 3);

        try {
            await shareable.addOwner(accounts[5], {from: accounts[5]});
        } catch (error) {
            assert.equal(await shareable.hasConfirmed(await shareable.getHashForAddingOwner(accounts[5]), accounts[5]), false);

            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });

    it('should remove owner with quorum', async function () {
        let shareable = await ShareableMock.new(accounts.slice(1, 3), 3);
        await shareable.addOwner(accounts[5], {from: accounts[0]});
        await shareable.addOwner(accounts[5], {from: accounts[1]});
        await shareable.addOwner(accounts[5], {from: accounts[2]});

        assert.equal(await shareable.getIsOwner(accounts[5], {from: accounts[0]}), true);

        await shareable.removeOwner(accounts[0], {from: accounts[5]});
        assert.equal(await shareable.hasConfirmed(await shareable.getHashForRemovingOwner(accounts[0]), accounts[5]), true);
        await shareable.removeOwner(accounts[0], {from: accounts[2]});
        assert.equal(await shareable.hasConfirmed(await shareable.getHashForRemovingOwner(accounts[0]), accounts[2]), true);
        await shareable.removeOwner(accounts[0], {from: accounts[1]});
        assert.equal(await shareable.getIsOwner(accounts[0], {from: accounts[5]}), false);
    });

    it('should remove owner failed not owner', async function () {
        let shareable = await ShareableMock.new(accounts.slice(1, 3), 3);
        await shareable.addOwner(accounts[5], {from: accounts[0]});
        await shareable.addOwner(accounts[5], {from: accounts[1]});
        await shareable.addOwner(accounts[5], {from: accounts[2]});

        assert.equal(await shareable.getIsOwner(accounts[5], {from: accounts[0]}), true);

        try {
            await shareable.removeOwner(accounts[0], {from: accounts[6]});
        } catch (error) {
            assert.equal(await shareable.hasConfirmed(await shareable.getHashForRemovingOwner(accounts[0]), accounts[1]), false);

            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });

    it('should add owner with quorum and revoke', async function () {
        let shareable = await ShareableMock.new(accounts.slice(1, 3), 3);
        await shareable.addOwner(accounts[5], {from: accounts[0]});
        await shareable.addOwner(accounts[5], {from: accounts[1]});

        assert.equal(await shareable.hasConfirmed(await shareable.getHashForAddingOwner(accounts[5]), accounts[1]), true);

        await shareable.revoke(await shareable.getHashForAddingOwner(accounts[5]), {from: accounts[1]});

        assert.equal(await shareable.hasConfirmed(await shareable.getHashForAddingOwner(accounts[5]), accounts[1]), false);
    });

    it('should add owner with quorum and revoke failed not owner', async function () {
        let shareable = await ShareableMock.new(accounts.slice(1, 3), 3);
        await shareable.addOwner(accounts[5], {from: accounts[0]});
        await shareable.addOwner(accounts[5], {from: accounts[1]});

        assert.equal(await shareable.hasConfirmed(await shareable.getHashForAddingOwner(accounts[5]), accounts[1]), true);

        try {
            await shareable.revoke(await shareable.getHashForAddingOwner(accounts[5]), {from: accounts[6]});
        } catch (error) {
            assert.equal(await shareable.hasConfirmed(await shareable.getHashForAddingOwner(accounts[5]), accounts[6]), false);

            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });

    it('should change required', async function () {
        let shareable = await ShareableMock.new([
            accounts[1],
            accounts[2],
        ], 3);

        assert.equal(await shareable.required(), 3);

        await shareable.changeRequirement(2, {from: accounts[0]});
        assert.equal(await shareable.required(), 3);

        await shareable.changeRequirement(2, {from: accounts[1]});
        assert.equal(await shareable.required(), 3);

        await shareable.changeRequirement(2, {from: accounts[2]});
        assert.equal(await shareable.required(), 2);
    });

    it('should failed change required > ownersCount', async function () {
        let shareable = await ShareableMock.new([
            accounts[1],
            accounts[2],
        ], 3);

        try {
            await shareable.changeRequirement(4, {from: accounts[0]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });

    it('should failed change required not owner', async function () {
        let shareable = await ShareableMock.new([
            accounts[1],
            accounts[2],
        ], 3);

        await shareable.changeRequirement(2, {from: accounts[0]});

        try {
            await shareable.changeRequirement(2, {from: accounts[3]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });

    it('should remove owner and clear pending operation list', async function () {
        let shareable = await ShareableMock.new([
            accounts[1],
            accounts[2]
        ], 2);
        await shareable.removeOwner(accounts[2], {from: accounts[0]});
        await shareable.addOwner(accounts[3], {from: accounts[0]});
        assert.equal(await shareable.hasOperation(await shareable.getHashForAddingOwner(accounts[3]), {from: accounts[0]}), true);
        assert.equal(await shareable.hasOperation(await shareable.getHashForRemovingOwner(accounts[2]), {from: accounts[0]}), true);

        await shareable.removeOwner(accounts[2], {from: accounts[1]});

        assert.equal(await shareable.getIsOwner(accounts[2], {from: accounts[0]}), false);
        assert.equal(await shareable.hasOperation(await shareable.getHashForAddingOwner(accounts[3]), {from: accounts[0]}), false);
    });
});
