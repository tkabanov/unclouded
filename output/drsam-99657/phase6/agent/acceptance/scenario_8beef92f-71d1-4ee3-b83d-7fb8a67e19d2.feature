Feature: scenario:8beef92f-71d1-4ee3-b83d-7fb8a67e19d2

  Scenario: scenario:8beef92f-71d1-4ee3-b83d-7fb8a67e19d2
    Given workflow "8beef92f-71d1-4ee3-b83d-7fb8a67e19d2" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
