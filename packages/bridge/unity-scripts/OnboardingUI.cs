/*
 * OnboardingUI.cs — First-run setup screen for language and API key.
 *
 * SETUP:
 *   1. Attach to a Panel on your Canvas
 *   2. Auto-creates all UI elements if references aren't set
 *   3. Player enters: target language, CEFR level, difficulty, API key
 *   4. On submit, calls GameManager.CompleteOnboarding()
 *
 * This is the FIRST thing the player sees. It should only appear once
 * (or when they reset from the settings menu).
 */

using System;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Onboarding screen for initial player configuration + API key entry.
/// </summary>
public class OnboardingUI : MonoBehaviour
{
    [Header("UI References (auto-created if empty)")]
    public GameObject onboardingPanel;
    public Dropdown nativeLanguageDropdown;
    public Dropdown targetLanguageDropdown;
    public Dropdown cefrDropdown;
    public Dropdown difficultyDropdown;
    public InputField apiKeyInput;
    public Button startButton;
    public Text statusText;

    [Header("Settings")]
    public bool showOnStart = true;

    // ─── Language & Level Options ──────────────────────────────

    private static readonly string[] Languages = {
        "English", "Spanish", "French", "Italian", "Portuguese",
        "Greek", "Turkish", "Arabic", "Croatian", "Albanian",
        "Hebrew", "Catalan", "Maltese", "Slovenian", "Montenegrin",
        "Egyptian Arabic", "Tunisian Arabic", "Moroccan Arabic", "Berber"
    };

    private static readonly string[] CEFRLevels = { "A1", "A2", "B1", "B2", "C1", "C2" };
    private static readonly string[] Difficulties = { "tourist", "traveler", "immersion" };
    private static readonly string[] DifficultyLabels = {
        "🌴 Tourist — NPCs patient, fallback language available",
        "⛵ Traveler — Balanced challenge, some fallback",
        "🔥 Immersion — Target language only, strict grammar"
    };

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        if (onboardingPanel == null) CreateDefaultUI();

        // Check if we already have a save
        if (ProgressionManager.Instance?.Data != null &&
            ProgressionManager.Instance.Data.portsVisited > 0)
        {
            // Returning player — skip onboarding
            onboardingPanel.SetActive(false);
            return;
        }

        onboardingPanel.SetActive(showOnStart);

        startButton?.onClick.AddListener(OnStartClicked);
    }

    // ─── Events ───────────────────────────────────────────────

    void OnStartClicked()
    {
        string apiKey = apiKeyInput?.text?.Trim();
        if (string.IsNullOrEmpty(apiKey))
        {
            if (statusText != null) statusText.text = "⚠️ Please enter your API key";
            return;
        }

        string nativeLang = Languages[nativeLanguageDropdown?.value ?? 0];
        string targetLang = Languages[targetLanguageDropdown?.value ?? 1];
        string level = CEFRLevels[cefrDropdown?.value ?? 1];
        string diff = Difficulties[difficultyDropdown?.value ?? 1];

        if (statusText != null) statusText.text = "Connecting to AAPM...";

        // Pass to GameManager
        GameManager.Instance?.CompleteOnboarding(nativeLang, targetLang, level, diff, apiKey);

        // Hide onboarding
        onboardingPanel.SetActive(false);
    }

    // ─── Auto UI ──────────────────────────────────────────────

    void CreateDefaultUI()
    {
        var canvas = FindObjectOfType<Canvas>();
        if (canvas == null)
        {
            var go = new GameObject("OnboardingCanvas");
            canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            go.AddComponent<CanvasScaler>();
            go.AddComponent<GraphicRaycaster>();
        }

        onboardingPanel = new GameObject("OnboardingPanel");
        onboardingPanel.transform.SetParent(canvas.transform, false);

        var rect = onboardingPanel.AddComponent<RectTransform>();
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;

        var bg = onboardingPanel.AddComponent<Image>();
        bg.color = new Color(0.04f, 0.06f, 0.1f, 0.98f);

        var layout = onboardingPanel.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(80, 80, 60, 40);
        layout.spacing = 12f;
        layout.childAlignment = TextAnchor.UpperCenter;
        layout.childForceExpandWidth = true;
        layout.childForceExpandHeight = false;

        // Title
        CreateLabel(onboardingPanel.transform, "Cielos del Mediterráneo", 28, Color.white);
        CreateLabel(onboardingPanel.transform, "Your Mediterranean language voyage begins here.", 14,
            new Color(0.6f, 0.7f, 0.9f));

        // Spacer
        CreateSpacer(onboardingPanel.transform, 20);

        // Native language
        CreateLabel(onboardingPanel.transform, "Your Native Language", 13, new Color(0.8f, 0.8f, 0.9f));
        nativeLanguageDropdown = CreateDropdown(onboardingPanel.transform, Languages, 0);

        // Target language
        CreateLabel(onboardingPanel.transform, "Language You Want to Learn", 13, new Color(0.8f, 0.8f, 0.9f));
        targetLanguageDropdown = CreateDropdown(onboardingPanel.transform, Languages, 1);

        // CEFR Level
        CreateLabel(onboardingPanel.transform, "Your Current Level", 13, new Color(0.8f, 0.8f, 0.9f));
        cefrDropdown = CreateDropdown(onboardingPanel.transform, CEFRLevels, 1);

        // Difficulty
        CreateLabel(onboardingPanel.transform, "Difficulty", 13, new Color(0.8f, 0.8f, 0.9f));
        difficultyDropdown = CreateDropdown(onboardingPanel.transform, DifficultyLabels, 1);

        // API Key
        CreateSpacer(onboardingPanel.transform, 10);
        CreateLabel(onboardingPanel.transform, "🔑 AI Provider API Key", 13, new Color(0.9f, 0.8f, 0.5f));

        var inputGO = new GameObject("APIKeyInput");
        inputGO.transform.SetParent(onboardingPanel.transform, false);
        apiKeyInput = inputGO.AddComponent<InputField>();
        apiKeyInput.contentType = InputField.ContentType.Password;
        var inputBG = inputGO.AddComponent<Image>();
        inputBG.color = new Color(0.12f, 0.12f, 0.16f);
        var inputText = new GameObject("Text").AddComponent<Text>();
        inputText.transform.SetParent(inputGO.transform, false);
        inputText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        inputText.fontSize = 14;
        inputText.color = Color.white;
        apiKeyInput.textComponent = inputText;
        var placeholder = new GameObject("Placeholder").AddComponent<Text>();
        placeholder.transform.SetParent(inputGO.transform, false);
        placeholder.text = "Enter your Google AI Studio or OpenAI key...";
        placeholder.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        placeholder.fontSize = 14;
        placeholder.color = new Color(0.4f, 0.4f, 0.5f);
        placeholder.fontStyle = FontStyle.Italic;
        apiKeyInput.placeholder = placeholder;

        var inputRect = inputGO.GetComponent<RectTransform>();
        inputRect.sizeDelta = new Vector2(0, 40);

        // Status
        statusText = CreateLabel(onboardingPanel.transform, "", 12, new Color(1f, 0.6f, 0.3f));

        // Start button
        CreateSpacer(onboardingPanel.transform, 10);
        var btnGO = new GameObject("StartButton");
        btnGO.transform.SetParent(onboardingPanel.transform, false);
        startButton = btnGO.AddComponent<Button>();
        var btnImg = btnGO.AddComponent<Image>();
        btnImg.color = new Color(0.15f, 0.4f, 0.8f);
        var btnText = new GameObject("Text").AddComponent<Text>();
        btnText.transform.SetParent(btnGO.transform, false);
        btnText.text = "⛵ Set Sail";
        btnText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        btnText.fontSize = 18;
        btnText.color = Color.white;
        btnText.alignment = TextAnchor.MiddleCenter;
        var btnRect = btnGO.GetComponent<RectTransform>();
        btnRect.sizeDelta = new Vector2(0, 50);

        Debug.Log("[OnboardingUI] Auto-created onboarding panel");
    }

    Text CreateLabel(Transform parent, string text, int size, Color color)
    {
        var go = new GameObject("Label");
        go.transform.SetParent(parent, false);
        var t = go.AddComponent<Text>();
        t.text = text;
        t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        t.fontSize = size;
        t.color = color;
        t.alignment = TextAnchor.MiddleCenter;
        var fitter = go.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        return t;
    }

    Dropdown CreateDropdown(Transform parent, string[] options, int defaultIndex)
    {
        var go = new GameObject("Dropdown");
        go.transform.SetParent(parent, false);
        var dd = go.AddComponent<Dropdown>();
        var img = go.AddComponent<Image>();
        img.color = new Color(0.12f, 0.12f, 0.16f);

        dd.options.Clear();
        foreach (var option in options)
        {
            dd.options.Add(new Dropdown.OptionData(option));
        }
        dd.value = defaultIndex;
        dd.RefreshShownValue();

        var rectTransform = go.GetComponent<RectTransform>();
        rectTransform.sizeDelta = new Vector2(0, 36);

        return dd;
    }

    void CreateSpacer(Transform parent, float height)
    {
        var go = new GameObject("Spacer");
        go.transform.SetParent(parent, false);
        var le = go.AddComponent<LayoutElement>();
        le.minHeight = height;
        le.preferredHeight = height;
    }
}
