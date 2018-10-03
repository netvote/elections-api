'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")
const Joi = require('joi');

const createElectionSchema = Joi.object().keys({
  autoActivate: Joi.boolean().default(false),
  continuousReveal: Joi.boolean().default(false),
  metadataLocation: Joi.string().required(),
  requireProof: Joi.boolean().default(true),
  netvoteKeyAuth: Joi.boolean().default(false),
  allowUpdates: Joi.boolean().default(false),
  closeAfter: Joi.date().default(new Date().getTime()),
  voteStartTime: Joi.date().default(new Date().getTime()),
  voteEndTime: Joi.date().default(0),
  network: Joi.string().only("netvote", "ropsten", "mainnet").required()
})

module.exports.create = async (event, context) => {

  try {

    let params = await utils.validate(event.body, createElectionSchema);
    let user = utils.getUser(event);

    let payload = {
      network: params.network,
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
          uid: user.id
      }
    }

    let jobId = await async.startJob("election-create", payload, user);
    return utils.success({ status: "pending", jobId: jobId })

  } catch (e) {
    return utils.error(400, e.message)
  }

};
