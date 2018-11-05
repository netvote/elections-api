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

module.exports = {
    getElection: dbGetElection,
    hasVoted: hasVoted
}