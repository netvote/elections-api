const AWS = require("aws-sdk")
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

const getElection = async (electionId, user) => {
    if(!user){
        throw new Error("user is required for lookup");
    }
    let el = await dbGetElection(electionId);
    if(!el) {
        return null;
    }
    if(el.company === user.company) {
        return el;
    } else {
        console.info(`Denied attempt to access ${electionId} by ${user.id}`);
        return null;
    }
}

const getTransactions = async (electionId, status) => {
    const params = {
        TableName : TABLE_VOTES,
        KeyConditionExpression: "electionId = :eid",
        ExpressionAttributeValues: {
            ":eid": electionId
        }
    };

    let result = []
    let data = await docClient.query(params).promise();

    let statusCounters = {}
    data.Items.forEach((itm)=>{
        if(!statusCounters[itm.txStatus]){
            statusCounters[itm.txStatus] = 0;
        }
        statusCounters[itm.txStatus]++;
        if(!status || itm.txStatus === status){
            result.push(itm);
        }
    })

    let transactions = result.sort((a,b)=>{
        return a.txTimestamp - b.txTimestamp;
    })

    return {stats: statusCounters, transactions: transactions};
}

const setStatus = async (electionId, status) => {
    let params = {
        TableName: TABLE_ELECTIONS,
        Key:{
            "electionId": electionId
        },
        UpdateExpression: "set electionStatus = :s",
        ExpressionAttributeValues:{
            ":s": status
        }
    }
    await docClient.update(params).promise();
}

const hasPendingVotes = async (electionId) => {
    let tx = await getTransactions(electionId, "pending");
    if(tx.stats["pending"] > 0){
        return true;
    } else {
        return false;
    }
}

const savePublicJwtKey = async (electionId, key) => {
    let obj = {
        electionId: electionId,
        keyType: "jwt-public",
        value: key.toString("base64"),
        encrypted: false,
        txTimestamp: new Date().getTime()
    }

    let params = {
        TableName: "electionKeys",
        Item: obj
    }
    await docClient.put(params).promise();
}

const saveVoterKey = async(keyObj) => {
    keyObj.txTimestamp = new Date().getTime();

    let params = {
        TableName: "voterKeys",
        Item: keyObj
    }
    await docClient.put(params).promise();
}

module.exports = {
    savePublicJwtKey: savePublicJwtKey,
    getElection: getElection,
    setStatus: setStatus,
    saveVoterKey: saveVoterKey,
    hasPendingVotes: hasPendingVotes,
    getTransactions: getTransactions
}