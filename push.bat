@echo off
chcp 65001 >nul
setlocal
cd /d "E:\hippo-archive"

echo.
echo  hippo-archive 推送脚本
echo  用法：先在 GitHub 网页上建一个空仓库（不要勾 README），
echo  然后把仓库地址粘进来。
echo.
set /p REPO=仓库地址（例如 https://github.com/你的名字/hippo-archive.git）: 
if "%REPO%"=="" (echo 没填地址，退出 & pause & exit /b 1)

set /p UNAME=GitHub 用户名: 
set /p EMAIL=GitHub 邮箱: 

git config user.name "%UNAME%"
git config user.email "%EMAIL%"

git branch -M main
git remote remove origin 2>nul
git remote add origin "%REPO%"

echo.
echo  正在推送……浏览器会弹一次登录，登完就好。
echo.
git push -u origin main
echo.
if errorlevel 1 (
  echo 推送失败。看看上面的报错。
) else (
  echo 成功。去 GitHub 刷新看看。
)
pause