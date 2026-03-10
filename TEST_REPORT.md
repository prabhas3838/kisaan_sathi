# Comprehensive Test Report
**Project:** Farmer Marketplace Backend
**Date:** 2026-02-09

This document details the unit tests implemented by each group member, including the specific input data provided to the test and the expected output that was verified using actual application logic.

## 1. Student 1 – Authentication Feature (Jest/Supertest)
**Tool Used:** Jest (Backend - Integration)
**File Tested:** `src/routes/authRoutes.js`
**Test File:** `tests/login.test.js`

| Test Case | Input Data | Expected Output | Status |
| :--- | :--- | :--- | :--- |
| **Send OTP** | `POST /api/auth/send-otp` <br> `{ phone: "8888888888" }` | **200 OK** <br> Returns `{ success: true, otp: "..." }` | **PASS** |
| **Verify OTP** | `POST /api/auth/verify-otp` <br> `{ phone, otp }` | **200 OK** <br> `otpVerified` becomes `true`. | **PASS** |
| **Complete Signup (Set PIN)** | `POST /api/auth/signup-complete` <br> `{ phone, name, role, pin: "1234" }` | **201 Created** <br> Returns Token & User Profile. | **PASS** |
| **Login with Correct PIN** | `POST /api/auth/login` <br> `{ phone: "8888888888", pin: "1234" }` | **200 OK** <br> Returns Token. | **PASS** |
| **Login with Incorrect PIN** | `POST /api/auth/login` <br> `{ phone: "8888888888", pin: "0000" }` | **401 Unauthorized** <br> Message: "Invalid credentials" | **PASS** |

## 2. Student 2 – Deal Negotiation Logic (Jest Unit)
**Tool Used:** Jest (Unit Testing with Mocks)
**File Tested:** `src/controllers/dealController.js`
**Test File:** `tests/unit/controllers/dealController.test.js`

| Test Case | Input Data | Expected Output | Status |
| :--- | :--- | :--- | :--- |
| **Create Deal (Success)** | `createDeal()` request body: <br> `{ crop: "Wheat", buyerId: "buyer123", originalPrice: 100, quantityKg: 50 }` | **201 Created** <br> `deal` object returned with `status: "PENDING"` | **PASS** |
| **Make Offer (Success)** | `makeOffer()` request body: <br> `{ price: 90 }` for Deal ID `deal123` | **200 OK** <br> `currentOffer` becomes 90, added to `history`. | **PASS** |
| **Prevent Self-Acceptance** | `acceptOffer()` by User who made the last offer | **400 Bad Request** <br> Message: "You cannot accept your own offer." | **PASS** |
| **Reject Deal** | `rejectOffer()` on pending deal | **200 OK** <br> `status` becomes "REJECTED" | **PASS** |

## 3. Student 3 – Inventory Management (Cucumber BDD)
**Tool Used:** Cucumber.js (Behavior Driven Development)
**File Tested:** `features/inventory.feature`
**Steps File:** `features/step_definitions/inventory_steps.js`

| Scenario | Input Data (Steps) | Expected Output (Then) | Status |
| :--- | :--- | :--- | :--- |
| **Farmer Adds Crop** | **Given** a farmer is logged in <br> **When** the farmer adds "Wheat" with quantity 100 kg and price 50 | **Then** the inventory should contain "Wheat" with 100 kg | **PASS** |

## 4. Student 4 – Mandi Validation (Mocha + Chai)
**Tool Used:** Mocha + Chai (Assertion)
**File Tested:** `tests/student4/mandi_validation.test.js`

| Test Case | Input Data | Expected Output | Status |
| :--- | :--- | :--- | :--- |
| **Valid Mandi Data** | `{ name: "Azadpur", location: "Delhi", prices: [...] }` | Returns `true` | **PASS** |
| **Missing Mandi Name** | `{ location: "Delhi", prices: [...] }` | Returns `false` | **PASS** |
| **Invalid Prices Format** | `{ name: "Azadpur", prices: "invalid_string" }` | Returns `false` | **PASS** |

## 5. Student 5 – Performance Health Check (Autocannon)
**Tool Used:** Autocannon (Load Testing)
**Target:** Localhost Server (`http://localhost:5001`)

| Metric | Input Configuration | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Load Handling** | 10 concurrent connections, 5 seconds duration | 200 OK responses > 99% | **PASS** |
| **Latency Check** | continuous requests | Average Latency < 100ms | **PASS** |
| **Error Rate** | continuous requests | 0 Errors | **PASS** |

## 6. Mandi Controller (Cucumber - Extra)
**Tool Used:** Cucumber.js
**File Tested:** `src/controllers/mandiController.js`
**Feature File:** `features/mandi.feature`

| Scenario | Steps Verified | Status |
| :--- | :--- | :--- |
| **Admin Adds Price** | Admin login -> Add "Potato" price -> Verify success | **PASS** |
| **Nearby Search** | User at specific lat/lng -> Search 50km -> Find added Mandi | **PASS** |
| **Crop Filter** | Search "Potato" -> Find specific price entry | **PASS** |
