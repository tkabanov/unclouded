Feature: scenario:27bbb170-aa1a-46fb-a946-079918d3097b

  Scenario: scenario:27bbb170-aa1a-46fb-a946-079918d3097b
    Given workflow "27bbb170-aa1a-46fb-a946-079918d3097b" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
