const AWS = require("aws-sdk")
const crypto = require('crypto');
const nJwt = require('njwt');
const ursa = require('ursa');
const ENCRYPT_ALGORITHM = "aes-256-cbc";

const docClient = new AWS.DynamoDB.DocumentClient();
const kmsClient = new AWS.KMS();

const TABLE_ELECTION_KEYS = "electionKeys";

const KEY_TYPE = {
    ENCRYPTION: "encryption",
    VOTER: "voter",
    JWT_PUBLIC: "jwt-public",
    JWT_PRIVATE: "jwt-private",
    JWT_ANONYMIZER: "jwt-anonymizer"
}

const sha256Hash = (str) => {
    let hash = crypto.createHash("sha256")
    hash.update(str);
    return hash.digest().toString("base64");
}

const toHmac = (value, key) => {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(value);
    return hmac.digest('hex');
};

const kmsDecrypt = async (ctx, encryptedString) => {
    const cipherText = Buffer.from(encryptedString, "base64");
    const params = { EncryptionContext:ctx, CiphertextBlob: cipherText };
    const result = await kmsClient.decrypt(params).promise();
    return result.Plaintext.toString();
}

const getElectionKey = async (electionId, keyType) => {
    let params = {
        TableName: TABLE_ELECTION_KEYS,
        Key:{
            "electionId": electionId,
            "keyType": keyType
        }
    };
    let data = await docClient.get(params).promise();
    let value = data.Item.value;
    if(data.Item.encrypted){
        return await kmsDecrypt({"id": electionId,"type": keyType}, value)
    } else{
        return value
    }
}

const getJwtPublicKey = async (electionId) => {
    return await getElectionKey(electionId, KEY_TYPE.JWT_PUBLIC)
}

const anonymize = async (electionId, text, keyType) => {
    let secret = await getElectionKey(electionId, keyType);
    return toHmac(text, secret)
}

const verifyElectionJwt = async (token) => {
    const key = token.split(".")[1]
    const electionId = JSON.parse(new Buffer(key, "base64").toString("ascii")).scope;
    const secretBase64 = await getJwtPublicKey(electionId);
    const secretBuffer = Buffer.from(secretBase64, 'base64'); 

    return new Promise((resolve, reject) => {
        nJwt.verify(token, secretBuffer.toString(), 'RS256', function (err, verified) {
            if (err) {
                reject(err);
            } else {
                let weight = `${verified.body.weight || "1.0"}`;
                resolve({
                    voterId: verified.body.sub,
                    electionId: verified.body.scope,
                    weight: weight,
                    tokenId: verified.body.jti + verified.body.sub
                }) 
            }
        });
    })
}

const extractAuthHeader = (event) => {
    let authorization = event.headers.Authorization;
    if(authorization){
        let token = authorization.replace(/Bearer /, "");
        return token;
    }
    return null;
}

const createJwt = async (electionId, token) => {
    let sub = await anonymize(electionId, `${electionId}:${token}`, KEY_TYPE.JWT_ANONYMIZER);
    let claims = {
        iss: "https://netvote.io/",
        sub: sub,
        scope: electionId
    };
    let secretBase64 = await getElectionKey(electionId, KEY_TYPE.JWT_PRIVATE)
    var secretBuffer = Buffer.from(secretBase64, 'base64'); 

    let jwt = nJwt.create(claims, secretBuffer.toString() ,'RS256');
    jwt.setExpiration(new Date().getTime() + (60 * 60 * 1000));
    return jwt.compact();
}

const encrypt = async (electionId, text) => {
    let encryptionKey = await getElectionKey(electionId, KEY_TYPE.ENCRYPTION);
    let cipher = crypto.createCipher(ENCRYPT_ALGORITHM, encryptionKey);           
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
}

const checkSignature = async (base64payload, publicKey, signature) => {
    const pub = ursa.createPublicKey(publicKey, 'base64');    
    return pub.hashAndVerify('md5', new Buffer(base64payload), signature, "base64");
}

module.exports =  {
    KEY_TYPE: KEY_TYPE,
    anonymize: anonymize,
    sha256Hash: sha256Hash,
    extractAuthHeader: extractAuthHeader,
    verifyElectionJwt: verifyElectionJwt,
    checkSignature: checkSignature,
    createJwt: createJwt,
    getJwtPublicKey: getJwtPublicKey,
    encrypt: encrypt,
    hmac: toHmac
}