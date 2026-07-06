Feature: scenario:4c395bee-6b0e-4484-ad22-b1cee9651afc

  Scenario: scenario:4c395bee-6b0e-4484-ad22-b1cee9651afc
    Given workflow "4c395bee-6b0e-4484-ad22-b1cee9651afc" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
