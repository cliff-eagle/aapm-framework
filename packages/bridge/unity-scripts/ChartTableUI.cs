/*
 * ChartTableUI.cs — Port selection map for the yacht's chart table.
 *
 * SETUP:
 *   1. Attach to a Panel on your Canvas
 *   2. Shows clickable port buttons for all 13 Mediterranean destinations
 *   3. Appears during the Sailing game state
 *   4. Clicking a port triggers GameManager.SailToPort()
 *
 * In a full implementation, this would be an embedded 2D map view.
 * This script provides the functional structure with city buttons.
 */

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Chart table showing available ports. Provides port selection
/// during the Sailing phase of the game.
/// </summary>
public class ChartTableUI : MonoBehaviour
{
    [Header("UI References (auto-created if empty)")]
    public GameObject chartPanel;
    public Text titleText;
    public Transform portListContainer;
    public Button closeButton;

    [Header("Settings")]
    public KeyCode toggleKey = KeyCode.M;

    // ─── Port Data ────────────────────────────────────────────

    private static readonly PortEntry[] Ports = new PortEntry[]
    {
        new PortEntry("Barcelona", "loc_barcelona", "Spain", "Spanish/Catalan", "41.38°N 2.18°E"),
        new PortEntry("Nice", "loc_nice", "France", "French", "43.70°N 7.27°E"),
        new PortEntry("Istanbul", "loc_istanbul", "Turkey", "Turkish", "41.01°N 28.98°E"),
        new PortEntry("Dubrovnik", "loc_dubrovnik", "Croatia", "Croatian", "42.65°N 18.09°E"),
        new PortEntry("Marseille", "loc_marseille", "France", "French/Arabic", "43.30°N 5.37°E"),
        new PortEntry("Valletta", "loc_valletta", "Malta", "Maltese/English", "35.90°N 14.51°E"),
        new PortEntry("Alexandria", "loc_alexandria", "Egypt", "Arabic", "31.20°N 29.92°E"),
        new PortEntry("Tangier", "loc_tangier", "Morocco", "Arabic/French", "35.78°N 5.81°W"),
        new PortEntry("Naples", "loc_naples", "Italy", "Italian", "40.85°N 14.27°E"),
        new PortEntry("Athens", "loc_athens", "Greece", "Greek", "37.94°N 23.65°E"),
        new PortEntry("Split", "loc_split", "Croatia", "Croatian", "43.51°N 16.44°E"),
        new PortEntry("Palma de Mallorca", "loc_palma", "Spain", "Spanish/Catalan", "39.57°N 2.65°E"),
        new PortEntry("Tunis", "loc_tunis", "Tunisia", "Arabic/French", "36.81°N 10.18°E"),
    };

    // ─── State ────────────────────────────────────────────────

    private bool _isOpen = false;

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        if (chartPanel == null) CreateDefaultUI();
        chartPanel.SetActive(false);

        closeButton?.onClick.AddListener(Close);

        if (GameManager.Instance != null)
        {
            GameManager.Instance.OnGameStateChanged += OnGameStateChanged;
        }
    }

    void Update()
    {
        if (Input.GetKeyDown(toggleKey) &&
            GameManager.Instance?.CurrentState == GameState.Sailing)
        {
            if (_isOpen) Close();
            else Open();
        }
    }

    void OnDestroy()
    {
        if (GameManager.Instance != null)
            GameManager.Instance.OnGameStateChanged -= OnGameStateChanged;
    }

    // ─── Public API ───────────────────────────────────────────

    public void Open()
    {
        _isOpen = true;
        chartPanel.SetActive(true);
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }

    public void Close()
    {
        _isOpen = false;
        chartPanel.SetActive(false);
    }

    // ─── Events ───────────────────────────────────────────────

    void OnGameStateChanged(GameState state)
    {
        if (state == GameState.Sailing)
        {
            // Chart table available during sailing
        }
        else
        {
            Close();
        }
    }

    void OnPortClicked(string cityName, string locationId)
    {
        Close();
        GameManager.Instance?.SailToPort(cityName, locationId);
    }

    // ─── Auto UI ──────────────────────────────────────────────

    void CreateDefaultUI()
    {
        var canvas = FindObjectOfType<Canvas>();
        if (canvas == null)
        {
            var go = new GameObject("ChartCanvas");
            canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            go.AddComponent<CanvasScaler>();
            go.AddComponent<GraphicRaycaster>();
        }

        chartPanel = new GameObject("ChartTablePanel");
        chartPanel.transform.SetParent(canvas.transform, false);

        var rect = chartPanel.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.1f, 0.1f);
        rect.anchorMax = new Vector2(0.9f, 0.9f);
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;

        var bg = chartPanel.AddComponent<Image>();
        bg.color = new Color(0.08f, 0.06f, 0.04f, 0.96f); // Antique map color

        var layout = chartPanel.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(20, 20, 16, 16);
        layout.spacing = 8f;
        layout.childForceExpandWidth = true;
        layout.childForceExpandHeight = false;

        // Title
        titleText = CreateChartText(chartPanel.transform, "🗺️ Chart Table — Select Destination", 20,
            new Color(0.9f, 0.85f, 0.7f));

        // Port list
        var listGO = new GameObject("PortList");
        listGO.transform.SetParent(chartPanel.transform, false);
        portListContainer = listGO.transform;
        var listLayout = listGO.AddComponent<VerticalLayoutGroup>();
        listLayout.spacing = 6f;
        listLayout.childForceExpandWidth = true;

        foreach (var port in Ports)
        {
            CreatePortButton(portListContainer, port);
        }

        // Close hint
        CreateChartText(chartPanel.transform, "Press M to close", 11,
            new Color(0.5f, 0.5f, 0.4f));
    }

    void CreatePortButton(Transform parent, PortEntry port)
    {
        var go = new GameObject($"Port_{port.cityName}");
        go.transform.SetParent(parent, false);

        var btn = go.AddComponent<Button>();
        var img = go.AddComponent<Image>();
        img.color = new Color(0.15f, 0.12f, 0.08f);

        var layoutGroup = go.AddComponent<HorizontalLayoutGroup>();
        layoutGroup.padding = new RectOffset(10, 10, 6, 6);
        layoutGroup.spacing = 12f;
        layoutGroup.childForceExpandWidth = false;

        var goRect = go.GetComponent<RectTransform>();
        goRect.sizeDelta = new Vector2(0, 40);

        // City name
        var nameGO = new GameObject("Name");
        nameGO.transform.SetParent(go.transform, false);
        var nameText = nameGO.AddComponent<Text>();
        nameText.text = $"⚓ {port.cityName}";
        nameText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        nameText.fontSize = 14;
        nameText.color = new Color(0.9f, 0.85f, 0.7f);
        var nameFitter = nameGO.AddComponent<LayoutElement>();
        nameFitter.preferredWidth = 180;

        // Country + language
        var infoGO = new GameObject("Info");
        infoGO.transform.SetParent(go.transform, false);
        var infoText = infoGO.AddComponent<Text>();
        infoText.text = $"{port.country} · {port.languages}";
        infoText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        infoText.fontSize = 11;
        infoText.color = new Color(0.6f, 0.55f, 0.45f);
        var infoFitter = infoGO.AddComponent<LayoutElement>();
        infoFitter.preferredWidth = 200;

        // Coordinates
        var coordGO = new GameObject("Coords");
        coordGO.transform.SetParent(go.transform, false);
        var coordText = coordGO.AddComponent<Text>();
        coordText.text = port.coordinates;
        coordText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        coordText.fontSize = 10;
        coordText.color = new Color(0.4f, 0.5f, 0.4f);

        string city = port.cityName;
        string loc = port.locationId;
        btn.onClick.AddListener(() => OnPortClicked(city, loc));
    }

    Text CreateChartText(Transform parent, string text, int size, Color color)
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
}

// ─── Port Data ────────────────────────────────────────────────

[Serializable]
public class PortEntry
{
    public string cityName;
    public string locationId;
    public string country;
    public string languages;
    public string coordinates;

    public PortEntry(string city, string locId, string ctry, string langs, string coords)
    {
        cityName = city;
        locationId = locId;
        country = ctry;
        languages = langs;
        coordinates = coords;
    }
}
