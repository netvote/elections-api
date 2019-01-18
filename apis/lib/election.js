const AWS = require("aws-sdk")
const web3 = require("web3-utils")
const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE_ELECTIONS = "elections";
const TABLE_VOTES = "votes";

const dbGetElection = async (electionId) => {
    var params = {
        TableName: TABLE_ELECTIONS,
        Key:{
            "electionId": electionId
        }
    };
    let data = await docClient.get(params).promise();
    return data.Item;
}

const getElectionsList = async (company, filter) => {
    let params = {
        TableName: TABLE_ELECTIONS,
        IndexName: "company-electionId-index",
        KeyConditionExpression: "company = :c",
        ExpressionAttributeValues: {
            ":c": company
        },
    }

    if(filter){
        let filterEx = "";
        let keys = Object.keys(filter);
        for(let i=0; i<keys.length; i++){
            let key = keys[i];
            if(filterEx !== ""){
                filterEx += " and "
            }
            filterEx += `#filter${key} = :value${key}`
            if(!params.ExpressionAttributeValues){
                params.ExpressionAttributeValues = {}
            }
            params.ExpressionAttributeValues[`:value${key}`] = filter[key];
            if(!params.ExpressionAttributeNames){
                params.ExpressionAttributeNames = {}
            }
            params.ExpressionAttributeNames[`#filter${key}`] = key;
        }
        params.FilterExpression = filterEx;
    }
    let res = await docClient.query(params).promise();
    return res.Items;
}

const hasVoted = async (electionId, voteId) => {
    const voterId = web3.sha3(voteId);
    const params = {
        TableName : TABLE_VOTES,
        KeyConditionExpression: "electionId = :eid",
        ExpressionAttributeValues: {
            ":eid": electionId
        }
    };
    console.log(electionId, voterId);
    let data = await docClient.query(params).promise();

    for(let i=0; i<data.Items.length; i++){
        console.log(data.Items[i])
        if(data.Items[i].voterId === voterId){
            console.log("found")
            return true;
        }
    }
    console.log("nope")
    return false;
}

const getStats = async (electionId) => {
    const params = {
        TableName : TABLE_VOTES,
        KeyConditionExpression: "electionId = :eid",
        ExpressionAttributeValues: {
            ":eid": electionId
        }
    };

    let data = await docClient.query(params).promise();

    let statusCounters = {
        total: 0
    }
    data.Items.forEach((itm)=>{
        if(!statusCounters[itm.txStatus]){
            statusCounters[itm.txStatus] = 0;
        }
        statusCounters[itm.txStatus]++;
        statusCounters.total++;
    })

    return {stats: statusCounters};
}

module.exports = {
    getElection: dbGetElection,
    hasVoted: hasVoted,
    getElectionsList: getElectionsList,
    getStats: getStats
}