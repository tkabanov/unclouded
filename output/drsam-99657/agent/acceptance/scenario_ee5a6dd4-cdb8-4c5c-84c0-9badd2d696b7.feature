Feature: scenario:ee5a6dd4-cdb8-4c5c-84c0-9badd2d696b7

  Scenario: scenario:ee5a6dd4-cdb8-4c5c-84c0-9badd2d696b7
    Given workflow "ee5a6dd4-cdb8-4c5c-84c0-9badd2d696b7" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
