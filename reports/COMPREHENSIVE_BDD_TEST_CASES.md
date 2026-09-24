# OSTTRA Markit EQT Trade Blotter: Complete BDD Step-Parity Regression Checklist Report

This BDD Test Case Specification acts as both the checklist index and the dynamic test specification for verifying feature parity between the legacy Google Web Toolkit (GWT) Old UI and the modern ag-Grid New UI on DemoB.

---

## 🏛️ Part 1: Text Search & Alphanumeric Identifiers

Scenario Outline: Exact and Contains Alphanumeric Search Parity on <FieldLabel>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the criteria field "<FieldLabel>"
  And inputs the search value "<SearchValue>"
  And sets the Contains checkbox matching to "<ContainsMode>"
  And clicks the "Apply" filter button
  Then both legacy GWT and ag-Grid must retrieve identical records

  Examples:
    | Scenario ID   | FieldLabel                         | SearchValue          | ContainsMode | VerifyColumn                       | ExpectedValue        |
    | Scenario 1.1  | Trade ID                           | TAUTO42132676_1      | false        | Trade ID                           | TAUTO42132676_1      |
    | Scenario 1.2  | Trade ID                           | TAUTO421             | true         | Trade ID                           | TAUTO42132676_1      |
    | Scenario 1.3  | Deal ID                            | S42132676_1          | false        | Deal ID                            | S42132676_1          |
    | Scenario 1.4  | Deal ID                            | S421326              | true         | Deal ID                            | S42132676_1          |
    | Scenario 1.5  | Counterparty Trade ID              | 42132676_1           | false        | Cpty Trade Id                      | 42132676_1           |
    | Scenario 1.6  | Counterparty Deal ID               | 42132676             | false        | Cpty Ref ID                        | 42132676             |
    | Scenario 1.7  | Bunched Order Block MW ID          | IFS_ALCT_05062026    | false        | Bunched Order Block MW ID          | IFS_ALCT_05062026    |
    | Scenario 1.8  | Counterparty Trade ID              | 42094954_1           | false        | Counterparty Trade ID              | 42094954_1           |
    | Scenario 1.9  | Counterparty Deal ID               | 42094954             | false        | Counterparty Deal ID               | 42094954             |
    | Scenario 1.10 | Counterparty Allocation Deal ID    | CPTY_AL_70           | false        | Counterparty Allocation Deal ID    | CPTY_AL_70           |
    | Scenario 1.11 | Selective Netting ID               | NET_9082             | false        | Selective Netting ID               | NET_9082             |
    | Scenario 1.12 | Netting String                     | NET_STR_ABC          | false        | Netting String                     | NET_STR_ABC          |
    | Scenario 1.13 | Clearing House Trade ID            | CH_TX_881            | false        | Clearing House Trade ID            | CH_TX_881            |
    | Scenario 1.14 | USI                                | USI_10029834         | false        | USI                                | USI_10029834         |
    | Scenario 1.15 | USI Issuer                         | OSTTRA_ISSUER        | false        | USI Issuer                         | OSTTRA_ISSUER        |
    | Scenario 1.16 | Cleared Trade USI                  | CL_USI_9082          | false        | Cleared Trade USI                  | CL_USI_9082          |
    | Scenario 1.17 | Cleared Trade USI Issuer           | CME_ISSUER           | false        | Cleared Trade USI Issuer           | CME_ISSUER           |
    | Scenario 1.18 | DTCC Warehouse TRI                 | DTCC_TRI_011         | false        | DTCC Warehouse TRI                 | DTCC_TRI_011         |
    | Scenario 1.19 | Associated Trade Id                | ASSOC_TX_12          | false        | Associated Trade Id                | ASSOC_TX_12          |
    | Scenario 1.20 | Block SEF Trade ID                 | SEF_BLOCK_3          | false        | Block SEF Trade ID                 | SEF_BLOCK_3          |
    | Scenario 1.21 | Block USI                          | BLK_USI_90           | false        | Block USI                          | BLK_USI_90           |
    | Scenario 1.22 | Block USI Issuer                   | BLK_ISSUER_1         | false        | Block USI Issuer                   | BLK_ISSUER_1         |
    | Scenario 1.23 | Block UTI                          | BLK_UTI_02           | false        | Block UTI                          | BLK_UTI_02           |
    | Scenario 1.24 | Block UTI Issuer                   | BLK_UTI_IS_2         | false        | Block UTI Issuer                   | BLK_UTI_IS_2         |
    | Scenario 1.25 | SEF Trade ID                       | SEF_TX_09            | false        | SEF Trade ID                       | SEF_TX_09            |
    | Scenario 1.26 | Package Name                       | PKG_SWAP_CREDIT      | false        | Package Name                       | PKG_SWAP_CREDIT      |
    | Scenario 1.27 | Package ID                         | PKG_501              | false        | Package ID                         | PKG_501              |
    | Scenario 1.28 | Match Id                           | MATCH_9011           | false        | Match Id                           | MATCH_9011           |
    | Scenario 1.29 | My Replaced Trade Id               | REPL_TX_442          | false        | My Replaced Trade Id               | REPL_TX_442          |
    | Scenario 1.30 | Post Clearing Batch ID             | POST_CLR_992         | false        | Post Clearing Batch ID             | POST_CLR_992         |
    | Scenario 1.31 | Post Clearing Activity Type        | NOVATION_POST        | false        | Post Clearing Activity Type        | NOVATION_POST        |
    | Scenario 1.32 | Post Clearing Sub-Category         | CL_SUB_901           | false        | Post Clearing Sub-Category         | CL_SUB_901           |
    | Scenario 1.33 | Deal ID(PDF Digitized)             | DIG_DL_40            | false        | Deal ID(PDF Digitized)             | DIG_DL_40            |
    | Scenario 1.34 | Trade ID(PDF Digitized)            | DIG_TX_40            | false        | Trade ID(PDF Digitized)            | DIG_TX_40            |
    | Scenario 1.35 | Package Trade Identifier           | PKG_TR_ID_882        | false        | Package Trade Identifier           | PKG_TR_ID_882        |
    | Scenario 1.36 | Multi Deal Id                      | DL_11,DL_12,DL_13    | false        | Deal ID                            | DL_11                |
    | Scenario 1.37 | UPI                                | UPI_9012873          | false        | UPI                                | UPI_9012873          |

---

## 📅 Part 2: Date Boundaries & Dynamic Offset Formulas

Scenario Outline: Date Range and Offset Formula Parity on <DateField>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the date field "<DateField>"
  And inputs the From Boundary Date as "<FromValue>"
  And inputs the To Boundary Date as "<ToValue>"
  And clicks the "Apply" filter button
  Then the system must extract matched records on both GWT and ag-Grid
  And every retrieved trade date must strictly fall within "<ExpectedStartDate>" and "<ExpectedEndDate>"

  Examples:
    | Scenario ID   | DateField                       | FromValue   | ToValue     | ExpectedStartDate | ExpectedEndDate |
    | Scenario 2.1  | Trade Date                      | 12-Aug-2026                     | 12-Aug-2026 | 12-Aug-2026       | 12-Aug-2026     |
    | Scenario 2.2  | Maturity Date                   | 27-Dec-2027 | 27-Dec-2027 | 27-Dec-2027       | 27-Dec-2027     |
    | Scenario 2.3  | Last Activity Date              | 13-Aug-2026 | 13-Aug-2026 | 13-Aug-2026       | 13-Aug-2026     |

---

## ⚙️ Part 3: Workflow, Status, and Tree Checklist Selectors

Scenario Outline: Multi-Select Category Dropdown Value Parity on <FilterLabel>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the dropdown selector "<FilterLabel>"
  And selects the dropdown option value "<SelectedValue>"
  And clicks the "Apply" filter button
  Then both legacy GWT and modern ag-Grid must render identical trade records
  And the column "<VerifyColumn>" must read "<ExpectedValue>" in all matched rows

  Examples:
    | Scenario ID   | FilterLabel                  | SelectedValue          | VerifyColumn                  | ExpectedValue          |
    | Scenario 3.1  | Workflow                     | Confirmations          | Workflow                      | Confirmations          |
    | Scenario 3.2  | Workflow                     | Novations              | Workflow                      | Novations              |
    | Scenario 3.3  | Clearing Status              | Cleared                | Clearing Status              | Cleared                  |
    | Scenario 3.4  | Clearing Status              | Clearing Pending       | Clearing Status              | Clearing Pending        |
    | Scenario 3.5  | Reconciliation State         | Reconciled             | Reconciliation State         | Reconciled             |
    | Scenario 3.6  | Reconciliation State         | Unreconciled           | Reconciliation State         | Unreconciled           |
    | Scenario 3.7  | Intended for Clearing        | Yes                    | Intended for Clearing        | Yes                    |
    | Scenario 3.8  | Intended for Clearing        | No                     | Intended for Clearing        | No                     |
    | Scenario 3.9  | Document Status              | Doc(s) Req'd           | Doc Status                    | Doc(s) Req'd           |
    | Scenario 3.10 | Document Status              | Executed               | Doc Status                    | Executed               |
    | Scenario 3.11 | Folder                       | All Folders            | Folder                       | All Folders            |
    | Scenario 3.12 | Folder                       | Inbox                  | Folder                       | Inbox                  |
    | Scenario 3.13 | Source                       | MarkitWire             | Source                       | MarkitWire             |
    | Scenario 3.14 | Source                       | SEF                    | Source                       | SEF                    |
    | Scenario 3.15 | Novation Status              | Complete: STP          | Novation Status              | Complete: STP          |
    | Scenario 3.16 | Novation Status              | Pending: STP           | Novation Status              | Pending: STP           |
    | Scenario 3.17 | Transaction Acceptance Status | Accepted               | Transaction Acceptance Status | Accepted               |
    | Scenario 3.18 | Transaction Acceptance Status | Pending                | Transaction Acceptance Status | Pending                |
    | Scenario 3.19 | Sent?                        | Yes                    | Sent?                        | Yes                    |
    | Scenario 3.20 | Sent?                        | No                     | Sent?                        | No                     |
    | Scenario 3.21 | Settlement Agency Status     | Cleared                | Settlement Agency Status     | Cleared                |
    | Scenario 3.22 | Settlement Agency Status     | Pending                | Settlement Agency Status     | Pending                |
    | Scenario 3.23 | Is Package Trade             | Yes                    | Is Package Trade             | Yes                    |
    | Scenario 3.24 | Is Package Trade             | No                     | Is Package Trade             | No                     |
    | Scenario 3.25 | Broker Submitted Novation    | Yes                    | Broker Submitted Novation    | Yes                    |
    | Scenario 3.26 | Broker Submitted Novation    | No                     | Broker Submitted Novation    | No                     |
    | Scenario 3.27 | Status                       | CLEARED                | Status                        | CLEARED                |
    | Scenario 3.28 | Status                       | DISPUTED               | Status                        | DISPUTED               |

---

## 🏢 Part 4: Counterparty, Legal Entity & Broker Multi-Selects

Scenario Outline: Entity and Legal Identifier Filter Parity on <FilterLabel>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the dropdown selector "<FilterLabel>"
  And selects the dropdown option value "<EntityValue>"
  And clicks the "Apply" filter button
  Then both legacy GWT and modern ag-Grid must render identical trade records
  And the column "<VerifyColumn>" must read "<ExpectedValue>" in all matched rows

  Examples:
    | Scenario ID   | FilterLabel                  | EntityValue          | VerifyColumn                  | ExpectedValue          |
    | Scenario 4.1  | Counterparty                 | M.BANK   | Cpty(s)                       | M.BANK   |
    | Scenario 4.2  | Account Number               | 1683          | Account                       | 1683          |

---

## 📈 Part 5: Product Tree Category Nodes

Scenario Outline: Product Tree Node Selection Parity on <FilterLabel>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the dropdown selector "Product"
  And selects the dropdown option value "<ProductNode>"
  And clicks the "Apply" filter button
  Then both legacy GWT and modern ag-Grid must render identical trade records
  And the column "Product" must read "<ExpectedValue>" in all matched rows

  Examples:
    | Scenario ID   | ProductNode          | ExpectedValue          |
    | Scenario 5.1  | EQO          | EQO          |

---

## 📊 Part 6: Economics and Numeric Range Filters

Scenario Outline: Numeric Economics Range Boundaries on <EconomicField>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the criteria field "<EconomicField>"
  And inputs the From Boundary Date as "<FromValue>"
  And inputs the To Boundary Date as "<ToValue>"
  And clicks the "Apply" filter button
  Then both legacy GWT and modern ag-Grid must retrieve the identical transaction records

  Examples:
    | Scenario ID   | EconomicField                  | FromValue    | ToValue      |
    | Scenario 6.1  | Notional                     | 0    | 0    |
    | Scenario 6.2  | Fixed Rate (1st Leg Rate)    | 7          | 7          |
