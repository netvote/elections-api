'use strict'

const Joi = require('joi');
const crypto = require('crypto');

const validate = (params, schema) => {
    return new Promise((resolve, reject)=>{
      Joi.validate(params, schema, (err, res) => {
        if(err){
          reject(err);
        } else {
          resolve(res);
        }
      })
    })
  }

const getUser = (event) => {
    let id = event.requestContext.authorizer.claims;
    return {
        id: id.sub,
        company: id["custom:company"],
        email: id.email,
        phone: id.phone_number
    }
}

const success = (obj) => {
    return {
        statusCode: 200,
        body: JSON.stringify(obj),
      };
}

const error = (code, message) => {
    return {
        statusCode: code,
        body: JSON.stringify({
            message: message
        }),
      };
}

const sendJobId = (jobId) => {
    return success({txStatus: "pending", jobId: jobId})
}

const sha256Hash = (str) => {
    let hash = crypto.createHash("sha256")
    hash.update(str);
    return hash.digest().toString("base64");
}

module.exports = {
    getUser: getUser,
    sha256Hash: sha256Hash,
    validate: validate,
    error: error,
    success: success,
    sendJobId: sendJobId
}