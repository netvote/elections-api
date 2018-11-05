const AWS = require("aws-sdk")
const docClient = new AWS.DynamoDB.DocumentClient();

ACTION = {
    CREATE_ELECTION: "create-election",
    CLOSE_ELECTION: "close-election",
    STOP_ELECTION: "stop-election",
    ACTIVATE_ELECTION: "activate-election",
    RESUME_ELECTION: "resume-election",
    CREATE_VOTER_KEY: "create-voter-key",
    DISABLE_VOTER_KEY: "disable-voter-key",
    SET_JWT_KEY: "set-jwt-key",
    ADD_API_KEY: "add-api-key"
}

const AUDIT_LOG = "nvAuditLog";

const add = async (user, action, details) => {
    let item = {
        company: user.company,
        eventTime: new Date().getTime(),
        user:user,
        action: action,
        details: details
    }
    // set to top level for searching
    if(details.electionId){
        item.electionId = details.electionId
    }
    let params = {
        TableName: AUDIT_LOG,
        Item: item
    }
    await docClient.put(params).promise();
}

const search = async (user, start, end) => {
    let company = user.company;
    var params = {
        TableName : AUDIT_LOG,
        KeyConditionExpression: "company = :company and eventTime between :startdt and :enddt",
        ExpressionAttributeValues: {
            ":startdt": start,
            ":enddt": end,
            ":company": company
        }
    };

    let res = await docClient.query(params).promise();
    return res.Items;
}

module.exports = {
    add: add,
    search: search,
    ACTION: ACTION
}