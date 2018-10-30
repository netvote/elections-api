const NodeRSA = require("node-rsa");
const protobuf = require("protobufjs");
const uuid = require('uuid/v4');

let Vote;

const initProto = async () => {
    if(!Vote){
        let root = await protobuf.load('./vote.proto');
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
    let pub = toBase64(new Buffer(public).toString("base64"));

    let sig = key.sign(new Buffer(voteBase64), null, "base64")
    
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
