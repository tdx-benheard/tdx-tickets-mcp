# Post-Build Pre-warming

**Problem:** After building, first request to each app is slow due to ASP.NET compilation and application initialization.

**Solution:** Pre-warm applications by hitting key endpoints to trigger compilation and startup.

## Pre-warming Instructions for Claude Code

**After building any web project, automatically run pre-warm for that project:**

- If built **TDWorkManagement** → Pre-warm TDWorkManagement
- If built **TDClient** → Pre-warm TDClient
- If built **TDAdmin** → Pre-warm TDAdmin
- If built **TDNext** → Pre-warm TDNext
- If built **full solution** → Pre-warm all apps

**Command:**
```bash
powershell -File .claude\claude-workflows\prewarm.ps1 -Projects "TDWorkManagement,TDClient"
```

**Examples:**
```bash
# After building TDClient only
powershell -File .claude\claude-workflows\prewarm.ps1 -Projects "TDClient"

# After building full solution
powershell -File .claude\claude-workflows\prewarm.ps1 -Projects "TDWorkManagement,TDClient,TDAdmin,TDNext"

# After building shared library that affects multiple apps
powershell -File .claude\claude-workflows\prewarm.ps1 -Projects "TDClient,TDNext"
```

## Pre-warm Script

Create `.claude\claude-workflows\prewarm.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Projects  # Comma-separated: "TDWorkManagement,TDClient,TDAdmin,TDNext"
)

$baseUrl = "http://localhost/TDDev"
$username = "bheard"
$password = "Password1!"

# Parse projects
$projectList = $Projects -split ',' | ForEach-Object { $_.Trim() }

Write-Host "Pre-warming applications..." -ForegroundColor Cyan

# Endpoint configurations
$endpoints = @{
    "TDWorkManagement" = @(
        "$baseUrl/TDWorkManagement/",
        "$baseUrl/TDWorkManagement/Home/Index"
    )
    "TDClient" = @(
        "$baseUrl/TDClient/",
        "$baseUrl/TDClient/Home/Desktop"
    )
    "TDAdmin" = @(
        "$baseUrl/TDAdmin/",
        "$baseUrl/TDAdmin/Home"
    )
    "TDNext" = @(
        "$baseUrl/TDNext/",
        "$baseUrl/TDNext/Home/Desktop",
        "$baseUrl/TDNext/Apps/627/Tickets/TicketDet?TicketID=555238"
    )
}

# Warm up each project in parallel
$jobs = @()
foreach ($project in $projectList) {
    if ($endpoints.ContainsKey($project)) {
        Write-Host "Pre-warming $project..." -ForegroundColor White

        foreach ($url in $endpoints[$project]) {
            $jobs += Start-Job -ScriptBlock {
                param($Url, $Project)
                try {
                    $response = Invoke-WebRequest -Uri $Url -Method GET `
                        -UseBasicParsing -TimeoutSec 30 `
                        -ErrorAction Stop `
                        -MaximumRedirection 5
                    return @{ Success = $true; Project = $Project; Status = $response.StatusCode; Url = $Url }
                }
                catch {
                    return @{ Success = $false; Project = $Project; Error = $_.Exception.Message; Url = $Url }
                }
            } -ArgumentList $url, $project
        }
    }
    else {
        Write-Host "  ⚠ Unknown project: $project" -ForegroundColor Yellow
    }
}

# Wait for all jobs and report results
if ($jobs.Count -gt 0) {
    Write-Host "`nWaiting for pre-warm requests..." -ForegroundColor Cyan
    $jobs | Wait-Job | Out-Null

    $results = $jobs | Receive-Job
    $jobs | Remove-Job

    Write-Host "`nResults:" -ForegroundColor Cyan
    foreach ($result in $results) {
        if ($result.Success) {
            Write-Host "  ✓ $($result.Project) - $($result.Status)" -ForegroundColor Green
        }
        else {
            Write-Host "  ✗ $($result.Project) - $($result.Error)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nPre-warm complete!" -ForegroundColor Green
```

## Configuration

**Local URLs:** All apps under `http://localhost/TDDev/`
- TDWorkManagement: `/TDWorkManagement/`
- TDClient: `/TDClient/`
- TDAdmin: `/TDAdmin/`
- TDNext: `/TDNext/`

**Credentials:** `bheard / Password1!`

**Timing:** Takes ~5-15 seconds depending on number of apps

**Notes:**
- Script hits main entry points for each app to trigger compilation
- Runs requests in parallel to save time
- TDNext includes ticket detail page to warm up ticket module
- Safe to run multiple times
