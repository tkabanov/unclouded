Feature: scenario:3cb4e7d7-f96d-46f8-9aa6-dd0981610767

  Scenario: scenario:3cb4e7d7-f96d-46f8-9aa6-dd0981610767
    Given workflow "3cb4e7d7-f96d-46f8-9aa6-dd0981610767" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
