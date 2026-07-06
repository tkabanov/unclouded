Feature: scenario:be98f37d-1c39-4502-85d1-fc0597aaf105

  Scenario: scenario:be98f37d-1c39-4502-85d1-fc0597aaf105
    Given workflow "be98f37d-1c39-4502-85d1-fc0597aaf105" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
