const initVoterClient = (apiKey, version) => {
    let v = version || "v1";
    const publicNv = require("./netvote-public-apis");
    publicNv.Init({
        apiKey: apiKey,
        baseUrl: `https://elections.netvote.io/${v}`
    })
    return publicNv;
}

const initAdminClient = (apiKey, id, secret, version) => {
    let v = version || "v1";
    const nv = require("./netvote-admin-apis");
    nv.Init({
        apiKey: apiKey,
        id: id,
        secret: secret,
        baseUrl: `https://elections.netvote.io/${v}`
    })
    return nv;
}

module.exports = {
    initAdminClient: initAdminClient,
    initVoterClient: initVoterClient
}