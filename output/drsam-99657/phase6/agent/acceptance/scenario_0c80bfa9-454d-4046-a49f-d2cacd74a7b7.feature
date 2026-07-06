Feature: scenario:0c80bfa9-454d-4046-a49f-d2cacd74a7b7

  Scenario: scenario:0c80bfa9-454d-4046-a49f-d2cacd74a7b7
    Given workflow "0c80bfa9-454d-4046-a49f-d2cacd74a7b7" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
