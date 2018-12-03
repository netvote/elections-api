'use strict';

const utils = require("../lib/utils")
const async = require("../lib/async")
const electionData = require("./lib/election")
const audit = require("../audit/audit")
const Joi = require('joi');

const STATUS_VOTING = "voting"
const STATUS_STOPPED = "stopped"
const STATUS_CLOSED = "closed"

const setStatusSchema = Joi.object().keys({
  status: Joi.string().only(STATUS_VOTING, STATUS_STOPPED, STATUS_CLOSED).required(),
  force: Joi.boolean().default(false)
})

const stopElection = async (el, user) => {
  await audit.add(user, audit.ACTION.STOP_ELECTION, {electionId: el.electionId});
  await electionData.setStatus(el.electionId, "stopped")
  return utils.success({txStatus:"complete", message: "election stopped"})
}

const resumeElection = async (el, user) => {
  await audit.add(user, audit.ACTION.RESUME_ELECTION, {electionId: el.electionId});
  await electionData.setStatus(el.electionId, "voting")  
  return utils.success({txStatus:"complete", message: "election resumed"})
}

const activateElection = async (el, user) => {
  let payload = {
    electionId: el.electionId
  }
  await audit.add(user, audit.ACTION.ACTIVATE_ELECTION, {electionId: el.electionId});
  let jobId = await async.startJob("election-activate", payload, user);
  return utils.sendJobId(jobId)
}

const closeElection = async (el, user, force) => {

  if(!force && new Date().getTime() < el.closeAfter) {
    return utils.error(409, `cannot close until ${new Date(el.closeAfter)}`)
  }

  let hasPendingVotes = await electionData.hasPendingVotes(el.electionId);
  if(!force && hasPendingVotes) {
    return utils.error(409, `There are still pending votes.  Inspect before closing.`);
  }

  let payload = {
    electionId: el.electionId
  }
  await audit.add(user, audit.ACTION.CLOSE_ELECTION, {electionId: el.electionId});
  let jobId = await async.startJob("election-close", payload, user);

  await async.startJob("election-publish-authids", payload, user);

  return utils.sendJobId(jobId)
}

// { from: { to: handler } }
const legalTransitions = {
  "building": {
    "voting": activateElection
  },
  "voting": {
    "stopped": stopElection,
  },
  "stopped": {
    "closed": closeElection,
    "voting": resumeElection
  }
}

module.exports.setStatus = async (event, context) => {

  try {
    console.log(event);
    let params = await utils.validate(event.body, setStatusSchema);
    let user = utils.getUser(event);
    if(!user){
      return utils.error(401, "unauthorized");
    }
    let electionId = event.pathParameters.id;
    let el = await electionData.getElection(electionId, user);

    if(!el) {
      return utils.error(404, "not found");
    }

    if(!legalTransitions[el.electionStatus] || !legalTransitions[el.electionStatus][params.status]){
      return utils.error(400, `invalid transition from ${el.electionStatus} to ${params.status}`)
    }

    let transition = legalTransitions[el.electionStatus][params.status];

    return await transition(el, user, params.force);
  
  } catch (e) {
    console.error(e);
    return utils.error(400, e.message)
  }

};
