Feature: scenario:0e6c1c66-480f-4058-8a1f-0eb582f05f6d

  Scenario: scenario:0e6c1c66-480f-4058-8a1f-0eb582f05f6d
    Given workflow "0e6c1c66-480f-4058-8a1f-0eb582f05f6d" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
