const url = require('url');
const nvReq = require('./lib/netvote-request')
const nvEncoder = require('./lib/netvote-signatures')

let BASE_URL;
let API_KEY;
let IPFS_URL;
let ready=false;

const apiPath = (path) => {
  return BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`;
}

const authentify = (headers) => {
  let reqHeaders = headers || {}
  reqHeaders['x-api-key'] = API_KEY;
  return reqHeaders;
}

const netvoteGet = (path, headers) => {
  let reqHeaders = authentify(headers);
  return nvReq.netvoteGet(BASE_URL.hostname, apiPath(path), reqHeaders);
};

const netvotePost = (path, postObj, headers) => {
  let reqHeaders = authentify(headers);
  return nvReq.netvotePost(BASE_URL.hostname,  apiPath(path), postObj, reqHeaders);
};

const ipfsGet = async (path, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = IPFS_URL.pathname == "/" ? path : `${IPFS_URL.pathname}${path}`
  return nvReq.netvoteGet(IPFS_URL.hostname, apiPath, reqHeaders);
};

const ipfsPost = async (path, postObj, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = IPFS_URL.pathname == "/" ? path : `${IPFS_URL.pathname}${path}`
  return nvReq.post(IPFS_URL.hostname, apiPath, postObj, reqHeaders);
};

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms)); 

const checkReady = () =>{
  if(!ready){
    throw new Error("must call Init() first");
  }
}

const required = (name, value) => {
  if(!value){
    throw new Error(`${name} is a required field`);
  }
}

module.exports = {
  Init: async(params) => {
    required("baseUrl", params.baseUrl);
    required("apiKey", params.apiKey);
    required("ipfsUrl", params.ipfsUrl);
    BASE_URL = url.parse(params.baseUrl);
    IPFS_URL = url.parse(params.ipfsUrl);
    API_KEY = params.apiKey;
    ready=true;
  },
  GetElection: async(electionId) => {
    checkReady();
    return await netvoteGet(`/public/election/${electionId}`)
  },
  GetElectionStats: async(electionId) => {
    checkReady();
    return await netvoteGet(`/public/election/${electionId}/stats`)
  },
  CheckVoter: async(electionId, token) => {
    checkReady();
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/voter/election/${electionId}/voter/check`, null, headers)
  },
  GetJwtToken: async(electionId, token) => {
    checkReady();
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/voter/election/${electionId}/auth/jwt`, null, headers)
  },
  GetJwtTokenQR: async(electionId, token) => {
    checkReady();
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/voter/election/${electionId}/auth/qr`, null, headers)
  },
  CastVote: async(electionId, token, voteObject, proofReference) => {
    checkReady();
    let vote = await nvEncoder.encodeVote(voteObject, false);
    let payload = {
      vote: vote,
      proof: proofReference || ""
    }
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/voter/election/${electionId}/vote`, payload, headers)
  },
  CastSignedVote: async(electionId, token, voteObject) => {
    checkReady();
    let voteBase64 = await nvEncoder.encodeVote(voteObject, true);
    let proof = await nvEncoder.signVote(voteBase64);
    let ipfsResponse = await netvotePost(`/ipfs`, proof);

    let payload = {
      vote: voteBase64,
      proof: ipfsResponse.hash
    }
    let headers = {
      "Authorization": `Bearer ${token}`
    }
    return await netvotePost(`/voter/election/${electionId}/vote`, payload, headers)
  },
  GetFromIPFS: async(hash) => {
    checkReady();
    let res = await ipfsGet(`/ipfs/${hash}`)
    try{
      return JSON.parse(res);
    } catch(e){
      return res;
    }
  },
  VerifyEmail: async(electionId, emailAddress) => {
    checkReady();
    return await netvotePost(`/voter/election/${electionId}/email/verification`, {
      email: emailAddress
    })
  },
  ConfirmEmail: async(electionId, obj, id) => {
    checkReady();
    return await netvotePost(`/voter/election/${electionId}/email/confirmation?id=${id}`, obj)
  },
  SaveToIPFS: async(obj) => {
    checkReady();
    return await netvotePost(`/ipfs`, JSON.stringify(obj))
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
