-- DATA QUALITY DIAGNOSTIC - Find Non-Numeric Data in Amount Fields
-- This will help identify the problematic data causing conversion errors

USE [PaySense]
GO

PRINT 'Running data quality diagnostics...'

-- ============================================================================
-- 1. CHECK ALLOWANCE AMOUNTS FOR NON-NUMERIC DATA
-- ============================================================================

PRINT '1. Checking Employee_Allowance_Archive for non-numeric allowance_amount values:'

SELECT TOP 20
    emp_number,
    archive_year,
    allowance_id,
    allowance_amount,
    LEN(allowance_amount) AS string_length,
    'ALLOWANCE' AS data_type
FROM dbo.Employee_Allowance_Archive 
WHERE ISNUMERIC(allowance_amount) = 0 
  AND allowance_amount IS NOT NULL
  AND LTRIM(RTRIM(allowance_amount)) != ''
ORDER BY LEN(allowance_amount) DESC

-- Count of bad records
SELECT 
    COUNT(*) AS total_bad_allowance_records,
    COUNT(DISTINCT emp_number) AS affected_employees
FROM dbo.Employee_Allowance_Archive 
WHERE ISNUMERIC(allowance_amount) = 0 
  AND allowance_amount IS NOT NULL
  AND LTRIM(RTRIM(allowance_amount)) != ''

-- ============================================================================
-- 2. CHECK DEDUCTION AMOUNTS FOR NON-NUMERIC DATA
-- ============================================================================

PRINT '2. Checking Employee_Deductions_Archive for non-numeric deduction_amount values:'

SELECT TOP 20
    employee_number,
    archive_year,
    deduction_id,
    deduction_amount,
    LEN(deduction_amount) AS string_length,
    'DEDUCTION' AS data_type
FROM dbo.Employee_Deductions_Archive 
WHERE ISNUMERIC(deduction_amount) = 0 
  AND deduction_amount IS NOT NULL
  AND LTRIM(RTRIM(deduction_amount)) != ''
ORDER BY LEN(deduction_amount) DESC

-- Count of bad records
SELECT 
    COUNT(*) AS total_bad_deduction_records,
    COUNT(DISTINCT employee_number) AS affected_employees
FROM dbo.Employee_Deductions_Archive 
WHERE ISNUMERIC(deduction_amount) = 0 
  AND deduction_amount IS NOT NULL
  AND LTRIM(RTRIM(deduction_amount)) != ''

-- ============================================================================
-- 3. CHECK MAIN TCTC ARCHIVE TABLE FOR POTENTIAL ISSUES
-- ============================================================================

PRINT '3. Checking Employee_TCTC_Archive for potential data type issues:'

-- Check for non-numeric values in supposedly numeric columns
SELECT 
    emp_number,
    archive_year,
    gross_salary_annual,
    gross_salary_monthly,
    cur_basic_salary,
    prv_basic_salary,
    net_salary
FROM dbo.Employee_TCTC_Archive 
WHERE (
    (gross_salary_annual IS NOT NULL AND ISNUMERIC(gross_salary_annual) = 0) OR
    (gross_salary_monthly IS NOT NULL AND ISNUMERIC(gross_salary_monthly) = 0) OR
    (cur_basic_salary IS NOT NULL AND ISNUMERIC(cur_basic_salary) = 0) OR
    (prv_basic_salary IS NOT NULL AND ISNUMERIC(prv_basic_salary) = 0) OR
    (net_salary IS NOT NULL AND ISNUMERIC(net_salary) = 0)
)

-- ============================================================================
-- 4. CHECK ORACLE EMPLOYEE INFORMATION FOR ISSUES
-- ============================================================================

PRINT '4. Checking OracleData.dbo.EmployeeInformation for potential issues:'

SELECT TOP 10
    employee_number,
    business_unit_code,
    cost_centre_code,
    business_unit_name,
    CONCAT(business_unit_code, cost_centre_code) AS concatenated_codes
FROM OracleData.dbo.EmployeeInformation 
WHERE business_unit_code IS NOT NULL 
   OR cost_centre_code IS NOT NULL
ORDER BY LEN(CONCAT(ISNULL(business_unit_code, ''), ISNULL(cost_centre_code, ''))) DESC

-- ============================================================================
-- 5. SAMPLE THE ACTUAL PROBLEMATIC DATA
-- ============================================================================

PRINT '5. Sample of the actual problematic data patterns:'

-- Show the specific encrypted/encoded values
SELECT 
    'ALLOWANCE' AS source_table,
    allowance_amount AS problematic_value,
    LEFT(allowance_amount, 50) AS first_50_chars,
    LEN(allowance_amount) AS total_length
FROM dbo.Employee_Allowance_Archive 
WHERE allowance_amount LIKE '%lFldhE2GiUdBjcP592D7QoB0Jw3mvykBj6O2J/tTY7eij46v/3BsD3XWS123ybUB%'

UNION ALL

SELECT 
    'DEDUCTION' AS source_table,
    deduction_amount AS problematic_value,
    LEFT(deduction_amount, 50) AS first_50_chars,
    LEN(deduction_amount) AS total_length
FROM dbo.Employee_Deductions_Archive 
WHERE deduction_amount LIKE '%lFldhE2GiUdBjcP592D7QoB0Jw3mvykBj6O2J/tTY7eij46v/3BsD3XWS123ybUB%'

-- ============================================================================
-- 6. RECOMMENDATIONS
-- ============================================================================

PRINT ''
PRINT '=== DATA QUALITY RECOMMENDATIONS ==='
PRINT '1. The fixed view will handle these data quality issues gracefully'
PRINT '2. Consider cleaning up the source data to prevent future issues'
PRINT '3. The non-numeric values appear to be encrypted/encoded data that should not be in amount fields'
PRINT '4. You may want to investigate how this data got into numeric amount columns'
PRINT '5. Consider adding data validation constraints to prevent this in the future'

PRINT ''
PRINT 'FIXED VIEW SOLUTION:'
PRINT '- Uses ISNUMERIC() checks before casting to numeric'
PRINT '- Treats non-numeric values as 0 (zero)'
PRINT '- Maintains performance while ensuring data safety'
PRINT '- Ready for production use'

GO 