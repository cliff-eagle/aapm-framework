/*
 * ScenarioChainUI.cs — HUD display for the current port scenario chain.
 *
 * SETUP:
 *   1. Create a Panel on your Canvas (left side or top)
 *   2. Attach this script
 *   3. It auto-creates step indicator UI if no references are set
 *
 * Shows: current step, progress pips, goal text, and NPC role hint.
 */

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Displays scenario chain progress as a step indicator on the HUD.
/// Listens for scenario/chain responses from the bridge.
/// </summary>
public class ScenarioChainUI : MonoBehaviour
{
    [Header("UI References (auto-created if empty)")]
    public GameObject chainPanel;
    public Text cityNameText;
    public Text currentStepText;
    public Text goalText;
    public Text progressText;
    public Transform stepPipContainer;
    public Button advanceButton;
    public Button skipOptionalButton;

    [Header("Colors")]
    public Color completedColor = new Color(0.2f, 0.8f, 0.3f, 1f);
    public Color currentColor = new Color(1f, 0.8f, 0.2f, 1f);
    public Color pendingColor = new Color(0.3f, 0.3f, 0.4f, 1f);
    public Color requiredColor = new Color(1f, 0.4f, 0.3f, 1f);

    // ─── State ────────────────────────────────────────────────

    private ScenarioChainData _currentChain;
    private readonly List<GameObject> _pipObjects = new List<GameObject>();

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        if (chainPanel == null) CreateDefaultUI();
        chainPanel.SetActive(false);

        advanceButton?.onClick.AddListener(() => GameManager.Instance?.AdvanceScenario(false));
        skipOptionalButton?.onClick.AddListener(() => GameManager.Instance?.AdvanceScenario(true));

        if (AAPMBridge.Instance != null)
        {
            AAPMBridge.Instance.OnMessageReceived += HandleBridgeMessage;
        }

        if (GameManager.Instance != null)
        {
            GameManager.Instance.OnGameStateChanged += OnGameStateChanged;
        }
    }

    void OnDestroy()
    {
        if (AAPMBridge.Instance != null)
            AAPMBridge.Instance.OnMessageReceived -= HandleBridgeMessage;
        if (GameManager.Instance != null)
            GameManager.Instance.OnGameStateChanged -= OnGameStateChanged;
    }

    // ─── Bridge Messages ──────────────────────────────────────

    void HandleBridgeMessage(BridgeMessage msg)
    {
        if (msg.type != "scenario/chain") return;

        _currentChain = JsonUtility.FromJson<ScenarioChainData>(JsonUtility.ToJson(msg.payload));
        if (_currentChain != null)
        {
            UpdateDisplay(_currentChain);
        }
    }

    void OnGameStateChanged(GameState state)
    {
        bool showChain = state == GameState.PortApproach ||
                         state == GameState.Docked ||
                         state == GameState.Departure;
        chainPanel.SetActive(showChain);
    }

    // ─── Display ──────────────────────────────────────────────

    void UpdateDisplay(ScenarioChainData chain)
    {
        chainPanel.SetActive(chain.active);

        if (cityNameText != null)
            cityNameText.text = $"⚓ {chain.cityName}";

        if (chain.currentStep != null)
        {
            if (currentStepText != null)
                currentStepText.text = $"Step {chain.currentStep.step}: {chain.currentStep.name}";

            if (goalText != null)
                goalText.text = chain.currentStep.goal;

            // Show/hide skip button based on whether current step is optional
            if (skipOptionalButton != null)
                skipOptionalButton.gameObject.SetActive(!chain.currentStep.required);
        }

        if (progressText != null)
            progressText.text = $"{chain.completedSteps.Length}/{chain.totalSteps} steps";

        // Update step pips
        UpdatePips(chain);
    }

    void UpdatePips(ScenarioChainData chain)
    {
        // Clear old pips
        foreach (var pip in _pipObjects) Destroy(pip);
        _pipObjects.Clear();

        if (stepPipContainer == null) return;

        for (int i = 0; i < chain.totalSteps; i++)
        {
            var pip = new GameObject($"Pip_{i}");
            pip.transform.SetParent(stepPipContainer, false);

            var img = pip.AddComponent<Image>();
            var rect = pip.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(20, 20);

            // Determine pip color
            bool isCurrent = chain.currentStep != null && chain.currentStep.step == i + 1;
            bool isCompleted = false;
            if (chain.completedSteps != null)
            {
                foreach (var id in chain.completedSteps)
                {
                    // Simple index check
                    if (System.Array.IndexOf(chain.completedSteps, id) >= 0)
                    {
                        isCompleted = true;
                        break;
                    }
                }
            }

            if (isCurrent) img.color = currentColor;
            else if (isCompleted) img.color = completedColor;
            else img.color = pendingColor;

            _pipObjects.Add(pip);
        }
    }

    // ─── Auto UI ──────────────────────────────────────────────

    void CreateDefaultUI()
    {
        var canvas = FindObjectOfType<Canvas>();
        if (canvas == null)
        {
            var go = new GameObject("ScenarioCanvas");
            canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            go.AddComponent<CanvasScaler>();
            go.AddComponent<GraphicRaycaster>();
        }

        chainPanel = new GameObject("ScenarioChainPanel");
        chainPanel.transform.SetParent(canvas.transform, false);

        var rect = chainPanel.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0f, 0.7f);
        rect.anchorMax = new Vector2(0.35f, 1f);
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;

        var bg = chainPanel.AddComponent<Image>();
        bg.color = new Color(0.05f, 0.08f, 0.12f, 0.9f);

        var layout = chainPanel.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(12, 12, 8, 8);
        layout.spacing = 4f;
        layout.childForceExpandWidth = true;
        layout.childForceExpandHeight = false;

        cityNameText = CreateText(chainPanel.transform, "CityName", 18, Color.white);
        currentStepText = CreateText(chainPanel.transform, "CurrentStep", 14, currentColor);
        goalText = CreateText(chainPanel.transform, "Goal", 12, new Color(0.7f, 0.7f, 0.8f));
        progressText = CreateText(chainPanel.transform, "Progress", 11, new Color(0.5f, 0.5f, 0.6f));

        // Pip container
        var pipGO = new GameObject("StepPips");
        pipGO.transform.SetParent(chainPanel.transform, false);
        stepPipContainer = pipGO.transform;
        var pipLayout = pipGO.AddComponent<HorizontalLayoutGroup>();
        pipLayout.spacing = 6f;
        pipLayout.childForceExpandWidth = false;
        var pipFitter = pipGO.AddComponent<ContentSizeFitter>();
        pipFitter.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;
        pipFitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
    }

    Text CreateText(Transform parent, string name, int size, Color color)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var text = go.AddComponent<Text>();
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = size;
        text.color = color;
        var fitter = go.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        return text;
    }
}
