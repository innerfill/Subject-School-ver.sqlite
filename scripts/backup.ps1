# backup.ps1 — run via Windows Task Scheduler
# Arguments: -ProjectDir "C:\path\to\subjectschool" -KeepDays 30

param(
    [string]$ProjectDir = "C:\Users\Palanuw4t\Documents\subjectschool",
    [string]$MysqlDump  = "C:\xampp\mysql\bin\mysqldump.exe",
    [string]$DbName     = "school_schedule",
    [string]$DbUser     = "root",
    [string]$DbPass     = "",
    [int]$KeepDays      = 30
)

$backupDir = Join-Path $ProjectDir "backups"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Force $backupDir | Out-Null }

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$outFile   = Join-Path $backupDir "school_schedule_$timestamp.sql"

$passArg = if ($DbPass) { "-p$DbPass" } else { $null }
$allArgs = @("-u$DbUser") + @(if ($passArg) { $passArg }) + @("--default-character-set=utf8mb4", "--single-transaction", "--routines", $DbName)

& $MysqlDump @allArgs | Out-File -FilePath $outFile -Encoding utf8

if ($LASTEXITCODE -eq 0) {
    Write-Output "Backup saved: $outFile"
} else {
    Write-Error "mysqldump failed (exit $LASTEXITCODE)"
    exit 1
}

# cleanup: delete files older than KeepDays
Get-ChildItem $backupDir -Filter "*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Output "Deleted old backup: $($_.Name)" }
