Feature: scenario:ea8cf7c3-196d-408e-a86d-e2c2d6ccb5d5

  Scenario: scenario:ea8cf7c3-196d-408e-a86d-e2c2d6ccb5d5
    Given workflow "ea8cf7c3-196d-408e-a86d-e2c2d6ccb5d5" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
