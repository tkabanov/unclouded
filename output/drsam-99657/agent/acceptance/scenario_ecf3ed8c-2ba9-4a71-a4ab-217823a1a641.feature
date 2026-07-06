Feature: scenario:ecf3ed8c-2ba9-4a71-a4ab-217823a1a641

  Scenario: scenario:ecf3ed8c-2ba9-4a71-a4ab-217823a1a641
    Given workflow "ecf3ed8c-2ba9-4a71-a4ab-217823a1a641" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
