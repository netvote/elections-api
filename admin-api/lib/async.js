const AWS = require("aws-sdk")
const docClient = new AWS.DynamoDB.DocumentClient();
const uuid = require("uuid/v4")

const TABLE_ASYNC_JOBS = "asyncJobs";

const asyncLambda = (name, payload) => {
    return new Promise((resolve, reject) => {
        try{
            const lambda = new AWS.Lambda({ region: "us-east-1", apiVersion: '2015-03-31' });
            const lambdaParams = {
                FunctionName: name,
                InvocationType: 'Event',
                LogType: 'None',
                Payload: JSON.stringify(payload)
            };
            lambda.invoke(lambdaParams, function(err, data){
                if(err){
                    reject(err)
                } else{
                    resolve(data);
                }
            });
        }catch(e){
            reject(e);
        }
    })
}

const getJob = async (jobId) => {
    let params = {
        TableName: TABLE_ASYNC_JOBS,
        Key: {
            "jobId": jobId
        }
    }
    let data = await docClient.get(params).promise();
    return data.Item;
}

const startJob = async (name, payload, user) => {

    payload = payload || {};

    let jobId =  `${user.id}-${uuid()}`;
    payload.jobId = jobId;
    payload.user = user;

    let obj = {
        jobId: jobId,
        jobType: name,
        user: user,
        txTimestamp: new Date().getTime(),
        txStatus: "pending"
    }

    let params = {
        TableName: TABLE_ASYNC_JOBS,
        Item: obj
    }

    await docClient.put(params).promise();
    await asyncLambda(name, payload)

    return jobId;
}


module.exports = {
    startJob: startJob,
    getJob: getJob
}