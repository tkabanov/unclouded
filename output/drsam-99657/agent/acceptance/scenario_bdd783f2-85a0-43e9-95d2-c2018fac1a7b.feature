Feature: scenario:bdd783f2-85a0-43e9-95d2-c2018fac1a7b

  Scenario: scenario:bdd783f2-85a0-43e9-95d2-c2018fac1a7b
    Given workflow "bdd783f2-85a0-43e9-95d2-c2018fac1a7b" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
