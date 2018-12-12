'use strict';

const utils = require("../lib/utils")
const electionData = require("./lib/election")
const uuid = require("uuid/v4")
const Joi = require('joi');

const addKeysSchema = Joi.object().keys({
    generate: Joi.number().greater(0).less(1000),
    hashedKeys: Joi.array().when('generate', { is: '0', then: Joi.array().min(1).items(Joi.string().base64().required()) })
}).without("generate", "keys")

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
    let keys = params.hashedKeys;
    let user = utils.getUser(event);
    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId, user);

    if (el == null) {
        return utils.error(404, "not found")
    }

    if (el.authType !== "key" && !el.netvoteKeyAuth){
        return utils.error(403, "election does not allow keys")
    }

    let saves = []
    for (let i = 0; i < keys.length; i++) {
        let obj = {
            electionId: electionId,
            hashedKey: keys[i],
            user: user,
            enabled: true
        }
        if(el.mode === "TEST"){
            obj.ttlTimestamp = el.ttlTimestamp;
        }
        saves.push(electionData.saveVoterKey(obj))
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

    if (el.authType !== "key" && !el.netvoteKeyAuth){
        return utils.error(403, "election does not allow keys")
    }

    let keys = [];

    let saves = []
    for (let i = 0; i < count; i++) {
        let key = uuid();
        keys.push(key);

        let obj = {
            electionId: electionId,
            hashedKey: utils.sha256Hash(key),
            user: user,
            enabled: true
        }
        if(el.mode === "TEST"){
            obj.ttlTimestamp = el.ttlTimestamp;
        }

        saves.push(electionData.saveVoterKey(obj))
    }

    await Promise.all(saves);

    return utils.success({
        keys: keys
    })
}