$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 백엔드 실행
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  cd '$root\backend';
  .\venv\Scripts\Activate.ps1;
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
" -WindowStyle Normal

# 프론트엔드 실행
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  cd '$root\frontend';
  npm run dev
" -WindowStyle Normal

Write-Host ""
Write-Host "서버 시작 중..."
Write-Host "  프론트엔드: http://localhost:5173"
Write-Host "  백엔드 API: http://localhost:8000"
Write-Host "  API 문서:   http://localhost:8000/docs"
Write-Host ""
