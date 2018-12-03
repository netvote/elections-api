module.exports.ERROR_TYPES = {
    BAD_TOKEN: {
        errorType: "BAD_TOKEN",
        code: 403,
        message: "Could not authenticate this token"
    },
    NOT_FOUND: {
        errorType: "NOT_FOUND",
        code: 404,
        message: "Could not find resource"
    },
    VOTING_WINDOW: {
        errorType: "VOTING_WINDOW",
        code: 409,
        message: "Voting window is not open for this election"
    },
    VOTE_VALIDATION: {
        errorType: "VOTE_VALIDATION",
        code: 409,
        message: "Vote is not valid"
    },
    PROOF_VALIDATION: {
        errorType: "PROOF_VALIDATION", 
        code: 409,
        message: "Proof is not valid"
    },
    INVALID_AUTH_TYPE: {
        errorType: "INVALID_AUTH_TYPE",
        code: 400,
        message: "Non-configured Auth Type was used for election"
    },
    INVALID_TOKEN_FORMAT: {
        errorType: "INVALID_TOKEN_FORMAT",
        code: 400,
        message: "Format must be either \"jwt\" or \"qr\""
    }
}

