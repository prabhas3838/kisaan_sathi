Feature: Mandi Controller - Comprehensive Testing

  Background:
    Given an admin is logged in

  # --- ADD PRICE SCENARIOS ---
  Scenario: Admin successfully adds a new mandi price
    When the admin adds a price for "Tomato" at "Okhla Mandi" with price 3000 per quintal at location 28.5, 77.3
    Then the response status should be 201
    And the response should confirm success
    And the returned data should contain "Okhla Mandi"

  Scenario: Admin fails to add price with missing fields
    When the admin attempts to add a price without specifying the crop
    Then the response status should be 500 or 400
    And the error message should indicate validation failure

  # --- NEARBY SEARCH SCENARIOS ---
  Scenario: User searches for nearby mandis successfully using query params
    Given the admin has added a price for "Tomato" at "Okhla Mandi" with price 3000 per quintal at location 28.5, 77.3
    And a user is at location 28.55, 77.35
    When the user searches for mandis within 20 km
    Then the response status should be 200
    And the result list should contain "Okhla Mandi"
    And the distance to "Okhla Mandi" should be less than 20 km

  Scenario: User searches for nearby mandis using profile location (fallback)
    Given the admin has added a price for "Tomato" at "Okhla Mandi" with price 3000 per quintal at location 28.5, 77.3
    And a user has a profile location set to 28.55, 77.35
    When the user searches for nearby mandis without providing latitude and longitude
    Then the response status should be 200
    And the result list should contain "Okhla Mandi"

  Scenario: User searches for nearby mandis and results are sorted by distance
    Given the admin has added a price for "P1" at "Mandi Near" with price 100 at location 28.51, 77.31
    And the admin has added a price for "P2" at "Mandi Far" with price 100 at location 28.6, 77.4
    And a user is at location 28.5, 77.3
    When the user searches for mandis within 50 km
    Then the first result should be "Mandi Near"
    And the second result should be "Mandi Far"

  Scenario: User searches for nearby mandis but finds none
    Given a user is at location 12.0, 77.0
    When the user searches for mandis within 10 km
    Then the response status should be 200
    And the result list should be empty

  Scenario: User search fails without location map data
    When the user searches for nearby mandis without providing latitude and longitude
    Then the response status should be 400
    And the error message should contain "Latitude and Longitude required"

  # --- FILTER SEARCH SCENARIOS ---
  Scenario: User filters prices by crop
    Given the admin has added a price for "Onion" at "Gazipur Mandi" with price 2000 per quintal at location 28.6, 77.3
    When the user filters prices for crop "Onion"
    Then the response status should be 200
    And the response data should include "Onion" at "Gazipur Mandi"

  Scenario: User filters prices by location name
    Given the admin has added a price for "Potato" at "Azadpur Mandi" with price 1500 per quintal at location 28.7, 77.1
    When the user filters prices for location "Azadpur"
    Then the response data should include "Azadpur Mandi"

  # --- SORTING SCENARIOS ---
  Scenario: User sorts prices by price descending
    Given the admin has added a price for "Apple" at "Mandi A" with price 5000 per quintal at location 28.0, 77.0
    And the admin has added a price for "Apple" at "Mandi B" with price 6000 per quintal at location 28.1, 77.1
    When the user searches for "Apple" sorted by price descending
    Then the first result should be "Mandi B" with price 6000
    And the second result should be "Mandi A" with price 5000
