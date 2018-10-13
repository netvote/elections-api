
const nvEncrypt = require('../../lib/encryption')
let protobuf = require("protobufjs");
let IPFS = require('ipfs-mini');
ipfs = new IPFS({ host: 'ipfs.netvote.io', port: 443, protocol: 'https' });

let VoteProto;

Array.prototype.pushArray = function (arr) {
    this.push.apply(this, arr);
};

const getFromIPFS = (location) => {
    return new Promise((resolve, reject) => {
        ipfs.catJSON(location, (err, obj) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            resolve(obj)
        });
    })
}

const ipfsLookup = async (metadataLocation) => {
    let metadata = await getFromIPFS(metadataLocation);
    let decisions = [];
    metadata.ballotGroups.forEach((bg) => {
        decisions.pushArray(bg.ballotSections);
    });
    return {
        decisions: decisions
    }
};

const voteProto = async () => {
    if(!VoteProto){
        let rt = await protobuf.load(`${__dirname}/vote.proto`);
        VoteProto = rt.lookupType("netvote.Vote");
    }
    return VoteProto;
};

const decodeVote = async (voteBuff) => {
    let vp = await voteProto();
    return vp.decode(voteBuff);
};

const encodeVote = async (voteObj) => {
    let vp = await voteProto();
    let err = vp.verify(voteObj);
    if(err){
        throw new Error(err);
    }
    let res = vp.create(voteObj);
    return vp.encode(res).finish();
}


// NOTE: these validate functions are copied from the tally API
// TODO: import tally API or extract validation into library
// spend totalPoints amongst the choices, all points must be spent
const validatePointsChoice = (choice, metadata) => {
    const c = choice;
    const selections = c.pointsAllocations;
    if (!selections || !selections.points ){
        throw new Error("INVALID selections be specified for points type");
    }
    if (selections.points.length !== (metadata.ballotItems.length)) {
        throw new Error("INVALID points must be allocated for each selection (or have 0 specified)");
    }
    let sum = 0;
    selections.points.forEach((points) => {
        sum += points;
    })
    if (sum !== metadata.totalPoints){
        throw new Error("INVALID not all points allocated, requires total of "+metadata.totalPoints);
    }
}

// strict numbering of 1-N for N choices
const validateRankedChoice = (choice, metadata) => {
    const c = choice;
    const selections = c.pointsAllocations;
    if (!selections || !selections.points ) {
        throw new Error("INVALID pointsAllocations be specified for ranked type");
    }
    if (selections.points.length !== (metadata.ballotItems.length)) {
        throw new Error("INVALID points must be allocated for each selection (or have 0 specified)");
    }
    //must contain all of 1,2,3,...N
    for(let i=1; i<=selections.points.length; i++){
        if(selections.points.indexOf(i) === -1){
            throw new Error("INVALID ranked points must include every number from 1 to number of entries")
        }
    }
}

// each entry represents an index of a choice selected, numberToSelect must be selected
const validateMultipleChoice = (choice, metadata) => {
    const c = choice;
    const selections = c.indexSelections;
    if (!selections || !selections.indexes ) {
        throw new Error("INVALID indexSelections be specified for multiple choice type");
    }
    // cannot select more than allowed (default max is number of choices)
    let maxSelect = metadata.maxSelect || metadata.ballotItems.length; 
    if (selections.indexes.length > maxSelect) {
        throw new Error("INVALID must select fewer than "+maxSelect+" entries, found="+selections.indexes.length);
    }
    // cannot select fewer than allowed (default minum is 1.  0 requires explicit Abstain)
    let minSelect = metadata.minSelect || 1;
    if (selections.indexes.length < minSelect) {
        throw new Error("INVALID must select more than "+minSelect+" entries, found="+selections.indexes.length);
    }
    for(let i=1; i<=selections.indexes.length; i++){
        if (selections.indexes[i] < 0) {
            throw new Error("INVALID selection < 0: " + selections.indexes[i]);
        }
        if (selections.indexes[i] > (metadata.ballotItems.length - 1)) {
            throw new Error("INVALID selection > array: " + selections.indexes[i]);
        }
    }
}

const validateSingleChoice = (choice, metadata) => {
    const c = choice;
    if(!c.writeIn){
        if(c.selection === undefined || c.selection === null){
            throw new Error("INVALID selection must be set")
        }
        if (c.selection < 0) {
            throw new Error("INVALID selection < 0: " + c.selection);
        }
        if (c.selection > (metadata.ballotItems.length - 1)) {
            throw new Error("INVALID selection > array: " + c.selection);
        }
    }
}

const validations = {
    "points": validatePointsChoice,
    "ranked": validateRankedChoice,
    "multiple": validateMultipleChoice,
    "single": validateSingleChoice
}

const validateChoices = (choices, decisionsMetadata) => {
    if (choices.length !== decisionsMetadata.length) {
        throw new Error("INVALID all questions must be answered");
    }

    choices.forEach((c, idx) => {
        let choiceType = decisionsMetadata[idx].type || "single"
        if(!c.abstain) {
            validations[choiceType](c, decisionsMetadata[idx])
        }
    });
 
    return true;
};

// only supports single-tiered ballot currently
const validateVote = async (election, vote) => {
    let metadataLocation = election.props.metadataLocation;
    let requireProof = election.props.requireProof;

    const metadata = await ipfsLookup(metadataLocation)

    if(vote.ballotVotes.length !== 1){
        throw new Error("Expected 1 ballotVote, but saw "+vote.ballotVotes.length)
    }

    if(requireProof && !vote.signatureSeed){
        throw new Error("signatureSeed must be set if proofs are required")
    }

    let ballotVote = vote.ballotVotes[0];
    validateChoices(ballotVote.choices, metadata.decisions);
};

const parseVote = async(voteBase64) => {
    let voteBuff = Buffer.from(voteBase64, 'base64');
    return await decodeVote(voteBuff);
}

const encryptVote = async(electionId, voteObj, weight) => {
    voteObj.weight = weight || 1;
    voteObj.encryptionSeed = Math.floor(Math.random() * 1000000);
    let vote = await encodeVote(voteObj);
    return nvEncrypt.encrypt(electionId, vote);
}

const validateProof = async (voteBase64, proof) => {
    if(!proof){
        throw new Error("proof is required")
    }
    const proofObj = await getFromIPFS(proof);
    if(!proofObj.signature){
        throw new Error("signature is not specified in IPFS proof")
    }
    if(!proofObj.publicKey){
        throw new Error("publicKey is not specified in IPFS proof")
    }
    return nvEncrypt.checkSignature(voteBase64, proofObj.publicKey, proofObj.signature)
}


module.exports = {
    parseVote: parseVote,
    validateVote: validateVote,
    validateProof: validateProof,
    encryptVote: encryptVote
}