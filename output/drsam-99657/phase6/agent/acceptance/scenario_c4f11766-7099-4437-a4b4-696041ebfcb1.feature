Feature: scenario:c4f11766-7099-4437-a4b4-696041ebfcb1

  Scenario: scenario:c4f11766-7099-4437-a4b4-696041ebfcb1
    Given workflow "c4f11766-7099-4437-a4b4-696041ebfcb1" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
