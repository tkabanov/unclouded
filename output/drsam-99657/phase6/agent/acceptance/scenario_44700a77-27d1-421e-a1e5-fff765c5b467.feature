Feature: scenario:44700a77-27d1-421e-a1e5-fff765c5b467

  Scenario: scenario:44700a77-27d1-421e-a1e5-fff765c5b467
    Given workflow "44700a77-27d1-421e-a1e5-fff765c5b467" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
