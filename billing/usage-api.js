'use strict';

const utils = require("../lib/utils")
const Joi = require('joi');
const usage = require('./lib/usage')

const getSearchSchema = () => {
    let now = new Date();
    
    let thirtyAgo = new Date(now.getTime());
    thirtyAgo.setDate(thirtyAgo.getDate()-30);

    return Joi.object().keys({
        start_dt: Joi.number().default(thirtyAgo.getTime()),
        end_dt: Joi.number().default(now.getTime()),
    })
}

module.exports.search = async (event, context) => {
    let queryParams = event.queryStringParameters || {};
    try {
        let user = utils.getUser(event);
        let params = await utils.validate(queryParams, getSearchSchema());
        let resp = await usage.searchUsageByDate(params.start_dt, params.end_dt, user);
        return utils.success({
            results: resp
        });
    } catch (e) {
        console.error(e);
        return utils.error(400, e.message)
    }

};
