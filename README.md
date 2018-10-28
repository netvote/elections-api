Netvote API
===========
Netvote API

**Version:** 1.0.0

**License:** [GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)

[Find out more about Swagger](http://swagger.io)

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

### /admin/election
---
##### ***POST***
**Summary:** Create a new Election

**Description:** Create a new election and deploy as a smart contract

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Async Job Reference |
| 400 | Invalid input |

**Security**

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |
| apiKeyAuth | |

### /admin/election/{id}/status
---
##### ***POST***
**Summary:** Set status of existing Election

**Description:** This will transition the election to the specified state.

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Async Job Reference |
| 400 | Invalid input |
| 404 | Election not found |

**Security**

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |
| apiKeyAuth | |

### /admin/election/{id}/jwt
---
##### ***POST***
**Summary:** Set public JWT Key for voter authentication

**Description:** 

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Async Job Reference |
| 400 | Invalid input |
| 404 | Election not found |

**Security**

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |
| apiKeyAuth | |

### /admin/election/{id}/keys
---
##### ***POST***
**Summary:** Add or generate Voter Keys for election

**Description:** If count is populated, will generate and return those keys.  Otherwise, will upload base64-encoded sha256 keys found in the hashedKeys array.

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Key Result |
| 400 | Invalid input |
| 404 | Election not found |

**Security**

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |
| apiKeyAuth | |

### /admin/job/{id}
---
##### ***GET***
**Summary:** Retrieves the Async Job status (from create or set status actions)

**Description:** Only the admin who created the job may retrieve job status

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Key Result |
| 400 | Invalid input |
| 404 | Job not found |

**Security**

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |
| apiKeyAuth | |

### /admin/election/{id}/votes
---
##### ***GET***
**Summary:** Retrieves the list of encrypted votes and submission status from a database

**Description:** Returns each unique vote (updates are separate entries)

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Key Result |
| 400 | Invalid input |
| 404 | Job not found |

**Security**

| Security Schema | Scopes |
| --- | --- |
| basicAuth | |
| apiKeyAuth | |

### /public/election/{id}
---
##### ***GET***
**Summary:** Retrieves the election information for ballot display

**Description:** Anyone may retrieve basic election information

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Election Data |
| 400 | Invalid input |
| 404 | Election not found |

### /public/election/{id}/results
---
##### ***GET***
**Summary:** Starts an asynchronous Tally execution

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Job Start Object |
| 400 | Invalid input |
| 404 | Election not found |

### /public/job/{id}
---
##### ***GET***
**Summary:** Retrieves status or result of a Vote or Tally async Job

**Description:** 

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Async Tally Job |
| 400 | Invalid input |
| 404 | Job not found |

### /voter/election/{id}/auth/{format}
---
##### ***POST***
**Summary:** Exchanges voter Key for one-time use anonymized JWT token if netvoteKeyAuth is enabled for Election

**Description:** If format is QR, will additionally return JWT inside of a data-type URL for HTML display

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |
| format | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Async Tally Job |
| 400 | Invalid input |
| 404 | Job not found |

**Security**

| Security Schema | Scopes |
| --- | --- |
| bearerAuth | |
| apiKeyAuth | |

### /voter/election/{id}/vote
---
##### ***POST***
**Summary:** Casts a vote

**Description:** 

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path |  | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 200 | Async Vote Job |
| 400 | Invalid input |
| 404 | Job not found |

**Security**

| Security Schema | Scopes |
| --- | --- |
| bearerAuth | |
| apiKeyAuth | |
