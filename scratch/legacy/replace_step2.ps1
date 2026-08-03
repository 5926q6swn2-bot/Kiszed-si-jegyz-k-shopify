$ErrorActionPreference = 'Stop'

$appJsPath = "js\app.js"
$historyViewPath = "js\views\historyView.js"

# 1. Update app.js
$appJs = Get-Content -Path $appJsPath -Raw -Encoding UTF8
$appJs = $appJs -replace "(?m)^\s*const selectedForMerge = new Set\(\);\r?\n?", ""

# Replace usages in app.js
$appJs = $appJs -replace 'selectedForMerge\.clear\(\)', 'Store.clearSelectedForMerge()'
$appJs = $appJs -replace 'selectedForMerge\.size', 'Store.selectedForMerge.size'
$appJs = $appJs -replace 'selectedForMerge\.add\(', 'Store.addToSelectedForMerge('
$appJs = $appJs -replace 'selectedForMerge\.delete\(', 'Store.removeFromSelectedForMerge('
$appJs = $appJs -replace 'Array\.from\(selectedForMerge\)', 'Array.from(Store.selectedForMerge)'

# Remove selectedForMerge from ctx injection
$appJs = $appJs -replace 'selectedForMerge,\s*\n\s*', ''

Set-Content -Path $appJsPath -Value $appJs -Encoding UTF8

# 2. Update historyView.js
$historyView = Get-Content -Path $historyViewPath -Raw -Encoding UTF8

if ($historyView -notmatch "import \{ Store \} from '\.\./store/state\.js';") {
    $historyView = $historyView -replace "(?m)^import \{ HistoryManager \} from '\.\./services/history\.js';", "import { HistoryManager } from '../services/history.js';`nimport { Store } from '../store/state.js';"
}

# Remove selectedForMerge from ctx destructuring
$historyView = $historyView -replace 'selectedForMerge,\s*\n\s*', ''

# Replace usage
$historyView = $historyView -replace 'selectedForMerge\.has\(', 'Store.selectedForMerge.has('

Set-Content -Path $historyViewPath -Value $historyView -Encoding UTF8

Write-Host "Replaced Step 2 variables"
