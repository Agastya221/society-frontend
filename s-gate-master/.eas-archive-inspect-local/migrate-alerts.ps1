# Simple script to replace Alert.alert -> AppAlert.show in remaining files
# and add AppAlert import

$files = @(
    "src\app\(admin)\payments.tsx",
    "src\app\(admin)\settings.tsx",
    "src\app\(admin)\vehicles.tsx",
    "src\app\(admin)\onboarding-requests\index.tsx",
    "src\app\(admin)\residents.tsx",
    "src\app\(admin)\notices.tsx",
    "src\app\(admin)\guards\[id].tsx",
    "src\app\(admin)\guards\index.tsx",
    "src\app\(admin)\gate-passes.tsx",
    "src\app\(admin)\emergencies.tsx",
    "src\app\(admin)\flats\index.tsx",
    "src\app\(admin)\flats\[id].tsx",
    "src\app\(admin)\elections\index.tsx",
    "src\app\(admin)\community\index.tsx",
    "src\app\(admin)\complaints\[id].tsx",
    "src\app\(admin)\complaints\index.tsx",
    "src\app\(admin)\gate-points.tsx"
)

$base = "c:\Users\javed\Desktop\s-gate-Ag\society-frontend\s-gate-master"
$importLine = "import { AppAlert } from '@/components/ui/AppAlert';"

foreach ($rel in $files) {
    $full = Join-Path $base $rel
    if (-not (Test-Path $full)) {
        Write-Host "SKIP (not found): $rel"
        continue
    }
    
    $content = [System.IO.File]::ReadAllText($full)
    
    # Check if file has Alert.alert
    if ($content -notmatch 'Alert\.alert\(') {
        Write-Host "SKIP (no Alert.alert): $rel"
        continue
    }
    
    # Step 1: Replace Alert.alert( -> AppAlert.show(
    $content = $content -replace 'Alert\.alert\(', 'AppAlert.show('
    
    # Step 2: Add AppAlert import if not present
    if ($content -notmatch 'AppAlert') {
        # This shouldn't happen since we just added AppAlert.show
        Write-Host "  WARNING: AppAlert not found after replacement in $rel"
    }
    
    if ($content -notmatch "import.*AppAlert.*from") {
        # Add import after the react-native import line
        $content = $content -replace "(from\s+'react-native'\s*;)", "`$1`nimport { AppAlert } from '@/components/ui/AppAlert';"
    }
    
    # Step 3: Remove Alert from react-native import if no longer needed
    # Check if 'Alert' is still referenced (not as 'AppAlert')
    $withoutAppAlert = $content -replace 'AppAlert', 'XXXXX'
    if ($withoutAppAlert -notmatch '\bAlert\b') {
        # Remove Alert from import destructure
        # Pattern: Alert, or , Alert or Alert\n or \nAlert
        $content = $content -replace '(\bimport\s*\{[^}]*)\bAlert\s*,\s*', '$1'
        $content = $content -replace '(\bimport\s*\{[^}]*),\s*Alert\b', '$1'
    }
    
    [System.IO.File]::WriteAllText($full, $content)
    Write-Host "DONE: $rel"
}

Write-Host "`nAll files processed!"
