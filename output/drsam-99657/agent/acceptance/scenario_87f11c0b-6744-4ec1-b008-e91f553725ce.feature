Feature: scenario:87f11c0b-6744-4ec1-b008-e91f553725ce

  Scenario: scenario:87f11c0b-6744-4ec1-b008-e91f553725ce
    Given workflow "87f11c0b-6744-4ec1-b008-e91f553725ce" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
