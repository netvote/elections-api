const AWS = require('aws-sdk');
const ipfs = require('../../lib/ipfs')
const electionData = require('../../lib/election')
const SES = new AWS.SES({ apiVersion: '2010-12-01' });

let apiVersion = (process.env.stage === "dev") ? "dev" : "v1";

const sendVerificationEmail = async (electionId, emailAddress, secret) => {
    let id = new Buffer(`${emailAddress}:${secret}`).toString("base64");
    let url = `https://elections.netvote.io/${apiVersion}/voter/election/${electionId}/email/confirmation?id=${id}`

    let el = await electionData.getElection(electionId);

    let title = "Netvote Election"
    if(el.props.metadataLocation){
        let metadata = await ipfs.getJson(el.props.metadataLocation);
        title = metadata.ballotTitle;
    }

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
                    Data: `Your ${title} ballot is ready. <br/><br/> Please click the following link to access your ballot.  For your security, this link will remain active for the next 15 minutes.  Once clicked, a new link must be requested to allow access to the ballot. <br/><br/><a href="${url}">${url}</a>`
                },
                Text: {
                    Charset: "UTF-8",
                    Data: `Your ${title} ballot is ready. Please open your browser and visit the following URL to access your ballot.  For your security, this link will remain active for the next 15 minutes.  Once clicked, a new link must be requested to allow access to the ballot. ${url}`
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: `Ballot is Ready: ${title}`
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