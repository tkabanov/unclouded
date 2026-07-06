Feature: scenario:447d0630-3317-4e58-b945-3d430e11d497

  Scenario: scenario:447d0630-3317-4e58-b945-3d430e11d497
    Given workflow "447d0630-3317-4e58-b945-3d430e11d497" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
