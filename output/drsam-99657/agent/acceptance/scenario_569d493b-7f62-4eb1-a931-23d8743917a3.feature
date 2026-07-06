Feature: scenario:569d493b-7f62-4eb1-a931-23d8743917a3

  Scenario: scenario:569d493b-7f62-4eb1-a931-23d8743917a3
    Given workflow "569d493b-7f62-4eb1-a931-23d8743917a3" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
