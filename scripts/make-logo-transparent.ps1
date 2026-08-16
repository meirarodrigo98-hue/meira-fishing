Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot '..\assets\logo.png'
$dst = Join-Path $PSScriptRoot '..\assets\logo-transparent.png'

$bmp = [System.Drawing.Bitmap]::FromFile($src)
$new = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $bmp.Height; $y++) {
  for ($x = 0; $x -lt $bmp.Width; $x++) {
    $c = $bmp.GetPixel($x, $y)
    if ($c.R -gt 235 -and $c.G -gt 235 -and $c.B -gt 235) {
      $nc = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
    } else {
      $nc = [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B)
    }
    $new.SetPixel($x, $y, $nc)
  }
}

$new.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$new.Dispose()
Write-Output "Created $dst"
