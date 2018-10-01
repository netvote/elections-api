'use strict';

const utils = require("./lib/utils")
const electionData = require("./lib/election")
const Joi = require('joi');

const jwtSchema = Joi.object().keys({
  publicKey: Joi.string().required()
})

module.exports.set = async (event, context) => {

  try {
    let params = await utils.validate(event.body, jwtSchema);

    const user = utils.getUser(event);
    const electionId = event.pathParameters.id;

    const el = await electionData.getElection(electionId, user);

    if(el == null){
      return utils.error(404, "not found");
    }

    if(el.netvoteKeyAuth){
      return utils.error(409, "election is using netvote key auth, public key cannot be overridden");
    }

    await electionData.savePublicJwtKey(electionId, params.publicKey);

    return utils.success({status: "complete"});

  } catch (e) {
    return utils.error(400, e.message)
  }

};
