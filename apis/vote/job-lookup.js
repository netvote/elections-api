'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")
const ERROR_TYPES = require("../lib/errors").ERROR_TYPES;


module.exports.lookup = async (event, context) => {

  try {
    const jobId = event.pathParameters.id;
    const job = await async.getJob(jobId);

    if(job.jobType !== "election-tally" && job.jobType !== "election-cast-vote") {
      console.log({jobId: jobId, message: 'attempt to load non-vote/tally from public job lookup', job: job})
      return utils.error(404, ERROR_TYPES.NOT_FOUND);
    }

    return utils.success(job)

  } catch (e) {
    return utils.error(400, e.message)
  }

};
