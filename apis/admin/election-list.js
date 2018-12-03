'use strict';

const utils = require("../lib/utils")
const election = require("../lib/election")

module.exports.get = async (event, context) => {

  try {
    console.log(event);
    let user = utils.getUser(event);
    const el = await election.getElectionsList(user.company, event.queryStringParameters)
    return utils.success({
        elections: el
    });
  } catch (e) {
    return utils.error(400, e.message)
  }
};
