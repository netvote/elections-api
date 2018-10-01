const url = require('url');
const nvReq = require('./netvote-request')

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
    return await netvotePost(`/vote/election/${electionId}/auth`, null, headers)
  }
}
