'use strict';

const assertJump = require('./helpers/assertJump');
var OTNToken = artifacts.require('../contracts/token/OTNToken.sol');

contract('OTNToken', function (accounts) {

    it('should start with initial supply', async function () {
        let owners = accounts.slice(0, 3);
        let token = await OTNToken.new(
            owners[0],           // initial supply address
            owners.slice(1, 3),  // owners
        );

        let currentIteration = await token.currentIteration();
        assert.equal(currentIteration, 1);

        let totalSupply = await token.totalSupply();
        assert.equal(totalSupply, 79000000e18);

        let balance0 = await token.balanceOf(owners[0]);
        assert.equal(balance0, 79000000e18);
    });

    it('should minting not allowed after deploy', async function () {
        let owners = accounts.slice(0, 3);
        let token = await OTNToken.new(
            owners[0],           // initial supply address
            owners.slice(1, 3),  // owners
        );

        try {
            await token.mint(owners[0], 100);
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });
});
