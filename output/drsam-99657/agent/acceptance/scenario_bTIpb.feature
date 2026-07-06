Feature: scenario:bTIpb

  Scenario: scenario:bTIpb
    Given workflow "bTIpb" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
