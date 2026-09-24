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
    | Scenario 1.2  | Trade ID                           | TAUTO42132           | true         | Trade ID                           | TAUTO42132           |
    | Scenario 1.3  | Deal ID                            | S42132676_1          | false        | Deal ID                            | S42132676_1          |
    | Scenario 1.4  | Deal ID                            | S421326              | true         | Deal ID                            | S42132676_1          |
    | Scenario 1.5  | Counterparty Trade ID              | 42132676_1           | false        | Cpty Trade Id                      | 42132676_1           |
    | Scenario 1.6  | Counterparty Deal ID               | 42132676             | false        | Cpty Ref ID                        | 42132676             |
    | Scenario 1.7  | Bunched Order Block MW ID          | 42137019             | false        | Bunched Order Block MW ID          | 42137019             |
    | Scenario 1.8  | Counterparty Trade ID              | 42137113             | true         | Counterparty Trade ID              | 42137113             |
    | Scenario 1.9  | Counterparty Deal ID               | 42137113             | true         | Counterparty Deal ID               | 42137113             |
    | Scenario 1.10 | Counterparty Allocation Deal ID    | 42137113             | false        | Counterparty Allocation Deal ID    | 42137113             |
    | Scenario 1.11 | Selective Netting ID               | NET_9082             | false        | Selective Netting ID               | NET_9082             |
    | Scenario 1.12 | Netting String                     | NET_STR_ABC          | false        | Netting String                     | NET_STR_ABC          |
    | Scenario 1.13 | Clearing House Trade ID            | 42138048             | true         | Clearing House Trade ID            | 42138048             |
    | Scenario 1.14 | USI                                | USI_10029834         | false        | USI                                | USI_10029834         |
    | Scenario 1.15 | USI Issuer                         | 549300FSLUWD8ETI2P24 | false        | USI Issuer                         | 549300FSLUWD8ETI2P24 |
    | Scenario 1.16 | Cleared Trade USI                  | 549300FSLUWD8ETI2P24 | false        | Cleared Trade USI                  | CL_USI_9082          |
    | Scenario 1.17 | Cleared Trade USI Issuer           | CME_ISSUER           | false        | Cleared Trade USI Issuer           | CME_ISSUER           |
    | Scenario 1.18 | DTCC Warehouse TRI                 | DTCC_TRI_011         | false        | DTCC Warehouse TRI                 | DTCC_TRI_011         |
    | Scenario 1.19 | Associated Trade Id                | ASSOC_TX_12          | false        | Associated Trade Id                | ASSOC_TX_12          |
    | Scenario 1.20 | Block SEF Trade ID                 | 568200580            | false        | Block SEF Trade ID                 | 568200580            |
    | Scenario 1.21 | Block USI                          | MARKITWIRE42137922   | false        | Block USI                          | MARKITWIRE42137922   |
    | Scenario 1.22 | Block USI Issuer                   | 549300FSLUWD8ETI2P24 | false        | Block USI Issuer                   | 549300FSLUWD8ETI2P24 |
    | Scenario 1.23 | Block UTI                          | MARKITWIRE42137019   | false        | Block UTI                          | MARKITWIRE42137019   |
    | Scenario 1.24 | Block UTI Issuer                   | 549300FSLUWD8ETI2P24 | false        | Block UTI Issuer                   | 549300FSLUWD8ETI2P24 |
    | Scenario 1.25 | SEF Trade ID                       | 568200580            | false        | SEF Trade ID                       | 568200580            |
    | Scenario 1.30 | Post Clearing Batch ID             | POST_CLR_992         | false        | Post Clearing Batch ID             | POST_CLR_992         |
    | Scenario 1.31 | Post Clearing Activity Type        | NOVATION_POST        | false        | Post Clearing Activity Type        | NOVATION_POST        |
    | Scenario 1.32 | Post Clearing Sub-Category         | CL_SUB_901           | false        | Post Clearing Sub-Category         | CL_SUB_901           |
    | Scenario 1.33 | Deal ID(PDF Digitized)             | S42122750            | true         | Deal ID(PDF Digitized)             | S42122750            |
    | Scenario 1.34 | Trade ID(PDF Digitized)            | S42122750            | true         | Trade ID(PDF Digitized)            | S42122750            |
    | Scenario 1.37 | UPI                                | QZPB5VSBGRCD         | false        | UPI                                | QZPB5VSBGRCD         |
    | Scenario 1.38 | Clearing House                     | LCH_EUR              | false        | Clearing Status                    | CLR-LCH_EUR          |
    | Scenario 1.39 | Execution Venue                    | SEF                  | false        | Trade ID                           | TAUTO                |

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
    | Scenario 2.1  | Trade Date                      | t-2         | t-1         | t-2               | t-1             |
    | Scenario 2.2  | Settle Date                     | t-2         | t-1         | t-2               | t-1             |
    | Scenario 2.3  | Maturity Date                   | t-2         | t-1         | t-2               | t-1             |
    | Scenario 2.4  | Last Activity Date              | t-2         | t-1         | t-2               | t-1             |
    | Scenario 2.5  | Creation Date                   | t-2         | t-1         | t-2               | t-1             |
    | Scenario 2.6  | Execution Date                  | t-2         | t-1         | t-2               | t-1             |
    | Scenario 2.7  | Expiry Date                     | t-2         | t-1         | t-2               | t-1             |
    | Scenario 2.8  | Strike Date                     | t-2         | t-1         | t-2               | t-1             |

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
    | Scenario ID   | FilterLabel                  | SelectedValue          | VerifyColumn                 | ExpectedValue          |
    | Scenario 3.1  | Workflow                     | Confirmations          | Workflow                     | Confirmations          |
    | Scenario 3.2  | Workflow                     | Novations              | Workflow                     | Novations              |
    | Scenario 3.3  | Clearing Status              | Cleared                | Clearing Status              | Cleared                |
    | Scenario 3.4  | Clearing Status              | Clearing Pending       | Clearing Status              | Clearing Pending       |
    | Scenario 3.5  | Reconciliation State         | Reconciled             | Reconciliation State         | Reconciled             |
    | Scenario 3.6  | Reconciliation State         | Unreconciled           | Reconciliation State         | Unreconciled           |
    | Scenario 3.7  | Intended for Clearing        | Yes                    | Intended for Clearing        | Yes                    |
    | Scenario 3.8  | Intended for Clearing        | No                     | Intended for Clearing        | No                     |
    | Scenario 3.9  | Document Status              | Disputed               | Doc Status                   | Disputed               |
    | Scenario 3.10 | Source                       | Markit                 | Source                       | Markit                 |
    | Scenario 3.12 | Novation Status              | Complete: STP          | Novation Status              | Complete: STP          |
    | Scenario 3.13 | Transaction Acceptance Status | Accepted              | Transaction Acceptance Status | Accepted              |
    | Scenario 3.14 | Sent?                        | Y                      | Sent?                        | Y                      |
    | Scenario 3.15 | Settlement Agency Status     | SA Accepted            | Settlement Agency Status     | SA Accepted            |
    | Scenario 3.17 | Is Package Trade             | Yes                    | Is Package Trade             | Yes                    |
    | Scenario 3.19 | Broker Submitted Novation    | Yes                    | Broker Submitted Novation    | Yes                    |
    | Scenario 3.21 | Status                       | CLEARED                | Status                       | CLEARED                |
    | Scenario 3.22 | Status                       | DISPUTED               | Status                       | DISPUTED               |

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
    | Scenario ID   | FilterLabel                  | EntityValue                | VerifyColumn                  | ExpectedValue             |
    | Scenario 4.1  | Counterparty                 | MarkitWire Demo Bank       | Cpty(s)                       | MarkitWire Demo Bank      |
    | Scenario 4.2  | Account Number               | M.BANK                       | Account                       | 1683                      |
    | Scenario 4.3  | Counterparty Company         | Non Disclosed Participant  | Cpty(s)                       | Non Disclosed Participant |
    | Scenario 4.4  | Counterparty Legal Entity    | Asset Mgr/BR.AM            | Cpty(s)                       | Asset Mgr/BR.AM        |
    | Scenario 4.5  | Broker ID                    | 1684                       | Broker ID                     | TAUTO                  |
    | Scenario 4.6  | Executing Broker             | M.Bank                     | Trade ID                      | TAUTO                  |
    | Scenario 4.7  | Intermediating Broker        | A.Bank                     | Trade ID                      | TAUTO                  |
    | Scenario 4.8  | Transferor                   | M.Bank                     | Trade ID                      | TAUTO                  |
    | Scenario 4.9  | Transferee                   | M.Bank                     | Trade ID                      | TAUTO                  |
    | Scenario 4.10 | Remaining Party              | A.Bank                     | Trade ID                      | TAUTO                  |
    LEI :0000Z377
    CptyLEI : 549300V2LQD6SX1WIG70
    RED : 2I65BYDX0
    My Product Type ID : CAP

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
    | Scenario 6.1  | Notional                       | 400000       | 12000000     |
    | Scenario 6.2  | Fixed Rate (1st Leg Rate)      | 7            | 17           |

---

## 💼 Part 7: Trade Details and Economics

Scenario Outline: Financial Attributes Search Parity on <CriteriaLabel>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the criteria field "<CriteriaLabel>"
  And inputs the search value "<Value>"
  And clicks the "Apply" filter button
  Then both legacy GWT and modern ag-Grid must retrieve the identical transaction records

  Examples:
    | Scenario ID   | CriteriaLabel                         | Value                 |
    | Scenario 6.3  | Account Number                        | 1684                  |
    | Scenario 6.4  | Cancellable Option                    | YES                   |
    | Scenario 6.5  | Currency                              |AUD                    |
    | Scenario 6.6  | Direction                             | Pay                   |
    | Scenario 6.7 | Primary Asset Class                   | Equity                |
    | Scenario 6.8 | Put/Call                              | Put                   |
    | Scenario 6.9 | Transaction Type                      | New                   |
    | Scenario 6.10 | 2nd leg (call) currency               | AUD                   |
    | Scenario 6.11 | Product Sub-Type                      | NDF                   |
    | Scenario 6.12 | Fee/Premium Direction                 | Buy/Pay               |
    | Scenario 6.13 | Straddle                              | Yes                   |
    | Scenario 6.14 | Settlement Currency                   | CAD                   |
    | Scenario 6.15 | Transaction Sub-Type / Amendment Type | Increase              |
    

Scenario Outline: Numeric Economics Range Boundaries on <EconomicField>
  Given the user has authenticated and loaded the OSTTRA Trade Blotter
  And ensure all search criteria are completely reset and empty
  When the user targets the criteria field "<EconomicField>"
  And inputs the From Boundary Date as "<FromValue>"
  And inputs the To Boundary Date as "<ToValue>"
  And clicks the "Apply" filter button
  Then both legacy GWT and modern ag-Grid must retrieve the identical transaction records

  Examples:
    | Scenario ID   | EconomicField                         | FromValue             | ToValue               |
    | Scenario 6.16 | Fee                                   | 200                   | 900                   |
    | Scenario 6.17 | Fixed Rate                            | 20                    | 20                    |
    | Scenario 6.18 | Independent Amount                    | 14500                 | 24500                 |
    | Scenario 6.19 | Initial Price                         | 50                    | 1200                  |
    | Scenario 6.20 | Notional                              | 1540000               | 2540000               |
    | Scenario 6.21 | # of Shares/Options                   | 100                   | 200                   |
    | Scenario 6.22 | Strike Price                          | 120                   | 120                   |
    | Scenario 6.23 | 2nd leg (call) notional               | 120                   | 189                   |
    | Scenario 6.24 | Purchase Price                        | 700                   | 1820                  |
    | Scenario 6.25 | Repurchase Price                      | 200                   | 1430                  |
    | Scenario 6.26 | Purchase Security Nominal             | 300                   | 892                   |
    | Scenario 6.27 | Purchase Security Quantity            | 10                    | 90                    |
