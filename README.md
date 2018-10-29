Netvote API
===========
Netvote API

**Version:** 1.0.0

**License:** [GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)

[Find out more about Swagger](http://swagger.io)

## NPM Package

```
npm install @netvote/netvote-api-sdk
```

## Admin SDK

###  Initialize Admin Client
```
const nv = netvoteApis.initAdminClient(
    process.env.NETVOTE_API_KEY, 
    process.env.NETVOTE_API_ID, 
    process.env.NETVOTE_API_SECRET, 
)
```

## Create an Election
```
let metadata = await nv.SaveToIPFS({
  "type": "basic",
  "ballotTitle": "Netvote Demo Election",
  "ballotLocation": "NYC",
  "ballotDate": "",
  "ballotImage": "",
  "featuredImage": "https://netvote.io/wp-content/uploads/2018/03/roswell-ga.jpg",
  "description": "This is a demo election on the Netvote platform",
  "ballotInformation": "Some information",
  "ballotGroups": [
    {
      "groupTitle": "State Election",
      "ballotSections": [
        {
          "sectionTitle": "Governor",
          "sectionTitleNote": "Choose one",
          "ballotItems": [
            {
              "itemTitle": "John Smith",
              "itemDescription": "Democratic Party"
            },
            {
              "itemTitle": "Sally Gutierrez",
              "itemDescription": "Republican Party (incumbent)"
            },
            {
              "itemTitle": "Tyrone Williams",
              "itemDescription": "Independent"
            }
          ]
        },
        {
          "sectionTitle": "Proposition 33",
          "sectionTitleNote": "Do you support Proposition 33?",
          "ballotItems": [
            {
              "itemTitle": "Yes"
            },
            {
              "itemTitle": "No"
            }
          ]
        }
      ]
    },
    {
      "groupTitle": "County Election",
      "ballotSections": [
        {
          "sectionTitle": "Tax Commissioner",
          "sectionTitleNote": "Choose one",
          "ballotItems": [
            {
              "itemTitle": "Doug Hall",
              "itemDescription": "(incumbent)"
            },
            {
              "itemTitle": "Emily Washington"
            }
          ]
        }
      ]
    }
  ]
});

let job = await nv.CreateElection({
    autoActivate: false,
    continuousReveal: false,
    metadataLocation: metadata.hash,
    requireProof: true,
    allowUpdates: true,
    netvoteKeyAuth: true,
    network: "netvote"
});

let finished = await nv.PollJob(job.jobId, 60000);

let electionId = finished.txResult.electionId;
```
### Activate / Resume Election
```
await nv.ActivateElection(electionId);
```
### Stop Election
```
await nv.StopElection(electionId);
```
### Close Election (Permanent)
```
await nv.CloseElection(electionId);
```

## Public/Voter SDK

###  Initialize Admin Client
```
const publicNv = netvoteApis.initVoterClient(
    process.env.NETVOTE_API_KEY, 
)
```
###  Get Anonymous Voter Auth Token
```
// voterToken distributed via string or QR
let tokenReponse = await publicNv.GetJwtToken(electionId, voterToken)
let token = tokenResponse.token;
```

### Cast Vote
```
let voteObject = {
    ballotVotes: [
        {
            choices: [
                {
                    selection: 0
                },
                {
                    selection: 1
                },
                {
                    selection: 1
                }
            ]
        }
    ]
}
let job = await publicNv.CastSignedVote(electionId, token, voteObject)

// poll for 60 seconds
let res = await publicNv.PollJob(job.jobId, 60000);

if(res.txStatus === "complete"){
    // everything is good
} else {
    // an error occured, or vote is a duplicate
}

```

## REST API 

### Authentication

There are two required headers:

```
x-api-key: APIKEY
Authorization: Basic base64(ID:SECRET)
```
For example, for values APKEY=abc123, ID=testid, and SECRET=testsecret, the headers are:
```
x-api-key: abc123
Authorization: Basic dGVzdGlkOnRlc3RzZWNyZXQK
```
<!-- markdown-swagger -->
 Endpoint                             | Method | Auth? | Description                                                                                                                                  
 ------------------------------------ | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------
 `/admin/election`                    | POST   | Yes   | Create a new election and deploy as a smart contract                                                                                         
 `/admin/election/{id}/status`        | POST   | Yes   | This will transition the election to the specified state.                                                                                    
 `/admin/election/{id}/jwt`           | POST   | Yes   | Set public JWT Key for voter authentication                                                                                                  
 `/admin/election/{id}/keys`          | POST   | Yes   | If count is populated, will generate and return those keys.  Otherwise, will upload base64-encoded sha256 keys found in the hashedKeys array.
 `/admin/job/{id}`                    | GET    | Yes   | Only the admin who created the job may retrieve job status                                                                                   
 `/admin/election/{id}/votes`         | GET    | Yes   | Returns each unique vote (updates are separate entries)                                                                                      
 `/public/election/{id}`              | GET    | No    | Anyone may retrieve basic election information                                                                                               
 `/public/election/{id}/results`      | GET    | No    |                                                                                                                                              
 `/public/job/{id}`                   | GET    | No    | Retrieves status or result of a Vote or Tally async Job                                                                                      
 `/voter/election/{id}/auth/{format}` | POST   | Yes   | If format is QR, will additionally return JWT inside of a data-type URL for HTML display                                                     
 `/voter/election/{id}/vote`          | POST   | Yes   | Casts a vote                                                                                                                                 
<!-- /markdown-swagger -->