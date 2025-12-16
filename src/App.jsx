import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ParticleScene } from './components/ParticleScene';
import { useCamera } from './hooks/useCamera';
import { handInput } from './systems/HandInput';
import { Shapes } from './data/shapes';

function App() {
    const { videoRef, isReady } = useCamera();
    const [currentShape, setCurrentShape] = useState(Shapes.HEART);
    const [particleColor, setParticleColor] = useState('#ff0055');
    const [handReady, setHandReady] = useState(false);

    useEffect(() => {
        if (isReady && videoRef.current) {
            // Initialize hand tracking once camera is ready
            handInput.initialize().then(() => {
                setHandReady(true);
            }).catch(err => {
                console.error("Hand tracking init failed", err);
            });
        }
    }, [isReady]);

    return (
        <div className="app-container">
            {/* 3D Scene */}
            <div className="canvas-container">
                <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 2]}>
                    <color attach="background" args={['#050505']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />

                    <ParticleScene
                        currentShape={currentShape}
                        particleColor={particleColor}
                        videoRef={videoRef}
                    />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate={true} autoRotateSpeed={0.5} />
                </Canvas>
            </div>

            {/* UI Overlay */}
            <div className="ui-overlay">
                <header>
                    <h1>Particle Morph</h1>
                    <div className="status-badge">
                        {handReady ? "🟢 Tracking Active" : "🔴 Loading AI..."}
                    </div>
                </header>

                <div className="controls-panel">
                    <div className="control-group">
                        <label>Shape</label>
                        <div className="shape-buttons">
                            {Object.values(Shapes).map(shape => (
                                <button
                                    key={shape}
                                    className={currentShape === shape ? 'active' : ''}
                                    onClick={() => setCurrentShape(shape)}
                                >
                                    {shape.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="control-group">
                        <label>Color</label>
                        <input
                            type="color"
                            value={particleColor}
                            onChange={(e) => setParticleColor(e.target.value)}
                        />
                    </div>
                </div>

                {/* Instructions */}
                <div className="instructions">
                    <p>Show your hand to the camera.</p>
                    <p>Open hand to expand, Close fist to contract.</p>
                </div>
            </div>

            {/* Hidden Video Feed or PIP */}
            <video
                ref={videoRef}
                className="input-video"
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    width: '160px',
                    height: '120px',
                    borderRadius: '10px',
                    opacity: 0.8,
                    transform: 'scaleX(-1)', // Mirror for user feel
                    pointerEvents: 'none',
                    border: '2px solid rgba(255,255,255,0.2)'
                }}
                playsInline
                muted
            />
        </div>
    );
}

export default App;
