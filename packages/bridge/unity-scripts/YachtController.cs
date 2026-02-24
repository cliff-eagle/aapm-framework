/*
 * YachtController.cs — Motor yacht sailing and navigation.
 *
 * SETUP:
 *   1. Attach to a yacht GameObject with Rigidbody
 *   2. Add a child camera for the helm view
 *   3. Yacht moves on a flat sea plane using physics
 *
 * Controls:
 *   W/S     — throttle up/down
 *   A/D     — rudder left/right
 *   Shift   — boost (planing speed)
 *   Tab     — toggle between helm view and deck walk
 *   M       — open chart table
 *   V       — toggle first/third person
 *
 * Physics: simplified hydrodynamics with drag, wave bobbing,
 * and heading-dependent resistance.
 */

using System;
using UnityEngine;

/// <summary>
/// Controls the player's yacht. Handles throttle, steering, camera,
/// and transitions between helm mode and walking-on-deck mode.
/// </summary>
[RequireComponent(typeof(Rigidbody))]
public class YachtController : MonoBehaviour
{
    [Header("Yacht Specs")]
    public float length = 32f;          // meters
    public float beam = 7.5f;           // meters
    public float draft = 2.1f;          // meters
    public float maxSpeedKnots = 14f;
    public float cruiseSpeedKnots = 10f;

    [Header("Engine")]
    public float enginePower = 500f;     // force multiplier
    public float reverseScale = 0.3f;    // reverse is 30% of forward
    public float throttleResponse = 2f;  // how fast throttle responds

    [Header("Steering")]
    public float rudderForce = 150f;
    public float rudderResponse = 3f;
    public float maxRudderAngle = 35f;

    [Header("Physics")]
    public float linearDrag = 0.5f;
    public float angularDrag = 2f;
    public float wavePeriod = 4f;        // seconds
    public float waveAmplitude = 0.3f;   // meters
    public float rollAmount = 3f;        // degrees

    [Header("Cameras")]
    public Transform helmCameraPoint;
    public Transform deckCameraPoint;
    public Transform thirdPersonPoint;
    public float cameraSmooth = 5f;

    [Header("Positions")]
    public Transform helmPosition;       // where player stands at helm
    public Transform deckSpawnPoint;     // where player spawns when walking
    public Transform boardingPoint;       // where player boards from dock

    // ─── State ────────────────────────────────────────────────

    public float CurrentThrottle { get; private set; }  // -1 to 1
    public float CurrentRudder { get; private set; }     // -1 to 1
    public float CurrentSpeedKnots { get; private set; }
    public float CurrentHeading { get; private set; }    // degrees
    public bool IsAtHelm { get; private set; } = true;
    public bool IsAnchored { get; private set; } = false;

    public static YachtController Instance { get; private set; }

    public event Action<float> OnSpeedChanged;           // knots
    public event Action<float> OnHeadingChanged;         // degrees

    private Rigidbody _rb;
    private Camera _camera;
    private float _targetThrottle;
    private float _targetRudder;
    private float _waveTime;
    private int _cameraMode = 0; // 0=helm, 1=deck, 2=third

    // Conversion: 1 knot ≈ 0.5144 m/s
    private const float KnotsToMs = 0.5144f;

    // ─── Lifecycle ────────────────────────────────────────────

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void Start()
    {
        _rb = GetComponent<Rigidbody>();
        _rb.mass = 50000f; // 50 tons
        _rb.drag = linearDrag;
        _rb.angularDrag = angularDrag;
        _rb.useGravity = false; // we handle buoyancy
        _rb.constraints = RigidbodyConstraints.FreezePositionY; // stay on water plane for now

        _camera = Camera.main;

        // Auto-create camera points if not set
        if (helmCameraPoint == null)
        {
            helmCameraPoint = CreatePoint("HelmCam", new Vector3(0, 4.5f, 8f));
        }
        if (deckCameraPoint == null)
        {
            deckCameraPoint = CreatePoint("DeckCam", new Vector3(0, 3f, 0));
        }
        if (thirdPersonPoint == null)
        {
            thirdPersonPoint = CreatePoint("ThirdPersonCam", new Vector3(-8f, 6f, -15f));
        }
        if (helmPosition == null)
        {
            helmPosition = CreatePoint("HelmPos", new Vector3(0, 2.5f, 7f));
        }
        if (deckSpawnPoint == null)
        {
            deckSpawnPoint = CreatePoint("DeckSpawn", new Vector3(0, 2f, 0));
        }
        if (boardingPoint == null)
        {
            boardingPoint = CreatePoint("BoardingPoint", new Vector3(-4f, 1f, 0));
        }

        // Listen to game state
        if (GameManager.Instance != null)
        {
            GameManager.Instance.OnGameStateChanged += OnGameStateChanged;
        }
    }

    void Update()
    {
        if (IsAnchored) return;
        if (!IsAtHelm) return;

        // ─── Input ────────────────────────────────────────
        _targetThrottle = 0;
        if (Input.GetKey(KeyCode.W)) _targetThrottle = Input.GetKey(KeyCode.LeftShift) ? 1f : 0.7f;
        if (Input.GetKey(KeyCode.S)) _targetThrottle = -reverseScale;

        _targetRudder = 0;
        if (Input.GetKey(KeyCode.A)) _targetRudder = -1f;
        if (Input.GetKey(KeyCode.D)) _targetRudder = 1f;

        // Smooth throttle and rudder
        CurrentThrottle = Mathf.MoveTowards(CurrentThrottle, _targetThrottle, throttleResponse * Time.deltaTime);
        CurrentRudder = Mathf.MoveTowards(CurrentRudder, _targetRudder, rudderResponse * Time.deltaTime);

        // Camera toggle
        if (Input.GetKeyDown(KeyCode.V))
        {
            _cameraMode = (_cameraMode + 1) % 3;
        }

        // Tab to switch helm/deck
        if (Input.GetKeyDown(KeyCode.Tab))
        {
            ToggleHelmMode();
        }

        // Update display values
        CurrentSpeedKnots = _rb.velocity.magnitude / KnotsToMs;
        CurrentHeading = transform.eulerAngles.y;

        OnSpeedChanged?.Invoke(CurrentSpeedKnots);
        OnHeadingChanged?.Invoke(CurrentHeading);
    }

    void FixedUpdate()
    {
        if (IsAnchored) return;

        // ─── Engine Force ─────────────────────────────────
        Vector3 engineForce = transform.forward * CurrentThrottle * enginePower;
        _rb.AddForce(engineForce, ForceMode.Force);

        // Speed limit
        float maxSpeed = maxSpeedKnots * KnotsToMs;
        if (_rb.velocity.magnitude > maxSpeed)
        {
            _rb.velocity = _rb.velocity.normalized * maxSpeed;
        }

        // ─── Rudder Torque ────────────────────────────────
        // Rudder effectiveness increases with speed
        float speedFactor = Mathf.Clamp01(_rb.velocity.magnitude / (cruiseSpeedKnots * KnotsToMs));
        float torque = CurrentRudder * rudderForce * speedFactor;
        _rb.AddTorque(Vector3.up * torque, ForceMode.Force);

        // ─── Wave Motion ──────────────────────────────────
        _waveTime += Time.fixedDeltaTime;
        float waveBob = Mathf.Sin(_waveTime * Mathf.PI * 2f / wavePeriod) * waveAmplitude;
        float waveRoll = Mathf.Sin(_waveTime * Mathf.PI * 2f / (wavePeriod * 1.3f)) * rollAmount;
        float wavePitch = Mathf.Sin(_waveTime * Mathf.PI * 2f / (wavePeriod * 0.8f)) * (rollAmount * 0.5f);

        // Apply wave rotation (visual only — doesn't affect physics heading)
        Vector3 euler = transform.eulerAngles;
        euler.x = wavePitch;
        euler.z = waveRoll;
        // Keep Y heading from physics
        transform.eulerAngles = euler;

        // Bob on waves
        Vector3 pos = transform.position;
        pos.y = waveBob;
        transform.position = pos;
    }

    void LateUpdate()
    {
        if (_camera == null) return;

        Transform target;
        switch (_cameraMode)
        {
            case 0: target = helmCameraPoint; break;
            case 1: target = deckCameraPoint; break;
            case 2: target = thirdPersonPoint; break;
            default: target = helmCameraPoint; break;
        }

        _camera.transform.position = Vector3.Lerp(
            _camera.transform.position,
            target.position,
            cameraSmooth * Time.deltaTime
        );

        if (_cameraMode == 2)
        {
            _camera.transform.LookAt(transform.position + Vector3.up * 3f);
        }
        else
        {
            _camera.transform.rotation = Quaternion.Slerp(
                _camera.transform.rotation,
                target.rotation,
                cameraSmooth * Time.deltaTime
            );
        }
    }

    // ─── Public API ───────────────────────────────────────────

    public void DropAnchor()
    {
        IsAnchored = true;
        _rb.velocity = Vector3.zero;
        _rb.angularVelocity = Vector3.zero;
        CurrentThrottle = 0;
        CurrentRudder = 0;
        Debug.Log("[Yacht] ⚓ Anchor down");
    }

    public void WeighAnchor()
    {
        IsAnchored = false;
        Debug.Log("[Yacht] ⚓ Anchor up — engines ready");
    }

    public void ToggleHelmMode()
    {
        IsAtHelm = !IsAtHelm;
        var player = FindObjectOfType<PlayerController>();
        if (player != null)
        {
            player.SetMovementEnabled(!IsAtHelm);
            if (!IsAtHelm)
            {
                player.transform.position = deckSpawnPoint.position;
            }
        }
    }

    /// <summary>
    /// Teleport yacht to a geographic position (for port arrival).
    /// World coordinates: X = longitude scale, Z = latitude scale.
    /// </summary>
    public void TeleportToPort(float worldX, float worldZ, float heading)
    {
        transform.position = new Vector3(worldX, 0, worldZ);
        transform.eulerAngles = new Vector3(0, heading, 0);
        _rb.velocity = Vector3.zero;
        _rb.angularVelocity = Vector3.zero;
        DropAnchor();
    }

    /// <summary>Get the yacht's GPS position as lat/lon</summary>
    public Vector2 GetGPSPosition()
    {
        // Simple world-to-GPS mapping (1 unit = ~100m)
        return new Vector2(
            transform.position.z * 0.001f + 38f, // rough Med latitude center
            transform.position.x * 0.001f + 15f  // rough Med longitude center
        );
    }

    // ─── Internal ─────────────────────────────────────────────

    void OnGameStateChanged(GameState state)
    {
        switch (state)
        {
            case GameState.Sailing:
                WeighAnchor();
                IsAtHelm = true;
                break;
            case GameState.PortApproach:
                // Slow approach
                break;
            case GameState.Docked:
                DropAnchor();
                IsAtHelm = false;
                break;
        }
    }

    Transform CreatePoint(string name, Vector3 localPos)
    {
        var go = new GameObject(name);
        go.transform.SetParent(transform, false);
        go.transform.localPosition = localPos;
        go.transform.localRotation = Quaternion.identity;
        return go.transform;
    }

    // ─── Yacht Geometry (procedural) ──────────────────────────

    /// <summary>
    /// Creates a basic yacht mesh procedurally. Call from editor or Start().
    /// For production, replace with imported 3D model.
    /// </summary>
    public static GameObject CreateProceduralYacht()
    {
        var yacht = new GameObject("Yacht_Cielos");
        var yc = yacht.AddComponent<YachtController>();
        yacht.AddComponent<Rigidbody>();

        // Hull
        var hull = GameObject.CreatePrimitive(PrimitiveType.Cube);
        hull.name = "Hull";
        hull.transform.SetParent(yacht.transform, false);
        hull.transform.localScale = new Vector3(7.5f, 2f, 32f);
        hull.transform.localPosition = new Vector3(0, 0.5f, 0);
        var hullMat = hull.GetComponent<Renderer>().material;
        hullMat.color = new Color(0.95f, 0.95f, 0.98f); // White hull

        // Superstructure
        var super1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        super1.name = "Superstructure";
        super1.transform.SetParent(yacht.transform, false);
        super1.transform.localScale = new Vector3(6f, 2.5f, 12f);
        super1.transform.localPosition = new Vector3(0, 2.75f, 2f);
        super1.GetComponent<Renderer>().material.color = new Color(0.9f, 0.9f, 0.92f);

        // Bridge / wheelhouse
        var bridge = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bridge.name = "Bridge";
        bridge.transform.SetParent(yacht.transform, false);
        bridge.transform.localScale = new Vector3(5f, 2f, 4f);
        bridge.transform.localPosition = new Vector3(0, 5f, 5f);
        bridge.GetComponent<Renderer>().material.color = new Color(0.3f, 0.35f, 0.4f); // Dark windows

        // Flybridge (sun deck above bridge)
        var flybridge = GameObject.CreatePrimitive(PrimitiveType.Cube);
        flybridge.name = "Flybridge";
        flybridge.transform.SetParent(yacht.transform, false);
        flybridge.transform.localScale = new Vector3(5.5f, 0.2f, 6f);
        flybridge.transform.localPosition = new Vector3(0, 6.1f, 4f);
        flybridge.GetComponent<Renderer>().material.color = Color.white;

        // Bow (tapered front)
        var bow = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bow.name = "Bow";
        bow.transform.SetParent(yacht.transform, false);
        bow.transform.localScale = new Vector3(4f, 1.5f, 8f);
        bow.transform.localPosition = new Vector3(0, 0.5f, 16f);
        bow.transform.localRotation = Quaternion.Euler(-5f, 0, 0);
        bow.GetComponent<Renderer>().material.color = new Color(0.95f, 0.95f, 0.98f);

        // Mast
        var mast = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        mast.name = "Mast";
        mast.transform.SetParent(yacht.transform, false);
        mast.transform.localScale = new Vector3(0.1f, 4f, 0.1f);
        mast.transform.localPosition = new Vector3(0, 8f, 5f);
        mast.GetComponent<Renderer>().material.color = Color.white;

        // Deck (teak colored walkway)
        var deck = GameObject.CreatePrimitive(PrimitiveType.Cube);
        deck.name = "Deck";
        deck.transform.SetParent(yacht.transform, false);
        deck.transform.localScale = new Vector3(7f, 0.1f, 30f);
        deck.transform.localPosition = new Vector3(0, 1.55f, 0);
        deck.GetComponent<Renderer>().material.color = new Color(0.6f, 0.45f, 0.25f); // Teak

        Debug.Log("[Yacht] Created procedural yacht geometry");
        return yacht;
    }
}
