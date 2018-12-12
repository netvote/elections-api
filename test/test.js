const assert = require('assert');
const VOTES = require("./vote-examples").VOTES;
const netvoteApis = require("../sdk")
const crypto = require("crypto");

const API_VERSION = process.env.NETVOTE_API_VERSION || "dev";

const nv = netvoteApis.initAdminClient(
    process.env.NETVOTE_API_KEY,
    process.env.NETVOTE_API_ID,
    process.env.NETVOTE_API_SECRET,
    API_VERSION
)

const publicNv = netvoteApis.initVoterClient(
    process.env.NETVOTE_API_KEY,
    API_VERSION
)

const TX_TIMEOUT = 120000;

const assertElectionState = async (electionId, state) => {
    await assertElectionValues(electionId, { electionStatus: state })
}

const assertElectionValues = async (electionId, keyVals) => {
    let el = await publicNv.GetElection(electionId);
    Object.keys(keyVals).forEach((name) => {
        let expected = keyVals[name];
        assert.equal(el[name], expected, `expected ${name} == ${expected}, but was ${el[name]}`);
    })
}

describe(`IPFS API`, function () {

    it('should save and get file', async () => {
        let res = await publicNv.SaveToIPFS({
            test: true
        })
        let obj = await publicNv.GetFromIPFS(res.hash);
        assert.equal(obj.test, true, "should be same object")
    });

})

describe(`Upload emails to Email Election`, function () {
    let electionId = "0974d90f-646a-4f3d-8665-740ea3f62068";
    const email = "steven@netvote.io";

    it('should create election', async () => {
        let job = await nv.CreateElection({
            autoActivate: true,
            continuousReveal: true,
            metadataLocation: "QmZaKMumAXXLkHPBV1ZdAVsF4XCUYz1Jp5PY3oEsLrKoy6",
            allowUpdates: true,
            requireProof: true,
            authType: "email",
            test: true,
            network: "netvote"
        });
        assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))
        assert.equal(job.txStatus, "pending", "status should be pending")
        // confirm initial job state
        let checkJob = await nv.AdminGetJob(job.jobId);
        assert.equal(checkJob.txStatus, "pending", "should be in pending state")
        // give it one minute to complete
        let finished = await nv.PollJob(job.jobId, TX_TIMEOUT);
        assert.equal(finished.txStatus, "complete", "should be in complete state")
        assert.equal(finished.txResult.address != null, true, "address should be set")
        assert.equal(finished.txResult.electionId != null, true, "electionId should be set")
        assert.equal(finished.txResult.tx != null, true, "tx should be set")
        electionId = finished.txResult.electionId;
        console.log(`electionId: ${electionId}`)
        await assertElectionValues(electionId, { authType: "email" })
    })
    it('should upload emails', async () => {
        let res = await nv.AddVoterEmails(electionId, [email] );
        assert.equal(res.count, 1, "should have a count of 1")
    })
})

describe(`End to End Election with Admin Keys`, function () {

    let electionId;
    let voterKeys;
    let token;

    let settings = {
        autoActivate: true,
        continuousReveal: false,
        metadataLocation: "QmZaKMumAXXLkHPBV1ZdAVsF4XCUYz1Jp5PY3oEsLrKoy6",
        allowUpdates: false,
        requireProof: true,
        test: true,
        authType: "admin",
        network: "netvote"
    }

    it('should get elections', async () => {
        let res = await nv.GetElectionsList();
        assert.equal(res.elections != null, true, "should get a list of elections")
    })

    it('should create election', async () => {
        let job = await nv.CreateElection(settings);

        assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))
        assert.equal(job.txStatus, "pending", "status should be pending")

        // confirm initial job state
        let checkJob = await nv.AdminGetJob(job.jobId);
        assert.equal(checkJob.txStatus, "pending", "should be in pending state")

        // give it one minute to complete
        let finished = await nv.PollJob(job.jobId, TX_TIMEOUT);

        assert.equal(finished.txStatus, "complete", "should be in complete state")
        assert.equal(finished.txResult.address != null, true, "address should be set")
        assert.equal(finished.txResult.electionId != null, true, "electionId should be set")
        assert.equal(finished.txResult.tx != null, true, "tx should be set")

        electionId = finished.txResult.electionId;
        console.log(`electionId: ${electionId}`)
        await assertElectionState(electionId, (settings.autoActivate ? "voting" : "building"))
        await assertElectionValues(electionId, { authType: settings.authType })
    })

    if (!settings.autoActivate) {
        it('should activate election', async () => {
            let job = await nv.SetElectionStatus(electionId, {
                status: "voting"
            });
            assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))


            // confirm initial job state
            let checkJob = await nv.AdminGetJob(job.jobId);
            assert.equal(checkJob.txStatus, "pending", "should be in pending state")

            // give it TX_TIMEOUT to complete
            let finished = await nv.PollJob(job.jobId, TX_TIMEOUT);

            assert.equal(finished.txStatus, "complete", "should be in complete state")

            await assertElectionState(electionId, "voting")
        })
    }

    it('should stop election', async () => {
        let job = await nv.SetElectionStatus(electionId, {
            status: "stopped"
        });
        assert.equal(job.txStatus, "complete", "status should be complete")
        await assertElectionState(electionId, "stopped")
    })

    it('should resume election', async () => {
        let job = await nv.SetElectionStatus(electionId, {
            status: "voting"
        });
        assert.equal(job.txStatus, "complete", "status should be complete")
        await assertElectionState(electionId, "voting")
    })

    it('should get an auth token', async () => {
        let tok = await nv.CreateVoterJwt(electionId, "test123")
        assert.equal(tok.token != null, true, "should have a token")
        token = tok.token;
    })

    it('should cast a vote', async () => {
        let job;
        if (settings.requireProof) {
            job = await publicNv.CastSignedVote(electionId, token, VOTES.VOTE_0_0_0)
        } else {
            job = await publicNv.CastVote(electionId, token, VOTES.VOTE_0_0_0, "testproof")
        }
        assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))
        assert.equal(job.txStatus, "pending", "status should be pending")

        let res = await publicNv.PollJob(job.jobId, TX_TIMEOUT);
        assert.equal(res.txResult.tx != null, true, "tx should be defined")
        assert.equal(res.txStatus, "complete", "status should be complete")
    })

    it('should get vote transactions', async () => {
        let votes = await nv.GetVoteTransactions(electionId)
        assert.equal(votes.stats.complete, 1, "should have 1 complete vote")
        assert.equal(votes.transactions.length, 1, "should have one transaction")
    })

    it('should stop and close election', async () => {
        let stop = await nv.SetElectionStatus(electionId, {
            status: "stopped"
        });
        assert.equal(stop.txStatus, "complete", "status should be complete")

        let job = await nv.SetElectionStatus(electionId, {
            status: "closed"
        });
        assert.equal(job.jobId != null, true, "jobId should be present")


        // confirm initial job state
        let checkJob = await nv.AdminGetJob(job.jobId);
        assert.equal(checkJob.txStatus, "pending", "should be in pending state")

        // give it one minute to complete
        let finished = await nv.PollJob(job.jobId, TX_TIMEOUT);

        assert.equal(finished.txStatus, "complete", "should be in complete state")

        await assertElectionValues(electionId, { electionStatus: "closed", resultsAvailable: true })
    })

    it('should tally correctly', async () => {
        //TODO: implement
        let job = await publicNv.GetResults(electionId)
        assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))
        assert.equal(job.txStatus, "pending", "status should be pending")

        let res = await publicNv.PollJob(job.jobId, TX_TIMEOUT);
        assert.equal(res.txResult.results != null, true, "results should be defined")
        assert.equal(res.txStatus, "complete", "status should be complete")
    })

})


let options = [{
    autoActivate: false,
    continuousReveal: false,
    metadataLocation: "QmZaKMumAXXLkHPBV1ZdAVsF4XCUYz1Jp5PY3oEsLrKoy6",
    allowUpdates: false,
    requireProof: true,
    test: true,
    authType: "key",
    network: "netvote"
},
{
    autoActivate: true,
    continuousReveal: false,
    metadataLocation: "QmZaKMumAXXLkHPBV1ZdAVsF4XCUYz1Jp5PY3oEsLrKoy6",
    allowUpdates: false,
    requireProof: false,
    authType: "key",
    test: true,
    network: "netvote"
}
]

for (let o = 0; o < options.length; o++) {
    let settings = options[o];

    describe(`End to End Election requireProof=${settings.requireProof}`, function () {

        let electionId;
        let voterKeys;
        let tokens = [];

        it('should get elections', async () => {
            let res = await nv.GetElectionsList();
            assert.equal(res.elections != null, true, "should get a list of elections")
        })

        it('should create election', async () => {
            let job = await nv.CreateElection(settings);

            assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))
            assert.equal(job.txStatus, "pending", "status should be pending")

            // confirm initial job state
            let checkJob = await nv.AdminGetJob(job.jobId);
            assert.equal(checkJob.txStatus, "pending", "should be in pending state")

            // give it one minute to complete
            let finished = await nv.PollJob(job.jobId, TX_TIMEOUT);

            assert.equal(finished.txStatus, "complete", "should be in complete state")
            assert.equal(finished.txResult.address != null, true, "address should be set")
            assert.equal(finished.txResult.electionId != null, true, "electionId should be set")
            assert.equal(finished.txResult.tx != null, true, "tx should be set")

            electionId = finished.txResult.electionId;
            console.log(`electionId: ${electionId}`)
            await assertElectionState(electionId, (settings.autoActivate ? "voting" : "building"))
            await assertElectionValues(electionId, { authType: settings.authType })
        })

        it('should generate keys', async () => {
            let count = 5;
            let res = await nv.GenerateVoterKeys(electionId, count);
            assert.equal(res.keys != null, true, "should have keys populated")
            assert.equal(res.keys.length, count, `should have generated ${count} keys`);
            voterKeys = res.keys;
        })

        it('should add a key', async () => {
            let keys = ["test1", "test2", "test3"];
            let res = await nv.AddVoterKeys(electionId, keys);
            assert.equal(res.count, 3, "should have a count of 3")
        })

        if (!settings.autoActivate) {
            it('should activate election', async () => {
                let job = await nv.SetElectionStatus(electionId, {
                    status: "voting"
                });
                assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))


                // confirm initial job state
                let checkJob = await nv.AdminGetJob(job.jobId);
                assert.equal(checkJob.txStatus, "pending", "should be in pending state")

                // give it TX_TIMEOUT to complete
                let finished = await nv.PollJob(job.jobId, TX_TIMEOUT);

                assert.equal(finished.txStatus, "complete", "should be in complete state")

                await assertElectionState(electionId, "voting")
            })
        }

        it('should stop election', async () => {
            let job = await nv.SetElectionStatus(electionId, {
                status: "stopped"
            });
            assert.equal(job.txStatus, "complete", "status should be complete")
            await assertElectionState(electionId, "stopped")
        })

        it('should resume election', async () => {
            let job = await nv.SetElectionStatus(electionId, {
                status: "voting"
            });
            assert.equal(job.txStatus, "complete", "status should be complete")
            await assertElectionState(electionId, "voting")
        })

        it('should get an auth token with generated key', async () => {
            let tok = await publicNv.GetJwtToken(electionId, voterKeys[0])
            assert.equal(tok.token != null, true, "should have a token")
        })

        it('should get an auth token QR with generated key', async () => {
            let tok = await publicNv.GetJwtTokenQR(electionId, voterKeys[0])
            assert.equal(tok.qr != null, true, "should have a qr")
        })

        it('should get an auth token with uploaded key', async () => {
            let tok = await publicNv.GetJwtToken(electionId, "test1")
            assert.equal(tok.token != null, true, "should have a token")
            tokens.push(tok.token);
        })

        it('should check before vote', async () => {
            let tok = await publicNv.CheckVoter(electionId, "test1")
            assert.equal(tok.canVote, true, "should canVote")
            assert.equal(tok.voted, false, "should not have voted")
        })

        it('should cast a vote', async () => {
            let job;
            if (settings.requireProof) {
                job = await publicNv.CastSignedVote(electionId, tokens[0], VOTES.VOTE_0_0_0)
            } else {
                job = await publicNv.CastVote(electionId, tokens[0], VOTES.VOTE_0_0_0, "testproof")
            }
            assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))
            assert.equal(job.txStatus, "pending", "status should be pending")

            let res = await publicNv.PollJob(job.jobId, TX_TIMEOUT);
            assert.equal(res.txResult.tx != null, true, "tx should be defined")
            assert.equal(res.txStatus, "complete", "status should be complete")
        })

        it('should check after vote', async () => {
            let tok = await publicNv.CheckVoter(electionId, "test1")
            assert.equal(tok.canVote, settings.allowUpdates, "should canVote=" + settings.allowUpdates)
            assert.equal(tok.voted, true, "should have voted")
        })

        it('should get vote transactions', async () => {
            let votes = await nv.GetVoteTransactions(electionId)
            assert.equal(votes.stats.complete, 1, "should have 1 complete vote")
            assert.equal(votes.transactions.length, 1, "should have one transaction")
        })

        it('should stop and close election', async () => {
            let stop = await nv.SetElectionStatus(electionId, {
                status: "stopped"
            });
            assert.equal(stop.txStatus, "complete", "status should be complete")

            let job = await nv.SetElectionStatus(electionId, {
                status: "closed"
            });
            assert.equal(job.jobId != null, true, "jobId should be present")


            // confirm initial job state
            let checkJob = await nv.AdminGetJob(job.jobId);
            assert.equal(checkJob.txStatus, "pending", "should be in pending state")

            // give it one minute to complete
            let finished = await nv.PollJob(job.jobId, TX_TIMEOUT);

            assert.equal(finished.txStatus, "complete", "should be in complete state")

            await assertElectionValues(electionId, { electionStatus: "closed", resultsAvailable: true })
        })

        it('should tally correctly', async () => {
            //TODO: implement
            let job = await publicNv.GetResults(electionId)
            assert.equal(job.jobId != null, true, "jobId should be present: " + JSON.stringify(job))
            assert.equal(job.txStatus, "pending", "status should be pending")

            let res = await publicNv.PollJob(job.jobId, TX_TIMEOUT);
            assert.equal(res.txResult.results != null, true, "results should be defined")
            assert.equal(res.txStatus, "complete", "status should be complete")
        })

    })
}
