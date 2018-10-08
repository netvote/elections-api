'use strict';

const utils = require("../lib/utils")
const electionData = require("./lib/election")

module.exports.getVotes = async (event, context) => {

    try {
      let user = utils.getUser(event);
      let electionId = event.pathParameters.id;
      let el = await electionData.getElection(electionId, user);
  
      if(!el) {
        return utils.error(404, "not found");
      }

      let tx = await electionData.getTransactions(electionId);
      return utils.success(tx);
    } catch (e) {
      return utils.error(400, e.message)
    }
  
  };
  