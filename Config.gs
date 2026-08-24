/**
 * @fileoverview Central configuration for EDECS HR Dashboard.
 *
 * SETUP INSTRUCTIONS:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. In Apps Script editor: File → Project Properties → Script Properties
 * 2. Add property: Key = SPREADSHEET_ID, Value = <your-spreadsheet-id>
 * 3. Deploy as Web App: Deploy → New Deployment → Web App
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @author EDECS HR Systems
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL CONFIGURATION OBJECT
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  /**
   * Google Sheets Spreadsheet ID.
   * Prefer setting via Script Properties (SPREADSHEET_ID).
   * This value is the fallback only.
   */
  SPREADSHEET_ID: '',

  /** CacheService expiry in seconds (3600 = 1 hour) */
  CACHE_EXPIRY: 3600,

  /** Sheet tab names — must exactly match Google Sheets tab names */
  SHEETS: {
    COUNTRY:       'DimCountry',
    NATIONALITY:   'DimNationality',
    DEPARTMENT:    'DimDepartment',
    EMPLOYEE:      'DimEmployee',
    EMPLOYEE_TYPE: 'DimEmployeeType'
  },

  /**
   * Gap for "Near Target" nationalization status in percentage points.
   * target - NEAR_TARGET_GAP_POINTS <= actual < target → Near Target
   */
  NEAR_TARGET_GAP_POINTS: 10,

  /** Display order for countries across the dashboard */
  COUNTRIES: ['Egypt', 'KSA', 'UAE', 'Oman', 'Tanzania', 'Angola'],

  /** Country-specific chart/map colors (spec-defined palette) */
  CHART_COLORS: {
    Egypt:    '#00A8E8',
    KSA:      '#E8A838',
    UAE:      '#1D3557',
    Oman:     '#2EC4B6',
    Tanzania: '#D4A373',
    Angola:   '#4A4E69'
  },

  /** Geographic center coordinates for Leaflet map pins */
  MAP_COORDINATES: {
    Egypt:    { lat: 26.82,  lng: 30.80  },
    KSA:      { lat: 23.89,  lng: 45.08  },
    UAE:      { lat: 23.42,  lng: 53.85  },
    Oman:     { lat: 21.51,  lng: 55.92  },
    Tanzania: { lat: -6.37,  lng: 34.89  },
    Angola:   { lat: -11.20, lng: 17.87  }
  },

  /** Hiring trend chart start year */
  HIRING_START_YEAR: 1995
};

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN INDEX CONSTANTS (0-based, row[0] = first column)
// Must match the exact column order in each Google Sheet.
// ─────────────────────────────────────────────────────────────────────────────

const COLS = {
  COUNTRY: {
    KEY:                        0,  // CountryKey
    CODE:                       1,  // CountryCode
    NAME:                       2,  // CountryName
    REGION:                     3,  // Region
    CURRENCY:                   4,  // Currency
    IS_GCC:                     5,  // IsGCC
    NATIONALIZATION_APPLICABLE: 6,  // NationalizationProgramApplicable
    TARGET_NATIONALIZATION_PCT: 7   // TargetNationalizationPercentage
  },
  NATIONALITY: {
    KEY:         0,  // NationalityKey
    CODE:        1,  // NationalityCode
    NAME:        2,  // NationalityName
    COUNTRY_KEY: 3   // CountryKey (FK → DimCountry)
  },
  DEPARTMENT: {
    KEY:      0,  // DepartmentKey
    CODE:     1,  // DepartmentCode
    NAME:     2,  // DepartmentName
    DIVISION: 3,  // Division
    CATEGORY: 4   // DepartmentCategory
  },
  EMPLOYEE_TYPE: {
    KEY:              0,  // EmployeeTypeKey
    NAME:             1,  // EmployeeTypeName
    EMPLOYMENT_CLASS: 2   // EmploymentClass
  },
  EMPLOYEE: {
    KEY:               0,  // EmployeeKey
    ID:                1,  // EmployeeID
    NAME:              2,  // EmployeeName
    GENDER:            3,  // Gender
    COUNTRY_KEY:       4,  // CountryKey (FK → DimCountry)
    DEPARTMENT_KEY:    5,  // DepartmentKey (FK → DimDepartment)
    EMPLOYEE_TYPE_KEY: 6,  // EmployeeTypeKey (FK → DimEmployeeType)
    HIRE_DATE:         7,  // HireDate
    EMPLOYMENT_STATUS: 8,  // EmploymentStatus
    IS_ACTIVE:         9,  // IsActive
    NATIONALITY_KEY:   10, // NationalityKey (FK → DimNationality)
    HIRE_DATE_KEY:     11  // HireDateKey (DDMMYYYY)
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves the Spreadsheet ID from Script Properties (preferred) or CONFIG.
 * @returns {string} The Spreadsheet ID.
 */
function getSpreadsheetId() {
  try {
    const props    = PropertiesService.getScriptProperties();
    const storedId = props.getProperty('SPREADSHEET_ID');
    return storedId || CONFIG.SPREADSHEET_ID;
  } catch (e) {
    AppLogger.error('Config', 'getSpreadsheetId', e.message);
    return CONFIG.SPREADSHEET_ID;
  }
}

/**
 * Opens and returns the configured Google Spreadsheet.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 * @throws {Error} If SPREADSHEET_ID is not set.
 */
function getSpreadsheet() {
  const id = getSpreadsheetId();
  if (!id) {
    throw new Error(
      'SPREADSHEET_ID is not configured. ' +
      'Go to Apps Script → File → Project Properties → Script Properties ' +
      'and add SPREADSHEET_ID = <your-spreadsheet-id>.'
    );
  }
  return SpreadsheetApp.openById(id);
}
