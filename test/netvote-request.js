const https = require('https');
const RateLimiter = require('limiter').RateLimiter;
const limiter = new RateLimiter(25, 'second');
const AWS = require("aws-sdk")
const url = require('url');

AWS.config.update({ region: 'us-east-1' });

let ID;
let SECRET;
let BASE_URL;
let ready=false;

const netvoteRequest = async (method, path, postObj, headers) => {
  let maxretries = 2;
  for(let count =0; count<maxretries; count++){
    try{
      let res = await netvoteUnsafeRequest(method, path, postObj, headers);
      if(res !== undefined){
        return res;
      }
    } catch(e){
      //squash, already logged
    }
    console.log("RETRY (sleep 1s): "+path)
    await snooze(1000)
  }
  throw new Error("failed to complete request: "+method)
} 

let authToken = async () => {var sp = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});
    var authParams = {
        USERNAME : ID,
        PASSWORD : SECRET
    };

    let params = {
        UserPoolId: "us-east-1_XGFVRW86R",
        ClientId: "6d5bgvo3j82eli47c36c00sreb",
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        AuthParameters: authParams
    }
    let data = await sp.adminInitiateAuth(params).promise();
    return data.AuthenticationResult.IdToken
}

const netvoteUnsafeRequest = (method, path, postObj, headers) => {
  return new Promise(async (resolve,reject) => {
    limiter.removeTokens(1, async () => {
      const postData = (postObj) ? JSON.stringify(postObj) : null;

      let reqHeaders = (postData) ? {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      } : {}
  
      if(headers){
        for(key in headers){
          if(headers.hasOwnProperty(key)){
            reqHeaders[key] = headers[key];
          }
        }
      }
  
      if(!reqHeaders['Authorization']){
        let token = await authToken();
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }
  
      const options = {
        hostname: BASE_URL.hostname,
        port: 443,
        path: `${BASE_URL.pathname}${path}`,
        method: method,
        headers: reqHeaders
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => {
          body += d.toString();
        });
        res.on('end', () => {
          try{
            resolve(JSON.parse(body))
          }catch(e){
            if(body && body.indexOf("500 Server Error") > -1){
              console.error("500 error")
            } else{
              console.error("not json: "+body)
            }
            reject(e);
          }
        });
      });
    
      req.on('error', (e) => {
        reject(e);
      });
      if(postData) {
        req.write(postData);
      }
      req.end();
    })
    
  }).catch((e)=>{
    console.error("error occured during request")
  })
}

const netvoteGet = (path, headers) => {
  return netvoteRequest('GET', path, null, headers);
};

const netvotePost = (path, postObj, headers) => {
  return netvoteRequest('POST', path, postObj, headers);
};

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms)); 

const checkReady = () =>{
  if(!ready){
    throw new Error("must call Init(id,secret) first");
  }
}

module.exports = {
  Init: async(params) => {
    ID = params.id;
    SECRET = params.secret;
    let baseUrl = params.baseUrl || "https://mxid9cufe1.execute-api.us-east-1.amazonaws.com/dev"
    BASE_URL = url.parse(baseUrl);
    ready=true;
  },
	CreateElection: async(obj) => {
    checkReady();
    return await netvotePost("/admin/election", obj)
  },
  SetElectionStatus: async(id, obj) => {
    checkReady();
    return await netvotePost(`/admin/election/${id}/status`, obj)
  },
  AdminGetJob: async(jobId) => {
    checkReady();
    return await netvoteGet(`/admin/job/${jobId}`)
  },
  AdminPollJob: async(jobId, timeout) => {
    let now = new Date().getTime();
    let expired = now + timeout;

    while(new Date().getTime() < expired){
      let job = await netvoteGet(`/admin/job/${jobId}`);
      if(job.txStatus !== "pending"){
        return job;
      }
      //wait 1 second
      await snooze(1000);
    }
  
    throw new Error("timeout occured while polling for job");

  }
}
