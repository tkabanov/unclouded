Feature: scenario:66670765-8958-4b53-a276-bea5cd06c2d0

  Scenario: scenario:66670765-8958-4b53-a276-bea5cd06c2d0
    Given workflow "66670765-8958-4b53-a276-bea5cd06c2d0" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
