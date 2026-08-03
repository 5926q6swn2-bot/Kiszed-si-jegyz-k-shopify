$ErrorActionPreference = 'Stop'

$appJsPath = "js\app.js"
$appJs = Get-Content -Path $appJsPath -Raw -Encoding UTF8

# Remove definitions
$appJs = $appJs -replace "(?m)^\s*let orders = \[\];\r?\n?", ""
$appJs = $appJs -replace "(?m)^\s*let sortableInstance = null;\r?\n?", ""
$appJs = $appJs -replace "(?m)^\s*let sortModeActive = false;\r?\n?", ""
$appJs = $appJs -replace "(?m)^\s*let editingOrderInternalId = null;\r?\n?", ""

# Replace Setters
$appJs = $appJs -replace 'orders = \[\];', 'Store.setOrders([]);'
$appJs = $appJs -replace 'orders = orders\.filter', 'Store.setOrders(Store.orders.filter'
$appJs = $appJs -replace 'orders = JSON\.parse', 'Store.setOrders(JSON.parse'

$appJs = $appJs -replace 'sortModeActive = !sortModeActive;', 'Store.setSortModeActive(!Store.sortModeActive);'
$appJs = $appJs -replace 'sortModeActive = false;', 'Store.setSortModeActive(false);'

$appJs = $appJs -replace 'sortableInstance = new Sortable', 'Store.setSortableInstance(new Sortable'
$appJs = $appJs -replace 'editingOrderInternalId = internalId;', 'Store.setEditingOrderInternalId(internalId);'
$appJs = $appJs -replace 'editingOrderInternalId = null;', 'Store.setEditingOrderInternalId(null);'

# Fix ES6 object shorthand BEFORE replacing getters
$appJs = $appJs -replace 'orders, orderList', 'orders: Store.orders, orderList'
$appJs = $appJs -replace 'sortModeActive\r?\n\s*\}\);', 'sortModeActive: Store.sortModeActive`n        });'

# Replace Getters
$appJs = [regex]::Replace($appJs, '(?<!\.|: )\borders\b(?!:)', 'Store.orders')
$appJs = [regex]::Replace($appJs, '(?<!\.|: )\bsortableInstance\b(?!:)', 'Store.sortableInstance')
$appJs = [regex]::Replace($appJs, '(?<!\.|: )\bsortModeActive\b(?!:)', 'Store.sortModeActive')
$appJs = [regex]::Replace($appJs, '(?<!\.|: )\beditingOrderInternalId\b(?!:)', 'Store.editingOrderInternalId')

# Fix any double-replacements
$appJs = $appJs -replace 'Store\.Store\.', 'Store.'

Set-Content -Path $appJsPath -Value $appJs -Encoding UTF8

Write-Host "Replaced Step 3 variables in app.js"
