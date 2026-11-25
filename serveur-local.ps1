# ==========================================================================
#  دعوة إلى موعد - خادم محلي بسيط بدون أي اعتماديات
#  الاستعمال:
#    powershell -ExecutionPolicy Bypass -File serveur-local.ps1
#    ثم افتح http://localhost:4173
# ==========================================================================
param(
  [int]$Port = 4173,
  [string]$Racine = $PSScriptRoot,
  [switch]$Open
)

if (-not $Racine) { $Racine = (Get-Location).Path }
$Racine = [System.IO.Path]::GetFullPath($Racine)

$mimes = @{
  '.html'  = 'text/html; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.js'    = 'application/javascript; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json'
  '.svg'   = 'image/svg+xml'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.jpeg'  = 'image/jpeg'
  '.webp'  = 'image/webp'
  '.gif'   = 'image/gif'
  '.ico'   = 'image/x-icon'
  '.woff'  = 'font/woff'
  '.woff2' = 'font/woff2'
  '.ttf'   = 'font/ttf'
  '.txt'   = 'text/plain; charset=utf-8'
  '.md'    = 'text/markdown; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
  $listener.Start()
} catch {
  Write-Host "Impossible de demarrer le serveur sur le port $Port : $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Essayez un autre port : -Port 4174" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "  دعوة إلى موعد est en ligne sur  http://localhost:$Port" -ForegroundColor Magenta
Write-Host "  Dossier servi : $Racine" -ForegroundColor DarkGray
Write-Host "  Ctrl + C pour arreter" -ForegroundColor DarkGray
Write-Host ""

if ($Open) {
  Start-Process "http://localhost:$Port"
}

$rootWithSep = $Racine.TrimEnd('\') + '\'

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }

  $req = $ctx.Request
  $res = $ctx.Response

  try {
    $chemin = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($chemin)) { $chemin = 'index.html' }

    $fichier = [System.IO.Path]::GetFullPath((Join-Path $Racine $chemin))

    if (-not $fichier.StartsWith($rootWithSep, [System.StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
      $msg = [System.Text.Encoding]::UTF8.GetBytes("403 - Acces refuse")
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.ContentLength64 = $msg.Length
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    elseif (Test-Path -LiteralPath $fichier -PathType Container) {
      $fichier = Join-Path $fichier 'index.html'
      if (Test-Path -LiteralPath $fichier -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($fichier).ToLower()
        $type = if ($mimes.ContainsKey($ext)) { $mimes[$ext] } else { 'application/octet-stream' }
        $octets = [System.IO.File]::ReadAllBytes($fichier)
        $res.ContentType = $type
        $res.ContentLength64 = $octets.Length
        $res.Headers.Add('Cache-Control', 'no-store')
        $res.OutputStream.Write($octets, 0, $octets.Length)
        Write-Host ("  200  " + $chemin) -ForegroundColor Green
      } else {
        $res.StatusCode = 404
        Write-Host ("  404  " + $chemin) -ForegroundColor Yellow
      }
    }
    elseif (Test-Path -LiteralPath $fichier -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($fichier).ToLower()
      $type = if ($mimes.ContainsKey($ext)) { $mimes[$ext] } else { 'application/octet-stream' }
      $octets = [System.IO.File]::ReadAllBytes($fichier)
      $res.ContentType = $type
      $res.ContentLength64 = $octets.Length
      $res.Headers.Add('Cache-Control', 'no-store')
      $res.OutputStream.Write($octets, 0, $octets.Length)
      Write-Host ("  200  " + $chemin) -ForegroundColor Green
    }
    else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - Fichier introuvable : " + $chemin)
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.ContentLength64 = $msg.Length
      $res.OutputStream.Write($msg, 0, $msg.Length)
      Write-Host ("  404  " + $chemin) -ForegroundColor Yellow
    }
  }
  catch {
    try {
      $res.StatusCode = 500
      Write-Host ("  500  " + $chemin) -ForegroundColor Red
    } catch {}
  }
  finally {
    try { $res.OutputStream.Close() } catch {}
  }
}