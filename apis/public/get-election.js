'use strict';

const utils = require("../lib/utils")
const election = require("../lib/election")
const errors = require("../lib/errors").ERROR_TYPES

module.exports.get = async (event, context) => {

  try {
    const el = await election.getElection(event.pathParameters.id)
    return utils.success(el);
  } catch (e) {
    return utils.error(400, e.message)
  }

};

module.exports.stats = async (event, context) => {

  try {
    let stats = await election.getStats(event.pathParameters.id);
    if(!stats){
      return utils.error(404, errors.NOT_FOUND)
    }
    return utils.success(stats);
  } catch (e) {
    return utils.error(400, e.message)
  }

};