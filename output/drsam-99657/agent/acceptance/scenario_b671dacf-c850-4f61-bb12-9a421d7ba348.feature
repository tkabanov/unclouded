Feature: scenario:b671dacf-c850-4f61-bb12-9a421d7ba348

  Scenario: scenario:b671dacf-c850-4f61-bb12-9a421d7ba348
    Given workflow "b671dacf-c850-4f61-bb12-9a421d7ba348" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
