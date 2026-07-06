Feature: scenario:72569cc9-ea60-4895-bef7-d25063e32a07

  Scenario: scenario:72569cc9-ea60-4895-bef7-d25063e32a07
    Given workflow "72569cc9-ea60-4895-bef7-d25063e32a07" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
