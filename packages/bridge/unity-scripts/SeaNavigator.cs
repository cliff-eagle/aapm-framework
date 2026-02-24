/*
 * SeaNavigator.cs — Mediterranean sea surface and GPS navigation.
 *
 * SETUP:
 *   1. Attach to an empty GameObject at world origin
 *   2. Auto-creates: infinite sea plane, skybox, compass HUD
 *   3. Manages real GPS coordinates → Unity world coordinates
 *
 * World coordinate mapping:
 *   X = longitude (scaled)
 *   Z = latitude (scaled)
 *   Y = sea level (0)
 *   1 Unity unit ≈ 100 meters
 */

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Creates and manages the Mediterranean sea surface, navigation,
/// and waypoint system. Handles GPS↔world coordinate conversion.
/// </summary>
public class SeaNavigator : MonoBehaviour
{
    [Header("Sea Settings")]
    public Color seaColor = new Color(0.05f, 0.15f, 0.35f);
    public Color seaColorShallow = new Color(0.1f, 0.35f, 0.5f);
    public Color horizonColor = new Color(0.6f, 0.75f, 0.9f);
    public float seaPlaneSize = 10000f;

    [Header("Navigation HUD")]
    public bool showHUD = true;

    [Header("Coordinate System")]
    public float worldScale = 10f; // 1 degree = 10 Unity units (≈ 111km mapped to 10 units)

    // Mediterranean bounds (rough)
    private const float MED_LAT_MIN = 30f;
    private const float MED_LAT_MAX = 46f;
    private const float MED_LON_MIN = -6f;
    private const float MED_LON_MAX = 37f;
    private const float MED_LAT_CENTER = 38f;
    private const float MED_LON_CENTER = 15f;

    // ─── State ────────────────────────────────────────────────

    public static SeaNavigator Instance { get; private set; }

    private GameObject _seaPlane;
    private Text _compassText;
    private Text _speedText;
    private Text _gpsText;
    private Text _distanceText;
    private Vector2 _targetPort; // lat, lon of current destination

    // ─── Port Positions (from registry) ───────────────────────

    private readonly Dictionary<string, Vector2> _portPositions = new Dictionary<string, Vector2>();

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        CreateSea();
        CreateSkybox();
        if (showHUD) CreateNavigationHUD();
        RegisterDefaultPorts();
    }

    void Update()
    {
        if (!showHUD) return;

        var yacht = YachtController.Instance;
        if (yacht == null) return;

        Vector2 gps = WorldToGPS(yacht.transform.position);

        if (_compassText != null)
        {
            float heading = yacht.CurrentHeading;
            string cardinal = GetCardinal(heading);
            _compassText.text = $"⧫ {heading:F0}° {cardinal}";
        }

        if (_speedText != null)
        {
            _speedText.text = $"⚡ {yacht.CurrentSpeedKnots:F1} kn";
        }

        if (_gpsText != null)
        {
            string ns = gps.x >= 0 ? "N" : "S";
            string ew = gps.y >= 0 ? "E" : "W";
            _gpsText.text = $"📍 {Mathf.Abs(gps.x):F2}°{ns}  {Mathf.Abs(gps.y):F2}°{ew}";
        }

        if (_distanceText != null && _targetPort != Vector2.zero)
        {
            float nm = GPSDistanceNM(gps, _targetPort);
            float hours = nm / Mathf.Max(yacht.CurrentSpeedKnots, 0.1f);
            _distanceText.text = $"🎯 {nm:F0} nm  ETA {hours:F1}h";
        }
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>Convert GPS (lat, lon) to Unity world position</summary>
    public Vector3 GPSToWorld(float lat, float lon)
    {
        float x = (lon - MED_LON_CENTER) * worldScale;
        float z = (lat - MED_LAT_CENTER) * worldScale;
        return new Vector3(x, 0, z);
    }

    /// <summary>Convert Unity world position to GPS (lat, lon)</summary>
    public Vector2 WorldToGPS(Vector3 worldPos)
    {
        float lat = worldPos.z / worldScale + MED_LAT_CENTER;
        float lon = worldPos.x / worldScale + MED_LON_CENTER;
        return new Vector2(lat, lon);
    }

    /// <summary>Distance in nautical miles between two GPS points</summary>
    public float GPSDistanceNM(Vector2 from, Vector2 to)
    {
        // Haversine formula
        float dLat = (to.x - from.x) * Mathf.Deg2Rad;
        float dLon = (to.y - from.y) * Mathf.Deg2Rad;
        float a = Mathf.Sin(dLat / 2) * Mathf.Sin(dLat / 2) +
                  Mathf.Cos(from.x * Mathf.Deg2Rad) * Mathf.Cos(to.x * Mathf.Deg2Rad) *
                  Mathf.Sin(dLon / 2) * Mathf.Sin(dLon / 2);
        float c = 2 * Mathf.Atan2(Mathf.Sqrt(a), Mathf.Sqrt(1 - a));
        float distKm = 6371f * c;
        return distKm / 1.852f; // km to nautical miles
    }

    /// <summary>Register a port for navigation</summary>
    public void RegisterPort(string id, float lat, float lon)
    {
        _portPositions[id] = new Vector2(lat, lon);
    }

    /// <summary>Set navigation target to a registered port</summary>
    public void SetDestination(string portId)
    {
        if (_portPositions.TryGetValue(portId, out var pos))
        {
            _targetPort = pos;
            Debug.Log($"[Nav] 🎯 Course set for {portId} ({pos.x:F2}°N, {pos.y:F2}°E)");
        }
    }

    /// <summary>Get world position of a registered port</summary>
    public Vector3 GetPortWorldPosition(string portId)
    {
        if (_portPositions.TryGetValue(portId, out var pos))
        {
            return GPSToWorld(pos.x, pos.y);
        }
        return Vector3.zero;
    }

    // ─── Internal ─────────────────────────────────────────────

    string GetCardinal(float degrees)
    {
        string[] cardinals = { "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                               "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW" };
        int index = Mathf.RoundToInt(degrees / 22.5f) % 16;
        return cardinals[index];
    }

    void RegisterDefaultPorts()
    {
        // Register all 158 ports — subset shown, full list loaded from registry
        RegisterPort("loc_barcelona", 41.38f, 2.18f);
        RegisterPort("loc_nice", 43.70f, 7.27f);
        RegisterPort("loc_istanbul", 41.01f, 28.98f);
        RegisterPort("loc_naples", 40.85f, 14.27f);
        RegisterPort("loc_athens", 37.94f, 23.65f);
        RegisterPort("loc_dubrovnik", 42.65f, 18.09f);
        RegisterPort("loc_marseille", 43.30f, 5.37f);
        RegisterPort("loc_valletta", 35.90f, 14.51f);
        RegisterPort("loc_alexandria", 31.20f, 29.92f);
        RegisterPort("loc_tangier", 35.78f, -5.81f);
        RegisterPort("loc_santorini", 36.43f, 25.43f);
        RegisterPort("loc_mykonos", 37.45f, 25.33f);
        RegisterPort("loc_venice", 45.44f, 12.32f);
        RegisterPort("loc_monaco", 43.74f, 7.43f);
        RegisterPort("loc_bodrum", 37.03f, 27.43f);
        RegisterPort("loc_capri", 40.55f, 14.24f);
        RegisterPort("loc_kotor", 42.42f, 18.77f);
        RegisterPort("loc_hydra", 37.35f, 23.46f);
        RegisterPort("loc_ibiza", 38.91f, 1.44f);
        RegisterPort("loc_hvar", 43.17f, 16.44f);
        // ... remaining ports loaded from PortRegistryLoader
        Debug.Log($"[Nav] Registered {_portPositions.Count} ports");
    }

    // ─── Sea Creation ─────────────────────────────────────────

    void CreateSea()
    {
        _seaPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
        _seaPlane.name = "MediterraneanSea";
        _seaPlane.transform.position = Vector3.zero;
        _seaPlane.transform.localScale = new Vector3(seaPlaneSize, 1, seaPlaneSize);

        var renderer = _seaPlane.GetComponent<Renderer>();
        var mat = new Material(Shader.Find("Standard"));
        mat.color = seaColor;
        mat.SetFloat("_Metallic", 0.3f);
        mat.SetFloat("_Glossiness", 0.85f);
        renderer.material = mat;

        // Disable collider (yacht uses rigidbody constraints)
        Destroy(_seaPlane.GetComponent<Collider>());

        Debug.Log("[Sea] 🌊 Created Mediterranean sea surface");
    }

    void CreateSkybox()
    {
        Camera.main.clearFlags = CameraClearFlags.SolidColor;
        Camera.main.backgroundColor = horizonColor;

        // Fog for ocean horizon blending
        RenderSettings.fog = true;
        RenderSettings.fogColor = horizonColor;
        RenderSettings.fogMode = FogMode.Linear;
        RenderSettings.fogStartDistance = 500f;
        RenderSettings.fogEndDistance = 2000f;

        // Directional light as sun
        var sunGO = GameObject.Find("Directional Light");
        if (sunGO == null)
        {
            sunGO = new GameObject("Sun");
            var sun = sunGO.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.95f, 0.85f);
            sun.intensity = 1.2f;
            sunGO.transform.rotation = Quaternion.Euler(45f, 30f, 0);
        }
    }

    void CreateNavigationHUD()
    {
        var canvas = FindObjectOfType<Canvas>();
        if (canvas == null)
        {
            var go = new GameObject("NavCanvas");
            canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            go.AddComponent<CanvasScaler>();
            go.AddComponent<GraphicRaycaster>();
        }

        var hudPanel = new GameObject("NavHUD");
        hudPanel.transform.SetParent(canvas.transform, false);
        var rect = hudPanel.AddComponent<RectTransform>();
        rect.anchorMin = new Vector2(0, 1);
        rect.anchorMax = new Vector2(0.3f, 1);
        rect.pivot = new Vector2(0, 1);
        rect.offsetMin = new Vector2(10, -100);
        rect.offsetMax = new Vector2(-10, -10);

        var bg = hudPanel.AddComponent<Image>();
        bg.color = new Color(0, 0, 0, 0.5f);

        var layout = hudPanel.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(10, 10, 6, 6);
        layout.spacing = 2;

        _compassText = CreateHUDText(hudPanel.transform, "Compass", 16);
        _speedText = CreateHUDText(hudPanel.transform, "Speed", 14);
        _gpsText = CreateHUDText(hudPanel.transform, "GPS", 12);
        _distanceText = CreateHUDText(hudPanel.transform, "Distance", 12);
    }

    Text CreateHUDText(Transform parent, string name, int size)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var text = go.AddComponent<Text>();
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = size;
        text.color = Color.white;
        var fitter = go.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        return text;
    }
}
