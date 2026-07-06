Feature: scenario:8966e8cc-b169-4ab5-8ec9-2fc85de160e1

  Scenario: scenario:8966e8cc-b169-4ab5-8ec9-2fc85de160e1
    Given workflow "8966e8cc-b169-4ab5-8ec9-2fc85de160e1" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
