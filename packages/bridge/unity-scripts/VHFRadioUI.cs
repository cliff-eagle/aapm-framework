/*
 * VHFRadioUI.cs — Maritime radio interface for port arrival/departure.
 *
 * SETUP:
 *   1. Attach to a Panel inside your Canvas
 *   2. Auto-creates radio-style UI with channel display,
 *      transmission button, and preset phrases
 *
 * This handles the first step of every port scenario (VHF Radio Call)
 * and the last step (Departure clearance).
 *
 * NATO phonetic alphabet and marine VHF protocol are built in.
 */

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// VHF Radio interface for maritime communication.
/// Provides preset radio phrases and free-text input for the
/// VHF radio call scenario steps.
/// </summary>
public class VHFRadioUI : MonoBehaviour
{
    [Header("UI References (auto-created if empty)")]
    public GameObject radioPanel;
    public Text channelDisplay;
    public Text statusText;
    public Text transcriptText;
    public InputField freeTextInput;
    public Button transmitButton;
    public Transform presetContainer;

    [Header("Settings")]
    public int defaultChannel = 16;
    public string yachtCallSign = "Motor Yacht Cielos";

    // ─── State ────────────────────────────────────────────────

    private int _currentChannel;
    private bool _isOpen = false;
    private readonly List<string> _transcript = new List<string>();

    // ─── Preset Radio Phrases ─────────────────────────────────

    private static readonly string[][] PresetPhrases = new string[][]
    {
        // Arrival presets
        new[] { "Request berth", "{callsign}, {callsign}, this is {yacht}, requesting permission to enter port and berth assignment, over." },
        new[] { "Position report", "{callsign}, this is {yacht}, our position is [bearing] from harbor entrance, ETA [time] minutes, over." },
        new[] { "Crew & draft", "{callsign}, {yacht}, we are a [length] meter motor yacht, draft [draft] meters, [crew] persons on board, over." },
        new[] { "Roger / copy", "Roger, {callsign}, understood. Proceeding to berth [number]. {yacht} out." },
        new[] { "Request repeat", "{callsign}, this is {yacht}, say again please, over." },

        // Departure presets
        new[] { "Request departure", "{callsign}, this is {yacht}, requesting permission to depart, over." },
        new[] { "Weather check", "{callsign}, {yacht}, request current weather and sea conditions for [destination], over." },
        new[] { "All clear", "Roger, {callsign}. {yacht} departing berth [number], proceeding to sea. Thank you, out." },
    };

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        if (radioPanel == null) CreateDefaultUI();
        radioPanel.SetActive(false);

        _currentChannel = defaultChannel;
        UpdateChannelDisplay();

        transmitButton?.onClick.AddListener(OnTransmitClicked);

        if (GameManager.Instance != null)
        {
            GameManager.Instance.OnScenarioStepChanged += OnStepChanged;
        }

        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived += HandleBridgeMessage;
        }
    }

    void OnDestroy()
    {
        if (GameManager.Instance != null)
            GameManager.Instance.OnScenarioStepChanged -= OnStepChanged;
        if (AAPMBridge.Instance != null)
            AAPMBridge.Instance.OnMessageReceived -= HandleBridgeMessage;
    }

    // ─── Public API ───────────────────────────────────────────

    public void Open(int channel = 16)
    {
        _currentChannel = channel;
        _isOpen = true;
        _transcript.Clear();
        radioPanel.SetActive(true);
        UpdateChannelDisplay();
        AddTranscriptLine("── Radio On ──");

        var player = FindObjectOfType<PlayerController>();
        if (player != null) player.SetMovementEnabled(false);
    }

    public void Close()
    {
        _isOpen = false;
        radioPanel.SetActive(false);

        var player = FindObjectOfType<PlayerController>();
        if (player != null) player.SetMovementEnabled(true);
    }

    public void SetChannel(int channel)
    {
        _currentChannel = channel;
        UpdateChannelDisplay();
        AddTranscriptLine($"── Channel {channel} ──");
    }

    // ─── Events ───────────────────────────────────────────────

    void OnStepChanged(string stepId, string stepName)
    {
        if (stepId == "vhf-radio-call")
        {
            Open(16);
            AddTranscriptLine($"Contacting port on CH{_currentChannel}...");
        }
        else if (stepId == "departure")
        {
            Open(16);
            AddTranscriptLine("Requesting departure clearance...");
        }
        else
        {
            if (_isOpen) Close();
        }
    }

    void OnTransmitClicked()
    {
        string text = freeTextInput?.text?.Trim();
        if (string.IsNullOrEmpty(text)) return;

        // Show player transmission
        AddTranscriptLine($"YOU: {text}");

        // Send to AAPM as a dialogue turn
        AAPMBridge.Instance?.SendDialogueTurn(text);

        if (freeTextInput != null)
        {
            freeTextInput.text = "";
            freeTextInput.Select();
        }
    }

    void OnPresetClicked(string template)
    {
        // Fill in yacht call sign
        string text = template
            .Replace("{yacht}", yachtCallSign)
            .Replace("{callsign}", "Port Control");

        if (freeTextInput != null)
        {
            freeTextInput.text = text;
        }
    }

    void HandleBridgeMessage(BridgeMessage msg)
    {
        if (!_isOpen) return;

        if (msg.type == "dialogue/npc-turn")
        {
            var data = JsonUtility.FromJson<DialogueTurnData>(JsonUtility.ToJson(msg.payload));
            if (data != null)
            {
                AddTranscriptLine($"PORT: {data.npcText}");
            }
        }
    }

    // ─── Display ──────────────────────────────────────────────

    void UpdateChannelDisplay()
    {
        if (channelDisplay != null)
            channelDisplay.text = $"CH {_currentChannel:D2}";
    }

    void AddTranscriptLine(string line)
    {
        _transcript.Add(line);
        if (transcriptText != null)
            transcriptText.text = string.Join("\n", _transcript);
    }

    // ─── Auto UI ──────────────────────────────────────────────

    void CreateDefaultUI()
    {
        var canvas = FindObjectOfType<Canvas>();
        if (canvas == null)
        {
            var go = new GameObject("RadioCanvas");
            canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            go.AddComponent<CanvasScaler>();
            go.AddComponent<GraphicRaycaster>();
        }

        radioPanel = new GameObject("VHFRadioPanel");
        radioPanel.transform.SetParent(canvas.transform, false);

        var rect = radioPanel.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.25f, 0.1f);
        rect.anchorMax = new Vector2(0.75f, 0.9f);
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;

        var bg = radioPanel.AddComponent<Image>();
        bg.color = new Color(0.08f, 0.08f, 0.06f, 0.95f); // Radio black

        var layout = radioPanel.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(16, 16, 12, 12);
        layout.spacing = 8f;
        layout.childForceExpandWidth = true;

        // Channel display
        channelDisplay = CreateRadioText(radioPanel.transform, "ChannelDisplay", 28,
            new Color(0.2f, 1f, 0.3f)); // Green LED style
        channelDisplay.text = "CH 16";

        statusText = CreateRadioText(radioPanel.transform, "Status", 12,
            new Color(0.6f, 0.6f, 0.5f));

        // Transcript
        transcriptText = CreateRadioText(radioPanel.transform, "Transcript", 13,
            new Color(0.8f, 0.8f, 0.7f));
        transcriptText.alignment = TextAnchor.UpperLeft;

        // Preset buttons
        var presetGO = new GameObject("Presets");
        presetGO.transform.SetParent(radioPanel.transform, false);
        presetContainer = presetGO.transform;
        var presetLayout = presetGO.AddComponent<VerticalLayoutGroup>();
        presetLayout.spacing = 4f;

        foreach (var preset in PresetPhrases)
        {
            CreatePresetButton(presetContainer, preset[0], preset[1]);
        }

        // Free text input
        var inputGO = new GameObject("FreeTextInput");
        inputGO.transform.SetParent(radioPanel.transform, false);
        freeTextInput = inputGO.AddComponent<InputField>();
        var inputBG = inputGO.AddComponent<Image>();
        inputBG.color = new Color(0.12f, 0.12f, 0.1f);
        var inputText = new GameObject("Text").AddComponent<Text>();
        inputText.transform.SetParent(inputGO.transform, false);
        inputText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        inputText.fontSize = 13;
        inputText.color = new Color(0.2f, 1f, 0.3f);
        freeTextInput.textComponent = inputText;

        // Transmit button
        var btnGO = new GameObject("TransmitButton");
        btnGO.transform.SetParent(radioPanel.transform, false);
        transmitButton = btnGO.AddComponent<Button>();
        var btnImg = btnGO.AddComponent<Image>();
        btnImg.color = new Color(0.8f, 0.2f, 0.1f); // Red transmit
        var btnText = new GameObject("Text").AddComponent<Text>();
        btnText.transform.SetParent(btnGO.transform, false);
        btnText.text = "📡 TRANSMIT";
        btnText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        btnText.fontSize = 16;
        btnText.color = Color.white;
        btnText.alignment = TextAnchor.MiddleCenter;

        Debug.Log("[VHFRadioUI] Auto-created radio panel");
    }

    Text CreateRadioText(Transform parent, string name, int size, Color color)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var text = go.AddComponent<Text>();
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = size;
        text.color = color;
        text.alignment = TextAnchor.MiddleCenter;
        var fitter = go.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        return text;
    }

    void CreatePresetButton(Transform parent, string label, string template)
    {
        var go = new GameObject($"Preset_{label}");
        go.transform.SetParent(parent, false);

        var btn = go.AddComponent<Button>();
        var img = go.AddComponent<Image>();
        img.color = new Color(0.15f, 0.2f, 0.15f);

        var textGO = new GameObject("Text");
        textGO.transform.SetParent(go.transform, false);
        var text = textGO.AddComponent<Text>();
        text.text = $"📻 {label}";
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = 11;
        text.color = new Color(0.7f, 0.9f, 0.7f);
        text.alignment = TextAnchor.MiddleLeft;

        string capturedTemplate = template;
        btn.onClick.AddListener(() => OnPresetClicked(capturedTemplate));
    }
}
