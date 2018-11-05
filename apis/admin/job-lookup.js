'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")

module.exports.lookup = async (event, context) => {

  try {
    const user = utils.getUser(event);
    const jobId = event.pathParameters.jobId;
    const job = await async.getJob(jobId);

    if(!job) {
      return utils.error(404, "not found");
    }

    if(job.user.id !== user.id) {
      console.warn({jobId:jobId, user:user.id, message: "unauthorized request for job"})
      return utils.error(404, "not found");
    }

    return utils.success(job)

  } catch (e) {
    return utils.error(400, e.message)
  }

};
