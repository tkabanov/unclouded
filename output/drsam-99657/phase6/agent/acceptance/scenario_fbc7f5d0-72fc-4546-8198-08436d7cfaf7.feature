Feature: scenario:fbc7f5d0-72fc-4546-8198-08436d7cfaf7

  Scenario: scenario:fbc7f5d0-72fc-4546-8198-08436d7cfaf7
    Given workflow "fbc7f5d0-72fc-4546-8198-08436d7cfaf7" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
