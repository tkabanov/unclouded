Feature: scenario:2740417a-5844-47c4-8067-2cc175ce23f0

  Scenario: scenario:2740417a-5844-47c4-8067-2cc175ce23f0
    Given workflow "2740417a-5844-47c4-8067-2cc175ce23f0" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
