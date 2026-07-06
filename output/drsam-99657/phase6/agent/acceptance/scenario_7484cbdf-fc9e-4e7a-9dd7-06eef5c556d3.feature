Feature: scenario:7484cbdf-fc9e-4e7a-9dd7-06eef5c556d3

  Scenario: scenario:7484cbdf-fc9e-4e7a-9dd7-06eef5c556d3
    Given workflow "7484cbdf-fc9e-4e7a-9dd7-06eef5c556d3" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
