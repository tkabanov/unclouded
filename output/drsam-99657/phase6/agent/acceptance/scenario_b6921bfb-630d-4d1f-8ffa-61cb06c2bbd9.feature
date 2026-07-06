Feature: scenario:b6921bfb-630d-4d1f-8ffa-61cb06c2bbd9

  Scenario: scenario:b6921bfb-630d-4d1f-8ffa-61cb06c2bbd9
    Given workflow "b6921bfb-630d-4d1f-8ffa-61cb06c2bbd9" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
