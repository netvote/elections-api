const AWS = require('aws-sdk');
const SES = new AWS.SES({ apiVersion: '2010-12-01' });

let apiVersion = (process.env.stage === "dev") ? "dev" : "v1";

const sendVerificationEmail = async (electionId, emailAddress, secret) => {
    let id = new Buffer(`${emailAddress}:${secret}`).toString("base64");
    let url = `https://elections.netvote.io/${apiVersion}/voter/election/${electionId}/email/confirmation?id=${id}`

    // Create sendEmail params 
    var params = {
        Destination: { 
            ToAddresses: [
                emailAddress
            ]
        },
        Message: { 
            Body: { 
                Html: {
                    Charset: "UTF-8",
                    Data: `<a href="${url}">Click here to open your ballot</a>`
                },
                Text: {
                    Charset: "UTF-8",
                    Data: `Open your browser, and visit ${url}`
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: `Your Ballot`
            }
        },
        Source: 'support@citizendata.network', 
        ReplyToAddresses: [
            'support@citizendata.network'
        ],
    };

    var res = await SES.sendEmail(params).promise();
    console.log(res);
}

module.exports = {
    sendVerificationEmail: sendVerificationEmail
}