Feature: scenario:a2e72910-457e-4a63-b335-44aadb893fc3

  Scenario: scenario:a2e72910-457e-4a63-b335-44aadb893fc3
    Given workflow "a2e72910-457e-4a63-b335-44aadb893fc3" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
