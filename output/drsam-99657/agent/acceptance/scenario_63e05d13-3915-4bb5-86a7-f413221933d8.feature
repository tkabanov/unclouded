Feature: scenario:63e05d13-3915-4bb5-86a7-f413221933d8

  Scenario: scenario:63e05d13-3915-4bb5-86a7-f413221933d8
    Given workflow "63e05d13-3915-4bb5-86a7-f413221933d8" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
