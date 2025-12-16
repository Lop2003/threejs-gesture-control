import { useState, useEffect, useRef } from 'react';

export function useCamera() {
    const videoRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let stream = null;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                        setIsReady(true);
                    };
                }
            } catch (e) {
                console.error("Camera access failed:", e);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return { videoRef, isReady };
}
