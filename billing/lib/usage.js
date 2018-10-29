const AWS = require("aws-sdk")

const docClient = new AWS.DynamoDB.DocumentClient();

const searchUsageByDate = async (start, end, user) => {
    let company = user.company;
    var params = {
        TableName : "nvUsage",
        KeyConditionExpression: "company = :company and createdAt between :startdt and :enddt",
        ExpressionAttributeValues: {
            ":startdt": start,
            ":enddt": end,
            ":company": company
        }
    };

    console.log(params);
    let res = await docClient.query(params).promise();
    return res.Items;
}

module.exports = {
    searchUsageByDate: searchUsageByDate
}