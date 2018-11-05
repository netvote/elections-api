'use strict';

const async = require("../lib/async")
const utils = require("../lib/utils")
const electionData = require("../lib/election")
const nvEncrypt = require('../lib/encryption')
const Joi = require('joi');
const voteUtils = require("./lib/vote")
const web3 = require('web3-utils');

const voteWithProofSchema = Joi.object().keys({
    vote: Joi.string().base64().required(),
    proof: Joi.string().required()
})

const voteSchema = Joi.object().keys({
    vote: Joi.string().base64().required(),
    proof: Joi.string()
})

module.exports.cast = async (event, context) => {

    // authorize (TODO: move to gateway authorizer?)
    let voter;
    try {
        let token = nvEncrypt.extractAuthHeader(event);
        voter = await nvEncrypt.verifyElectionJwt(token);
    } catch (e) {
        console.error(e);
        console.info({message: "token invalid", error: e.message});
        return utils.error(403, "token is invalid")
    }

    // only voting state allowed
    let electionId = voter.electionId;
    let el = await electionData.getElection(electionId);
    if(el.electionStatus !== "voting") {
        return utils.error(409, {message: `election is in ${el.electionStatus} state`})
    }

    // validate schema
    let params
    if(el.props.requireProof){
        params = await utils.validate(event.body, voteWithProofSchema);
    } else {
        params = await utils.validate(event.body, voteSchema);
    }

    let vote = await voteUtils.parseVote(params.vote);

    // validate vote contents
    try{
        await voteUtils.validateVote(el, vote);
    } catch(e) {
        console.error(e);
        console.error({electionId: electionId, message: "invalid vote", error: e.message});
        return utils.error(400, e.message);
    }

    // validate signature
    if(el.props.requireProof){
        try{
            await voteUtils.validateProof(params.vote, params.proof);
        } catch(e) {
            console.error({electionId: electionId, message: "invalid proof", error: e.message});
            return utils.error(400, e.message);
        }
    }
    let nowTime = new Date().getTime();

    if(el.props.voteStartTime){
        if(el.props.voteStartTime > nowTime) {
            return utils.error(409, {message: `The voting period is now yet open.  (Starts at ${el.props.voteStartTime})`})
        }
    }

    if(el.props.voteEndTime){
        if(el.props.voteEndTime < nowTime) {
            return utils.error(409, {message: `The voting period is now over.  (Ended at ${el.props.voteEndTime})`})
        }
    }

    let encryptedVote = await voteUtils.encryptVote(electionId, vote, voter.weight);
    let voteId = await nvEncrypt.anonymize(electionId, voter.voterId, nvEncrypt.KEY_TYPE.VOTER);
    let tokenId = await nvEncrypt.anonymize(electionId, voter.tokenId, nvEncrypt.KEY_TYPE.VOTER);

    let voteObj = {
        proof: params.proof,
        voteId: web3.sha3(voteId),
        tokenId: web3.sha3(tokenId),
        encryptedVote: encryptedVote
    };

    let payload = {
        electionId: electionId,
        vote: voteObj
    }

    let jobId = await async.startJob("election-cast-vote", payload)
    return utils.sendJobId(jobId)
};
