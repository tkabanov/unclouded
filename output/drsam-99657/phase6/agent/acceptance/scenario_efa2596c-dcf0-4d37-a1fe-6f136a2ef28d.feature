Feature: scenario:efa2596c-dcf0-4d37-a1fe-6f136a2ef28d

  Scenario: scenario:efa2596c-dcf0-4d37-a1fe-6f136a2ef28d
    Given workflow "efa2596c-dcf0-4d37-a1fe-6f136a2ef28d" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
