const utils = require("../lib/utils")
const electionData = require("../lib/election")
const auth = require("../lib/auth")
const nvEncrypt = require('../lib/encryption')
const Joi = require('joi');


const verifyEmailSchema = Joi.object().keys({
    email: Joi.string().trim().lowercase().email()
})

module.exports.verify = (event, context) => {
    let electionId = event.pathParameters.id;
    let params = await utils.validate(event.body, verifyEmailSchema);
    let el = await electionData.getElection(electionId);



    if(el.authType !== "email"){
        return utils.error(409, "election does not allow email authentication")
    }

    if(!auth.authorizeKey(electionId, params.email)){
        return utils.error(403, "email is not allowed to vote for this election")
    }
}