const AWS = require("aws-sdk")
const url = require('url');
const nvReq = require('./lib/netvote-request')

AWS.config.update({ region: 'us-east-1' });

let ID;
let SECRET;
let BASE_URL;
let API_KEY;
let ready=false;

let authToken = async () => {var sp = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});
    const authParams = {
        USERNAME : ID,
        PASSWORD : SECRET
    };

    const params = {
        UserPoolId: "us-east-1_XGFVRW86R",
        ClientId: "6d5bgvo3j82eli47c36c00sreb",
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        AuthParameters: authParams
    }
    const data = await sp.adminInitiateAuth(params).promise();
    return data.AuthenticationResult.IdToken
}

let authBasic = () => {
  let token = new Buffer(`${ID}:${SECRET}`).toString("base64");
  return `Basic ${token}`;
}

const authentify = async (headers) => {
  let token = await authToken();
  let reqHeaders = headers || {}
  reqHeaders['Authorization'] = `Bearer ${token}`;
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

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms)); 

const checkReady = () =>{
  if(!ready){
    throw new Error("must call Init() first");
  }
}

module.exports = {
  Init: async(params) => {
    ID = params.id;
    SECRET = params.secret;
    API_KEY = params.apiKey;
    BASE_URL = url.parse(params.baseUrl);
    ready=true;
  },
	CreateElection: async(obj) => {
    checkReady();
    return await netvotePost("/admin/election", obj)
  },
  AddVoterKeys: async(id, obj) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/keys`, obj)
  },
  SetElectionStatus: async(id, obj) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/status`, obj)
  },
  AdminGetJob: async(jobId) => {
    checkReady();
    return await netvoteGet(`/admin/job/${jobId}`)
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
