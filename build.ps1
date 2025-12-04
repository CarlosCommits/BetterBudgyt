# BetterBudgyt Build Script
# Creates a zip file for Chrome Web Store submission

$extensionName = "BetterBudgyt"
$version = (Get-Content "manifest.json" | ConvertFrom-Json).version
$outputFile = "$extensionName-v$version.zip"

# Remove old zip if exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

# Files and folders to include
$includes = @(
    "manifest.json",
    "content.js",
    "popup.html",
    "popup.js",
    "styles.css",
    "images",
    "modules",
    "lib"
)

# Create temp directory
$tempDir = "build_temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files to temp directory
foreach ($item in $includes) {
    if (Test-Path $item) {
        Copy-Item $item -Destination $tempDir -Recurse
    } else {
        Write-Warning "Missing: $item"
    }
}

# Create zip
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputFile

# Cleanup
Remove-Item $tempDir -Recurse -Force

# Output result
$size = [math]::Round((Get-Item $outputFile).Length / 1KB, 1)
Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "  Output: $outputFile"
Write-Host "  Size: ${size} KB"
Write-Host ""
Write-Host "Next: Upload to Chrome Web Store Developer Dashboard"
