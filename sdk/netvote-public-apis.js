const url = require('url');
const nvReq = require('./lib/netvote-request')
const nvEncoder = require('./lib/netvote-signatures')

let BASE_URL;
let ready=false;

const apiPath = (path) => {
  return BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`;
}

const netvoteGet = (path, headers) => {
  return nvReq.netvoteGet(BASE_URL.hostname, apiPath(path), headers);
};

const netvotePost = (path, postObj, headers) => {
  return nvReq.netvotePost(BASE_URL.hostname,  apiPath(path), postObj, headers);
};

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms)); 

const checkReady = () =>{
  if(!ready){
    throw new Error("must call Init() first");
  }
}

module.exports = {
  Init: async(params) => {
    BASE_URL = url.parse(params.baseUrl);
    ready=true;
  },
  GetElection: async(electionId) => {
    checkReady();
    return await netvoteGet(`/public/election/${electionId}`)
  },
  GetJwtToken: async(electionId, token) => {
    checkReady();
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/public/election/${electionId}/auth/jwt`, null, headers)
  },
  GetJwtTokenQR: async(electionId, token) => {
    checkReady();
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/public/election/${electionId}/auth/qr`, null, headers)
  },
  CastVote: async(electionId, token, voteObject) => {
    let vote = await nvEncoder.encodeVote(voteObject, false);
    let payload = {
      vote: vote
    }
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/public/election/${electionId}/vote`, payload, headers)
  },
  CastSignedVote: async(electionId, token, voteObject) => {
    let voteBase64 = await nvEncoder.encodeVote(voteObject, true);
    let proof = await nvEncoder.signVote(voteBase64);

    let payload = {
      vote: voteBase64,
      proof: proof
    }
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/public/election/${electionId}/vote`, payload, headers)
  },
  GetResults: async(electionId) => {
    checkReady();
    return await netvoteGet(`/public/election/${electionId}/results`)
  },
  PollJob: async(jobId, timeout) => {
    let now = new Date().getTime();
    let expired = now + timeout;

    while(new Date().getTime() < expired){
      let job = await netvoteGet(`/public/job/${jobId}`);
      if(job.txStatus !== "pending"){
        return job;
      }
      //wait 1 second
      await snooze(1000);
    }
  
    throw new Error("timeout occured while polling for job");

  }
}
