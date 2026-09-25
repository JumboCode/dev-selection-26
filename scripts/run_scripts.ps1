param(
    # Raw Google Form responses exported as CSV
    [string]$ApplicationsCsv = (Join-Path -Path (Get-Location) -ChildPath "JumboCode Developer Application 26_27 (Responses) - Form Responses 1.csv")
)

$scriptPath = Join-Path -Path (Get-Location) -ChildPath "scripts\parse_application_data.py"
$namesListPath = Join-Path -Path (Get-Location) -ChildPath "data\lotr_names.csv"
$outputPath = Join-Path -Path (Get-Location) -ChildPath "scripts\out"

if (-Not (Test-Path -Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath | Out-Null
}

python $scriptPath $ApplicationsCsv $namesListPath -o $outputPath
