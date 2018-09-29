'use strict';

const utils = require("./lib/utils")
const election = require("./lib/election")

module.exports.get = async (event, context) => {

  try {
    const el = await election.getElection(event.pathParameters.id)
    return utils.success(el);
  } catch (e) {
    return utils.error(400, e.message)
  }

};
