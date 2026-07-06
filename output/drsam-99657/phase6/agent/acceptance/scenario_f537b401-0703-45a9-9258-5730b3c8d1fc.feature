Feature: scenario:f537b401-0703-45a9-9258-5730b3c8d1fc

  Scenario: scenario:f537b401-0703-45a9-9258-5730b3c8d1fc
    Given workflow "f537b401-0703-45a9-9258-5730b3c8d1fc" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
