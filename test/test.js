const assert = require('assert');
const nv = require("./netvote-admin-apis");
nv.Init({
    id: process.env.NETVOTE_DEV_API_ID,
    secret: process.env.NETVOTE_DEV_API_SECRET,
    baseUrl: "https://xbg2p0sfld.execute-api.us-east-1.amazonaws.com/dev"
})

const publicNv = require("./netvote-public-apis");
publicNv.Init({
    baseUrl: "https://xbg2p0sfld.execute-api.us-east-1.amazonaws.com/dev"
})

const assertElectionState = async (electionId, state) => {
    let el = await publicNv.GetElection(electionId);
    assert.equal(el.electionStatus, state, `should be in ${state} state, but was ${el.electionStatus}`);
}

describe(`End to End Election`, function() {

    let electionId;
    let voterKeys;

    it('should create election', async () => {
        let job = await nv.CreateElection({
            autoActivate: false,
            continuousReveal: false,
            metadataLocation: "QmZaKMumAXXLkHPBV1ZdAVsF4XCUYz1Jp5PY3oEsLrKoy6",
            allowUpdates: true,
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

    it.skip('should get an auth token', async ()=> {
        //TODO: implement
    })

    it.skip('should cast a vote', async ()=> {
        //TODO: implement
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
        await assertElectionState(electionId, "closed")
    })

})