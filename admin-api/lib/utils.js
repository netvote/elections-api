'use strict'

const Joi = require('joi');

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

module.exports = {
    getUser: getUser,
    validate: validate,
    error: error,
    success: success
}