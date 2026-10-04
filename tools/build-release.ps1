# Сборка релизного архива расширения.
#
#   .\tools\build-release.ps1              # версия берётся из manifest.json
#   .\tools\build-release.ps1 -Version 1.11.2
#   .\tools\build-release.ps1 -OutDir D:\releases
#
# Архив кладётся ЗА пределы репо (по умолчанию — Рабочий стол): zip релиза
# не должен появляться в папке проекта. Место релизных архивов — GitHub
# Releases и загрузка в сторы, не репозиторий.
#
# Что НЕ попадает в архив и почему:
#   *.md (README.md, СВОДКА.md),
#   package.json, package-lock.json — зависимости рантайму не нужны,
#   LICENSE                   — не нужны браузеру; рабочая сводка и вовсе
#                               не должна покидать проект
#   assets\preview_*          — скриншоты для GitHub, расширение их не грузит
#                                (192 КБ мёртвого веса в каждой установке)
#   *.zip                     — чтобы архив не включал сам себя
#   файлы инструментов разработки (tsconfig.json, eslint.config.js,
#   .prettierrc.json, .prettierignore, .editorconfig, .gitignore,
#   .gitattributes)           — браузер их не читает вообще. Раньше они
#                               уезжали в релиз: корневые файлы копировались
#                               все подряд, кроме явного списка ниже, а
#                               dotfiles и конфиги в него не входили.
#
# Compress-Archive в PowerShell 5.1 пишет обратные слэши в путях записей,
# поэтому архив собирается через System.IO.Compression с явным '/'.
param(
  [string]$Version = '',
  [string]$OutDir = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not $Version) {
  $Version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
}
if (-not $OutDir) {
  $OutDir = [Environment]::GetFolderPath('Desktop')
}
$out = Join-Path $OutDir "strict-compact-tab-v$Version.zip"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $out) { Remove-Item $out -Force }

# Файлы, которых в релизе быть не должно (по имени, в корне проекта).
$skipNames = @(
  'README.md', 'СВОДКА.md', 'LICENSE',
  'package.json', 'package-lock.json',
  'tsconfig.json', 'eslint.config.js',
  '.prettierrc.json', '.prettierignore',
  '.editorconfig', '.gitignore', '.gitattributes'
)
$files = @()
$files += Get-ChildItem -Path $root -File |
  Where-Object { $_.Extension -notin '.zip', '.md' -and $_.Name -notin $skipNames }
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
