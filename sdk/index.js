const initVoterClient = () => {
    const publicNv = require("./netvote-public-apis");
    publicNv.Init({
        baseUrl: "https://elections-dev.netvote.io"
    })
    return publicNv;
}

const initAdminClient = (apiKey, secret) => {
    const nv = require("./netvote-admin-apis");
    nv.Init({
        id: apiKey,
        secret: secret,
        baseUrl: "https://elections-dev.netvote.io"
    })
    return nv;
}

module.exports = {
    initAdminClient: initAdminClient,
    initVoterClient: initVoterClient
}