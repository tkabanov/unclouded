Feature: scenario:5c73aa72-de1e-4ed5-bd3e-d2ca552e1aa6

  Scenario: scenario:5c73aa72-de1e-4ed5-bd3e-d2ca552e1aa6
    Given workflow "5c73aa72-de1e-4ed5-bd3e-d2ca552e1aa6" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
