Feature: scenario:13dcfa03-ed95-446d-95b3-15f8f4ac36d5

  Scenario: scenario:13dcfa03-ed95-446d-95b3-15f8f4ac36d5
    Given workflow "13dcfa03-ed95-446d-95b3-15f8f4ac36d5" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
