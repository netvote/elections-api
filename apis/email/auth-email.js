const utils = require("../lib/utils")
const electionData = require("../lib/election")
const auth = require("../lib/auth")
const encryption = require("../lib/encryption")
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
        return utils.error(409, "This election does not allow email authentication")
    }

    let authorized = await auth.authorizeKey(electionId, params.email);

    if(!authorized){
        return utils.error(403, "This email is not allowed to vote for this election")
    }

    // already voted and not allow updates
    if(!el.props.allowUpdates){
        let voterId = await encryption.anonymize(electionId, `${electionId}:${params.email}`, encryption.KEY_TYPE.JWT_ANONYMIZER)
        let voteId = await encryption.anonymize(electionId, voterId, encryption.KEY_TYPE.VOTER)
        let hasVoted = await electionData.hasVoted(electionId, voteId);
        if(hasVoted){
            return utils.error(403, "This email address has already voted");
        }
    }

    await emailAuth.verifyEmail(electionId, params.email);

    return utils.success({"message": `Email sent to ${params.email}`})
}

const redirectError = (errorType)=>{
    let url = `https://vote.netvote.io/#/error/${errorType}`
    return utils.redirect(url);
}

const handledErrors = {
    "expired": true
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
        let key = new Buffer(verificationId, "base64").toString("utf-8");

        // tolerant of complicated email formats that can actually have a : in it
        let email = key.substring(0, key.lastIndexOf(":"));
        let secret = key.substring(key.lastIndexOf(":")+1)

        let confirmed = await emailAuth.confirmEmail(electionId, email, secret)
        if(!confirmed){
            console.log("email is not allowed to vote");
            return redirectError("default");
        }

        let token = await encryption.createJwt(electionId, email);

        let url = `https://vote.netvote.io/#/ballot/${electionId}/${token}`
        return utils.redirect(url);

    } catch(e) {
        console.error(e);
        if(handledErrors[e.message]){
            return redirectError(e.message)
        } else {
            return redirectError("default");
        }
    }
}