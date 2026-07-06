Feature: scenario:11997876-b024-48b2-92ee-13cec914cf01

  Scenario: scenario:11997876-b024-48b2-92ee-13cec914cf01
    Given workflow "11997876-b024-48b2-92ee-13cec914cf01" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
