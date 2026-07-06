Feature: scenario:9d1599d2-6110-44bb-87f8-439f167e9701

  Scenario: scenario:9d1599d2-6110-44bb-87f8-439f167e9701
    Given workflow "9d1599d2-6110-44bb-87f8-439f167e9701" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
