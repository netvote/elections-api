'use strict';

const ERROR_TYPES = require("../lib/errors").ERROR_TYPES;
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
        return utils.error(403, ERROR_TYPES.BAD_TOKEN);
    }

    // only voting state allowed
    let electionId = voter.electionId;
    let el = await electionData.getElection(electionId);
    if(el.electionStatus !== "voting") {
        return utils.error(409, ERROR_TYPES.VOTING_WINDOW)
    }


    // validate schema
    let params
    try{
        if(el.props.requireProof){
            params = await utils.validate(event.body, voteWithProofSchema);
        } else {
            params = await utils.validate(event.body, voteSchema);
        }
    } catch(e){
        console.error(e);
        return utils.error(400, ERROR_TYPES.VOTE_VALIDATION);
    }

    let vote = await voteUtils.parseVote(params.vote);

    // validate vote contents
    try{
        await voteUtils.validateVote(el, vote);
    } catch(e) {
        console.error(e);
        return utils.error(400, ERROR_TYPES.VOTE_VALIDATION);
    }

    // validate signature
    if(el.props.requireProof){
        try{
            await voteUtils.validateProof(params.vote, params.proof);
        } catch(e) {
            return utils.errorMessage(ERROR_TYPES.VOTE_VALIDATION, e.message);
        }
    }
    let nowTime = new Date().getTime();

    if(el.props.voteStartTime){
        if(el.props.voteStartTime > nowTime) {
            return utils.error(409, ERROR_TYPES.VOTING_WINDOW)
        }
    }

    if(el.props.voteEndTime){
        if(el.props.voteEndTime < nowTime) {
            return utils.error(409, ERROR_TYPES.VOTING_WINDOW)
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
