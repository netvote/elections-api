'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")

module.exports.lookup = async (event, context) => {

  try {
    const jobId = event.pathParameters.jobId;
    const job = await async.getJob(jobId);

    if(job.name !== "election-cast-vote") {
      console.log({message: 'attempt to load non-vote from public job lookup'})
      return utils.error(404, "not found");
    }

    return utils.success(job)

  } catch (e) {
    return utils.error(400, e.message)
  }

};
