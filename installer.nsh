!macro customInstall
  CreateShortCut "$DESKTOP\NG PB Launcher.lnk" "$INSTDIR\NG PB Launcher.exe" "" "$INSTDIR\assets\icon.ico"
  CreateShortCut "$SMPROGRAMS\NG PB Launcher.lnk" "$INSTDIR\NG PB Launcher.exe" "" "$INSTDIR\assets\icon.ico"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\NG PB Launcher.lnk"
  Delete "$SMPROGRAMS\NG PB Launcher.lnk"
!macroend
