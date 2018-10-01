const url = require('url');
const nvReq = require('./netvote-request')

let BASE_URL;
let ready=false;

const netvoteGet = (path, headers) => {
  let apiPath = BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`
  return nvReq.netvoteGet(BASE_URL.hostname, apiPath, headers);
};

const netvotePost = (path, postObj, headers) => {
  let apiPath = BASE_URL.pathname == "/" ? path : `${BASE_URL.pathname}${path}`
  return nvReq.netvotePost(BASE_URL.hostname, apiPath, postObj, headers);
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
  }
}
