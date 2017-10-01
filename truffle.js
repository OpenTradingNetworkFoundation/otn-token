module.exports = {
    networks: {
        development: {
            network_id: "*", // Match any network id
            host: "localhost",
            port: 8545,
        }
    },
    mocha: {
        useColors: true
    }
};
