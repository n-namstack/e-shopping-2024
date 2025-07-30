USE [PaySense]
GO

-- OPTIMIZED Employee Salary Details Archive View - FIXED VERSION
-- Includes proper data type handling to prevent conversion errors

PRINT 'Creating FIXED OPTIMIZED v_EmployeeSalaryDetails_Archive view...'

-- Drop existing view if it exists
DROP VIEW IF EXISTS v_EmployeeSalaryDetails_Archive
GO

CREATE VIEW v_EmployeeSalaryDetails_Archive AS

WITH 
-- Pre-aggregate allowances with data type safety
AllowancesCTE AS (
    SELECT 
        aa.emp_number,
        aa.archive_year,
        SUM(CASE 
            WHEN b.allowance_name = 'TransportAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Transport_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'TransportAllowanceTaxable' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Transport_Allowance_Taxable,
        SUM(CASE 
            WHEN b.allowance_name = 'HousingAmount' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Housing_Amount,
        SUM(CASE 
            WHEN b.allowance_name = 'HousingAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Housing_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'UnutilisedHousing' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Unutilised_Housing,
        SUM(CASE 
            WHEN b.allowance_name = 'EntertainmentAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Entertainment_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'EntertainmentAllowanceTaxable' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Entertainment_Allowance_Taxable,
        SUM(CASE 
            WHEN b.allowance_name = 'CarAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Car_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'CarAllowanceTaxable' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Car_Allowance_Taxable,
        SUM(CASE 
            WHEN b.allowance_name = 'RentalAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Rental_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'FixedTransAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Fixed_Trans_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'CellphoneAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Cellphone_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'RustAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Rust_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'CarAllowanceFullyTaxableOnTop' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Car_Allowance_Fully_Taxable_On_Top,
        SUM(CASE 
            WHEN b.allowance_name = 'OtherAllowance' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Other_Allowance,
        SUM(CASE 
            WHEN b.allowance_name = 'Utilities' AND ISNUMERIC(aa.allowance_amount) = 1 
            THEN CAST(aa.allowance_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Utilities_Allowance
    FROM dbo.Employee_Allowance_Archive aa
    INNER JOIN dbo.Allowances b ON aa.allowance_id = b.allowance_id
    WHERE ISNUMERIC(aa.allowance_amount) = 1 OR aa.allowance_amount IS NULL
    GROUP BY aa.emp_number, aa.archive_year
),

-- Pre-aggregate deductions with data type safety
DeductionsCTE AS (
    SELECT 
        da.employee_number,
        da.archive_year,
        SUM(CASE 
            WHEN e.deduction_name = 'Union' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Union_Deduction,
        SUM(CASE 
            WHEN e.deduction_name = 'Social Security' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Social_Security,
        SUM(CASE 
            WHEN e.deduction_name = 'Income tax' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Income_Tax,
        SUM(CASE 
            WHEN e.deduction_name = 'Medical_aid_employee' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Medical_Aid_Employee,
        SUM(CASE 
            WHEN e.deduction_name = 'Medical_aid_employer' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Medical_Aid_Employer,
        SUM(CASE 
            WHEN e.deduction_name = 'Pension_employee' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Pension_Employee,
        SUM(CASE 
            WHEN e.deduction_name = 'Pension_employer' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Pension_Employer,
        SUM(CASE 
            WHEN e.deduction_name = 'Death_benefit' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Death_benefit,
        SUM(CASE 
            WHEN e.deduction_name = 'Consulting_cost' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Consulting_cost,
        SUM(CASE 
            WHEN e.deduction_name = 'Admin_cost' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Admin_cost,
        SUM(CASE 
            WHEN e.deduction_name = 'Disability_benefit' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Disability_benefit,
        SUM(CASE 
            WHEN e.deduction_name = 'Funeral_benefit' AND ISNUMERIC(da.deduction_amount) = 1 
            THEN CAST(da.deduction_amount AS DECIMAL(18,2)) 
            ELSE 0 
        END) AS Funeral_benefit
    FROM dbo.Employee_Deductions_Archive da
    INNER JOIN dbo.Deductions e ON da.deduction_id = e.deduction_id
    WHERE ISNUMERIC(da.deduction_amount) = 1 OR da.deduction_amount IS NULL
    GROUP BY da.employee_number, da.archive_year
)

-- Main query with data type safety
SELECT 
    ta.emp_number,
    ta.gross_salary_annual,
    ta.gross_salary_monthly,
    ta.cur_basic_salary,
    ta.prv_basic_salary,
    ta.net_salary,
    
    -- Simplified creation date logic
    COALESCE(ta.updated_date, ta.created_date) AS created_date,
    ta.archive_year,
    
    -- Employee information from Oracle with safe string concatenation
    lm.business_unit_name,
    lm.sub_business_unit_name,
    lm.department_name,
    CONCAT(ISNULL(lm.business_unit_code, ''), ISNULL(lm.cost_centre_code, '')) AS cost_center_code,
    
    -- Pre-aggregated allowances (already safe from CTEs)
    COALESCE(ac.Transport_Allowance, 0) AS Transport_Allowance,
    COALESCE(ac.Transport_Allowance_Taxable, 0) AS Transport_Allowance_Taxable,
    COALESCE(ac.Housing_Amount, 0) AS Housing_Amount,
    COALESCE(ac.Housing_Allowance, 0) AS Housing_Allowance,
    COALESCE(ac.Unutilised_Housing, 0) AS Unutilised_Housing,
    COALESCE(ac.Entertainment_Allowance, 0) AS Entertainment_Allowance,
    COALESCE(ac.Entertainment_Allowance_Taxable, 0) AS Entertainment_Allowance_Taxable,
    COALESCE(ac.Car_Allowance, 0) AS Car_Allowance,
    COALESCE(ac.Car_Allowance_Taxable, 0) AS Car_Allowance_Taxable,
    COALESCE(ac.Rental_Allowance, 0) AS Rental_Allowance,
    COALESCE(ac.Fixed_Trans_Allowance, 0) AS Fixed_Trans_Allowance,
    COALESCE(ac.Cellphone_Allowance, 0) AS Cellphone_Allowance,
    COALESCE(ac.Rust_Allowance, 0) AS Rust_Allowance,
    COALESCE(ac.Car_Allowance_Fully_Taxable_On_Top, 0) AS Car_Allowance_Fully_Taxable_On_Top,
    COALESCE(ac.Other_Allowance, 0) AS Other_Allowance,
    COALESCE(ac.Utilities_Allowance, 0) AS Utilities_Allowance,
    
    -- Pre-aggregated deductions (already safe from CTEs)
    COALESCE(dc.Union_Deduction, 0) AS Union_Deduction,
    COALESCE(dc.Social_Security, 0) AS Social_Security,
    COALESCE(dc.Income_Tax, 0) AS Income_Tax,
    COALESCE(dc.Medical_Aid_Employee, 0) AS Medical_Aid_Employee,
    COALESCE(dc.Medical_Aid_Employer, 0) AS Medical_Aid_Employer,
    COALESCE(dc.Pension_Employee, 0) AS Pension_Employee,
    COALESCE(dc.Pension_Employer, 0) AS Pension_Employer,
    COALESCE(dc.Death_benefit, 0) AS Death_benefit,
    COALESCE(dc.Consulting_cost, 0) AS Consulting_cost,
    COALESCE(dc.Admin_cost, 0) AS Admin_cost,
    COALESCE(dc.Disability_benefit, 0) AS Disability_benefit,
    COALESCE(dc.Funeral_benefit, 0) AS Funeral_benefit
    
FROM dbo.Employee_TCTC_Archive ta
LEFT JOIN AllowancesCTE ac ON ta.emp_number = ac.emp_number AND ta.archive_year = ac.archive_year
LEFT JOIN DeductionsCTE dc ON ta.emp_number = dc.employee_number AND ta.archive_year = dc.archive_year
LEFT JOIN OracleData.dbo.EmployeeInformation lm ON ta.emp_number = lm.employee_number

GO

-- Add extended property for the fixed optimized view
EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'FIXED OPTIMIZED Archive view with data type safety. Handles non-numeric data in amount fields gracefully. Uses CTEs for pre-aggregation and improved performance.', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'VIEW', @level1name = N'v_EmployeeSalaryDetails_Archive'
GO

PRINT 'Fixed optimized view created successfully with data type safety!' 