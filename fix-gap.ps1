# Fix gap for all WXSS files in pages/
$base = "C:\Users\rain\WorkBuddy\20260411012625\study-checkin-miniapp-master"
Get-ChildItem -Path "$base\pages" -Recurse -Include "*.wxss" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "gap: (\d+)rpx;", "/* gap: `$1rpx; */"
    Set-Content $_.FullName -Value $content -Encoding UTF8
}
# Fix app.wxss
Get-ChildItem -Path "$base\app.wxss" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "gap: (\d+)rpx;", "/* gap: `$1rpx; */"
    Set-Content $_.FullName -Value $content -Encoding UTF8
}
Write-Host "Done"