# MASTER PROMPT

## EDECS HR Workforce & Nationalization Dashboard

### Platform: Google Apps Script + Google Sheets

### Environment: Google Antigravity IDE

You are an expert:

* Google Apps Script Developer
* HR Analytics Consultant
* UI/UX Designer
* Enterprise Dashboard Architect
* Data Visualization Specialist

Build a complete professional internal HR Dashboard for **EDECS**.

The application will be used by HR Management to monitor:

* Workforce Headcount
* Countries
* Departments
* Nationalities
* Nationalization
* Hiring Trends

---

# 1. CRITICAL TECHNOLOGY RULES

The project MUST be developed ONLY using:

```text
.gs files
.html files
Google Apps Script
Google Sheets
HTML Service
Vanilla JavaScript
CSS inside HTML
```

DO NOT CREATE:

```text
.js
.css
.ts
.tsx
.jsx
React
Vue
Angular
Node.js
Firebase
Python
PHP
Java
SQL Server
package.json
webpack
vite
```

The final project must contain ONLY:

```text
.gs
.html
```

---

# 2. DATABASE

Database Type:

```text
Google Sheets
```

Expected Sheets:

```text
DimCountry
DimNationality
DimDepartment
DimEmployeeType
DimEmployee
```

---

# 3. DATABASE STRUCTURE

## DimCountry

```text
CountryKey
CountryCode
CountryName
Region
Currency
IsGCC
NationalizationProgramApplicable
TargetNationalizationPercentage
```

Countries:

```text
Egypt
KSA
UAE
Oman
Tanzania
Angola
```

---

## DimNationality

```text
NationalityKey
NationalityCode
NationalityName
CountryKey
```

---

## DimDepartment

```text
DepartmentKey
DepartmentCode
DepartmentName
Division
DepartmentCategory
```

---

## DimEmployeeType

```text
EmployeeTypeKey
EmployeeTypeName
EmploymentClass
```

---

## DimEmployee

```text
EmployeeKey
EmployeeID
EmployeeName
Gender
CountryKey
DepartmentKey
EmployeeTypeKey
HireDate
EmploymentStatus
IsActive
NationalityKey
HireDateKey
```

Example:

```text
HireDateKey = DDMMYYYY
12042023
```

Expected Employee Records:

```text
Approximately 5862 Employees
```

---

# 4. RELATIONSHIPS

```text
Employee.CountryKey
→ Country.CountryKey

Employee.DepartmentKey
→ Department.DepartmentKey

Employee.EmployeeTypeKey
→ EmployeeType.EmployeeTypeKey

Employee.NationalityKey
→ Nationality.NationalityKey

Nationality.CountryKey
→ Country.CountryKey
```

---

# 5. BUSINESS LOGIC

## Head Count

```text
COUNT(EmployeeKey)
```

---

## Active Employees

```text
IsActive = TRUE
```

---

## Inactive Employees

```text
IsActive = FALSE
```

---

## Nationalization Formula

IMPORTANT:

DO NOT compare:

```text
Nationality Name = Country Name
```

Correct logic:

```text
Employee
→ Nationality
→ Country
```

Formula:

```text
National Employees
÷
Total Active Employees in Country
× 100
```

Only calculate if:

```text
NationalizationProgramApplicable = TRUE
```

Compare with:

```text
TargetNationalizationPercentage
```

Variance:

```text
Actual %
-
Target %
```

Display:

```text
Above Target
Near Target
Below Target
```

Example values below are validation examples only:

```text
Egypt: 18.55%
KSA: 6.31%
Oman: 5.17%
UAE: 11.75%
Tanzania: 0.65%
Angola: 0.00%
```

DO NOT HARD-CODE THESE VALUES.

---

# 6. APPLICATION STRUCTURE

The application contains ONLY:

```text
2 Pages
```

---

# PAGE 1

# HR OVERVIEW

---

## HEADER

Top Header:

```text
EDECS
EGYPT | KSA | UAE | OMAN | TANZANIA | ANGOLA
```

Display:

* Company Logo
* Current Date
* Last Refresh Date

---

## KPI CARD

Large Card:

```text
Head Count
```

Example:

```text
4014
```

This number must be dynamic.

---

## FILTERS

Create filters:

### Department Name

Default:

```text
All
```

### Country Name

Default:

```text
All
```

Filters should affect all visuals dynamically.

Do NOT reload page.

---

## TABLE 1

Country HeadCount

Columns:

```text
CountryName
HeadCount
```

Sort:

```text
Descending
```

---

## TABLE 2

Department HeadCount

Columns:

```text
DepartmentName
HeadCount
```

Sort:

```text
Descending
```

---

## TABLE 3

Nationality HeadCount

Columns:

```text
NationalityName
HeadCount
```

Show:

```text
Top Nationalities
```

---

## MAP

Create Interactive Map.

Requirements:

* Dark Theme
* Middle East & Africa
* Pins
* Country Labels
* Head Count

Countries:

```text
Egypt
KSA
UAE
Oman
Tanzania
Angola
```

DO NOT USE:

```text
Static Image
Fake Map
Screenshot
```

Create a real interactive map compatible with Google Apps Script.

---

# PAGE 2

# NATIONALIZATION & HIRING

---

## HEADER

Display:

```text
Head Count
```

Large KPI Card.

---

## TITLE

```text
Nationalization Rate For Each Country
```

---

## NATIONALIZATION CARDS

Create responsive card grid.

Cards:

```text
Egypt
KSA
Oman
UAE
Tanzania
Angola
```

Display:

```text
Country Name
Current %
Target %
Variance
Status
```

---

## FILTER

Country Filter:

```text
Country Name
```

Default:

```text
All
```

---

## HIRING CHART

Title:

```text
Hiring Date For Each Country
```

Type:

```text
Multi Line Chart
```

X Axis:

```text
1995 → Current Year
```

Y Axis:

```text
Number of Hires
```

Lines:

```text
Egypt
KSA
UAE
Oman
Tanzania
Angola
```

Group by:

```text
Year
```

Optional:

```text
Quarter
Month
```

---

# 7. DESIGN SYSTEM

Create a premium enterprise dashboard.

Style:

```text
Dark Corporate
Executive
Modern
Minimal
HR Analytics
```

---

# 8. COLOR SYSTEM

## Main Background

```text
#1F242D
```

Dark Charcoal.

Optional:

```text
EDECS Building Background
```

with dark overlay.

---

## Filter Containers

```text
#6C757D
```

Border:

```text
#D4A017
```

---

## Gold Color

```text
#D4A017
#C59B27
```

Use for:

* Borders
* Titles
* Filter Labels

---

## Header Text

```text
#E5C158
```

---

## KPI Numbers

```text
#17A2B8
```

or

```text
#008080
```

---

## Tables

Header:

```text
Background: #000000
Text: #FFFFFF
```

Rows:

```text
Background: White
Text: Black
```

---

## Nationalization Cards

```text
Background: #FFFFFF
Border Radius: 18px
```

Percentage Color:

```text
#005F73
```

---

## EDECS Logo

Text:

```text
#0077B6
```

---

# 9. CHART COLORS

Egypt:

```text
#00A8E8
```

KSA:

```text
#E8A838
```

UAE:

```text
#1D3557
```

Oman:

```text
#2EC4B6
```

Tanzania:

```text
#D4A373
```

Angola:

```text
#4A4E69
```

DO NOT USE:

* Neon Colors
* Pink
* Purple
* Bright Green

---

# 10. PERFORMANCE

Employee Records:

```text
~5862
```

DO NOT:

* Read Sheets repeatedly
* Call server many times
* Reload page

USE:

```javascript
CacheService
```

Use:

```javascript
getValues()
```

Build:

```text
Country Maps
Department Maps
Nationality Maps
Employee Type Maps
```

Use:

```text
One Data Load
Many Visuals
```

---

# 11. FILE STRUCTURE

GS Files:

```text
Code.gs
Config.gs
DataService.gs
DashboardService.gs
AnalyticsService.gs
Utils.gs
```

HTML Files:

```text
Index.html
Styles.html
Overview.html
Nationalization.html
Components.html
JavaScript.html
```

---

# 12. APPS SCRIPT FUNCTIONS

Create:

```javascript
doGet()
include()

getDashboardData()
getOverviewData()
getNationalizationData()
getHiringTrend()
getEmployees()
getFilterOptions()
refreshCache()
```

---

# 13. LOADING

Create:

```text
Loading Dashboard...
Loading Data...
Loading Charts...
```

Use:

* Skeletons
* Spinners

---

# 14. EMPTY STATES

Display:

```text
No Data Found
Try changing filters
```

---

# 15. ERROR HANDLING

Backend:

```javascript
try {} catch {}
```

User Message:

```text
Unable to load dashboard
Please contact administrator
```

---

# 16. SETTINGS

Central Configuration:

```javascript
const CONFIG = {
 SPREADSHEET_ID:'',
 SHEETS:{
   COUNTRY:'DimCountry',
   NATIONALITY:'DimNationality',
   DEPARTMENT:'DimDepartment',
   EMPLOYEE:'DimEmployee',
   EMPLOYEE_TYPE:'DimEmployeeType'
 }
}
```

Prefer:

```text
PropertiesService
```

---

# 17. DEVELOPMENT PROCESS

Step 1:

Analyze database.

Step 2:

Create architecture.

Step 3:

Create GS files.

Step 4:

Create HTML files.

Step 5:

Validate:

* Apps Script compatibility
* HTML Service compatibility
* Google Sheets integration
* Performance

Step 6:

Generate final project.

---

# 18. IMPORTANT

DO NOT:

* Create mock employees
* Create fake data
* Create unsupported files

Build ONLY:

```text
Google Apps Script + Google Sheets + HTML
```

The final result should look like:

```text
Enterprise HR Dashboard
Executive Analytics
Professional EDECS Internal System
```
