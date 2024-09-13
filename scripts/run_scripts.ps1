$scriptPath = Join-Path -Path (Get-Location) -ChildPath "scripts\parse_application_data.py"
$dataPath = Join-Path -Path (Get-Location) -ChildPath "data\new_test_apps.csv"
$namesListPath = Join-Path -Path (Get-Location) -ChildPath "data\lotr_names.csv"
$outputPath = Join-Path -Path (Get-Location) -ChildPath "scripts\out"

if (-Not (Test-Path -Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath | Out-Null
}

python $scriptPath $dataPath $namesListPath -o $outputPath
