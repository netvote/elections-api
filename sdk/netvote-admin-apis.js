const AWS = require("aws-sdk")
const url = require('url');
const nvReq = require('./lib/netvote-request')

AWS.config.update({ region: 'us-east-1' });

let ID;
let SECRET;
let BASE_URL;
let IPFS_URL;
let API_KEY;
let ready=false;

let authBasic = () => {
  let token = Buffer.from(`${ID}:${SECRET}`, "utf8").toString("base64");
  return token;
}

const authentify = async (headers) => {
  let token = await authBasic();
  let reqHeaders = headers || {}
  reqHeaders['Authorization'] = `Basic ${token}`;
  reqHeaders['x-api-key'] = API_KEY;
  return reqHeaders;
}

const netvoteGet = async (path, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`
  return nvReq.netvoteGet(BASE_URL.hostname, apiPath, reqHeaders);
};

const netvotePost = async (path, postObj, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`
  return nvReq.netvotePost(BASE_URL.hostname, apiPath, postObj, reqHeaders);
};

const ipfsGet = async (path, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = IPFS_URL.pathname == "/" ? path : `${IPFS_URL.pathname}${path}`
  return nvReq.netvoteGet(IPFS_URL.hostname, apiPath, reqHeaders);
};

const ipfsPost = async (path, postObj, headers) => {
  let reqHeaders = await authentify(headers);
  let apiPath = IPFS_URL.pathname == "/" ? path : `${IPFS_URL.pathname}${path}`
  return nvReq.netvotePost(IPFS_URL.hostname, apiPath, postObj, reqHeaders);
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
    required("id", params.id);
    required("secret", params.secret);
    required("apiKey", params.apiKey);
    required("baseUrl", params.baseUrl);
    required("ipfsUrl", params.ipfsUrl);
    ID = params.id;
    SECRET = params.secret;
    API_KEY = params.apiKey;
    BASE_URL = url.parse(params.baseUrl);
    IPFS_URL = url.parse(params.ipfsUrl);
    ready=true;
  },
	CreateElection: async(obj) => {
    checkReady();
    return await netvotePost("/admin/election", obj)
  },
  GetElectionsList: async(filter) => {
    checkReady();
    let queryParams = "";
    if(filter){
      queryParams = queryParams ? "&" : "?";
      Object.keys(filter).forEach((key) => {
        queryParams += `${key}=${filter[key]}`
      })
    }
    return await netvoteGet(`/admin/election${queryParams}`)
  },
  AddVoterKeys: async(id, obj) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/keys`, obj)
  },
  AddVoterEmails: async(id, obj) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/emails`, obj)
  },
  ActivateElection: async(id) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/status`, { status: "voting"})
  },
  StopElection: async(id) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/status`, { status: "stopped"})
  },
  CloseElection: async(id) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/status`, { status: "closed"})
  },
  SetElectionStatus: async(id, obj) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/status`, obj)
  },
  AdminGetJob: async(jobId) => {
    checkReady();
    return await netvoteGet(`/admin/job/${jobId}`)
  },
  GetFromIPFS: async(hash) => {
    checkReady();
    let res = await ipfsGet(`/ipfs/${hash}`)
    return JSON.parse(res);
  },
  SaveToIPFS: async(obj) => {
    checkReady();
    return await ipfsPost(`/ipfs`, obj)
  },
  GetVoteTransactions: async(id) => {
    checkReady();
    return await netvoteGet(`/admin/election/${id}/votes`)
  },
  PollJob: async(jobId, timeout) => {
    let now = new Date().getTime();
    let expired = now + timeout;

    while(new Date().getTime() < expired){
      let job = await netvoteGet(`/admin/job/${jobId}`);
      if(job.txStatus !== "pending"){
        if(job.txStatus === "error"){
          throw new Error(job);
        }
        return job;
      }
      //wait 1 second
      await snooze(1000);
    }
  
    throw new Error("timeout occured while polling for job");

  }
}
