# Закрыть окна-пустышки «New Tab»/«Новая вкладка» и убрать мусор после замеров.
#
# Запуск (обычный PowerShell, от имени пользователя — НЕ нужен админ):
#   powershell -ExecutionPolicy Bypass -File tools\close-newtab-windows.ps1
#   powershell -ExecutionPolicy Bypass -File tools\close-newtab-windows.ps1 -WhatIf
#
# Что делает:
#   1) перечисляет ВСЕ видимые окна верхнего уровня и показывает заголовки;
#   2) закрывает мягко (WM_CLOSE) окна, чей заголовок — «New Tab»/«Новая вкладка»
#      (и прочие пустые вкладки: «Untitled», «Без имени», «about:blank»);
#   3) если окно не ответило за 2 секунды — добивает процесс окна;
#   4) удаляет временные профили замеров (%TEMP%\perf-profile-*, mem-profile-*,
#      perf-*.json, mem-*.json) — это мусор инструментов, не твои данные.
#
# Чего НЕ делает: не трогает окна с осмысленными заголовками (документы, чаты,
# консоль) и не закрывает браузер целиком.
param([switch]$WhatIf)

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class TabWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr SendMessageTimeout(IntPtr h, uint msg, IntPtr w, IntPtr l, uint flags, uint timeout, out IntPtr result);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  public const uint WM_CLOSE = 0x0010;
  public const uint SMTO_ABORTIFHUNG = 0x0002;
  public static List<string> Windows() {
    var list = new List<string>();
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h)) return true;
      var title = new StringBuilder(512);
      GetWindowText(h, title, 512);
      if (title.Length == 0) return true;
      var cls = new StringBuilder(256);
      GetClassName(h, cls, 256);
      uint pid;
      GetWindowThreadProcessId(h, out pid);
      list.Add(h.ToInt64() + "|" + pid + "|" + cls + "|" + title.ToString());
      return true;
    }, IntPtr.Zero);
    return list;
  }
  public static bool Close(IntPtr h) {
    IntPtr res;
    SendMessageTimeout(h, WM_CLOSE, IntPtr.Zero, IntPtr.Zero, SMTO_ABORTIFHUNG, 2000, out res);
    return !IsWindow(h);
  }
}
"@ -ErrorAction Stop

# Заголовки, которые считаем окном-пустышкой. Сравнение — по точному совпадению
# (без учёта регистра), чтобы не задеть документы с похожими именами.
$emptyTitles = @(
  'New Tab', 'Новая вкладка', 'about:blank', 'Untitled', 'Без имени',
  'Новая вкладка Brave', 'New Tab - Brave', 'New Tab - Google Chrome'
)

$all = [TabWin]::Windows()
Write-Host "Всего видимых окон с заголовком: $($all.Count)"
Write-Host ''
$targets = @()
foreach ($row in $all) {
  $parts = $row -split '\|', 4
  $handle = [IntPtr][int64]$parts[0]
  $procId = [int]$parts[1]
  $cls = $parts[2]
  $title = $parts[3]
  $isTarget = $emptyTitles -contains $title
  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  $line = "{0,-7} {1,-14} {2}" -f $procId, $(if ($proc) { $proc.ProcessName } else { '?' }), $title
  if ($isTarget) {
    Write-Host "[закрою] $line" -ForegroundColor Yellow
    $targets += [pscustomobject]@{ Handle = $handle; Pid = $procId; Title = $title; Class = $cls }
  } else {
    Write-Host "[оставлю] $line"
  }
}

Write-Host ''
if ($targets.Count -eq 0) {
  Write-Host 'Окон-пустышек не найдено. Если «New Tab» всё ещё видно в Alt+Tab —' -ForegroundColor Cyan
  Write-Host 'это застрявшие превью: нажми Win+Tab и закрой их там крестиком (или перезапусти explorer: taskkill /f /im explorer.exe; start explorer).' -ForegroundColor Cyan
} elseif ($WhatIf) {
  Write-Host "Режим -WhatIf: закрыл бы $($targets.Count) окон(о)." -ForegroundColor Cyan
} else {
  $closed = 0
  foreach ($t in $targets) {
    if ([TabWin]::Close($t.Handle)) {
      Write-Host "закрыто: $($t.Title) (pid $($t.Pid))" -ForegroundColor Green
      $closed++
    } else {
      # Не ответило на WM_CLOSE — добиваем процесс окна.
      try {
        Stop-Process -Id $t.Pid -Force -ErrorAction Stop
        Write-Host "закрыто жёстко: $($t.Title) (pid $($t.Pid))" -ForegroundColor Green
        $closed++
      } catch {
        Write-Host "не удалось закрыть: $($t.Title) (pid $($t.Pid)) — $($_.Exception.Message)" -ForegroundColor Red
      }
    }
  }
  Write-Host "Итого закрыто окон: $closed" -ForegroundColor Cyan
}

Write-Host ''
Write-Host '--- мусор инструментов замеров в %TEMP% ---'
$patterns = @('perf-profile-*', 'mem-profile-*', 'diag-*', 'diag2-*', 'perf-*.json', 'mem-*.json')
$removed = 0
foreach ($pattern in $patterns) {
  $items = Get-ChildItem -Path $env:TEMP -Filter $pattern -ErrorAction SilentlyContinue
  foreach ($item in $items) {
    if ($WhatIf) {
      Write-Host "[удалил бы] $($item.Name)"
      continue
    }
    try {
      Remove-Item $item.FullName -Recurse -Force -ErrorAction Stop
      $removed++
    } catch {
      Write-Host "не удалось удалить $($item.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}
if (-not $WhatIf) { Write-Host "удалено объектов: $removed" -ForegroundColor Cyan }

Write-Host ''
Write-Host 'Готово. Если после этого «New Tab» остались в Alt+Tab — это превью проводника:'
Write-Host '  taskkill /f /im explorer.exe ; start explorer'
Write-Host '(панель задач мигнёт и вернётся, ничего не потеряется)'
