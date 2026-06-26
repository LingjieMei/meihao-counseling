import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import type { Factor } from "@/lib/types";

interface Props {
  factors: Factor[];
  width?: number;
  height?: number;
}

const SOURCE_COLORS: Record<string, number> = {
  family: 0x4f8ef7,
  school: 0x52c47f,
  peers: 0xf7a94f,
};

const SOURCE_LABELS: Record<string, string> = {
  family: "家庭",
  school: "学校",
  peers: "同伴",
};

export default function FactorScatterPlot({ factors, width = 480, height = 360 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);

  // Deduplicate factors by name+source for display
  const displayFactors = useMemo(() => {
    const seen = new Set<string>();
    return factors.filter(f => {
      const key = `${f.name}|${f.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [factors]);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(14, 10, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 10, 5);
    scene.add(dirLight);

    // Grid helpers
    const gridMat = new THREE.LineBasicMaterial({ color: 0xdddddd });

    // Draw axis lines
    const axisPoints = [
      // X axis: source (family=-5, school=0, peers=5)
      [new THREE.Vector3(-6, 0, 0), new THREE.Vector3(6, 0, 0)],
      // Y axis: positivity (-5 to +5)
      [new THREE.Vector3(0, -6, 0), new THREE.Vector3(0, 6, 0)],
      // Z axis: impact (1 to 10)
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 11)],
    ];
    axisPoints.forEach(([start, end]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      scene.add(new THREE.Line(geo, gridMat));
    });

    // Axis labels via sprites
    const makeLabel = (text: string, pos: [number, number, number], color = '#555') => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(...pos);
      sprite.scale.set(2.5, 0.6, 1);
      scene.add(sprite);
    };

    makeLabel('← 家庭  来源系统  同伴 →', [0, -7.5, 0], '#4f8ef7');
    makeLabel('正向程度', [-7.5, 0, 0], '#52c47f');
    makeLabel('影响强度', [0, 0, 12], '#f7a94f');

    // Zero plane (Y=0)
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const planeGeo = new THREE.PlaneGeometry(12, 12);
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);

    // Plot data points
    // X: source mapping: family=-4, school=0, peers=4
    const sourceX: Record<string, number> = { family: -4, school: 0, peers: 4 };

    displayFactors.forEach(f => {
      const x = sourceX[f.source] ?? 0;
      const y = f.positivity;
      const z = f.impact;
      const color = SOURCE_COLORS[f.source] ?? 0x888888;

      // Sphere size proportional to impact
      const radius = 0.15 + (f.impact / 10) * 0.35;
      const geo = new THREE.SphereGeometry(radius, 16, 16);
      const mat = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        shininess: 60,
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(x, y, z);
      scene.add(sphere);

      // Vertical drop line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, y, z),
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
      scene.add(new THREE.Line(lineGeo, lineMat));

      // Label
      makeLabel(f.name, [x, y + 0.6, z], `#${color.toString(16).padStart(6, '0')}`);
    });

    // Auto-rotate
    let angle = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      angle += 0.005;
      camera.position.x = 14 * Math.cos(angle);
      camera.position.z = 14 * Math.sin(angle);
      camera.lookAt(0, 0, 5);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [displayFactors, width, height]);

  if (displayFactors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
        <div className="text-3xl">📊</div>
        <p>暂无因子数据</p>
        <p className="text-xs">在咨询记录中添加正负因子后，此处将显示三维散点图</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={mountRef} className="rounded-lg overflow-hidden" style={{ width, height }} />
      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {Object.entries(SOURCE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: `#${SOURCE_COLORS[key].toString(16).padStart(6, '0')}` }} />
            <span>{label}</span>
          </div>
        ))}
        <span className="ml-2 text-muted-foreground/60">· 球体大小 = 影响强度 · Y轴 = 正负程度 · 自动旋转</span>
      </div>
    </div>
  );
}
