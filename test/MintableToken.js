'use strict';

const assertJump = require('./helpers/assertJump');
var MintableToken = artifacts.require('../contracts/token/MintableToken.sol');

contract('Mintable', function (accounts) {
    let initialSupply = 79000000;
    let firstIterationMaxSupply = 350000;
    let totalSupplyLimit = 100000000;
    let token;

    beforeEach(async function () {
        token = await MintableToken.new(
            accounts[0],
            initialSupply,
            firstIterationMaxSupply,
            totalSupplyLimit,
            0,
            [accounts[1], accounts[2]],
            2
        );
    });

    it('should start with a totalSupplyLimit', async function () {
        assert.equal(await token.totalSupplyLimit(), totalSupplyLimit);
    });

    it('should start with a totalSupply', async function () {
        assert.equal(await token.totalSupply(), initialSupply);
    });

    it('should start with a correct balance', async function () {
        assert.equal(await token.balanceOf(accounts[0]), initialSupply);
    });

    it('should start with a correct step blocks parameter', async function () {
        assert.equal(await token.numberOfBlocksBetweenSupplies(), 0);
    });

    it('should start with a correct current iteration', async function () {
        assert.equal(await token.currentIteration(), 1);
    });

    it('should start with a correct next mint after block > 0', async function () {
        assert.isTrue((await token.nextSupplyAfterBlock()) > 0);
    });

    it('should create mint failed not owner', async function () {
        try {
            await token.mint(accounts[0], 100, {from: accounts[6]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });

    it('should create mint operation', async function () {
        await token.mint(accounts[0], 100, {from: accounts[0]});

        assert.equal(await token.totalSupply(), initialSupply);
        assert.equal(await token.balanceOf(accounts[0]), initialSupply);
    });

    it('should create minting and confirm all owners', async function () {
        await token.mint(accounts[0], 100, {from: accounts[1]});
        await token.mint(accounts[0], 100, {from: accounts[2]});

        assert.equal(await token.totalSupply(), initialSupply + 100);
        assert.equal(await token.balanceOf(accounts[0]), initialSupply + 100);
        assert.equal(await token.currentIteration(), 2);
    });

    it('should correct amount of supply at each iteration', async function () {
        let currentySupply = firstIterationMaxSupply;
        let totalSupply = initialSupply;

        for (let iteration = 1; iteration < 107; iteration++) {
            if (currentySupply > (totalSupplyLimit - totalSupply)) {
                currentySupply = totalSupplyLimit - totalSupply;
            }

            assert.equal((await token.currentIterationSupplyLimit()).valueOf(), currentySupply);

            await token.mint(accounts[0], currentySupply, {from: accounts[1]});
            await token.mint(accounts[0], currentySupply, {from: accounts[2]});

            totalSupply += currentySupply;

            assert.equal((await token.totalSupply()).valueOf(), totalSupply);
            assert.equal((await token.balanceOf(accounts[0])).valueOf(), totalSupply);

            currentySupply = Math.floor((currentySupply * 9881653713) / 10000000000);
        }

        assert.equal((await token.totalSupply()).valueOf(), totalSupplyLimit);
        assert.equal((await token.balanceOf(accounts[0])).valueOf(), totalSupplyLimit);
    });

    it('should mint failed amount of supply > max amount at iteration', async function () {
        let currentySupply = 500010e18;

        try {
            await token.mint(accounts[0], currentySupply, {from: accounts[0]});
        } catch (error) {
            return assertJump(error);
        }

        assert.fail('should have thrown before');
    });
});
