$ErrorActionPreference = 'Stop'
$demoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/experiments/inverse-canvas'))
$demoFiles = @('index.html', 'engine.mjs', 'transition.css', 'stage.mjs', 'stage.css', 'README.md') |
  ForEach-Object { Join-Path $demoRoot $_ }
$demoFiles | ForEach-Object { if (-not (Test-Path -LiteralPath $_ -PathType Leaf)) { throw "Missing demo file: $_" } }
Compress-Archive -LiteralPath $demoFiles -DestinationPath (Join-Path $demoRoot 'inverse-canvas.zip') -Force
Write-Output "Packaged inverse-canvas.zip (6 files)."
