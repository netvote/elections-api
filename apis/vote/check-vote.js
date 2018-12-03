'use strict';

const ERROR_TYPES = require("../lib/errors").ERROR_TYPES;
const utils = require("../lib/utils")
const electionData = require("../lib/election")
const auth = require("../lib/auth")
const nvEncrypt = require('../lib/encryption')


module.exports.check = async (event, context) => {

    try {

        let token = nvEncrypt.extractAuthHeader(event);
        if (!token) {
            return utils.error(403, ERROR_TYPES.BAD_TOKEN);
        }

        let electionId = event.pathParameters.id;
        let el = await electionData.getElection(electionId);

        if (!el) {
            return utils.error(404, ERROR_TYPES.NOT_FOUND);
        }
        
        // netvoteKeyAuth is deprecated
        if (!el.netvoteKeyAuth && el.authType != "key") {
            return utils.error(400, ERROR_TYPES.INVALID_AUTH_TYPE)
        }

        if (el.electionStatus !== "voting") {
            return utils.error(409, ERROR_TYPES.VOTING_WINDOW)
        }

        let authorized = await auth.authorizeKey(electionId, token)
        if (!authorized) {
            return utils.error(403, ERROR_TYPES.BAD_TOKEN);
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
