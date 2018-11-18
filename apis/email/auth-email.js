const utils = require("../lib/utils")
const electionData = require("../lib/election")
const auth = require("../lib/auth")
const emailAuth = require('./lib/email-data')
const Joi = require('joi');

const verifyEmailSchema = Joi.object().keys({
    email: Joi.string().trim().lowercase().email()
})

module.exports.verifyEmail = async (event, context) => {
    console.log(event)
    let electionId = event.pathParameters.id;
    let params = await utils.validate(event.body, verifyEmailSchema);
    let el = await electionData.getElection(electionId);

    if(el.authType !== "email"){
        return utils.error(409, "election does not allow email authentication")
    }

    if(!auth.authorizeKey(electionId, params.email)){
        return utils.error(403, "email is not allowed to vote for this election")
    }

    await emailAuth.verifyEmail(electionId, params.email);

    return utils.success({"message": `Email sent to ${params.email}`})
}

// NO API KEY required (wide open), straight from email link
module.exports.confirmEmail = async (event, context) => {
    console.log(event);
    let verificationId = event.queryStringParameters.id;
    if(!verificationId){
        return utils.error(400, "?id parameter is required")
    }

    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId);

    if(el.authType !== "email"){
        return utils.error(409, "election does not allow email authentication")
    }

    try{
        let confirmed = await emailAuth.confirmEmail(electionId, verificationId)
        if(!confirmed){
            return utils.error(403, "email is not allowed to vote for this election")
        }

        return utils.success({"message": `Email confirmed`})

    } catch(e) {
        return utils.error(403, e.message);
    }
}