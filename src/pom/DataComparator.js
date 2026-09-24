/**
 * Utility for performing deep record-level data comparisons between Old UI (GWT) and New UI (ag-Grid) rows.
 */
class DataComparator {
  /**
   * Standardizes dynamic text values to eliminate framework formatting discrepancies.
   * Map dot representations (`.`), raw `N/A`, and empty fields into a unified empty-state value.
   * 
   * @param {any} val - The raw field value.
   * @returns {string} Normalized value.
   */
  static normalizeValue(val) {
    if (val === undefined || val === null) return '';
    const cleanStr = String(val).trim();
    // GWT uses '.' or empty string, ag-Grid uses 'N/A' or empty string for unpopulated data
    if (cleanStr === '.' || cleanStr.toUpperCase() === 'N/A' || cleanStr === '') {
      return '';
    }
    return cleanStr;
  }

  /**
   * Compares two parsed rows (Old UI vs New UI) field-by-field.
   * 
   * @param {Object} oldRow - Key-value map representing a row from Old UI GWT.
   * @param {Object} newRow - Key-value map representing a row from New UI ag-Grid.
   * @param {Array<string>} [fieldsToCompare] - Optional explicit list of fields to compare. If omitted, checks all fields present in either row.
   * @returns {Object} Comparison report containing matches, mismatches, and status.
   */
  static compareRows(oldRow, newRow, fieldsToCompare = null) {
    const report = {
      isMatch: true,
      matches: {},
      mismatches: {}
    };

    // Define alias mappings from GWT (old) to ag-Grid (new) column headers
    const gwtToAgGridAliases = {
      'Ind.Amt.%': 'IA %',
      'Ind.Amt.$': 'IA $',
      'Sent?': 'Sent',
      'Trader Name': 'Trader',
      'Submission Type (CSV/FpML)': 'Submission Method',
      'Multiplier/Option Entitlement': 'Option Multiplier'
    };

    // If no explicit fields, combine all unique keys from both rows, mapping GWT keys to their ag-Grid equivalents
    let rawFields = fieldsToCompare || Array.from(new Set([
      ...Object.keys(oldRow),
      ...Object.keys(newRow)
    ]));

    // Normalize field names to avoid comparing the same aliased column twice
    const normalizedFields = Array.from(new Set(rawFields.map(f => gwtToAgGridAliases[f] || f)));

    // Exclude WORKFLOWICON from deep cell-level validation as it is a New UI-specific column not present in GWT
    const fields = normalizedFields.filter(field => field !== 'WORKFLOWICON');

    fields.forEach(field => {
      // Find the old key (it could be the alias or the field itself)
      const oldKey = Object.keys(gwtToAgGridAliases).find(k => gwtToAgGridAliases[k] === field) || field;
      const newKey = field;

      const oldValRaw = oldRow[oldKey];
      const newValRaw = newRow[newKey];

      let oldVal = this.normalizeValue(oldValRaw);
      let newVal = this.normalizeValue(newValRaw);

      // PCE (Post Clearing Event) and other field normalization alignment
      // Normalize 'N' and '.' (or empty) to be identical for PCE/Post Clearing Event
      if (field === 'PCE' || field === 'Post Clearing Event') {
        if (oldVal === '' || oldVal === '.') oldVal = 'N';
        if (newVal === '' || newVal === '.') newVal = 'N';
      }

      // Handle GWT cell truncation (e.g., "Rec Equit..." vs "Rec Equity,Pay Interest")
      let isFieldMatch = (oldVal === newVal);
      if (!isFieldMatch && oldVal.endsWith('...')) {
        const prefix = oldVal.slice(0, -3);
        if (newVal.startsWith(prefix)) {
          isFieldMatch = true;
        }
      }

      if (isFieldMatch) {
        report.matches[field] = {
          old: oldValRaw || '(empty)',
          new: newValRaw || '(empty)'
        };
      } else {
        report.isMatch = false;
        report.mismatches[field] = {
          old: oldValRaw || '(empty)',
          new: newValRaw || '(empty)'
        };
      }
    });

    return report;
  }

  /**
   * Compares two arrays of row records.
   * 
   * @param {Array<Object>} oldRows - List of row records from GWT Old UI.
   * @param {Array<Object>} newRows - List of row records from ag-Grid New UI.
   * @returns {Object} Batch comparison result with success flag, row metrics, and details.
   */
  static compareGrids(oldRows, newRows) {
    const results = {
      allPassed: true,
      totalOldRows: oldRows.length,
      totalNewRows: newRows.length,
      rowCountMismatch: oldRows.length !== newRows.length,
      rowDetails: []
    };

    const maxRows = Math.max(oldRows.length, newRows.length);

    for (let i = 0; i < maxRows; i++) {
      const oldRow = oldRows[i] || {};
      const newRow = newRows[i] || {};

      const rowComp = this.compareRows(oldRow, newRow);
      
      if (!rowComp.isMatch) {
        results.allPassed = false;
      }

      results.rowDetails.push({
        rowIndex: i + 1,
        tradeId: oldRow['Trade ID'] || newRow['Trade ID'] || `Row-${i + 1}`,
        isMatch: rowComp.isMatch,
        matchesCount: Object.keys(rowComp.matches).length,
        mismatchesCount: Object.keys(rowComp.mismatches).length,
        mismatches: rowComp.mismatches,
        matches: rowComp.matches
      });
    }

    if (results.rowCountMismatch) {
      results.allPassed = false;
    }

    return results;
  }
}

module.exports = {
  DataComparator
};
