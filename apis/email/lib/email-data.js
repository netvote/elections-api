const AWS = require('aws-sdk');

const uuid = require("uuid/v4")
const encryption = require("../../lib/encryption")
const emailer = require("./email-sender")

const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE_VOTER_AUTH_TABLE = "voterEmailAuthLinks";

const markAsUsed = async (electionId, email, linkKey) => {
    let params = {
        TableName: TABLE_VOTER_AUTH_TABLE,
        Key: {
            electionId: electionId,
            emailHash: encryption.sha256Hash(email)
        },
        UpdateExpression: "set used = :t",
        ConditionExpression: "linkKey = :k", 
        ExpressionAttributeValues:{
            ":t": true,
            ":k": linkKey
        }
    }
    await docClient.update(params).promise();
}


// STEP 1: sends a verification link
const verifyEmail = async (electionId, email) => {
    let secret = uuid();
    let linkKey = encryption.hmac(email, secret);

    let item = {
        electionId: electionId,
        emailHash: encryption.sha256Hash(email),
        linkKey: linkKey,
        expirationTime: (new Date().getTime() + 15*60*1000), // 15 minutes
        used: false,
        ttlTimestamp: Math.floor((new Date().getTime() + 1000*60*60*24*3)/1000) // delete in a week
    }

    let params = {
        TableName: TABLE_VOTER_AUTH_TABLE,
        Item: item
    }

    await docClient.put(params).promise();
    return await emailer.sendVerificationEmail(electionId, email, secret);
}

// STEP 2: once a user verifies their email, this checks the link they click
const confirmEmail = async (electionId, email, secret) => {

    let linkKey = encryption.hmac(email, secret);

    let params = {
        TableName: TABLE_VOTER_AUTH_TABLE,
        Key: {
            electionId: electionId,
            emailHash: encryption.sha256Hash(email)
        }
    }

    let res = await docClient.get(params).promise();
    let data = res.Item;

    // doesn't exist OR new link has been generated
    if(!data || data.linkKey !== linkKey){
        throw new Error("invalid");
    }
    // expired link
    if(data.expirationTime < new Date().getTime()){
        throw new Error("expired");
    }
    // already clicked
    if(data.used) {
        throw new Error("used")
    }

    await markAsUsed(electionId, email, linkKey);
    return true;
}



module.exports = {
    verifyEmail: verifyEmail,
    confirmEmail: confirmEmail
}