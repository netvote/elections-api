'use strict';

const utils = require("../lib/utils")
const electionData = require("../lib/election")
const auth = require("./lib/auth")
const nvEncrypt = require('../lib/encryption')


module.exports.check = async (event, context) => {

    try {

        let token = nvEncrypt.extractAuthHeader(event);
        if (!token) {
            return utils.error(401, "unauthorized");
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

        let voterId = await nvEncrypt.anonymize(electionId, `${electionId}:${token}`, nvEncrypt.KEY_TYPE.JWT_ANONYMIZER)
        let voteId = await nvEncrypt.anonymize(electionId, voterId, nvEncrypt.KEY_TYPE.VOTER)
        let hasVoted = await electionData.hasVoted(electionId, voteId);

        return utils.success({
            canVote: (!hasVoted || (hasVoted && el.props.allowUpdates)),
            voted: hasVoted
        })

    } catch (e) {
        console.error(e);
        return utils.error(400, e.message)
    }

};
