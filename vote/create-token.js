'use strict';

const utils = require("../lib/utils")
const electionData = require("../lib/election")
const auth = require("./lib/auth")
const nvEncrypt = require('../lib/encryption')


module.exports.create = async (event, context) => {

    try {

        let token = nvEncrypt.extractAuthHeader(event);
        if (!token) {
            return utils.error(401, "unauthorized");
        }

        let format = event.pathParameters.format;
        if(format !== "jwt" && format !== "qr"){
            return utils.error(400, "format must be jwt or qr");
        }

        let electionId = event.pathParameters.id;
        let el = await electionData.getElection(electionId);

        if (!el) {
            return utils.error(404, "election not found");
        }

        if (!el.netvoteKeyAuth) {
            return utils.error(400, "election is not using Netvote key authentication, only signed JWTs")
        }

        if (el.electionStatus !== "voting") {
            return utils.error(409, "election is not currently in 'voting' state")
        }

        let authorized = await auth.authorizeKey(electionId, token)
        if (!authorized) {
            return utils.error(401, "unauthorized");
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
            obj.qr = qr;
        }

        return utils.success(obj)

    } catch (e) {
        console.error(e);
        return utils.error(400, e.message)
    }

};
