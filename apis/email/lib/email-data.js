const uuid = require("uuid/v4")
const encryption = require("../../lib/encryption")

const docClient = new AWS.DynamoDB.DocumentClient();

const markAsUsed = async (electionId, email, linkKey) => {
    let params = {
        TableName: "emailVerifications",
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

const verifyEmail = async (electionId, email, secret) => {
    let linkKey = encryption.hmac(email, secret);

    let params = {
        TableName: "emailVerifications",
        Key: {
            electionId: electionId,
            emailHash: encryption.sha256Hash(email)
        }
    }

    let res = await docClient.get(params).promise();
    let data = res.Item;

    if(!data || data.linkKey !== linkKey){
        throw new Error("invalid link");
    }
    if(data.expirationTime > new Date().getTime()){
        throw new Error("link is expired");
    }
    if(data.used) {
        throw new Error("link already used")
    }

    await markAsUsed(electionId, email, linkKey);
    return true;
}

const createVerificationLink = async (electionId, email) => {
    let secret = uuid();
    let linkKey = encryption.hmac(email, secret);

    let item = {
        electionId: electionId,
        emailHash: encryption.sha256Hash(email),
        linkKey: linkKey,
        expirationTime: (new Date().getTime() + 15*60*1000), // 15 minutes
        used: false
    }

    let params = {
        TableName: "emailVerifications",
        Item: item
    }

    await docClient.put(params).promise();
}


module.exports = {
    createVerificationLink: createVerificationLink
}