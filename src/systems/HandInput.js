import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

class HandInput {
    constructor() {
        this.landmarker = null;
        this.isVideoPlaying = false;
        this.lastVideoTime = -1;
        this.results = null; // Store latest results
    }

    async initialize() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });
        console.log("HandLandmarker initialized");
    }

    detect(videoElement) {
        if (!this.landmarker) return null;

        let startTimeMs = performance.now();
        if (this.lastVideoTime !== videoElement.currentTime) {
            this.lastVideoTime = videoElement.currentTime;
            this.results = this.landmarker.detectForVideo(videoElement, startTimeMs);
        }
        return this.results;
    }

    // Metrics calculation
    getHandMetrics(results) {
        if (!results || !results.landmarks || results.landmarks.length === 0) {
            return { isOpen: true, tension: 0, count: 0 }; // Default state
        }

        // Process first hand (or merge both?) -> simplified for now, use first detected hand
        // To support "both hands" as requested for scaling, we might want to check the spread of both hands or the average tension.

        // Let's use the average "openness" of all visible hands.
        let totalTension = 0;
        let visibleHands = results.landmarks.length;

        results.landmarks.forEach(landmarks => {
            totalTension += this.calculateHandTension(landmarks);
        });

        const avgTension = visibleHands > 0 ? totalTension / visibleHands : 0;

        // Calculate Rotation (Roll, Pitch, Yaw)
        // We use the first hand for rotation control to avoid conflict
        let rotation = { x: 0, y: 0, z: 0 };
        if (visibleHands > 0) {
            rotation = this.calculateHandRotation(results.landmarks[0]);
        }

        // Tension: 0 (Open) -> 1 (Closed/Fist)
        // Reversed for "Expansion"? 
        // Request: "detect tension and closing ... to control scale"
        // Let's return the raw tension and let the particle system decide logic.

        return {
            tension: avgTension, // 0 to 1 ideally
            isOpen: avgTension < 0.5,
            count: visibleHands,
            rotation: rotation
        };
    }

    calculateHandTension(landmarks) {
        // Simple heuristic: Distance from finger tips to wrist (landmark 0)
        // Tips: 4 (Thumb), 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
        const wrist = landmarks[0];
        const tips = [4, 8, 12, 16, 20];

        let avgDist = 0;
        tips.forEach(tipIdx => {
            const tip = landmarks[tipIdx];
            const d = Math.sqrt(
                (tip.x - wrist.x) ** 2 +
                (tip.y - wrist.y) ** 2 +
                (tip.z - wrist.z) ** 2
            );
            avgDist += d;
        });
        avgDist /= 5;

        // Normalize? 
        // Max distance for a hand is roughly 0.3-0.4 in screen coords? 
        // Closed fist is very small distance.
        // Let's say max open is ~0.4, min closed is ~0.1
        // We want tension 0 (open) to 1 (closed)
        // So map 0.4 -> 0, 0.1 -> 1

        const MAX_OPEN_DIST = 0.35;
        const MIN_CLOSED_DIST = 0.10;

        let tension = (MAX_OPEN_DIST - avgDist) / (MAX_OPEN_DIST - MIN_CLOSED_DIST);
        return Math.min(Math.max(tension, 0), 1);
    }

    calculateHandRotation(landmarks) {
        // 0: Wrist
        // 5: Index MCP, 17: Pinky MCP
        // 9: Middle Finger MCP

        const wrist = landmarks[0];
        const indexMCP = landmarks[5];
        const pinkyMCP = landmarks[17];
        const middleMCP = landmarks[9];

        // 1. ROLL (Twist): Angle of line connecting IndexMCP and PinkyMCP relative to horizontal
        // dx, dy between index and pinky
        const dx = pinkyMCP.x - indexMCP.x;
        const dy = pinkyMCP.y - indexMCP.y;
        // In screen space, y is down. 
        // atan2(dy, dx) gives angle. 
        // Normal flat hand: index (left) to pinky (right) -> dx > 0, dy ~ 0 -> angle 0
        // Vertical hand: angle -90 or 90
        const roll = -Math.atan2(dy, dx);

        // 2. PITCH (Bend Forward/Back): Angle of Wrist to MiddleMCP relative to vertical/depth?
        // Using projected 2D Y difference for simple "Tilt up/down" 
        // Ideally we want 3D pitch, but z is estimated.
        // Let's use simple 2D Tilt: Wrist to Middle Finger
        const dy_pitch = middleMCP.y - wrist.y;
        const dx_pitch = middleMCP.x - wrist.x;
        // Pointing up: middle higher (smaller y) than wrist -> dy < 0
        // Pointing down: dy > 0
        // atan2(dx, -dy) -> 0 is up
        const pitch = Math.atan2(dx_pitch, -dy_pitch);

        // 3. YAW (Turn Left/Right): distinct from Roll?
        // Hard to distinguish comfortably without depth.
        // Let's just use Roll and Pitch for now.
        // Or we can map X position to Yaw?
        const yaw = (wrist.x - 0.5) * 2; // -1 (left) to 1 (right)

        return { x: pitch, y: yaw, z: roll };
    }
}

export const handInput = new HandInput();
