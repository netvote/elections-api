'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")
const audit = require("../audit/audit")
const Joi = require('joi');
const uuid = require('uuid/v4');

const createElectionSchema = Joi.object().keys({
  autoActivate: Joi.boolean().default(false),
  continuousReveal: Joi.boolean().default(false),
  metadataLocation: Joi.string().required(),
  requireProof: Joi.boolean().default(true),
  netvoteKeyAuth: Joi.boolean().default(false),
  allowUpdates: Joi.boolean().default(false),
  closeAfter: Joi.number().default(new Date().getTime()),
  voteStartTime: Joi.number().default(new Date().getTime()),
  test: Joi.boolean().default(false),
  voteEndTime: Joi.number().default(0),
  network: Joi.string().only("netvote", "ropsten", "mainnet").required()
})

module.exports.create = async (event, context) => {

  try {

    let params = await utils.validate(event.body, createElectionSchema);
    let user = utils.getUser(event);

    if(params.network === "mainnet"){
      if(!user.mainnet){
        return utils.error(403, "user does not have permission to use mainnet")
      }
    }

    if(params.voteEndTime && params.voteEndTime < (new Date().getTime())){
      return utils.error(400, "voteEndTime is in the past.  Value should be in epoch milliseconds.")
    }

    let electionId = uuid();
    let payload = {
      network: params.network,
      electionId: electionId,
      election: {
          type: "basic",
          allowUpdates: params.allowUpdates,
          isPublic: params.continuousReveal,
          requireProof: params.requireProof,
          closeAfter: params.closeAfter,
          netvoteKeyAuth: params.netvoteKeyAuth,
          metadataLocation: params.metadataLocation,
          autoActivate: params.autoActivate,
          voteStartTime: params.voteStartTime,
          voteEndTime: params.voteEndTime,
          isDemo: false, 
          test: params.test,
          uid: user.id
      }
    }

    let jobId = await async.startJob("election-create", payload, user);
    await audit.add(user, audit.ACTION.CREATE_ELECTION, payload);
    return utils.sendJobId(jobId)

  } catch (e) {
    console.error(e);
    return utils.error(400, e.message)
  }

};
