Feature: scenario:912893d7-4123-4de7-b2a8-8eebc2ed00b5

  Scenario: scenario:912893d7-4123-4de7-b2a8-8eebc2ed00b5
    Given workflow "912893d7-4123-4de7-b2a8-8eebc2ed00b5" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
