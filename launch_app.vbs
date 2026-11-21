Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\Admin\np-one-hr"
sh.Run "node.exe C:\Users\Admin\np-one-hr\server.js", 0, False
WScript.Sleep 1200
sh.Run "cmd.exe /c start """" ""http://localhost:3899""", 0, False
