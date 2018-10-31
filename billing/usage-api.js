'use strict';

const utils = require("../lib/utils")
const Joi = require('joi');
const usage = require('./lib/usage')
const dateFormat = require('dateformat');

let defaultReport = () => {
    return {
        "PROD": 0,
        "TEST": 0
    }
}

var initReport = function (s, e) { 
    let days = {}
    let months = {}
    for (var d = s; d <= e; d.setDate(d.getDate() + 1)) { 
        let dateStr = dateFormat(new Date(d), "yyyy-mm-dd");
        let monthStr = dateFormat(new Date(d), "yyyy-mm")
        days[dateStr] = defaultReport()
        months[monthStr] = defaultReport()
    } 
    return {
        totals: defaultReport(),
        days: days,
        months: months
    }; 
};

const getSearchSchema = () => {
    let now = new Date();

    let thirtyAgo = new Date(now.getTime());
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);

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

module.exports.timeReport = async (event, context) => {
    let queryParams = event.queryStringParameters || {};
    try {
        let user = utils.getUser(event);
        let params = await utils.validate(queryParams, getSearchSchema());
        let resp = await usage.searchUsageByDate(params.start_dt, params.end_dt, user);

        let report = initReport(new Date(params.start_dt), new Date(params.end_dt));
        for (let i = 0; i < resp.length; i++) {
            let entry = resp[i];
            let d = new Date(entry.createdAt);
            let dateStr = dateFormat(new Date(d), "yyyy-mm-dd");
            let monthStr = dateFormat(new Date(d), "yyyy-mm")

            // shouldn't happen, but being safe
            if (!report.days[dateStr]) {
                report.days[dateStr] = defaultReport()
            }
            if(!report.months[monthStr]){
                report.months[monthStr] = defaultReport();
            }
            report.days[dateStr][entry.mode]++;
            report.months[monthStr][entry.mode]++;
            report.totals[entry.mode]++;
        }
        return utils.success(report);
    } catch (e) {
        console.error(e);
        return utils.error(400, e.message)
    }
};