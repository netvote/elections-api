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