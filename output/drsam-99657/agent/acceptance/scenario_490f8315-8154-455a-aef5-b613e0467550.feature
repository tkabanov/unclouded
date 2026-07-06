Feature: scenario:490f8315-8154-455a-aef5-b613e0467550

  Scenario: scenario:490f8315-8154-455a-aef5-b613e0467550
    Given workflow "490f8315-8154-455a-aef5-b613e0467550" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
