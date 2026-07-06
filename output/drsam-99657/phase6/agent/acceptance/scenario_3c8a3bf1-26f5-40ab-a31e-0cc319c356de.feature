Feature: scenario:3c8a3bf1-26f5-40ab-a31e-0cc319c356de

  Scenario: scenario:3c8a3bf1-26f5-40ab-a31e-0cc319c356de
    Given workflow "3c8a3bf1-26f5-40ab-a31e-0cc319c356de" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
