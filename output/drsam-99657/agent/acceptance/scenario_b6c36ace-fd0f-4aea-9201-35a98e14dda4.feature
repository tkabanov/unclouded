Feature: scenario:b6c36ace-fd0f-4aea-9201-35a98e14dda4

  Scenario: scenario:b6c36ace-fd0f-4aea-9201-35a98e14dda4
    Given workflow "b6c36ace-fd0f-4aea-9201-35a98e14dda4" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
