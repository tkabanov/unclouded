Feature: scenario:dbbd1796-67cd-45dd-9a52-400fd553367f

  Scenario: scenario:dbbd1796-67cd-45dd-9a52-400fd553367f
    Given workflow "dbbd1796-67cd-45dd-9a52-400fd553367f" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
