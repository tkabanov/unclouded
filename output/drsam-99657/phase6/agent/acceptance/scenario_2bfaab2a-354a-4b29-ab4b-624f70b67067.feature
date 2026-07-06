Feature: scenario:2bfaab2a-354a-4b29-ab4b-624f70b67067

  Scenario: scenario:2bfaab2a-354a-4b29-ab4b-624f70b67067
    Given workflow "2bfaab2a-354a-4b29-ab4b-624f70b67067" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
