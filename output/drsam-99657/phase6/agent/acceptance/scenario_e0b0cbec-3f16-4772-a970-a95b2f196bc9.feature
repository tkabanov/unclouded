Feature: scenario:e0b0cbec-3f16-4772-a970-a95b2f196bc9

  Scenario: scenario:e0b0cbec-3f16-4772-a970-a95b2f196bc9
    Given workflow "e0b0cbec-3f16-4772-a970-a95b2f196bc9" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
