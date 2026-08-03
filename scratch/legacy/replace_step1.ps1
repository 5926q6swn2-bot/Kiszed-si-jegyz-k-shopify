$ErrorActionPreference = 'Stop'
$appJsPath = "js\app.js"
$content = Get-Content -Path $appJsPath -Raw -Encoding UTF8

# Add Import
if ($content -notmatch "import \{ Store \} from '\./store/state\.js';") {
    $content = $content -replace "(?m)^import \{ CustomDialog \} from '\./utils/dialog\.js';", "import { CustomDialog } from './utils/dialog.js';`nimport { Store } from './store/state.js';"
}

# Remove definitions
$content = $content -replace "(?m)^\s*let currentLoadedRunId = null;\r?\n?", ""
$content = $content -replace "(?m)^\s*let originalLoadedRun = null;\r?\n?", ""
$content = $content -replace "(?m)^\s*let mergeSelectionMode = false;\r?\n?", ""

# Replace Setters
$content = $content -replace 'currentLoadedRunId = null;', 'Store.setCurrentLoadedRunId(null);'
$content = $content -replace 'originalLoadedRun = null;', 'Store.setOriginalLoadedRun(null);'
$content = $content -replace 'currentLoadedRunId = newRun \? newRun\.id : Store\.currentLoadedRunId;', 'Store.setCurrentLoadedRunId(newRun ? newRun.id : Store.currentLoadedRunId);'
$content = $content -replace 'originalLoadedRun = newRun \? JSON\.parse\(JSON\.stringify\(newRun\)\) : null;', 'Store.setOriginalLoadedRun(newRun ? JSON.parse(JSON.stringify(newRun)) : null);'
$content = $content -replace 'currentLoadedRunId = run\.id;', 'Store.setCurrentLoadedRunId(run.id);'
$content = $content -replace 'originalLoadedRun = JSON\.parse\(JSON\.stringify\(run\)\);', 'Store.setOriginalLoadedRun(JSON.parse(JSON.stringify(run)));'
$content = $content -replace 'originalLoadedRun = await HistoryManager\.getRunById\(Store\.currentLoadedRunId\);', 'Store.setOriginalLoadedRun(await HistoryManager.getRunById(Store.currentLoadedRunId));'
$content = $content -replace 'mergeSelectionMode = true;', 'Store.setMergeSelectionMode(true);'
$content = $content -replace 'mergeSelectionMode = false;', 'Store.setMergeSelectionMode(false);'

# The regex below will replace getters, but we must run Setters first (which we just did)
# However, note that in `Store.setCurrentLoadedRunId(...)` we might have created a new string `Store.currentLoadedRunId`.
# To avoid double-replacing, we use word boundaries (\b).
$content = $content -replace '\bcurrentLoadedRunId\b', 'Store.currentLoadedRunId'
$content = $content -replace '\boriginalLoadedRun\b', 'Store.originalLoadedRun'
$content = $content -replace '\bmergeSelectionMode\b', 'Store.mergeSelectionMode'

# Fix any double replacements (Store.Store.currentLoadedRunId)
$content = $content -replace 'Store\.Store\.', 'Store.'

Set-Content -Path $appJsPath -Value $content -Encoding UTF8
Write-Host "Replaced Step 1 variables"
