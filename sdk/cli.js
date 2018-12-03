#! /usr/bin/env node

const sdk = require('./index.js')
const program = require('commander');

let client;

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
    client = sdk.initAdminClient(
        process.env.NETVOTE_API_KEY,
        process.env.NETVOTE_API_ID,
        process.env.NETVOTE_API_SECRET,
        "dev"
    )
}

const listElections = async (filter) => {
    initClient();
    let res = await client.GetElectionsList(filter);
    console.log(JSON.stringify(res, null, 4));
}

const addToFilter = (filter, key, val) => {
    filter = filter ? filter : {}
    filter[key] = val;
    return filter;
}

program
    .version('1.1.2')
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

        await listElections(filter);
    })

program.parse(process.argv)
