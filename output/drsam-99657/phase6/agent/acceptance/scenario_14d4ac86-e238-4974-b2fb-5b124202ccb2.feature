Feature: scenario:14d4ac86-e238-4974-b2fb-5b124202ccb2

  Scenario: scenario:14d4ac86-e238-4974-b2fb-5b124202ccb2
    Given workflow "14d4ac86-e238-4974-b2fb-5b124202ccb2" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
