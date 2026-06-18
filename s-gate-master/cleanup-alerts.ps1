# Cleanup script: remove unused Alert imports from react-native
# These files had Alert.alert replaced by the script but Alert wasn't removed from import

$files = @(
    "src\app\(admin)\payments.tsx",
    "src\app\(admin)\settings.tsx",
    "src\app\(admin)\vehicles.tsx",
    "src\app\(admin)\onboarding-requests\index.tsx",
    "src\app\(admin)\residents.tsx",
    "src\app\(admin)\notices.tsx",
    "src\app\(admin)\guards\index.tsx",
    "src\app\(admin)\gate-passes.tsx",
    "src\app\(admin)\emergencies.tsx",
    "src\app\(admin)\flats\index.tsx",
    "src\app\(admin)\elections\index.tsx",
    "src\app\(admin)\community\index.tsx",
    "src\app\(admin)\complaints\index.tsx",
    "src\app\(admin)\gate-points.tsx",
    "src\app\(resident)\profile\_components\HouseholdGrid.tsx",
    "src\app\(resident)\elections\index.tsx"
)

$base = "c:\Users\javed\Desktop\s-gate-Ag\society-frontend\s-gate-master"

foreach ($rel in $files) {
    $full = Join-Path $base $rel
    if (-not (Test-Path -LiteralPath $full)) {
        Write-Host "SKIP (not found): $rel"
        continue
    }
    
    $content = [System.IO.File]::ReadAllText($full)
    
    # Check if Alert is imported
    if ($content -notmatch '\bAlert\b') {
        Write-Host "SKIP (no Alert): $rel"
        continue
    }
    
    # Check if Alert is used (not just in import or AppAlert)
    $contentNoImport = $content -replace "import\s*\{[^}]*\}\s*from\s*'react-native'\s*;", ''
    $contentNoAppAlert = $contentNoImport -replace 'AppAlert', 'XXXXX'
    
    if ($contentNoAppAlert -match '\bAlert\b') {
        Write-Host "SKIP (Alert still used): $rel"
        continue
    }
    
    # Remove Alert from import: handle various patterns
    # Pattern 1: Alert,\n or Alert, (with possible whitespace)
    $content = $content -replace '\s*Alert,\s*\n', "`n"
    $content = $content -replace '\s*Alert,\s*', ' '
    # Pattern 2: , Alert (at end or before })
    $content = $content -replace ',\s*Alert\s*', ' '
    
    [System.IO.File]::WriteAllText($full, $content)
    Write-Host "CLEANED: $rel"
}

Write-Host "`nCleanup complete!"
