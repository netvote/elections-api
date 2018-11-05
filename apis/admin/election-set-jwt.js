'use strict';

const utils = require("../lib/utils")
const electionData = require("./lib/election")
const audit = require("../audit/audit")
const ursa = require('ursa')

module.exports.set = async (event, context) => {

  try {
    let pem = event.body;

    //will throw error if not pem
    ursa.coercePublicKey(pem);

    const user = utils.getUser(event);
    const electionId = event.pathParameters.id;

    const el = await electionData.getElection(electionId, user);

    if(el == null){
      return utils.error(404, "not found");
    }

    if(el.netvoteKeyAuth){
      return utils.error(409, "election is using netvote key auth, public key cannot be overridden");
    }

    await electionData.savePublicJwtKey(electionId, pem);

    await audit.add(user, audit.ACTION.SET_JWT_KEY, {electionId: electionId});

    return utils.success({txStatus: "complete"});

  } catch (e) {
    return utils.error(400, e.message)
  }

};
