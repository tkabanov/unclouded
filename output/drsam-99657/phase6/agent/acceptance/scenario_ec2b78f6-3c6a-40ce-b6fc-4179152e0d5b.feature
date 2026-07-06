Feature: scenario:ec2b78f6-3c6a-40ce-b6fc-4179152e0d5b

  Scenario: scenario:ec2b78f6-3c6a-40ce-b6fc-4179152e0d5b
    Given workflow "ec2b78f6-3c6a-40ce-b6fc-4179152e0d5b" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
