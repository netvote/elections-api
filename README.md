Netvote API
===========
[![Build Status](https://travis-ci.org/netvote/elections-api.svg?branch=master)](https://travis-ci.org/netvote/elections-api)

**Version:** 1.0.6

**License:** [GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)

[Click here for our Swagger UI](https://swagger.netvote.io)

[Admin SDK](#admin-sdk)

[Public SDK](#public-sdk)

[Rest API](#rest-api)

## NPM Package

```
npm install @netvote/netvote-api-sdk
```

## Admin SDK

**Note: Admin SDK is meant for server-deployment only.  Do not place ID or Secret in the browser** 

###  Initialize Admin Client
```
const netvoteApis = require("@netvote/netvote-api-sdk")

const nv = netvoteApis.initAdminClient(
    process.env.NETVOTE_API_KEY, 
    process.env.NETVOTE_API_ID, 
    process.env.NETVOTE_API_SECRET, 
)
```

### Create Election
```
let metadata = await nv.SaveToIPFS({
	"type": "basic",
	"ballotTitle": "2020 Election",
	"ballotLocation": "NYC",
	"ballotDate": "",
	"ballotImage": "",
	"featuredImage": "https://netvote.io/wp-content/uploads/2018/03/roswell-ga.jpg",
	"ballotInformation": "Some information",
	"ballotGroups": [{
		"groupTitle": "Decision Types",
		"ballotSections": [{
			"type": "multiple",
			"maxSelect": 2,
			"minSelect": 1,
			"sectionTitle": "Governor",
			"sectionTitleNote": "Choose 1 or 2 choices",
			"ballotItems": [{
				"itemTitle": "John Smith",
				"itemDescription": "Democratic Party"
			}, {
				"itemTitle": "Sally Gutierrez",
				"itemDescription": "Republican Party (incumbent)"
			}, {
				"itemTitle": "Tyrone Williams",
				"itemDescription": "Independent"
			}]
		}, {
			"type": "single",
			"sectionTitle": "Proposition 33",
			"sectionTitleNote": "Do you support Proposition 33?",
			"ballotItems": [{
				"itemTitle": "Yes"
			}, {
				"itemTitle": "No"
			}]
		}, {
			"type": "ranked",
			"sectionTitle": "Favorite Color",
			"sectionTitleNote": "Choose your favorite color (1 is highest)",
			"ballotItems": [{
				"itemTitle": "Red"
			}, {
				"itemTitle": "Green"
			}, {
				"itemTitle": "Blue"
			}]
		}, {
			"type": "points",
			"totalPoints": 9,
			"sectionTitle": "Tax Commissioner",
			"sectionTitleNote": "Allocate Points",
			"ballotItems": [{
				"itemTitle": "Doug Hall",
				"itemDescription": "(incumbent)"
			}, {
				"itemTitle": "Emily Washington"
			}]
		}]
	}]
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
### Create a Voter Key
```
// example logic for base64(sha256(key)) 
const sha256Hash = (str) => {
    let hash = crypto.createHash("sha256")
    hash.update(str);
    return hash.digest().toString("base64");
}

// hash key
let voterKey = "secretKey"
let hashedKey = sha256Hash(k)

let res = await nv.AddVoterKeys(electionId, {hashedKeys: [hashedKey]});

console.log(res.count) // 1 
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

## Public SDK

This can be initialized in a browser using a stack like [Browserify](http://browserify.org/) 

###  Initialize Voter/Public Client
```
const netvoteApis = require("@netvote/netvote-api-sdk")

const publicNv = netvoteApis.initVoterClient(
    process.env.NETVOTE_API_KEY, 
)
```
###  Get Anonymous Voter Auth Token
```
// voterToken distributed via string
let tokenReponse = await publicNv.GetJwtToken(electionId, voterKey)
let token = tokenResponse.token;
```

###  Get Anonymous Voter Auth Token QR
```
// voterToken distributed via string or QR
let tokenReponse = await publicNv.GetJwtTokenQR(electionId, voterKey)

// token qr is data URL object with {electionId: electionId, token: jwtToken}
document.getElementById("yourimage").src = tokenReponse.qr;
```

### Cast Vote
```
let voteObject = {
    ballotVotes: [
        {
            choices: [
                {
                    indexSelections: {
                        indexes: [0, 1]     // select first and second choice
                    }
                },
                {
                    selection: 1            // select the second choice
                },
                {
                    pointsAllocations: {
                        points: [2,1,3]     // index is choice, value is rank (1 is highest)
                    }
                },
                {
                    pointsAllocations: {
                        points: [3,6]       // these are points, more is higher
                    }
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

### Endpoints

[Click here for our Swagger UI](https://swagger.netvote.io)

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
 `/public/election/{id}/results`      | GET    | No    | Starts an asynchronous Tally execution                                                                                                       
 `/public/job/{id}`                   | GET    | No    | Retrieves status or result of a Vote or Tally async Job                                                                                      
 `/voter/election/{id}/auth/{format}` | POST   | Yes   | If format is QR, will additionally return JWT inside of a data-type URL for HTML display                                                     
 `/voter/election/{id}/vote`          | POST   | Yes   | Casts a vote                                                                                                                                 
 `/ipfs`                              | POST   | Yes   | Save an object to IPFS                                                                                                                       
 `/ipfs/{hash}`                       | GET    | Yes   | Get an object from IPFS                                                                                                                      
<!-- /markdown-swagger -->
