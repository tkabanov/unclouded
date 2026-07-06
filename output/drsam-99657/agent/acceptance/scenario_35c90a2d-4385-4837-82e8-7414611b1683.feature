Feature: scenario:35c90a2d-4385-4837-82e8-7414611b1683

  Scenario: scenario:35c90a2d-4385-4837-82e8-7414611b1683
    Given workflow "35c90a2d-4385-4837-82e8-7414611b1683" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
