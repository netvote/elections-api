const ursa = require("ursa");
const protobuf = require("protobufjs");
const uuid = require('uuid/v4');

let Vote;

const initProto = async () => {
    if(!Vote){
        let root = await protobuf.load(`${__dirname}/vote.proto`);
        Vote = root.lookupType("netvote.Vote");
    }
}

const signVote = async (voteBase64) => {
    let keyPair = ursa.generatePrivateKey();
    let pub = keyPair.toPublicPem('base64');
    let data = new Buffer(voteBase64);
    let sig = keyPair.hashAndSign('md5', data).toString("base64");
    let obj = {
        signature: sig,
        publicKey: pub
    }
    return obj;
}

const encodeVote = async (payload, signatures) => {
    await initProto();

    let errMsg = Vote.verify(payload);
    if (errMsg) {
        throw Error(errMsg);
    }

    // prevent populating unnecessary fields
    const newVote = {
        ballotVotes: payload.ballotVotes,
    }
    if(signatures){
        newVote.signatureSeed = uuid();
    }

    let vote = Vote.create(newVote);
    let buff = await Vote.encode(vote).finish();
    return buff.toString("base64")
};

module.exports = {
    signVote: signVote,
    encodeVote: encodeVote
}
