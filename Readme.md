# SALTO CloudWorks API Testing Strategy
## QA Automation Assessment Implementation

## Overview
This document outlines the test automation strategy and implementation for SALTO CloudWorks API access control system, focusing on license plate-based authentication.

## 1. Introduction
### 1.1 Purpose
In the example, the system provides APIs to manage vehicle access control using license plates. The main components are (in hierarchical order):

1. Collection: Represents the facility (e.g. hotel, dormitory)
   - Top-level container for all other components
   
2. Lock: Physical access control device with camera
   
3. Access Group: Group linking users to locks and schedules
   - Contains references to Locks, Accessors and Schedules
   
4. Accessor: User who can have credentials
   - Can belong to Access Groups
   
5. Credential: License plate of the vehicle
   - Belongs to an Accessor
   
6. Schedule: Allowed access schedules
   - Belongs to an Access Group

Note: When cleaning up resources, they must be deleted in reverse order (Credentials first, Collection last) due to dependencies.

### 1.1 Main Endpoints in assessment PDF
- Auth: POST https://identity-acc.eu.my-clay.com/connect/token
- Collections: POST /v1.2/collections 
- Locks: POST /v1.2/locks
- Access Groups: POST /v1.2/access_groups
- License Plates: POST /v1.2/collections/{id}/locks/{id}/access/license_plates

## 2. Test Environment
### 2.1 API Endpoints
- Base URL: https://clp-accept-hardware.my-clay.com
- Authentication URL: https://identity-acc.eu.my-clay.com/connect/token
- API Version: v1.2

### 2.2 Authentication Details
- Auth Type: OAuth2 (Client Credentials)
- Client ID: ad8bad31-764d-41fd-bccb-8a639907ba8a
- Required Scopes: core_api.full core_api.license_plate

## Test Strategy

### 1. Core Testing Focus Areas
- Authentication & Authorization flows
- Access Control setup for car's license plate and access validation  
- Security testing, some cases for cover very basic security features like token expiration and blocked accessors and credentials.
- Validation of required headers (CLP-Collection-Id)
- Cross-collection access prevention
- Error handling, based on error codes returned by the API.
- Data cleanup in inverse order of creation, with conditional cleanup based on the response of the previous request.

### 2. End-to-End Test Scenarios

Plenty of tests can be created, but for the sake of time and scope, I will focus on the main Happy Path and some Unhappy Paths:

Note: Ill use random numbers combination variables for license plate for save time.

Feature: Vehicle License Plate Access Control

Scenario: Configure Successful access for a vehicle Happy Path (low level of detail)
  Given user have a valid authentication token
  When user create a new collection "Parking Test"
  And user register a lock with license plate camera using activation code "014FCA0A000071"
  And user create an access group with time schedule
  And user add the lock to the access group
  And user create a new accessor in the access group
  And user add a license plate (example "ABC123987") to the access configuration
  Then the license plate should be authorized for access
  And user can verify access is granted for license plate (example "ABC123987")

Scenario: Vehicle access verification - Outside Schedule Unhappy Path
  Given a vehicle with license plate (example "ABC123987") is registered
  And the current time is outside allowed schedule
  When the system reads the license plate (example "ABC123987")
  Then access should be denied
  And the response should indicate "access_granted": false

Scenario: Vehicle access verification - Unregistered Unhappy Path
  Given the access control system is configured
  When the system reads an unregistered license plate (example "XYZ999")
  Then access should be denied
  And the response should indicate "access_granted": false

Scenario: Vehicle access verification - Blocked Accessor Unhappy Path
  Given a vehicle with license plate (example "ABC123987") is registered
  And the accessor is blocked
  When the system reads the license plate (example "ABC123987")
  Then access should be denied
  And the response should indicate "access_granted": false
  And the response should include reason "blocked_accessor"

Scenario: Vehicle access verification - Blocked Credential Unhappy Path
  Given a vehicle with license plate (example "ABC123987") is registered
  And the license plate credential is blocked
  When the system reads the license plate (example "ABC123987")
  Then access should be denied
  And the response should indicate "access_granted": false
  And the response should include reason "blocked_credential"

Feature: Access Control Security

Scenario: Token Expiration Unhappy Path
  Given user have an expired authentication token
  When user try to access any protected endpoint
  Then user should receive a 401 Unauthorized response
  And the response should include a "Token expired" message

Scenario: Cross-Collection Access Attempt Unhappy Path
  Given user have a configured lock in Collection A with an accessor
  And user have another Collection B
  When user try to access the lock from Collection A using Collection B's ID
  Then user should receive a 403 Forbidden response

Scenario: Invalid Collection Headers CLP-Collection-Id missed Unhappy Path
  Given user have a configured lock with an accessor
  And the accessor has license plate access configured
  When user try to verify the license plate access without the CLP-Collection-Id header
  Then user should receive a 403 Forbidden response


### 3. Test Implementation Approach
1. Authentication Flow
   - Obtain access token
   - Validate token expiration
   - Create a new collection
   - Register a lock with license plate camera
   - Create an access group with time schedule
   - Add the lock to the access group
   - Create a new accessor in the access group
   - Add a license plate to the access configuration
   - Verify access is granted

### 3.2 Access Verification Tests
1. Valid Access Scenarios
   - Valid license plate during allowed time
   - Access within schedule
   - Proper collection membership

2. Invalid Access Scenarios
   - Blocked license plate
   - Outside schedule hours
   - Invalid collection
   - Expired access

## 4. Test Data Management

### 4.1 Required Test Data
- Collection IDs
- Lock activation codes
- License plate numbers
- Time schedules
- Access groups

### 4.2 Data Cleanup
- Remove accessors and their credentials
- Delete license plate configurations
- Remove access groups and schedules
- Delete locks
- Remove collections

## 5. API Endpoints Overview

### 5.1 Authentication
- **POST** `/connect/token`
  - Obtaining the access token
  - Used in: All flows for authentication

### 5.2 Base Configuration
1. **Collections**
   - **POST** `/v1.2/collections`
     - Create new collection
     - Minimum payload: `{ "customer_reference": "string" }`
   - **DELETE** `/v1.2/collections/{id}`
     - Cleanup collection
   - **GET** `/v1.2/collections`
     - List collections
     - Used in: Verification and cleanup

2. **Locks**
   - **POST** `/v1.2/locks`
     - Register lock with camera
     - Required payload: 
       ```json
       {
         "customer_reference": "string",
         "activation_code": "string",
         "collection_id": "uuid",
         "license_plate_camera": true
       }
       ```
   - **DELETE** `/v1.2/locks/{id}`
     - Cleanup lock
   - **GET** `/v1.2/collections/{collection_id}/locks`
     - List locks in collection
     - Used in: Verification after creation

### 5.3 Access Management
1. **Access Groups**
   - **POST** `/v1.2/access_groups`
     - Create access group
     - Link accessors to locks
   - **DELETE** `/v1.2/access_groups/{id}`
     - Cleanup group
   - **PATCH** `/v1.2/access_groups/{access_group_id}/locks`
     - Add locks to access group
   - **GET** `/v1.2/access_groups/{access_group_id}/locks`
     - Verify locks in access group
   - **PATCH** `/v1.2/access_groups/{access_group_id}/accessors`
     - Add accessors to access group
   - **GET** `/v1.2/access_groups/{access_group_id}/accessors`
     - Verify accessors in access group

2. **Time Schedules**
   - **POST** `/v1.2/access_groups/{id}/time_schedules`
     - Configure allowed schedules
     - Used in: Access outside schedule test

3. **Accessors**
   - **POST** `/v1.2/accessors`
     - Crear usuario
   - **PATCH** `/v1.2/accessors/{id}`
     - Block/unblock accessor
     - Used in: Blocked accessor test
   - **GET** `/v1.2/accessors`
     - List accessors
     - Used in: Verification and cleanup

### 5.4 License Plates
1. **Registration**
   - **POST** `/v1.2/accessors/{id}/license_plates`
     - Register plate for an accessor
   - **DELETE** `/v1.2/accessors/{id}/license_plates/{id}`
     - Delete plate registration
   - **GET** `/v1.2/accessors/{accessor_id}/license_plates`
     - List plates for an accessor
     - Used in: Verification after creation

2. **Verification**
   - **POST** `/v1.2/collections/{id}/locks/{id}/access/license_plates/{plate}`
     - Verify plate access
     - Required header: `CLP-Collection-Id`
     - Used in: All access verification tests
     - Mocked in Postman Tests as assessment mentions.

## 6. Error Handling Tests

### 6.1 Expected Errors
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

### 6.2 Error Scenarios
1. Authentication Errors
   - Invalid credentials
   - Expired tokens
   - Invalid scopes

2. Access Control Errors
   - Invalid license plates
   - Blocked access
   - Invalid schedules

### 6.3 Mock Strategy
- Simulating access_granted responses using Postman Tests as assessment mentions.

## 7. Running the Tests

### 7.1 Prerequisites
- Node.js (v12 or higher)
- npm (Node Package Manager)
- Postman collections and environment files in the root directory

### 7.2 Installation
1. Install dependencies:
```bash
npm install
```

### 7.3 Running Tests
Execute all test collections in sequence:
```bash
npm test
```

### 7.4 Test Execution Order
1. Authentication Flow
   - Token Expiration Tests
2. Happy Path Flow
   - Configure Successful Vehicle Access
3. Unhappy Path Flows
   - Blocked Credential Verification
   - Blocked Accessor Verification
   - Outside Schedule Verification
   - Unregistered Plate Verification
   - Cross Collection Access
   - Missing Headers Validation

### 7.5 Troubleshooting
If tests fail, check:
1. Environment variables are properly set
2. API endpoints are accessible
3. Authentication credentials are valid
4. Collection files are in the root directory