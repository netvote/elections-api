'use strict';

const utils = require("../lib/utils")
const electionData = require("./lib/election")
const Joi = require('joi');

const addEmailsSchema = Joi.object().keys({
    emailAddresses: Joi.array().min(1).items(Joi.string().trim().lowercase().email())
})

module.exports.add = async (event, context) => {
    try {
        let params = await utils.validate(event.body, addEmailsSchema);
        return await storeEmails(event, params);
    } catch (e) {
        return utils.error(400, e.message)
    }
}

const storeEmails = async (event, params) => {
    let emails = params.emailAddresses;
    let user = utils.getUser(event);
    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId, user);

    if (el == null) {
        // this could mean user may not administer election, but we don't leak that info
        return utils.error(404, "not found")
    }

    if(el.authType !== "email"){
        return utils.error(409, `Cannot add emails to election with authType ${el.authType}`)
    }

    let saves = []
    for (let i = 0; i < emails.length; i++) {
        let emailHash = utils.sha256Hash(emails[i])
        saves.push(electionData.saveVoterKey({
            electionId: electionId,
            hashedKey: emailHash,
            user: user,
            enabled: true
        }))
    }

    await Promise.all(saves);

    return utils.success({
        count: emails.length
    })
}