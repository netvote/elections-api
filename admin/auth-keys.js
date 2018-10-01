'use strict';

const utils = require("./lib/utils")
const electionData = require("./lib/election")
const uuid = require("uuid/v4")
const Joi = require('joi');

const addKeysSchema = Joi.object().keys({
    generate: Joi.number().greater(0).less(1000),
    keys: Joi.array().when('generate', { is: '0', then: Joi.array().min(1).items(Joi.string().required()) })
}).without("generate", "keys")

const generateKeysSchema = Joi.object().keys({
    count: Joi.number().less(1000).default(1)
})

module.exports.add = async (event, context) => {
    try {
        let params = await utils.validate(event.body, addKeysSchema);
        if (params.generate > 0) {
            return await generateKeys(event, params);
        } else {
            return await storeKeys(event, params);
        }
    } catch (e) {
        return utils.error(400, e.message)
    }
}

const storeKeys = async (event, params) => {
    let keys = params.keys;
    let user = utils.getUser(event);
    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId, user);

    if (el == null) {
        return utils.error(404, "not found")
    }

    if (!el.netvoteKeyAuth){
        return utils.error(403, "election does not allow keys")
    }

    let saves = []
    for (let i = 0; i < keys.length; i++) {
        saves.push(electionData.saveVoterKey({
            electionId: electionId,
            hashedKey: utils.sha256Hash(keys[i]),
            user: user,
            enabled: true
        }))
    }

    await Promise.all(saves);

    return utils.success({
        count: keys.length
    })
}

const generateKeys = async (event, params) => {
    let count = params.generate;
    let user = utils.getUser(event);
    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId, user);

    if (el == null) {
        return utils.error(404, "not found")
    }

    if (!el.netvoteKeyAuth){
        return utils.error(403, "election does not allow keys")
    }

    let keys = [];

    let saves = []
    for (let i = 0; i < count; i++) {
        let key = uuid();
        keys.push(key);
        saves.push(electionData.saveVoterKey({
            electionId: electionId,
            hashedKey: utils.sha256Hash(key),
            user: user,
            enabled: true
        }))
    }

    await Promise.all(saves);

    return utils.success({
        keys: keys
    })
}