Feature: scenario:6ea8c2d7-e6b4-44bd-a84d-eedb224cd054

  Scenario: scenario:6ea8c2d7-e6b4-44bd-a84d-eedb224cd054
    Given workflow "6ea8c2d7-e6b4-44bd-a84d-eedb224cd054" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
