import * as THREE from 'three';
import {Mesh, MeshStandardMaterial, PlaneBufferGeometry, PointLight, WebGLRenderer} from 'three';
import * as Stats from 'stats.js';
import {Game} from "./game";

let renderer: WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, stats: Stats;

let game: Game;

function init() {
    const textureLoader = new THREE.TextureLoader();

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    const container = document.getElementById('container');
    container.appendChild(renderer.domElement);

    stats = new Stats();
    container.appendChild(stats.dom);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    let light = new PointLight("#FFFFFF");
    light.position.set(0, 10, 0);
    light.castShadow = true;            // default false
    light.shadow.mapSize.width = 1024;  // default
    light.shadow.mapSize.height = 1024; // default
    light.shadow.camera.near = 0.1;       // default
    light.shadow.camera.far = 20;      // default
    scene.add(light);

    let plane = new PlaneBufferGeometry(10, 10);
    let mat = new MeshStandardMaterial();
    mat.color.setRGB(0.6, 0.6, 0.6);
    mat.emissive.setRGB(0.2, 0.2, 0.2);
    let mesh = new Mesh(plane, mat);
    mesh.rotateX(-Math.PI / 2);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mat.map = textureLoader.load("resource/Floor.jpg");
    mat.emissiveMap = textureLoader.load("resource/Floor.jpg");
    scene.add(mesh);


    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.x = 10;
    camera.position.y = 10;
    camera.position.z = 10;

    camera.lookAt(0, 0, 0);

    window.addEventListener('resize', onWindowResize, false);

    game = new Game(scene);
    game.spawn();
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}


let clock = new THREE.Clock(true);

init();
animate();

function animate() {

    requestAnimationFrame(animate);

    render(clock.getDelta());
    stats.update();

}

function render(dt: number) {
    if (dt > 0.5) dt = 0.5;
    game.update(dt);
    game.updateCamera(camera, dt);

    renderer.render(scene, camera);
}