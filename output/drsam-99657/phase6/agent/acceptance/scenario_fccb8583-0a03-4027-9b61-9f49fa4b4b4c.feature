Feature: scenario:fccb8583-0a03-4027-9b61-9f49fa4b4b4c

  Scenario: scenario:fccb8583-0a03-4027-9b61-9f49fa4b4b4c
    Given workflow "fccb8583-0a03-4027-9b61-9f49fa4b4b4c" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
