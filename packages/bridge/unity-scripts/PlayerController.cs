/*
 * PlayerController.cs — First-person WASD + mouse-look controller.
 *
 * SETUP:
 *   1. Create a Capsule or empty GameObject for the player
 *   2. Tag it as "Player" (IMPORTANT — NPCInteraction uses this tag)
 *   3. Add a CharacterController component
 *   4. Attach this script
 *   5. Add a Camera as a child of the player
 *
 * Controls:
 *   WASD  — Move
 *   Mouse — Look
 *   Shift — Sprint
 *   Space — Jump
 *   Esc   — Toggle cursor lock
 */

using UnityEngine;

/// <summary>
/// First-person character controller with WASD movement and mouse look.
/// Can be disabled during dialogue via SetMovementEnabled().
/// </summary>
[RequireComponent(typeof(CharacterController))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    public float walkSpeed = 4f;
    public float sprintSpeed = 7f;
    public float jumpForce = 5f;
    public float gravity = -15f;

    [Header("Mouse Look")]
    public float mouseSensitivity = 2f;
    public float maxLookAngle = 80f;

    [Header("References")]
    public Transform cameraTransform;

    // ─── State ────────────────────────────────────────────────

    private CharacterController _controller;
    private Vector3 _velocity;
    private float _verticalRotation = 0f;
    private bool _movementEnabled = true;
    private bool _cursorLocked = true;

    // ─── Lifecycle ────────────────────────────────────────────

    void Start()
    {
        _controller = GetComponent<CharacterController>();

        // Auto-find camera if not assigned
        if (cameraTransform == null)
        {
            var cam = GetComponentInChildren<Camera>();
            if (cam != null)
            {
                cameraTransform = cam.transform;
            }
            else
            {
                // Create a camera as child
                var camGO = new GameObject("PlayerCamera");
                camGO.transform.SetParent(transform);
                camGO.transform.localPosition = new Vector3(0, 0.8f, 0);
                camGO.AddComponent<Camera>();
                camGO.AddComponent<AudioListener>();
                cameraTransform = camGO.transform;
            }
        }

        SetCursorLock(true);
    }

    void Update()
    {
        // Toggle cursor lock
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            SetCursorLock(!_cursorLocked);
        }

        if (!_movementEnabled) return;

        HandleMouseLook();
        HandleMovement();
    }

    // ─── Movement ─────────────────────────────────────────────

    void HandleMovement()
    {
        // Ground check
        bool isGrounded = _controller.isGrounded;
        if (isGrounded && _velocity.y < 0)
        {
            _velocity.y = -2f; // Small downward force to stick to ground
        }

        // WASD input
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");

        Vector3 move = transform.right * h + transform.forward * v;

        // Sprint
        float speed = Input.GetKey(KeyCode.LeftShift) ? sprintSpeed : walkSpeed;
        _controller.Move(move * speed * Time.deltaTime);

        // Jump
        if (Input.GetKeyDown(KeyCode.Space) && isGrounded)
        {
            _velocity.y = jumpForce;
        }

        // Gravity
        _velocity.y += gravity * Time.deltaTime;
        _controller.Move(_velocity * Time.deltaTime);
    }

    void HandleMouseLook()
    {
        if (!_cursorLocked) return;

        float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity;

        // Horizontal rotation — rotate the player body
        transform.Rotate(Vector3.up * mouseX);

        // Vertical rotation — rotate the camera
        _verticalRotation -= mouseY;
        _verticalRotation = Mathf.Clamp(_verticalRotation, -maxLookAngle, maxLookAngle);
        cameraTransform.localRotation = Quaternion.Euler(_verticalRotation, 0, 0);
    }

    // ─── Cursor Lock ──────────────────────────────────────────

    void SetCursorLock(bool locked)
    {
        _cursorLocked = locked;
        Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
        Cursor.visible = !locked;
    }

    // ─── Public API ───────────────────────────────────────────

    /// <summary>
    /// Enable or disable player movement (used during dialogue).
    /// </summary>
    public void SetMovementEnabled(bool enabled)
    {
        _movementEnabled = enabled;
        SetCursorLock(enabled);
    }
}
