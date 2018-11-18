const AWS = require("aws-sdk")
const docClient = new AWS.DynamoDB.DocumentClient();
const nvEncrypt = require('./encryption')

const TABLE_VOTER_KEYS = "voterKeys";

const recordAuthId = async (electionId, token) => {
    let authId = nvEncrypt.sha256Hash(token);
    let params = {
        TableName: "authIds",
        Item: {
            "electionId": electionId,
            "authId": authId
        }
    }
    await docClient.put(params).promise();
}

const authorizeKey = async (electionId, key) => {
    let hashedKey = nvEncrypt.sha256Hash(key);
    let params = {
        TableName: TABLE_VOTER_KEYS,
        Key:{
            "electionId": electionId,
            "hashedKey": hashedKey
        }
    };
    let data = await docClient.get(params).promise();
    if(data.Item && data.Item.enabled){
        return true
    }
    return false;
}

module.exports = {
    recordAuthId: recordAuthId,
    authorizeKey: authorizeKey
}