Feature: Inventory Management

  Scenario: Farmer adds a crop to inventory
    Given a farmer is logged in
    When the farmer adds "Wheat" with quantity 100 kg and price 50
    Then the inventory should contain "Wheat" with 100 kg
