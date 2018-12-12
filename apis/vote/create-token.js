'use strict';

const ERROR_TYPES = require("../lib/errors").ERROR_TYPES;
const utils = require("../lib/utils")
const electionData = require("../lib/election")
const auth = require("../lib/auth")
const nvEncrypt = require('../lib/encryption')
const Joi = require("joi")

const adminCreateTokenSchema = Joi.object().keys({
    voterId: Joi.string().required()
})

// a voter provides a key, and gets a JWT back
module.exports.createAsAdmin = async (event, context) => {
    console.log(event);
    let user = await utils.getUser(event);
    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId);
    let params = await utils.validate(event.body, adminCreateTokenSchema);

    if (!el) {
        return utils.error(404, ERROR_TYPES.NOT_FOUND);
    }
    if(el.company !== user.company){
        return utils.error(403, ERROR_TYPES.FORBIDDEN);
    }
    if(el.authType !== "admin"){
        return utils.error(409, ERROR_TYPES.INVALID_AUTH_TYPE);
    }
    if (el.electionStatus !== "voting") {
        return utils.error(409, ERROR_TYPES.VOTING_WINDOW)
    }

    let jwt = await nvEncrypt.createJwt(electionId, params.voterId)

    return utils.success({ 
        electionId: electionId,
        token: jwt,
    })
}

// a voter provides a key, and gets a JWT back
module.exports.create = async (event, context) => {

    try {

        let token = nvEncrypt.extractAuthHeader(event);
        if (!token) {
            return utils.error(401, ERROR_TYPES.BAD_TOKEN);
        }

        let format = event.pathParameters.format;
        if(format !== "jwt" && format !== "qr"){
            return utils.error(400, ERROR_TYPES.INVALID_TOKEN_FORMAT);
        }

        let electionId = event.pathParameters.id;
        let el = await electionData.getElection(electionId);

        if (!el) {
            return utils.error(404, ERROR_TYPES.NOT_FOUND);
        }

        // netvoteKeyAuth is deprecated
        if (el.authType != "key" && !el.netvoteKeyAuth) {
            return utils.error(400, ERROR_TYPES.INVALID_AUTH_TYPE)
        }

        if (el.electionStatus !== "voting") {
            return utils.error(409, ERROR_TYPES.VOTING_WINDOW)
        }

        let authorized = await auth.authorizeKey(electionId, token)
        if (!authorized) {
            return utils.error(401, ERROR_TYPES.BAD_TOKEN);
        }

        let jwt = await nvEncrypt.createJwt(electionId, token)
        await auth.recordAuthId(electionId, token);

        console.log({ electionId: electionId, message: "authorized voter" });

        let obj = { 
            electionId: electionId,
            token: jwt,
        }

        if(format === "qr"){
            let qr = await utils.qr(obj);
            obj.qr = qr.qr;
        }

        return utils.success(obj)

    } catch (e) {
        console.error(e);
        return utils.error(400, e.message)
    }

};
