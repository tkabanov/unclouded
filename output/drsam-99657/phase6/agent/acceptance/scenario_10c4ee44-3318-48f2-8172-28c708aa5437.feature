Feature: scenario:10c4ee44-3318-48f2-8172-28c708aa5437

  Scenario: scenario:10c4ee44-3318-48f2-8172-28c708aa5437
    Given workflow "10c4ee44-3318-48f2-8172-28c708aa5437" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
