#! /usr/bin/env node

const sdk = require('./index.js')
const program = require('commander');

let adminClient;
let publicClient;

const validateEnv = () => {
    let errors = false;
    if (!process.env.NETVOTE_API_KEY) {
        console.error("NETVOTE_API_KEY environment variable must be set")
        errors = true;
    }
    if (!process.env.NETVOTE_API_ID) {
        console.error("NETVOTE_API_ID environment variable must be set")
        errors = true;
    }
    if (!process.env.NETVOTE_API_SECRET) {
        console.error("NETVOTE_API_SECRET environment variable must be set")
        errors = true;
    }
    if (errors) {
        process.exit(1);
    }
}

const initClient = async () => {
    validateEnv();
    adminClient = sdk.initAdminClient(
        process.env.NETVOTE_API_KEY,
        process.env.NETVOTE_API_ID,
        process.env.NETVOTE_API_SECRET
    )

    publicClient = sdk.initVoterClient(
        process.env.NETVOTE_API_KEY
    )
}

const printObj = (obj) => {
    console.log(JSON.stringify(obj, null, 4));
}

const addToFilter = (filter, key, val) => {
    filter = filter ? filter : {}
    filter[key] = val;
    return filter;
}

const readJsonFile = (inputFile) => {
    var fs = require('fs');
    let obj = fs.readFileSync(inputFile, 'utf8');
    return JSON.parse(obj);
}

const checkKeysInBatch = async (inputFile, electionId) => {
    return new Promise((resolve, reject) => {
        var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

        let batch = [];
        let result = {
            used: [],
            notUsed: []
        }
     
        rl.on('line', async function (line) {
            if(line) batch.push(line);
            if(batch.length > 1000){
                let res = await adminClient.CheckKeys(electionId, batch);
                result.used = result.used.concat(res.used);
                result.notUsed = result.notUsed.concat(res.notUsed);
                batch = [];
            }
        });
        
        rl.on('close', async function (line) {
            if(line) batch.push(line);
            if(batch.length > 0){
                let res = await adminClient.CheckKeys(electionId, batch);
                result.used = result.used.concat(res.used);
                result.notUsed = result.notUsed.concat(res.notUsed);
            }
            resolve(result);
        });
    })
}

const processBatches = async (inputFile, electionId, processor) => {
    return new Promise((resolve, reject) => {
        var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

        let batch = [];
     
        rl.on('line', async function (line) {
            if(line) batch.push(line);
            if(batch.length > 1000){
                await processor(electionId, batch);
                batch = [];
            }
        });
        
        rl.on('close', async function (line) {
            if(line) batch.push(line);
            if(batch.length > 0){
                await processor(electionId, batch);
            }
            resolve();
        });
    })
}

program
    .command('tally <electionId>')
    .action(async function (electionId, cmd) {
        let el = await publicClient.GetElection(electionId);
        let job = await publicClient.GetResults(electionId);
        if(!job.jobId){
            console.log(job);
            return;
        }
        let res = await publicClient.PollJob(job.jobId, 600000);
        try{
            printObj(res.txResult.results.ballots[el.address].results["ALL"])
        }catch(e){
            printObj(res);
            process.exit(1);
        }
    })

program
    .command('votes <electionId>')
    .option('-c, --count', 'count votes')
    .action(async function (electionId, cmd) {
        let res = await adminClient.GetVoteTransactions(electionId);
        if(cmd.count){
            printObj(res.stats);
        } else {
            printObj(res);
        }
    })

program
    .command('create <fileName>')
    .option('-c, --continuous-reveal', 'post encryption key to reveal results during election')
    .option('-u, --allow-updates', 'allow voters to vote again to update their vote')
    .option('-n, --network [network]', 'netvote, ropsten, or mainnet')
    .option('-a, --auth-type [type]', 'email or key')
    .option('-s, --start-time [timestamp]', 'epoch ms of start time')
    .option('-e, --end-time [timestamp]', 'epoch ms of end time')
    .action(async function (fileName, cmd) {
        if(cmd.authType && ["email","key"].indexOf(cmd.authType) == -1){
            throw new Error("invalid auth type, must be one of: key, email")
        }
        let authType = cmd.authType || "key";

        if(cmd.network && ["netvote","ropsten","mainnet"].indexOf(cmd.network) == -1){
            throw new Error("invalid network, must be one of: ropsten, netvote, mainnet")
        }
        let network = cmd.network || "netvote";

        let continuousReveal = cmd.continuousReveal ? true : false;
        let allowUpdates = cmd.allowUpdates ? true : false;

        let metadataJson = await readJsonFile(fileName);
        let ipfsObj = await adminClient.SaveToIPFS(metadataJson)

        if(!ipfsObj.hash || ipfsObj.hash === "zb2rhbE2775XANjTsRTV9sxfFMWxrGuMWYgshDn9xvjG69fZ3"){
            throw new Error("error saving to IPFS")
        }

        let voteStartTime = cmd.startTime || 0;
        let voteEndTime = cmd.endTime || 0;
        
        let res = await adminClient.CreateElection({
            autoActivate: true,
            continuousReveal: continuousReveal,
            metadataLocation: ipfsObj.hash,
            allowUpdates: allowUpdates,
            requireProof: true,
            authType: authType,
            network: network,
            voteStartTime: voteStartTime,
            voteEndTime: voteEndTime
        });

        let finished = await adminClient.PollJob(res.jobId, 600000);
        var cliRes = { result: finished.txResult};
        if(cmd.authType === "email") {
            cliRes.voterUrl = `https://vote.netvote.io/#/email/${finished.txResult.electionId}`
        }
        printObj(cliRes);
    })

program
    .command('close <electionId>')
    .action(async function (electionId, cmd) {
        let res = await adminClient.CloseElection(electionId);
        printObj(res);
    })

program
    .command('stop <electionId>')
    .action(async function (electionId, cmd) {
        let res = await adminClient.StopElection(electionId);
        printObj(res);
    })

program
    .command('info <electionId>')
    .action(async function (electionId, cmd) {
        let res = await publicClient.GetElection(electionId);
        printObj(res);
    })

program
    .command('create-voter-jwt <electionId> <voterId>')
    .action(async function (electionId, voterId, cmd) {
        let res = await adminClient.CreateVoterJwt(electionId, voterId);
        console.log(res.token);
    })

program
    .command('check-keys <electionId> <file>')
    .action(async function (electionId, file, cmd) {
        let res = await checkKeysInBatch(file, electionId);
        printObj(res);
    })

program
    .command('add-keys <electionId> <file>')
    .action(async function (electionId, file, cmd) {
        await processBatches(file, electionId, adminClient.AddVoterKeys);
        console.log("keys added successfully")
    })

program
    .command('add-emails <electionId> <file>')
    .action(async function (electionId, file, cmd) {
        await processBatches(file, electionId, adminClient.AddVoterEmails);
        console.log("emails added successfully")
    })

program
    .command('activate <electionId>')
    .action(async function (electionId, cmd) {
        let res = await adminClient.ActivateElection(electionId);
        printObj(res);
    })

program
    .version('1.2.4')
    .command('list')
    .option('-s, --status [value]', 'status of election')
    .option('-m, --mode [value]', 'TEST or PROD')
    .action(async function (cmd) {
        let filter = null;
        if(cmd.status){
            filter = addToFilter(filter, "electionStatus", cmd.status);
        }
        if(cmd.mode){
            filter = addToFilter(filter, "mode", cmd.mode.toUpperCase());
        }
        let res = await adminClient.GetElectionsList(filter);
        printObj(res)
    })

initClient();
program.parse(process.argv)
