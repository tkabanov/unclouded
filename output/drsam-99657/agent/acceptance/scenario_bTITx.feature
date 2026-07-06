Feature: scenario:bTITx

  Scenario: scenario:bTITx
    Given workflow "bTITx" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
