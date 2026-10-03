# Сборка релизного архива расширения.
#
#   .\tools\build-release.ps1              # версия берётся из manifest.json
#   .\tools\build-release.ps1 -Version 1.11.1
#
# Что НЕ попадает в архив и почему:
#   README.md, package.json,
#   LICENSE                   — не нужны браузеру
#   assets\preview_*           — скриншоты для GitHub, расширение их не грузит
#                                (192 КБ мёртвого веса в каждой установке)
#   *.zip                     — чтобы архив не включал сам себя
#
# Compress-Archive в PowerShell 5.1 пишет обратные слэши в путях записей,
# поэтому архив собирается через System.IO.Compression с явным '/'.
param(
  [string]$Version = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not $Version) {
  $Version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
}
$out = Join-Path $root "strict-compact-tab-v$Version.zip"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $out) { Remove-Item $out -Force }

$skipNames = @('README.md', 'package.json', 'LICENSE')
$files = @()
$files += Get-ChildItem -Path $root -File |
  Where-Object { $_.Extension -ne '.zip' -and $_.Name -notin $skipNames }
foreach ($dir in @('app', 'assets', 'css', 'i18n', 'services', 'state', 'storage', 'src')) {
  $files += Get-ChildItem -Path (Join-Path $root $dir) -Recurse -File |
    Where-Object { $_.BaseName -notlike 'preview_*' }
}

$zip = [System.IO.Compression.ZipFile]::Open($out, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($file in $files) {
  $relative = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
  $entry = $zip.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
  $stream = $entry.Open()
  $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Dispose()
}
$zip.Dispose()

$sizeKb = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host "strict-compact-tab-v$Version.zip"
# считаем ровно то, что положили в архив, а не все файлы в папке:
# tests/, tools/ и README в сборку не входят
Write-Host "  записей: $($files.Count)"
Write-Host "  размер:  $sizeKb КБ"
Write-Host "  папка:   $out"
