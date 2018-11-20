const NodeRSA = require("node-rsa");
const protobuf = require("protobufjs");
const uuid = require('uuid/v4');

let Vote;

// output from export of proto
let protoJson = {"nested":{"netvote":{"nested":{"PointsAllocation":{"fields":{"points":{"rule":"repeated","type":"uint32","id":1}}},"IndexSelection":{"fields":{"indexes":{"rule":"repeated","type":"uint32","id":1}}},"VoteChoice":{"oneofs":{"choice":{"oneof":["selection","writeIn","pointsAllocations","indexSelections","abstain"]}},"fields":{"selection":{"type":"uint32","id":1},"writeIn":{"type":"string","id":2},"pointsAllocations":{"type":"PointsAllocation","id":3},"indexSelections":{"type":"IndexSelection","id":4},"abstain":{"type":"bool","id":5}}},"BallotVote":{"fields":{"choices":{"rule":"repeated","type":"VoteChoice","id":1}}},"Vote":{"fields":{"encryptionSeed":{"type":"uint64","id":1},"ballotVotes":{"rule":"repeated","type":"BallotVote","id":2},"weight":{"type":"string","id":3},"decoy":{"type":"bool","id":4},"signatureSeed":{"type":"string","id":5}}}}}}}

const initProto = async () => {
    if(!Vote){
        let root = protobuf.Root.fromJSON(protoJson);
        Vote = root.lookupType("netvote.Vote");
    }
}

//for browser compatibility 
function toBase64( bufferText ) {
    if(bufferText.indexOf(",") == -1){
        return bufferText;
    }
    let buffer = bufferText.split(","); 
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

const signVote = async (voteBase64) => {
    const key = new NodeRSA();
    key.setOptions({
        signingScheme: "pkcs1-md5"
    })
    key.generateKeyPair();

    const public = key.exportKey('public');
    let pub = toBase64(Buffer.from(public, "utf8").toString("base64"));
    let sig = key.sign(Buffer.from(voteBase64, "utf8"), null, "base64")
    
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
    return toBase64(buff.toString("base64"))
};

module.exports = {
    signVote: signVote,
    encodeVote: encodeVote
}
