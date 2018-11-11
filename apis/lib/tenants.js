const AWS = require("aws-sdk")
const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE_TENANTS = "tenants";

const getTenant = async (tenantId) => {
    var params = {
        TableName: TABLE_TENANTS,
        Key:{
            "tenantId": tenantId
        }
    };
    let data = await docClient.get(params).promise();
    return data.Item;
}

module.exports = {
    getTenant: getTenant
}