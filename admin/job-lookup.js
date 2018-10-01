'use strict';

const utils = require("./lib/utils")
const async = require("./lib/async")

module.exports.lookup = async (event, context) => {

  try {
    const user = utils.getUser(event);
    const jobId = event.pathParameters.jobId;

    // jobIDs must start with the user's ID
    if(jobId.indexOf(user.id) !== 0){
      return utils.error(403, "forbidden")
    }

    const job = await async.getJob(jobId);
    return utils.success(job)

  } catch (e) {
    return utils.error(400, e.message)
  }

};
