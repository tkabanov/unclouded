Feature: scenario:6ef268e7-62a5-4a30-836e-54bd00eb85de

  Scenario: scenario:6ef268e7-62a5-4a30-836e-54bd00eb85de
    Given workflow "6ef268e7-62a5-4a30-836e-54bd00eb85de" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
