# Mandi Controller Exclusive Test Report
**Project:** Farmer Marketplace Backend
**Module:** Mandi Controller
**Tool:** Cucumber.js (BDD)
**Date:** 2026-02-09

This report focuses exclusively on the testing of the `mandiController.js`, covering all features including price management, geospatial search (with advanced scenarios), filtering, and validation.

## Test Summary
- **Total Scenarios:** 10
- **Total Steps:** 38
- **Status:** **ALL PASS**

## Detailed Test Cases

### 1. Add Mandi Price (Admin)
| Scenario | Steps Executed | Status |
| :--- | :--- | :--- |
| **Success Case** | 1. Admin logs in (OTP flow) <br> 2. Adds "Tomato" at "Okhla Mandi" (Price: 3000) <br> 3. Verify Response 201 Created | **PASS** |
| **Validation Failure** | 1. Admin adds price without `crop` field <br> 2. Verify Response 500/400 <br> 3. Check error message for "validation failed" | **PASS** |

### 2. Nearby Mandi Search (Deep Dive)
| Scenario | Steps Executed | Status |
| :--- | :--- | :--- |
| **Standard Search** | 1. Seed "Okhla Mandi" at [77.3, 28.5] <br> 2. User at [77.35, 28.55] searches within 20km <br> 3. Verify "Okhla Mandi" found <br> 4. Verify distance < 20km | **PASS** |
| **Profile Location Fallback** | 1. User has NO query params <br> 2. User profile set to [77.35, 28.55] <br> 3. Verify "Okhla Mandi" found using profile location | **PASS** |
| **Sorting by Distance** | 1. Seed "Mandi Near" (1km) and "Mandi Far" (10km) <br> 2. Search within 50km <br> 3. Verify Result 1 is "Mandi Near" <br> 4. Verify Result 2 is "Mandi Far" | **PASS** |
| **No Results** | 1. User at [77.0, 12.0] (Far away) <br> 2. Searches within 10km <br> 3. Verify result list is empty | **PASS** |
| **Missing Location Error** | 1. User searches without params AND without profile location <br> 2. Verify Response 400 | **PASS** |

### 3. Filter & Sort
| Scenario | Steps Executed | Status |
| :--- | :--- | :--- |
| **Filter by Crop** | 1. Seed "Onion" at "Gazipur" <br> 2. Search crop="Onion" <br> 3. Verify result contains "Onion" | **PASS** |
| **Filter by Location** | 1. Seed "Potato" at "Azadpur" <br> 2. Search location="Azadpur" <br> 3. Verify result contains "Azadpur Mandi" | **PASS** |
| **Sort by Price** | 1. Seed "Apple" at Mandi A (5000) & Mandi B (6000) <br> 2. Search "Apple" with sort="price_desc" <br> 3. Verify order: Mandi B (6000) -> Mandi A (5000) | **PASS** |
