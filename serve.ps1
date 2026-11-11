param(
  [int]$Port = 8080,
  [int]$MaxRequests = 0
)

$ErrorActionPreference = 'Stop'
$rootFull = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $rootFull.TrimEnd('\') + '\'

$mimeTypes = @{
  '.html'        = 'text/html; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.js'          = 'application/javascript; charset=utf-8'
  '.json'        = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.ico'         = 'image/x-icon'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $Port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
}

Write-Output "Serving $rootFull at http://localhost:$Port/"
[Console]::Out.Flush()

$handled = 0
try {
  while ($MaxRequests -le 0 -or $handled -lt $MaxRequests) {
    if (-not $listener.Pending()) {
      Start-Sleep -Milliseconds 30
      continue
    }
    $handled++
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $stream.ReadTimeout = 5000
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

      while ($true) {
        $headerLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($headerLine)) { break }
      }

      $parts = $requestLine.Split(' ')
      $method = if ($parts.Length -ge 1) { $parts[0].ToUpperInvariant() } else { 'GET' }
      $rawTarget = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
      $rawPath = ($rawTarget.Split('?')[0])
      $decodedPath = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
      if ([string]::IsNullOrEmpty($decodedPath)) { $decodedPath = 'index.html' }

      $relPath = $decodedPath -replace '/', '\'
      $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootFull, $relPath))

      $statusCode = 200
      $statusText = 'OK'
      $contentType = 'application/octet-stream'
      [byte[]]$bodyBytes = @()

      if (-not ($candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or $candidate.Equals($rootFull, [System.StringComparison]::OrdinalIgnoreCase))) {
        $statusCode = 403
        $statusText = 'Forbidden'
        $contentType = 'text/plain; charset=utf-8'
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
      } elseif (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = [System.IO.Path]::Combine($candidate, 'index.html')
      }

      if ($statusCode -eq 200) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
          $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
          if ($mimeTypes.ContainsKey($ext)) {
            $contentType = $mimeTypes[$ext]
          }
          $bodyBytes = [System.IO.File]::ReadAllBytes($candidate)
        } else {
          $statusCode = 404
          $statusText = 'Not Found'
          $contentType = 'text/plain; charset=utf-8'
          $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        }
      }

      $headers = @(
        "HTTP/1.1 $statusCode $statusText"
        "Content-Type: $contentType"
        "Content-Length: $($bodyBytes.Length)"
        "Cache-Control: no-cache"
        "Connection: close"
        ""
        ""
      ) -join "`r`n"

      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      if ($method -ne 'HEAD' -and $bodyBytes.Length -gt 0) {
        $stream.Write($bodyBytes, 0, $bodyBytes.Length)
      }
      $stream.Flush()
    } catch {
      # Ignore transient client disconnect errors
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
