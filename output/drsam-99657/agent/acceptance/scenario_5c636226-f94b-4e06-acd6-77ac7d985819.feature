Feature: scenario:5c636226-f94b-4e06-acd6-77ac7d985819

  Scenario: scenario:5c636226-f94b-4e06-acd6-77ac7d985819
    Given workflow "5c636226-f94b-4e06-acd6-77ac7d985819" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
