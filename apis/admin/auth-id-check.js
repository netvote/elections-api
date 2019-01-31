'use strict';

const utils = require("../lib/utils")
const errors = require("../lib/errors")
const electionData = require("./lib/election")
const Joi = require('joi');
const auth = require("../lib/auth")
const encryption = require("../lib/encryption")

const checkAuthIdsSchema = Joi.object().keys({
    keys: Joi.array().min(1).max(5000).items(Joi.string())
})

module.exports.check = async (event, context) => {
    try {
        let electionId = event.pathParameters.id;
        let params = await utils.validate(event.body, checkAuthIdsSchema);
        let user = utils.getUser(event);
        let el = await electionData.getElection(electionId, user)
        
        if(!el){
            return utils.error(404, errors.ERROR_TYPES.NOT_FOUND)
        }

        let results = {
            used: [],
            notUsed: []
        };

        if(el.authType === "email") {
            for(let i=0; i<params.keys.length; i++){
                let email = params.keys[i].toLowerCase().trim();
                let voterId = await encryption.anonymize(electionId, `${electionId}:${email}`, encryption.KEY_TYPE.JWT_ANONYMIZER)
                let voteId = await encryption.anonymize(electionId, voterId, encryption.KEY_TYPE.VOTER)
                let used = await electionData.hasVoted(electionId, voteId);
                if(used){
                    results.used.push(email);
                } else {
                    results.notUsed.push(email);
                }
            }
        } else {
            for(let i=0; i<params.keys.length; i++){
                let key = params.keys[i];
                let used = await auth.keyHasBeenUsed(electionId, key);
                if(used){
                    results.used.push(key);
                } else {
                    results.notUsed.push(key);
                }
            }
        }

        //anonymization
        results.used.sort();
        results.notUsed.sort();

        return utils.success(results);
        
    } catch (e) {
        return utils.error(400, e.message)
    }
}