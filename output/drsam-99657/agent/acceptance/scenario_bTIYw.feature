Feature: scenario:bTIYw

  Scenario: scenario:bTIYw
    Given workflow "bTIYw" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
