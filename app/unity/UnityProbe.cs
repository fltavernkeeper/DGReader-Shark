using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

namespace Doorstop
{
    public static class Entrypoint
    {
        private static readonly object LogLock = new object();
        private static readonly object NetLock = new object();
        private static readonly Dictionary<string, string> LastByInstance = new Dictionary<string, string>();
        private static string _logPath;
        private static TcpClient _tcp;
        private static StreamWriter _writer;

        public static void Start()
        {
            _logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "DGReader.UnityProbe.log");
            Log("=== DGReader Unity Probe started ===");
            Log("base=" + AppDomain.CurrentDomain.BaseDirectory);
            Thread t = new Thread(Loop);
            t.IsBackground = true;
            t.Start();
            Thread n = new Thread(NetworkLoop);
            n.IsBackground = true;
            n.Start();
        }

        private static void NetworkLoop()
        {
            while (true)
            {
                try
                {
                    if (_writer == null)
                    {
                        TcpClient c = new TcpClient();
                        c.Connect("127.0.0.1", 17870);
                        _tcp = c;
                        _writer = new StreamWriter(c.GetStream(), new UTF8Encoding(false));
                        _writer.AutoFlush = true;
                        SendRaw("{\"t\":\"hello\",\"game\":\"Unity\",\"engine\":\"Unity\",\"version\":\"probe\"}");
                        Log("NET connected 127.0.0.1:17870");
                    }
                }
                catch
                {
                    CloseNet();
                }
                Thread.Sleep(3000);
            }
        }

        private static void CloseNet()
        {
            lock (NetLock)
            {
                try { if (_writer != null) _writer.Dispose(); } catch { }
                try { if (_tcp != null) _tcp.Close(); } catch { }
                _writer = null;
                _tcp = null;
            }
        }

        private static void SendRaw(string json)
        {
            lock (NetLock)
            {
                if (_writer == null) return;
                _writer.WriteLine(json);
            }
        }

        private static void SendUnity(string kind, string text, string path, string instance)
        {
            string json = "{\"t\":\"unity\",\"kind\":\"" + JsonEscape(kind) +
                          "\",\"text\":\"" + JsonEscape(text) +
                          "\",\"path\":\"" + JsonEscape(path) +
                          "\",\"id\":\"" + JsonEscape(instance) + "\"}";
            SendRaw(json);
        }

        private static string JsonEscape(string s)
        {
            if (s == null) return "";
            StringBuilder b = new StringBuilder(s.Length + 8);
            for (int i = 0; i < s.Length; i++)
            {
                char c = s[i];
                if (c == '\\') b.Append("\\\\");
                else if (c == '"') b.Append("\\\"");
                else if (c == '\n') b.Append("\\n");
                else if (c == '\r') b.Append("\\r");
                else if (c == '\t') b.Append("\\t");
                else if (c < 32) b.Append(' ');
                else b.Append(c);
            }
            return b.ToString();
        }

        private static void Loop()
        {
            while (true)
            {
                try { Scan(); }
                catch (Exception ex) { Log("ERR " + ex.GetType().Name + ": " + ex.Message); }
                Thread.Sleep(120);
            }
        }

        private static void Scan()
        {
            Type tmpText = FindType("Unity.TextMeshPro", "TMPro.TMP_Text");
            Type uiText = FindType("UnityEngine.UI", "UnityEngine.UI.Text");
            ScanType(tmpText, "TMP");
            ScanType(uiText, "UGUI");
        }

        private static Type FindType(string assemblyName, string typeName)
        {
            Assembly[] assemblies = AppDomain.CurrentDomain.GetAssemblies();
            for (int i = 0; i < assemblies.Length; i++)
            {
                Assembly a = assemblies[i];
                if (a.GetName().Name == assemblyName)
                {
                    Type t = a.GetType(typeName, false);
                    if (t != null) return t;
                }
            }
            return null;
        }

        private static void ScanType(Type textType, string tag)
        {
            if (textType == null) return;

            Type resources = FindType("UnityEngine.CoreModule", "UnityEngine.Resources");
            if (resources == null) resources = FindType("UnityEngine", "UnityEngine.Resources");
            if (resources == null) return;

            MethodInfo findAll = null;
            MethodInfo[] methods = resources.GetMethods(BindingFlags.Public | BindingFlags.Static);
            for (int i = 0; i < methods.Length; i++)
            {
                if (methods[i].Name == "FindObjectsOfTypeAll" && methods[i].GetParameters().Length == 1)
                {
                    findAll = methods[i];
                    break;
                }
            }
            if (findAll == null) return;

            Array objects;
            try { objects = findAll.Invoke(null, new object[] { textType }) as Array; }
            catch (Exception ex) { Log("ERR FindObjectsOfTypeAll " + tag + ": " + ex.Message); return; }
            if (objects == null) return;

            for (int i = 0; i < objects.Length; i++)
            {
                object obj = objects.GetValue(i);
                if (obj == null) continue;
                try { Emit(obj, textType, tag); }
                catch (Exception ex) { Log("ERR emit " + tag + ": " + ex.Message); }
            }
        }

        private static void Emit(object obj, Type textType, string tag)
        {
            if (!textType.IsInstanceOfType(obj)) return;

            PropertyInfo enabledProp = textType.GetProperty("enabled", BindingFlags.Public | BindingFlags.Instance);
            if (enabledProp != null)
            {
                object enabled = enabledProp.GetValue(obj, null);
                if (enabled is bool && !(bool)enabled) return;
            }

            PropertyInfo goProp = textType.GetProperty("gameObject", BindingFlags.Public | BindingFlags.Instance);
            object go = goProp == null ? null : goProp.GetValue(obj, null);
            if (go == null) return;

            PropertyInfo activeProp = go.GetType().GetProperty("activeInHierarchy", BindingFlags.Public | BindingFlags.Instance);
            if (activeProp != null)
            {
                object active = activeProp.GetValue(go, null);
                if (active is bool && !(bool)active) return;
            }

            string path = GetPath(obj, textType);
            string kind = Classify(path);
            if (kind == null) return;

            PropertyInfo textProp = textType.GetProperty("text", BindingFlags.Public | BindingFlags.Instance);
            if (textProp == null) return;
            string text = textProp.GetValue(obj, null) as string;
            if (string.IsNullOrEmpty(text) || text.Trim().Length == 0) return;

            int visible = -1;
            PropertyInfo visProp = textType.GetProperty("maxVisibleCharacters", BindingFlags.Public | BindingFlags.Instance);
            if (visProp != null)
            {
                object v = visProp.GetValue(obj, null);
                if (v is int) visible = (int)v;
            }

            string plain = StripTags(text);
            string shown = plain;
            if (visible >= 0 && visible < plain.Length) shown = plain.Substring(0, visible);
            if (shown.Trim().Length == 0) return;

            string instance = GetInstanceId(obj);
            string stateKey = kind + "|" + instance;
            lock (LogLock)
            {
                string previous;
                if (LastByInstance.TryGetValue(stateKey, out previous) && previous == shown) return;
                LastByInstance[stateKey] = shown;
            }

            Log(kind + " path=" + path + " id=" + instance + " visible=" + visible + " text=" + Escape(shown));
            SendUnity(kind, shown, path, instance);
        }

        private static string Classify(string path)
        {
            string p = path.ToLowerInvariant();
            if (p.Contains("title") || p.Contains("shop") || p.Contains("settings") ||
                p.Contains("saveload") || p.Contains("scriptnavigator") || p.Contains("tips") ||
                p.Contains("toast") || p.Contains("preview") || p.Contains("hud") ||
                p.Contains("header") || p.Contains("inputhint") || p.Contains("menup") ||
                p.Contains("confirm")) return null;

            if (p.Contains("choice")) return "CHOICE";
            if (p.Contains("dialoguenametext") || p.Contains("authornametext") ||
                p.Contains("txt_name") || p.Contains("dialoguenamebox")) return "NAME";
            if (p.Contains("dialoguetext") || p.Contains("txt_dialogue") ||
                (p.Contains("textprinter") && p.Contains("dialogue")) ||
                (p.Contains("dialoguebox") && p.Contains("text"))) return "DIALOGUE";
            return null;
        }

        private static string StripTags(string text)
        {
            return Regex.Replace(text, "<[^>]+>", "");
        }

        private static string Escape(string text)
        {
            string s = text.Replace("\r", "\\r").Replace("\n", "\\n");
            return s.Length > 500 ? s.Substring(0, 500) + "..." : s;
        }

        private static string GetInstanceId(object obj)
        {
            try
            {
                MethodInfo m = obj.GetType().GetMethod("GetInstanceID", BindingFlags.Public | BindingFlags.Instance);
                if (m != null) return Convert.ToString(m.Invoke(obj, null));
            }
            catch { }
            return "?";
        }

        private static string GetPath(object obj, Type textType)
        {
            PropertyInfo trProp = textType.GetProperty("transform", BindingFlags.Public | BindingFlags.Instance);
            object tr = trProp == null ? null : trProp.GetValue(obj, null);
            if (tr == null) return "?";

            List<string> parts = new List<string>();
            object cur = tr;
            for (int depth = 0; depth < 12 && cur != null; depth++)
            {
                PropertyInfo nameProp = cur.GetType().GetProperty("name", BindingFlags.Public | BindingFlags.Instance);
                string name = nameProp == null ? "?" : nameProp.GetValue(cur, null) as string;
                parts.Add(string.IsNullOrEmpty(name) ? "?" : name);

                PropertyInfo parentProp = cur.GetType().GetProperty("parent", BindingFlags.Public | BindingFlags.Instance);
                cur = parentProp == null ? null : parentProp.GetValue(cur, null);
            }
            parts.Reverse();
            return string.Join("/", parts.ToArray());
        }

        private static void Log(string line)
        {
            try
            {
                lock (LogLock)
                {
                    File.AppendAllText(_logPath, "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + line + Environment.NewLine, new UTF8Encoding(false));
                }
            }
            catch { }
        }
    }
}
