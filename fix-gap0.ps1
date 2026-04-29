# Fix gap: 0 for all WXSS files
Get-ChildItem -Path "C:\Users\rain\WorkBuddy\20260411012625\study-checkin-miniapp-master\pages" -Recurse -Include "*.wxss" | ForEach-Object {
    $f = $_.FullName
    (Get-Content $f -Raw) -replace "gap: 0;", "/* gap: 0; */" | Set-Content $f -Encoding UTF8
}
Write-Host "Done"