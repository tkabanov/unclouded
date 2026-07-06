Feature: scenario:835ed2a2-f6d3-4d0d-ba89-25cecd260f0d

  Scenario: scenario:835ed2a2-f6d3-4d0d-ba89-25cecd260f0d
    Given workflow "835ed2a2-f6d3-4d0d-ba89-25cecd260f0d" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
