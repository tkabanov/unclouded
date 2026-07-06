Feature: scenario:fcc3f1c6-b897-4a61-89ba-46f24b915db2

  Scenario: scenario:fcc3f1c6-b897-4a61-89ba-46f24b915db2
    Given workflow "fcc3f1c6-b897-4a61-89ba-46f24b915db2" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
