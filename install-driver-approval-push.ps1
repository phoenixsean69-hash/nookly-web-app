param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FilesRoot = Join-Path $PackageRoot "files"

$pagePath = Join-Path $ProjectRoot "app\dashboard\drivers\[id]\page.tsx"
$serviceTarget = Join-Path $ProjectRoot "lib\push-notification.service.ts"
$functionTarget = Join-Path $ProjectRoot "functions\nookly-push-api"

if (-not (Test-Path -LiteralPath $pagePath)) {
  throw "Could not find app/dashboard/drivers/[id]/page.tsx under $ProjectRoot"
}

Write-Step "Creating a backup of the driver approval page"
$backupPath = "$pagePath.before-driver-push.bak"
Copy-Item -LiteralPath $pagePath -Destination $backupPath -Force
Write-Host "Backup: $backupPath"

Write-Step "Copying the web push service"
New-Item -ItemType Directory -Path (Split-Path -Parent $serviceTarget) -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $FilesRoot "lib\push-notification.service.ts") -Destination $serviceTarget -Force

Write-Step "Copying the Nookly Push API source into the web repository"
New-Item -ItemType Directory -Path $functionTarget -Force | Out-Null
Copy-Item -Path (Join-Path $FilesRoot "functions\nookly-push-api\*") -Destination $functionTarget -Recurse -Force

Write-Step "Connecting driver approval to push delivery"
$page = Get-Content -LiteralPath $pagePath -Raw

$importLine = 'import { sendDriverApprovedPushNotification } from "@/lib/push-notification.service";'
if (-not $page.Contains($importLine)) {
  $importMarker = @'
} from "@/lib/driver-review.service";
import type {
'@
  $importReplacement = @'
} from "@/lib/driver-review.service";
import { sendDriverApprovedPushNotification } from "@/lib/push-notification.service";
import type {
'@

  if (-not $page.Contains($importMarker)) {
    throw "Could not locate the driver-review import block. The page may have changed. Restore from $backupPath if necessary."
  }

  $page = $page.Replace($importMarker, $importReplacement)
}

$oldApprovalBlock = @'
      setApplication(result);
      setShowApproveDialog(false);
      toast.success(`${result.profile.name} is now an approved driver.`);
      window.dispatchEvent(new CustomEvent("driverApplicationsUpdated"));
'@

$newApprovalBlock = @'
      setApplication(result);
      setShowApproveDialog(false);

      try {
        const pushResult = await sendDriverApprovedPushNotification({
          recipientUserId: result.profile.userId,
          driverId: result.profile.$id,
          organizationId: result.institution.organizationId,
        });

        if (pushResult.accepted > 0) {
          toast.success(
            `${result.profile.name} is approved and has been notified.`,
          );
        } else {
          toast.success(`${result.profile.name} is now an approved driver.`);
          toast.error(
            pushResult.message ||
              "The driver has no active device token, so no push was delivered.",
          );
        }
      } catch (pushError) {
        console.error(
          "Driver approval succeeded, but push notification failed:",
          pushError,
        );
        toast.success(`${result.profile.name} is now an approved driver.`);
        toast.error(
          pushError instanceof Error
            ? `Approval succeeded, but notification failed: ${pushError.message}`
            : "Approval succeeded, but the driver notification could not be sent.",
        );
      }

      window.dispatchEvent(new CustomEvent("driverApplicationsUpdated"));
'@

if (-not $page.Contains("sendDriverApprovedPushNotification({")) {
  if (-not $page.Contains($oldApprovalBlock)) {
    throw "Could not locate the current approval success block. The page may have changed. Restore from $backupPath if necessary."
  }

  $page = $page.Replace($oldApprovalBlock, $newApprovalBlock)
}

Set-Content -LiteralPath $pagePath -Value $page -Encoding utf8

Write-Step "Checking required files"
$required = @(
  $pagePath,
  $serviceTarget,
  (Join-Path $functionTarget "package.json"),
  (Join-Path $functionTarget "src\main.js")
)

foreach ($file in $required) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Required file is missing after installation: $file"
  }
  Write-Host "OK  $file" -ForegroundColor Green
}

Write-Host "`nDriver approval push integration installed." -ForegroundColor Green
Write-Host "Next run: npm run build"
Write-Host "Then deploy deployment/nookly-push-api-v1.4.3.tar.gz to the existing push Function."
