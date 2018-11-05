'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")
const electionData = require("../lib/election")


module.exports.tally = async (event, context) => {

  try {

    let electionId = event.pathParameters.id;
    let election = await electionData.getElection(electionId);

    if(!election.resultsAvailable){
        return utils.error(409, "results are not available at this time");
    }

    let payload = {
      electionId: event.pathParameters.id
    }

    let jobId = await async.startJob("election-tally", payload);
    return utils.sendJobId(jobId)

  } catch (e) {
    return utils.error(400, e.message)
  }

};
