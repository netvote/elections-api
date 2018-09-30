'use strict';

const utils = require("./lib/utils")
const electionData = require("./lib/election")
const uuid = require("uuid/v4")
const Joi = require('joi');


const generateSchema = Joi.object().keys({
    count: Joi.number().less(1000).default(1)
})

module.exports.generate = async (event, context) => {

  try {
    let params = await utils.validate(event.body, generateSchema);
    let count = params.count;
    let user = utils.getUser(event);
    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId, user);

    if(el == null){
        return utils.error(404, "not found")
    }

    let keys = [];

    let saves = []
    for(let i=0; i<count; i++){
        let key = uuid();
        keys.push(key);
        saves.push(electionData.saveVoterKey({
            electionId: electionId,
            hashedKey: utils.sha256Hash(key),
            user: user
        }))
    }

    await Promise.all(saves);

    return utils.success({
        keys: keys
    })

  } catch (e) {
    return utils.error(400, e.message)
  }
};