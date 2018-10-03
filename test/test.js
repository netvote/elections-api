const assert = require('assert');
const nv = require("./netvote-admin-apis");
const VOTES = require("./vote-examples").VOTES;


nv.Init({
    id: process.env.NETVOTE_DEV_API_ID,
    secret: process.env.NETVOTE_DEV_API_SECRET,
    baseUrl: "https://elections-dev.netvote.io"
})

const publicNv = require("./netvote-public-apis");
publicNv.Init({
    baseUrl: "https://elections-dev.netvote.io"
})

const assertElectionState = async (electionId, state) => {
    await assertElectionValues(electionId, {electionStatus: state})
}

const assertElectionValues = async (electionId, keyVals) => {
    let el = await publicNv.GetElection(electionId);
    Object.keys(keyVals).forEach((name) => {
        let expected = keyVals[name];
        assert.equal(el[name], expected, `expected ${name} == ${expected}, but was ${el[name]}`);
    })
}

describe(`End to End Election`, function() {

    let electionId;
    let voterKeys;
    let tokens = [];

    it('should create election', async () => {
        let job = await nv.CreateElection({
            autoActivate: false,
            continuousReveal: false,
            metadataLocation: "QmZaKMumAXXLkHPBV1ZdAVsF4XCUYz1Jp5PY3oEsLrKoy6",
            allowUpdates: true,
            netvoteKeyAuth: true,
            network: "netvote"
        });

        assert.equal(job.jobId != null, true, "jobId should be present")
        assert.equal(job.status, "pending", "status should be pending")

        // confirm initial job state
        let checkJob = await nv.AdminGetJob(job.jobId);
        assert.equal(checkJob.txStatus, "pending", "should be in pending state")

        // give it one minute to complete
        let finished = await nv.AdminPollJob(job.jobId, 60000);

        assert.equal(finished.txStatus, "complete", "should be in complete state")
        assert.equal(finished.txResult.address != null, true, "address should be set")
        assert.equal(finished.txResult.electionId != null, true, "electionId should be set")
        assert.equal(finished.txResult.tx != null, true, "tx should be set")

        electionId = finished.txResult.electionId;
        console.log(`electionId: ${electionId}`)
        await assertElectionState(electionId, "building")
    })

    it('should generate keys', async ()=> {
        let res = await nv.AddVoterKeys(electionId, {generate: 5});
        assert.equal(res.keys != null, true, "should have keys populated")
        assert.equal(res.keys.length, 5, "should have generated 5 keys");
        voterKeys = res.keys;
    })

    it('should add a key', async ()=> {
        let res = await nv.AddVoterKeys(electionId, {keys: ["test1","test2","test3"]});
        assert.equal(res.count, 3, "should have a count of 3")
    })

    it('should activate election', async () => {
        let job = await nv.SetElectionStatus(electionId, {
            status: "voting"
        });
        assert.equal(job.jobId != null, true, "jobId should be present")


        // confirm initial job state
        let checkJob = await nv.AdminGetJob(job.jobId);
        assert.equal(checkJob.txStatus, "pending", "should be in pending state")

        // give it one minute to complete
        let finished = await nv.AdminPollJob(job.jobId, 60000);

        assert.equal(finished.txStatus, "complete", "should be in complete state")

        await assertElectionState(electionId, "voting")
    })

    it('should stop election', async () => {
        let job = await nv.SetElectionStatus(electionId, {
            status: "stopped"
        });
        assert.equal(job.status, "complete", "status should be complete")
        await assertElectionState(electionId, "stopped")
    })

    it('should resume election', async () => {
        let job = await nv.SetElectionStatus(electionId, {
            status: "voting"
        });
        assert.equal(job.status, "complete", "status should be complete")
        await assertElectionState(electionId, "voting")
    })

    it('should get an auth token', async ()=> {
        let tok = await publicNv.GetJwtToken(electionId, voterKeys[0])
        assert.equal(tok.token != null, true, "should have a token")
        tokens.push(tok.token);
    })

    it('should cast a vote', async ()=> {
        let job = await publicNv.CastSignedVote(electionId, tokens[0], VOTES.VOTE_0_0_0)
        assert.equal(job.jobId != null, true, "jobId should be present")
        assert.equal(job.status, "pending", "status should be pending")
    })

    it('should stop and close election', async () => {
        let stop = await nv.SetElectionStatus(electionId, {
            status: "stopped"
        });
        assert.equal(stop.status, "complete", "status should be complete")

        let job = await nv.SetElectionStatus(electionId, {
            status: "closed"
        });
        assert.equal(job.jobId != null, true, "jobId should be present")


        // confirm initial job state
        let checkJob = await nv.AdminGetJob(job.jobId);
        assert.equal(checkJob.txStatus, "pending", "should be in pending state")

        // give it one minute to complete
        let finished = await nv.AdminPollJob(job.jobId, 60000);

        assert.equal(finished.txStatus, "complete", "should be in complete state")

        await assertElectionValues(electionId, {electionStatus: "closed", resultsAvailable: true})
    })

    it.skip('should tally correctly', async ()=> {
        //TODO: implement
    })

})