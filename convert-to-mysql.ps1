# Script to convert SQL Server script to MySQL
$inputFile = "quanlyquan.sql"
$outputFile = "quanlyquan_mysql.sql"

Write-Host "Reading file: $inputFile"
$content = Get-Content $inputFile -Raw -Encoding UTF8

Write-Host "Converting SQL Server syntax to MySQL..."

# Remove GO statements
$content = $content -replace '(?m)^GO\s*$', ''

# Remove SET ANSI_NULLS and SET QUOTED_IDENTIFIER
$content = $content -replace '(?m)^SET\s+(ANSI_NULLS|QUOTED_IDENTIFIER)\s+(ON|OFF)\s*$', ''

# Remove comments with Object and Script Date
$content = $content -replace '/\*\*\*\*\s+Object:.*?\*\*\*\*/', ''

# Replace [dbo]. with empty or database name (keeping table names)
$content = $content -replace '\[dbo\]\.', ''

# Replace nvarchar with VARCHAR or TEXT BEFORE replacing brackets
$content = $content -replace '\[nvarchar\]\(max\)', 'TEXT'
$content = $content -replace '\[nvarchar\]\((\d+)\)', 'VARCHAR($1)'
$content = $content -replace 'nvarchar\(max\)', 'TEXT'
$content = $content -replace 'nvarchar\((\d+)\)', 'VARCHAR($1)'

# Replace bit with TINYINT(1) (MySQL uses TINYINT(1) for boolean, BOOLEAN is just an alias)
$content = $content -replace '\[bit\]', 'TINYINT(1)'
$content = $content -replace '\bbit\b', 'TINYINT(1)'

# Replace datetime2 with DATETIME BEFORE replacing brackets
$content = $content -replace '\[datetime2\]\(7\)', 'DATETIME(6)'
$content = $content -replace '\[datetime2\]\((\d+)\)', 'DATETIME($1)'
$content = $content -replace 'datetime2\(7\)', 'DATETIME(6)'
$content = $content -replace 'datetime2\((\d+)\)', 'DATETIME($1)'

# Replace datetimeoffset with DATETIME
$content = $content -replace '\[datetimeoffset\]\(7\)', 'DATETIME(6)'
$content = $content -replace '\[datetimeoffset\]\((\d+)\)', 'DATETIME($1)'
$content = $content -replace 'datetimeoffset\(7\)', 'DATETIME(6)'
$content = $content -replace 'datetimeoffset\((\d+)\)', 'DATETIME($1)'

# Replace time(7) with TIME
$content = $content -replace '\[time\]\(7\)', 'TIME(6)'
$content = $content -replace '\[time\]\((\d+)\)', 'TIME($1)'
$content = $content -replace 'time\(7\)', 'TIME(6)'
$content = $content -replace 'time\((\d+)\)', 'TIME($1)'

# Replace square brackets with backticks for identifiers (do this BEFORE other replacements)
$content = $content -replace '\[', '`'
$content = $content -replace '\]', '`'

# Fix VARCHAR(450) in PRIMARY KEY columns to VARCHAR(191) to avoid "key too long" error
# MySQL has a limit of 3072 bytes for index keys, and utf8mb4 uses 4 bytes per character
# 191 * 4 = 764 bytes (safe), 450 * 4 = 1800 bytes (too long for composite keys)
# Common ASP.NET Identity columns that are PRIMARY KEY: Id, UserId, RoleId
# Fix all VARCHAR(450) that are in tables with PRIMARY KEY containing these columns
$content = $content -replace '`Id`\s+VARCHAR\(450\)', '`Id` VARCHAR(191)'
$content = $content -replace '`UserId`\s+VARCHAR\(450\)', '`UserId` VARCHAR(191)'
$content = $content -replace '`RoleId`\s+VARCHAR\(450\)', '`RoleId` VARCHAR(191)'

# Replace IDENTITY(1,1) with AUTO_INCREMENT
$content = $content -replace 'IDENTITY\(1,1\)', 'AUTO_INCREMENT'

# Remove backticks around data types (MySQL doesn't need them)
$content = $content -replace '`int`', 'INT'
$content = $content -replace '`decimal`', 'DECIMAL'
$content = $content -replace '`float`', 'FLOAT'
$content = $content -replace '`double`', 'DOUBLE'
$content = $content -replace '`bigint`', 'BIGINT'
$content = $content -replace '`smallint`', 'SMALLINT'
$content = $content -replace '`tinyint`', 'TINYINT'
$content = $content -replace '`money`', 'DECIMAL(19,4)'
$content = $content -replace '`smallmoney`', 'DECIMAL(10,4)'

# Remove CLUSTERED from PRIMARY KEY
$content = $content -replace 'PRIMARY KEY CLUSTERED', 'PRIMARY KEY'

# Remove WITH options from PRIMARY KEY
$content = $content -replace '(?s)WITH\s*\([^)]*\)\s*ON\s*`PRIMARY`', ''
$content = $content -replace 'ON\s*`PRIMARY`', ''

# Remove TEXTIMAGE_ON [PRIMARY] and any remaining TEXTIMAGE_
$content = $content -replace 'TEXTIMAGE_ON\s*`PRIMARY`', ''
$content = $content -replace 'TEXTIMAGE_', ''

# Remove WITH CHECK from ALTER TABLE ADD CONSTRAINT
$content = $content -replace 'WITH CHECK ADD CONSTRAINT', 'ADD CONSTRAINT'
$content = $content -replace '\s+WITH CHECK ADD\s+', ' ADD '

# Remove CHECK CONSTRAINT statements (MySQL doesn't need them)
$content = $content -replace '(?m)^ALTER TABLE `[^`]+` CHECK CONSTRAINT `[^`]+`\s*$', ''

# Replace DEFAULT (N'') with DEFAULT ''
$content = $content -replace "DEFAULT\s*\(N''\)", "DEFAULT ''"

# Replace DEFAULT (CONVERT([bit],(0))) with DEFAULT 0 for TINYINT(1)
$content = $content -replace 'DEFAULT\s*\(CONVERT\(`TINYINT\(1\)`,\(0\)\)\)', 'DEFAULT 0'
$content = $content -replace 'DEFAULT\s*\(CONVERT\(TINYINT\(1\),\(0\)\)\)', 'DEFAULT 0'
$content = $content -replace 'DEFAULT\s*\(CONVERT\(`bit`,\(0\)\)\)', 'DEFAULT 0'
$content = $content -replace 'DEFAULT\s*\(CONVERT\(\[bit\],\(0\)\)\)', 'DEFAULT 0'
$content = $content -replace 'DEFAULT\s*\(CONVERT\(`BOOLEAN`,\(0\)\)\)', 'DEFAULT 0'
$content = $content -replace 'DEFAULT\s*\(CONVERT\(BOOLEAN,\(0\)\)\)', 'DEFAULT 0'

# Replace DEFAULT ((0)) with DEFAULT 0
$content = $content -replace 'DEFAULT\s*\(\(0\)\)', 'DEFAULT 0'

# Remove computed columns (PERSISTED columns) - MySQL doesn't support them the same way
$content = $content -replace ',\s*`[^`]+`\s+AS\s+\([^)]+\)\s+PERSISTED', ''

# Remove ASC from PRIMARY KEY (MySQL doesn't need it)
# Must be done before bracket replacement to catch [ASC]
$content = $content -replace '\s+ASC\s*\)', ')'
$content = $content -replace '\s+ASC\s*,', ','
$content = $content -replace '\s+ASC\s*$', ''
$content = $content -replace 'ASC\s*\)', ')'
$content = $content -replace 'ASC\s*,', ','
$content = $content -replace 'ASC\s*$', ''

# Add ENGINE, CHARSET and semicolon to CREATE TABLE statements
# Process line by line to handle multiline CREATE TABLE statements
$lines = $content -split "`r?`n"
$newLines = @()
$createTableStart = -1
$parenLevel = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $trimmedLine = $line.Trim()
    
    # Check if this line starts a CREATE TABLE
    if ($trimmedLine -match '^CREATE TABLE') {
        $createTableStart = $i
        $parenLevel = 0
    }
    
    # If we're inside a CREATE TABLE, track parentheses
    if ($createTableStart -ge 0) {
        $openParens = ([regex]::Matches($line, '\(')).Count
        $closeParens = ([regex]::Matches($line, '\)')).Count
        $parenLevel += $openParens - $closeParens
        
        # If parentheses are balanced, we've reached the end of CREATE TABLE
        if ($parenLevel -eq 0) {
            # Check if line already has ENGINE clause
            if ($trimmedLine -notmatch 'ENGINE=') {
                # Remove trailing whitespace and add ENGINE clause with semicolon
                $line = $line.TrimEnd() + ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
            }
            elseif ($trimmedLine -notmatch ';$') {
                # Has ENGINE but no semicolon
                $line = $line.TrimEnd() + ';'
            }
            
            $createTableStart = -1
        }
    }
    
    $newLines += $line
}

$content = $newLines -join "`r`n"

# Remove USE [master] and ALTER DATABASE statements
$content = $content -replace '(?m)^USE\s+`master`\s*$', ''
$content = $content -replace '(?m)^USE\s+\[master\]\s*$', ''
$content = $content -replace '(?m)^ALTER\s+DATABASE.*?$', ''

# Remove NONCLUSTERED from CREATE INDEX (MySQL doesn't support it)
$content = $content -replace 'NONCLUSTERED\s+INDEX', 'INDEX'

# Remove INCLUDE clause from CREATE INDEX (MySQL doesn't support it)
$content = $content -replace '(?s)INCLUDE\s*\([^)]+\)', ''

# Remove WHERE clause from CREATE INDEX (MySQL supports WHERE but syntax is different, remove for now)
$content = $content -replace '(?s)WHERE\s*\([^)]+\)', ''

# Remove SET ANSI_PADDING statements (MySQL doesn't need it)
$content = $content -replace '(?m)^SET\s+ANSI_PADDING\s+(ON|OFF)\s*$', ''

# Fix CREATE INDEX statements - add missing closing parenthesis and semicolon
# Process CREATE INDEX statements line by line
$lines = $content -split "`r?`n"
$newLines = @()
$inCreateIndex = $false
$indexBuffer = ""
$indexParenLevel = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $trimmedLine = $line.Trim()
    
    # Check if this line starts a CREATE INDEX
    if ($trimmedLine -match '^CREATE\s+(UNIQUE\s+)?INDEX') {
        $inCreateIndex = $true
        $indexBuffer = $line
        $indexParenLevel = 0
    }
    elseif ($inCreateIndex) {
        $indexBuffer += "`n" + $line
        $openParens = ([regex]::Matches($line, '\(')).Count
        $closeParens = ([regex]::Matches($line, '\)')).Count
        $indexParenLevel += $openParens - $closeParens
        
        # If parentheses are balanced or we hit a comment/next statement, we've reached the end
        if ($indexParenLevel -eq 0 -or $trimmedLine -match '^/|\*\*\*\*') {
            # If we hit a comment before closing paren, add the closing paren
            if ($indexParenLevel -gt 0) {
                $indexBuffer = $indexBuffer.TrimEnd() + ')'
            }
            
            # Ensure semicolon
            if ($indexBuffer -notmatch ';$') {
                $indexBuffer = $indexBuffer.TrimEnd() + ';'
            }
            
            $newLines += $indexBuffer
            $inCreateIndex = $false
            $indexBuffer = ""
            $indexParenLevel = 0
            
            # If we hit a comment, add it as a new line
            if ($trimmedLine -match '^/|\*\*\*\*') {
                $newLines += $line
            }
            continue
        }
    }
    else {
        $newLines += $line
    }
}

# If we're still in a CREATE INDEX at the end, add it
if ($inCreateIndex -and $indexBuffer) {
    if ($indexParenLevel -gt 0) {
        $indexBuffer = $indexBuffer.TrimEnd() + ')'
    }
    if ($indexBuffer -notmatch ';$') {
        $indexBuffer = $indexBuffer.TrimEnd() + ';'
    }
    $newLines += $indexBuffer
}

$content = $newLines -join "`r`n"

# Fix ALTER TABLE ADD CONSTRAINT - remove semicolon after FOREIGN KEY column list (wrong position)
$content = $content -replace 'FOREIGN KEY\(`([^`]+)`\);', 'FOREIGN KEY(`$1`)'

# Ensure ALTER TABLE ADD CONSTRAINT statements end with semicolon (after REFERENCES, not after FOREIGN KEY)
$content = $content -replace '(ALTER TABLE `[^`]+` ADD CONSTRAINT `[^`]+` FOREIGN KEY\(`[^`]+`\)\s*REFERENCES `[^`]+` \(`[^`]+`\)(?:\s+ON DELETE[^)]+)?)\s*(?=\n|$)(?!;)', '$1;'

# Fix cases where statements are concatenated without newlines
$content = $content -replace '\);ALTER TABLE', "`r`n`r`nALTER TABLE"
$content = $content -replace '\);CREATE', "`r`n`r`nCREATE"
$content = $content -replace '\);/', "`r`n/"

# Add MySQL specific settings at the beginning
$mysqlHeader = @"
-- MySQL version of quanlyquan.sql
-- Converted from SQL Server script
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

"@

$content = $mysqlHeader + $content

# Add MySQL specific settings at the end
$mysqlFooter = @"

SET FOREIGN_KEY_CHECKS = 1;
"@

$content = $content + $mysqlFooter

# Clean up multiple blank lines
$content = $content -replace '(?m)^\s*$\r?\n^\s*$\r?\n', "`r`n"

Write-Host "Writing converted file: $outputFile"
$content | Out-File -FilePath $outputFile -Encoding UTF8 -NoNewline

Write-Host "Conversion completed!"
Write-Host "Output file: $outputFile"

