'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")

module.exports.lookup = async (event, context) => {

  try {
    const user = utils.getUser(event);
    const jobId = event.pathParameters.jobId;
    const job = await async.getJob(`${user.id}-${jobId}`);
    return utils.success(job)

  } catch (e) {
    return utils.error(400, e.message)
  }

};
