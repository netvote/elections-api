const AWS = require("aws-sdk")
const docClient = new AWS.DynamoDB.DocumentClient();
const kmsClient = new AWS.KMS();
const crypto = require('crypto');
const nJwt = require('njwt');

const TABLE_VOTER_KEYS = "voterKeys";
const TABLE_ELECTION_KEYS = "electionKeys";

const sha256Hash = (str) => {
    let hash = crypto.createHash("sha256")
    hash.update(str);
    return hash.digest().toString("base64");
}

const kmsDecrypt = async (ctx, encryptedString) => {
    console.log(ctx);
    const cipherText = Buffer.from(encryptedString, "base64");
    const params = { EncryptionContext:ctx, CiphertextBlob: cipherText };
    const result = await kmsClient.decrypt(params).promise();
    return result.Plaintext.toString();
}

const getElectionKey = async (electionId, keyType) => {
    console.log(electionId);
    console.log(keyType);
    let params = {
        TableName: TABLE_ELECTION_KEYS,
        Key:{
            "electionId": electionId,
            "keyType": keyType
        }
    };
    let data = await docClient.get(params).promise();
    let encrypted = data.Item.value;
    console.log("encrypted="+encrypted);
    return await kmsDecrypt({"id": electionId,"type": keyType}, encrypted)
}

const toHmac = (value, key) => {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(value);
    return hmac.digest('hex');
};


const getJwtSecret = async (electionId) => {
    return await getElectionKey(electionId, "jwt-private")
}

const getVoteIdHashSecret = async (electionId) => {
    return await getElectionKey(electionId, "voter")
}

const anonymize = async (electionId, token) => {
    let secret = await getVoteIdHashSecret(electionId);
    return toHmac(`${electionId}:${token}`, secret)
}


const tokenToJwt = async (electionId, token) => {
    let jwtSecret = await getJwtSecret(electionId)
    let sub = await anonymize(electionId, token);
    let claims = {
        iss: "https://netvote.io/",
        sub: sub,
        scope: electionId
    };

    let jwt = nJwt.create(claims, jwtSecret);
    jwt.setExpiration(new Date().getTime() + (60 * 60 * 1000));
    return jwt.compact();
}

const authorizeKey = async (electionId, key) => {
    let hashedKey = sha256Hash(key);
    let params = {
        TableName: TABLE_VOTER_KEYS,
        Key:{
            "electionId": electionId,
            "hashedKey": hashedKey
        }
    };
    let data = await docClient.get(params).promise();
    return data.Item && data.Item.enabled;
}

module.exports = {
    tokenToJwt: tokenToJwt,
    authorizeKey: authorizeKey
}