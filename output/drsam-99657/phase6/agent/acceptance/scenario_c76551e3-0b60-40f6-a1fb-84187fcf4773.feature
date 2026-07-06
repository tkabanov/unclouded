Feature: scenario:c76551e3-0b60-40f6-a1fb-84187fcf4773

  Scenario: scenario:c76551e3-0b60-40f6-a1fb-84187fcf4773
    Given workflow "c76551e3-0b60-40f6-a1fb-84187fcf4773" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
