Feature: scenario:d81eb9ac-c335-49b4-8c31-353dd7688e27

  Scenario: scenario:d81eb9ac-c335-49b4-8c31-353dd7688e27
    Given workflow "d81eb9ac-c335-49b4-8c31-353dd7688e27" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
