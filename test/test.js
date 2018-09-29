const assert = require('assert');
const nv = require("./netvote-request");
nv.Init({
    id: process.env.NETVOTE_DEV_API_ID,
    secret: process.env.NETVOTE_DEV_API_SECRET
})


describe(`End to End Election`, function() {

    let electionId;

    it('should create election', async () => {
        let job = await nv.CreateElection({
            autoActivate: false,
            continuousReveal: true,
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
    })

    it('should stop election', async () => {
        let job = await nv.SetElectionStatus(electionId, {
            status: "stopped"
        });
        assert.equal(job.status, "complete", "status should be complete")
    })

    it('should resume election', async () => {
        let job = await nv.SetElectionStatus(electionId, {
            status: "voting"
        });
        assert.equal(job.status, "complete", "status should be complete")
    })

})